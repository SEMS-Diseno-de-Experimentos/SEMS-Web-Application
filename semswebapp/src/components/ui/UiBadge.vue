<script setup>
import { computed } from "vue";

const props = defineProps({
  color: { type: String, default: "blue" }, // blue | green | amber | rose | slate
});

const COLORS = {
  blue: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  rose: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  slate: "bg-slate-100 text-slate-600 dark:bg-navy-800 dark:text-slate-300",
};

const classes = computed(() => COLORS[props.color] ?? COLORS.slate);
</script>

<template>
  <span
    :class="[
      'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
      classes,
    ]"
  >
    <slot />
  </span>
</template>
