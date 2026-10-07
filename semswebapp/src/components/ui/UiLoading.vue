<script setup>
import { LoaderCircle } from "lucide-vue-next";
import { useLangStore } from "@/stores/lang";

defineProps({ label: { type: String, default: "" } });

const { t } = useLangStore();
</script>

<template>
  <div class="flex items-center justify-center gap-2 py-12 text-sm text-slate-400">
    <LoaderCircle class="h-5 w-5 animate-spin" />
    {{ label || t("Cargando...", "Loading...") }}
  </div>
</template>
