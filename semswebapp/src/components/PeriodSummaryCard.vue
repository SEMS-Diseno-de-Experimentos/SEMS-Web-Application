<script setup>
import { ref, computed } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { CalendarRange } from "lucide-vue-next";
import UiCard from "./ui/UiCard.vue";
import UiCardTitle from "./ui/UiCardTitle.vue";
import UiLoading from "./ui/UiLoading.vue";
import UiErrorState from "./ui/UiErrorState.vue";
import UiSegmented from "./ui/UiSegmented.vue";
import { getConsumptionSummary } from "@/services/energy.service";
import { useLangStore } from "@/stores/lang";
import { soles, kwh as fmtKwh } from "@/lib/format";

// Resumenes de consumo por semana y por mes (RF-MON-06).
const props = defineProps({ userId: { type: String, required: true } });

const { t } = useLangStore();
const view = ref("weekly");

const { data, isLoading, isError } = useQuery({
  queryKey: computed(() => ["summary-period", props.userId]),
  queryFn: () => getConsumptionSummary(props.userId),
});

const rows = computed(() =>
  view.value === "weekly" ? data.value?.weekly ?? [] : data.value?.monthly ?? []
);

const viewOptions = computed(() => [
  ["weekly", t("Semana", "Week")],
  ["monthly", t("Mes", "Month")],
]);

// Las claves mensuales llegan como "2026-07"; se muestran como "julio de 2026".
function monthLabel(ym) {
  const d = new Date(ym + "-01T00:00:00");
  return isNaN(d.getTime()) ? ym : d.toLocaleDateString("es-PE", { month: "long", year: "numeric" });
}
</script>

<template>
  <UiCard>
    <UiCardTitle>
      <span class="flex items-center gap-2">
        <CalendarRange class="h-4 w-4 text-slate-400" />
        {{ t("Resúmenes por periodo", "Period summaries") }}
      </span>
      <template #action>
        <UiSegmented
          v-model="view"
          :options="viewOptions"
        />
      </template>
    </UiCardTitle>

    <UiLoading v-if="isLoading" />
    <UiErrorState v-else-if="isError || !data" />
    <p
      v-else-if="rows.length === 0"
      class="py-3 text-center text-xs text-slate-400"
    >
      {{ t("Sin datos suficientes todavía.", "Not enough data yet.") }}
    </p>
    <div
      v-else
      class="overflow-x-auto"
    >
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-slate-100 text-left text-xs uppercase tracking-wider text-slate-400 dark:border-navy-800">
            <th class="pb-2 font-semibold">
              {{ t("Periodo", "Period") }}
            </th>
            <th class="pb-2 text-right font-semibold">
              {{ t("Consumo", "Usage") }}
            </th>
            <th class="pb-2 text-right font-semibold">
              {{ t("Costo", "Cost") }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="p in rows"
            :key="p.key"
            class="border-b border-slate-50 last:border-0 dark:border-navy-800/50"
          >
            <td class="py-3 font-medium capitalize text-slate-900 dark:text-white">
              {{ view === "monthly" ? monthLabel(p.key) : p.label }}
            </td>
            <td class="py-3 text-right text-slate-600 dark:text-slate-300">
              {{ fmtKwh(p.kwh) }}
            </td>
            <td class="py-3 text-right text-slate-600 dark:text-slate-300">
              {{ soles(p.cost) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </UiCard>
</template>
