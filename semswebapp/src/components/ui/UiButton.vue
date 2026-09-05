<script setup>
import { computed } from "vue";

const props = defineProps({
  variant: { type: String, default: "primary" }, // primary | outline | ghost
  type: { type: String, default: "button" },
  disabled: { type: Boolean, default: false },
  class: { type: String, default: "" },
});

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed";

const VARIANTS = {
  primary: "bg-blue-600 text-white shadow-sm shadow-blue-600/20 hover:bg-blue-700",
  outline:
    "border border-slate-300 text-slate-700 hover:border-blue-400 hover:text-blue-600 dark:border-navy-700 dark:text-slate-200 dark:hover:text-blue-400",
  ghost: "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-navy-800",
};

const classes = computed(() => [BASE, VARIANTS[props.variant] ?? VARIANTS.primary, props.class]);
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    :class="classes"
  >
    <slot />
  </button>
</template>
