<script setup>
import { ref, computed } from "vue";
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import { Gauge, Plus, Trash2, LoaderCircle, QrCode } from "lucide-vue-next";
import UiCard from "./ui/UiCard.vue";
import UiCardTitle from "./ui/UiCardTitle.vue";
import UiBadge from "./ui/UiBadge.vue";
import UiButton from "./ui/UiButton.vue";
import UiLoading from "./ui/UiLoading.vue";
import UiErrorState from "./ui/UiErrorState.vue";
import QrScannerModal from "./QrScannerModal.vue";
import { getMeters, linkMeter, unlinkMeter } from "@/services/energy.service";
import { useLangStore } from "@/stores/lang";
import { kwh as fmtKwh } from "@/lib/format";

const props = defineProps({ userId: { type: String, required: true } });

const { t } = useLangStore();
const qc = useQueryClient();

const serial = ref("");
const error = ref("");
const scanOpen = ref(false);

/**
 * Lee el codigo de serie desde el texto del QR.
 *
 * Acepta texto plano (el propio serial) o un JSON con `serial`/`meter_serial`,
 * porque los medidores no traen todos el mismo formato de etiqueta.
 */
function parseMeterQr(text) {
  const raw = (text ?? "").trim();
  try {
    const obj = JSON.parse(raw);
    const found = String(obj.serial ?? obj.meter_serial ?? obj.serialNumber ?? obj.serie ?? "");
    if (found) return { serial: found, model: obj.model ? String(obj.model) : undefined };
  } catch {
    /* no era JSON: se trata como serial plano */
  }
  return { serial: raw };
}

const { data: meters, isLoading, isError } = useQuery({
  queryKey: computed(() => ["meters", props.userId]),
  queryFn: () => getMeters(props.userId),
});

const link = useMutation({
  mutationFn: ({ serial: s, model }) => linkMeter(props.userId, s, model),
  onSuccess: () => {
    serial.value = "";
    error.value = "";
    qc.invalidateQueries({ queryKey: ["meters", props.userId] });
  },
  onError: () => {
    error.value = t(
      "No se pudo vincular el medidor. Revisa el código de serie.",
      "Couldn't link the meter. Check the serial code."
    );
  },
});

const unlink = useMutation({
  mutationFn: (meterId) => unlinkMeter(meterId),
  onSuccess: () => qc.invalidateQueries({ queryKey: ["meters", props.userId] }),
});

function onLink() {
  const s = serial.value.trim();
  if (!s) return;
  link.mutate({ serial: s });
}

// Resultado del escaneo: se muestra el serial y se vincula sin pasos extra.
function onScan(text) {
  scanOpen.value = false;
  const { serial: s, model } = parseMeterQr(text);
  if (!s) return;
  serial.value = s;
  link.mutate({ serial: s, model });
}

function confirmUnlink(meterId) {
  if (window.confirm(t("¿Desvincular este medidor de tu cuenta?", "Unlink this meter from your account?"))) {
    unlink.mutate(meterId);
  }
}
</script>

<template>
  <UiCard>
    <UiCardTitle>
      {{ t("Medidores EOS", "EOS meters") }}
      <template #action>
        <Gauge class="h-4 w-4 text-slate-400" />
      </template>
    </UiCardTitle>

    <QrScannerModal
      v-if="scanOpen"
      @result="onScan"
      @close="scanOpen = false"
    />

    <UiLoading v-if="isLoading" />
    <UiErrorState v-else-if="isError" />
    <p
      v-else-if="(meters?.length ?? 0) === 0"
      class="py-3 text-sm text-slate-400"
    >
      {{ t("Aún no tienes un medidor vinculado.", "You don't have a meter linked yet.") }}
    </p>
    <ul
      v-else
      class="space-y-2.5"
    >
      <li
        v-for="m in meters"
        :key="m.meterId"
        class="flex items-center justify-between gap-3 rounded-lg border border-slate-100 p-3 dark:border-navy-800"
      >
        <div class="flex min-w-0 items-center gap-3">
          <span
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300"
          >
            <Gauge class="h-5 w-5" />
          </span>
          <div class="min-w-0">
            <p class="truncate font-semibold text-slate-900 dark:text-white">
              {{ m.name }}
            </p>
            <p class="text-xs text-slate-400">
              {{ t("Lectura acumulada", "Total reading") }}: {{ fmtKwh(m.lastReadingKwh) }}
            </p>
          </div>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <UiBadge :color="m.active ? 'green' : 'slate'">
            <span
              :class="[
                'h-1.5 w-1.5 rounded-full',
                m.active ? 'bg-emerald-500 animate-pulse-soft' : 'bg-slate-400',
              ]"
            />
            {{ m.active ? t("En línea", "Online") : t("Desconectado", "Offline") }}
          </UiBadge>
          <!-- Eliminar el boton de desvincular -->
        </div>
      </li>
    </ul>

    <div class="mt-4 flex justify-end">
      <button
        type="button"
        class="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        @click="error = ''; scanOpen = true"
      >
        <QrCode class="h-5 w-5" />
        {{ t("Escanear QR", "Scan QR") }}
      </button>
    </div>

    <p
      v-if="error"
      class="mt-2 text-xs text-rose-600 dark:text-rose-400"
    >
      {{ error }}
    </p>
  </UiCard>
</template>
