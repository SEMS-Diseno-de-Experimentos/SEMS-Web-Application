<script setup>
// Etiqueta + control de formulario. Envolver el control en <label> hace que el
// texto sea clicable sin tener que inventar un id para cada campo.
defineProps({ label: { type: String, required: true } });
</script>

<template>
  <label class="block">
    <span class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
      {{ label }}
    </span>
    <slot />
  </label>
</template>
