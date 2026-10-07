<script setup>
import { useLangStore } from "@/stores/lang";

const { t } = useLangStore();
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
    <p class="font-display text-6xl font-extrabold text-blue-600">
      404
    </p>
    <p class="text-slate-500 dark:text-slate-400">
      {{ t("La página que buscas no existe.", `The page you're looking for doesn't exist.`) }}
    </p>
    <RouterLink
      to="/"
      class="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
    >
      {{ t("Volver al panel", "Back to dashboard") }}
    </RouterLink>
  </div>
</template>
