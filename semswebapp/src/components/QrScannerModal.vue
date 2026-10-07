<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import { Html5Qrcode } from "html5-qrcode";
import { X, Camera } from "lucide-vue-next";
import { useLangStore } from "@/stores/lang";

// Abre la camara y devuelve el texto del QR escaneado. Se usa para leer el
// codigo de serie del medidor EOS (RF-DEV-01).
const emit = defineEmits(["result", "close"]);

const { t } = useLangStore();
const CONTAINER_ID = "qr-reader-region";

const error = ref("");
let scanner = null;
// Una vez leido un codigo dejamos de atender lecturas: la camara sigue viva
// unos milisegundos y sin esta guarda se emitiria el mismo codigo varias veces.
let stopped = false;

onMounted(() => {
  scanner = new Html5Qrcode(CONTAINER_ID, { verbose: false });

  scanner
    .start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 220, height: 220 } },
      (decodedText) => {
        if (stopped) return;
        stopped = true;
        // Se detiene antes de devolver, para liberar la camara.
        scanner.stop().catch(() => {}).finally(() => emit("result", decodedText));
      },
      () => {
        /* fallos de decodificacion por fotograma: son normales, se ignoran */
      }
    )
    .catch(() => {
      error.value = t(
        "No se pudo acceder a la cámara. Revisa los permisos.",
        "Couldn't access the camera. Check permissions."
      );
    });
});

onBeforeUnmount(() => {
  stopped = true;
  if (scanner?.isScanning) scanner.stop().catch(() => {});
});
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
    <div class="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-navy-800 dark:bg-navy-900">
      <div class="mb-3 flex items-center justify-between">
        <h3 class="flex items-center gap-2 font-display text-lg font-bold text-slate-900 dark:text-white">
          <Camera class="h-5 w-5 text-blue-600" />
          {{ t("Escanear QR del medidor", "Scan meter QR") }}
        </h3>
        <button
          type="button"
          class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          :aria-label="t('Cerrar', 'Close')"
          @click="$emit('close')"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <div
        :id="CONTAINER_ID"
        class="overflow-hidden rounded-xl bg-slate-950"
      />

      <p
        v-if="error"
        class="mt-3 text-sm text-rose-600 dark:text-rose-400"
      >
        {{ error }}
      </p>
      <p
        v-else
        class="mt-3 text-center text-xs text-slate-400"
      >
        {{ t("Apunta la cámara al código QR del medidor EOS.", "Point the camera at the EOS meter's QR code.") }}
      </p>
    </div>
  </div>
</template>
