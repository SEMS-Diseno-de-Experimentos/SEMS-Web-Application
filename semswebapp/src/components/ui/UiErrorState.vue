<script setup>
import { useLangStore } from "@/stores/lang";

defineProps({ message: { type: String, default: "" } });

const { t } = useLangStore();
</script>

<template>
  <div
    class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-6 text-center text-sm text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
  >
    {{
      message ||
        t(
          "No se pudo cargar la información. Revisa tu conexión con el backend.",
          "Could not load the data. Check your connection to the backend."
        )
    }}
  </div>
</template>
