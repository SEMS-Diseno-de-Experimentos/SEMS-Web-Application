<script setup>
// Hueco con explicacion para una lista sin elementos. Sin esto las tarjetas del
// panel se quedaban como cajas en blanco, que se leen igual que un error.
defineProps({
  message: { type: String, required: true },
  hint: { type: String, default: "" },
});
</script>

<template>
  <div
    class="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center dark:border-navy-700"
  >
    <p class="text-sm text-slate-500 dark:text-slate-400">
      {{ message }}
    </p>
    <p
      v-if="hint"
      class="mt-1 text-xs text-slate-400 dark:text-slate-500"
    >
      {{ hint }}
    </p>
  </div>
</template>
