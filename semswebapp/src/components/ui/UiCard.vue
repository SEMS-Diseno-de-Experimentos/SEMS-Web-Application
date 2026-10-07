<script setup>
defineProps({
  /** Clases extra para el contenedor (ancho de columna, fondos especiales...). */
  class: { type: String, default: "" },
});
</script>

<template>
  <div :class="['card p-5', $props.class]">
    <slot />
  </div>
</template>
