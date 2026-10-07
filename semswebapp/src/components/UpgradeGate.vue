<script setup>
import { computed } from "vue";
import { Lock, Sparkles } from "lucide-vue-next";
import UiCard from "./ui/UiCard.vue";
import { useLangStore } from "@/stores/lang";
import { TIER_LABEL } from "@/lib/plan";

// Bloque que se muestra cuando una funcionalidad requiere un plan superior.
const props = defineProps({
  required: { type: String, required: true }, // free | plus | pro
  title: { type: String, required: true },
  description: { type: String, required: true },
});

const { t } = useLangStore();

const label = computed(() => TIER_LABEL[props.required] ?? props.required);
const cta = computed(() => t(`Mejorar al plan ${label.value}`, `Upgrade to ${label.value}`));
</script>

<template>
  <UiCard class="flex flex-col items-center gap-3 py-14 text-center">
    <span
      class="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300"
    >
      <Lock class="h-7 w-7" />
    </span>
    <h3 class="font-display text-xl font-extrabold text-slate-900 dark:text-white">
      {{ title }}
    </h3>
    <p class="max-w-md text-sm text-slate-500 dark:text-slate-400">
      {{ description }}
    </p>
    <RouterLink
      to="/subscription"
      class="mt-2 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
    >
      <Sparkles class="h-4 w-4" />
      {{ cta }}
    </RouterLink>
  </UiCard>
</template>
