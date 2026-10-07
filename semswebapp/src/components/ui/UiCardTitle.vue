<script setup>
// Titulo de tarjeta con una zona de accion a la derecha (filtros, insignias,
// enlaces). El slot "action" es opcional.
</script>

<template>
  <div class="mb-4 flex items-center justify-between gap-3">
    <h3 class="font-display text-base font-bold text-slate-900 dark:text-white">
      <slot />
    </h3>
    <slot name="action" />
  </div>
</template>
