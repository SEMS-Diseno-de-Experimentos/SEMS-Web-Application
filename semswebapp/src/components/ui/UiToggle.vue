<script setup>
// Interruptor de dos estados. Se usa para las preferencias de notificacion.
defineProps({ modelValue: { type: Boolean, required: true } });
defineEmits(["update:modelValue"]);
</script>

<template>
  <button
    type="button"
    :aria-pressed="modelValue"
    :class="[
      'relative h-6 w-11 shrink-0 rounded-full transition-colors',
      modelValue ? 'bg-blue-600' : 'bg-slate-300 dark:bg-navy-700',
    ]"
    @click="$emit('update:modelValue', !modelValue)"
  >
    <span
      :class="[
        'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
        modelValue ? 'translate-x-5' : 'translate-x-0.5',
      ]"
    />
  </button>
</template>
