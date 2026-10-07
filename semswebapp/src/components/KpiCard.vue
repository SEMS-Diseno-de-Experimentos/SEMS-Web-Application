<script setup>
import { computed } from "vue";
import { ArrowUpRight } from "lucide-vue-next";
import UiCard from "./ui/UiCard.vue";

// Indicador del panel: icono, etiqueta, valor grande y una linea de contexto.
const props = defineProps({
  icon: { type: [Object, Function], required: true },
  label: { type: String, required: true },
  value: { type: String, required: true },
  hint: { type: String, default: "" },
  tone: { type: String, default: "blue" }, // green | blue | amber | slate
});

const TONES = {
  green: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
  blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
  slate: "bg-slate-100 text-slate-600 dark:bg-navy-800 dark:text-slate-300",
};

const toneClass = computed(() => TONES[props.tone] ?? TONES.blue);
</script>

<template>
  <UiCard>
    <div class="flex items-center justify-between">
      <span :class="['flex h-10 w-10 items-center justify-center rounded-xl', toneClass]">
        <component
          :is="icon"
          class="h-5 w-5"
        />
      </span>
      <ArrowUpRight class="h-4 w-4 text-slate-300 dark:text-navy-700" />
    </div>
    <p class="mt-4 text-sm text-slate-500 dark:text-slate-400">
      {{ label }}
    </p>
    <p class="font-display text-2xl font-extrabold text-slate-900 dark:text-white">
      {{ value }}
    </p>
    <p class="mt-1 text-xs text-slate-400">
      {{ hint }}
    </p>
  </UiCard>
</template>
