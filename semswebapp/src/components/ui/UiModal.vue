<script setup>
import { onMounted, onBeforeUnmount } from "vue";
import { X } from "lucide-vue-next";
import { useLangStore } from "@/stores/lang";

// Dialogo centrado. Lo usan el alta de dispositivo, el de umbral y el de
// tarjeta, que antes repetian el mismo marcado tres veces.
defineProps({
  title: { type: String, required: true },
  maxWidth: { type: String, default: "max-w-md" },
});

const emit = defineEmits(["close"]);
const { t } = useLangStore();

// Escape cierra el dialogo: es lo que el usuario espera y evita quedarse
// atrapado si el boton queda fuera de la pantalla.
function onKey(e) {
  if (e.key === "Escape") emit("close");
}

onMounted(() => document.addEventListener("keydown", onKey));
onBeforeUnmount(() => document.removeEventListener("keydown", onKey));
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
  >
    <div
      :class="[
        'w-full rounded-card border border-slate-200 bg-white p-6 shadow-xl dark:border-navy-800 dark:bg-navy-900',
        maxWidth,
      ]"
    >
      <div class="mb-5 flex items-center justify-between">
        <h3 class="font-display text-lg font-bold text-slate-900 dark:text-white">
          {{ title }}
        </h3>
        <button
          type="button"
          class="text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
          :aria-label="t('Cerrar', 'Close')"
          @click="$emit('close')"
        >
          <X class="h-5 w-5" />
        </button>
      </div>
      <slot />
    </div>
  </div>
</template>
