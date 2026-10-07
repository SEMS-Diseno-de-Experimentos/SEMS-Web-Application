<script setup>
// Selector de opciones en linea (metrica, rango de dias, pestanas de filtro).
// `options` es una lista de pares [valor, etiqueta].
defineProps({
  modelValue: { type: [String, Number], required: true },
  options: { type: Array, required: true },
});

defineEmits(["update:modelValue"]);
</script>

<template>
  <div class="inline-flex rounded-lg border border-slate-200 p-0.5 dark:border-navy-800">
    <button
      v-for="[value, label] in options"
      :key="value"
      type="button"
      :class="[
        'rounded-md px-2.5 py-1 text-xs font-semibold transition-colors',
        String(modelValue) === String(value)
          ? 'bg-blue-600 text-white'
          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white',
      ]"
      @click="$emit('update:modelValue', value)"
    >
      {{ label }}
    </button>
  </div>
</template>
