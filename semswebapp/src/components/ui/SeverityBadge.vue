<script setup>
import { computed } from "vue";
import UiBadge from "./UiBadge.vue";
import { useLangStore } from "@/stores/lang";

const props = defineProps({
  severity: { type: String, required: true }, // LOW | MEDIUM | HIGH
});

const { t } = useLangStore();

const map = computed(() => ({
  LOW: { color: "slate", label: t("Baja", "Low") },
  MEDIUM: { color: "amber", label: t("Media", "Medium") },
  HIGH: { color: "rose", label: t("Alta", "High") },
}));

const current = computed(() => map.value[props.severity] ?? map.value.LOW);
</script>

<template>
  <UiBadge :color="current.color">
    {{ current.label }}
  </UiBadge>
</template>
