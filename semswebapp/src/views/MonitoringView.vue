<script setup>
import { ref, computed } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { storeToRefs } from "pinia";
import { Zap, Receipt, TrendingUp, TrendingDown } from "lucide-vue-next";
import UiCard from "@/components/ui/UiCard.vue";
import UiCardTitle from "@/components/ui/UiCardTitle.vue";
import UiBadge from "@/components/ui/UiBadge.vue";
import UiLoading from "@/components/ui/UiLoading.vue";
import UiErrorState from "@/components/ui/UiErrorState.vue";
import UiSegmented from "@/components/ui/UiSegmented.vue";
import ConsumptionChart from "@/components/charts/ConsumptionChart.vue";
import MetersManager from "@/components/MetersManager.vue";
import PeriodSummaryCard from "@/components/PeriodSummaryCard.vue";
import { getReadings, getDeviceConsumption, getPeriodComparison } from "@/services/energy.service";
import { getGoals } from "@/lib/homeStore";
import { useAuthStore } from "@/stores/auth";
import { useLangStore } from "@/stores/lang";
import { soles, kwh as fmtKwh } from "@/lib/format";

const { user } = storeToRefs(useAuthStore());
const { t } = useLangStore();

const metric = ref("kwh");
const days = ref(14);

const enabled = computed(() => Boolean(user.value));

const { data: readings, isLoading: loadingReadings, isError: errorReadings } = useQuery({
  queryKey: computed(() => ["readings", user.value?.id, days.value]),
  queryFn: () => getReadings(user.value.id, days.value),
  enabled,
});

const { data: consumption, isLoading: loadingConsumption, isError: errorConsumption } = useQuery({
  queryKey: computed(() => ["consumption", user.value?.id]),
  queryFn: () => getDeviceConsumption(user.value.id),
  enabled,
});

const { data: comparison, isLoading: loadingComparison, isError: errorComparison } = useQuery({
  queryKey: computed(() => ["comparison", user.value?.id, days.value]),
  queryFn: () => getPeriodComparison(user.value.id, days.value),
  enabled,
});

const totalKwh = computed(() => readings.value?.reduce((s, r) => s + r.kwh, 0) ?? 0);
const totalCost = computed(() => readings.value?.reduce((s, r) => s + r.cost, 0) ?? 0);

// Umbrales por dispositivo que definio el usuario (RF-ANL-05).
const goals = computed(() => getGoals(user.value?.id ?? "anon"));

const metricOptions = computed(() => [
  ["kwh", "kWh"],
  ["cost", t("Costo", "Cost")],
]);
const dayOptions = [
  [7, "7d"],
  [14, "14d"],
  [30, "30d"],
];

// Comparacion contra el periodo anterior: subir es malo, bajar es bueno.
const trend = computed(() => {
  const delta = comparison.value?.deltaPct ?? 0;
  if (delta === 0) return "flat";
  return delta > 0 ? "up" : "down";
});

const trendClass = computed(() => ({
  flat: "bg-slate-50 text-slate-600 dark:bg-navy-800 dark:text-slate-300",
  up: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  down: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
}[trend.value]));

const trendMessage = computed(() => {
  const abs = Math.abs(comparison.value?.deltaPct ?? 0);
  if (trend.value === "flat") return t("Tu consumo se mantuvo igual.", "Your usage stayed the same.");
  if (trend.value === "up") {
    return `${t("Subiste", "Up")} ${abs}% ${t("vs. el periodo anterior.", "vs. the previous period.")}`;
  }
  return `${t("Bajaste", "Down")} ${abs}% ${t("vs. el periodo anterior. ¡Bien!", "vs. the previous period. Nice!")}`;
});

function goalFor(deviceId) {
  return goals.value.perDevice[deviceId] ?? 0;
}
function isOverGoal(d) {
  const goal = goalFor(d.deviceId);
  return goal > 0 && d.kwh > goal;
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="font-display text-2xl font-extrabold text-slate-900 dark:text-white">
        {{ t("Monitoreo", "Monitoring") }}
      </h2>
      <p class="text-sm text-slate-500 dark:text-slate-400">
        {{ t("Consumo de tu hogar en tiempo real.", `Your home's energy usage in real time.`) }}
      </p>
    </div>

    <MetersManager
      v-if="user"
      :user-id="user.id"
    />

    <!-- Totales del periodo -->
    <div class="grid gap-4 sm:grid-cols-2">
      <UiCard>
        <div class="flex items-center gap-3">
          <span
            class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300"
          >
            <Zap class="h-5 w-5" />
          </span>
          <div>
            <p class="text-sm text-slate-500 dark:text-slate-400">
              {{ t("Consumo", "Usage") }} ({{ days }} {{ t("días", "days") }})
            </p>
            <p class="font-display text-xl font-extrabold text-slate-900 dark:text-white">
              {{ fmtKwh(+totalKwh.toFixed(1)) }}
            </p>
          </div>
        </div>
      </UiCard>
      <UiCard>
        <div class="flex items-center gap-3">
          <span
            class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300"
          >
            <Receipt class="h-5 w-5" />
          </span>
          <div>
            <p class="text-sm text-slate-500 dark:text-slate-400">
              {{ t("Costo", "Cost") }} ({{ days }} {{ t("días", "days") }})
            </p>
            <p class="font-display text-xl font-extrabold text-slate-900 dark:text-white">
              {{ soles(+totalCost.toFixed(2)) }}
            </p>
          </div>
        </div>
      </UiCard>
    </div>

    <!-- Comparacion de periodos -->
    <UiCard>
      <UiCardTitle>{{ t("Comparación con el periodo anterior", "Comparison with previous period") }}</UiCardTitle>
      <UiLoading v-if="loadingComparison" />
      <UiErrorState v-else-if="errorComparison || !comparison" />
      <div
        v-else
        class="space-y-4"
      >
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="rounded-lg border border-slate-100 p-4 dark:border-navy-800">
            <p class="text-xs text-slate-500 dark:text-slate-400">
              {{ t("Periodo actual", "Current period") }} ({{ days }} {{ t("días", "days") }})
            </p>
            <p class="mt-1 font-display text-xl font-extrabold text-slate-900 dark:text-white">
              {{ fmtKwh(comparison.currentKwh) }}
            </p>
            <p class="text-xs text-slate-400">
              {{ soles(comparison.currentCost) }}
            </p>
          </div>
          <div class="rounded-lg border border-slate-100 p-4 dark:border-navy-800">
            <p class="text-xs text-slate-500 dark:text-slate-400">
              {{ t("Periodo anterior", "Previous period") }}
            </p>
            <p class="mt-1 font-display text-xl font-extrabold text-slate-500 dark:text-slate-400">
              {{ fmtKwh(comparison.previousKwh) }}
            </p>
            <p class="text-xs text-slate-400">
              {{ soles(comparison.previousCost) }}
            </p>
          </div>
        </div>

        <div :class="['flex items-center gap-2 rounded-lg p-3 text-sm', trendClass]">
          <TrendingUp
            v-if="trend === 'up'"
            class="h-4 w-4 shrink-0"
          />
          <TrendingDown
            v-else-if="trend === 'down'"
            class="h-4 w-4 shrink-0"
          />
          <span class="font-semibold">{{ trendMessage }}</span>
        </div>
      </div>
    </UiCard>

    <!-- Grafico con controles -->
    <UiCard>
      <UiCardTitle>
        {{ t("Tendencia de consumo", "Usage trend") }}
        <template #action>
          <div class="flex flex-wrap items-center gap-2">
            <UiSegmented
              v-model="metric"
              :options="metricOptions"
            />
            <UiSegmented
              v-model="days"
              :options="dayOptions"
            />
          </div>
        </template>
      </UiCardTitle>
      <UiLoading v-if="loadingReadings" />
      <UiErrorState v-else-if="errorReadings || !readings" />
      <ConsumptionChart
        v-else
        :data="readings"
        :metric="metric"
      />
    </UiCard>

    <!-- Resumenes por semana y mes (RF-MON-06) -->
    <PeriodSummaryCard
      v-if="user"
      :user-id="user.id"
    />

    <!-- Detalle por dispositivo -->
    <UiCard>
      <UiCardTitle>{{ t("Detalle por dispositivo", "Device breakdown") }}</UiCardTitle>
      <UiLoading v-if="loadingConsumption" />
      <UiErrorState v-else-if="errorConsumption || !consumption" />
      <div
        v-else
        class="overflow-x-auto"
      >
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-slate-100 text-left text-xs uppercase tracking-wider text-slate-400 dark:border-navy-800">
              <th class="pb-2 font-semibold">
                {{ t("Dispositivo", "Device") }}
              </th>
              <th class="pb-2 text-right font-semibold">
                {{ t("Consumo", "Usage") }}
              </th>
              <th class="pb-2 text-right font-semibold">
                {{ t("Costo", "Cost") }}
              </th>
              <th class="pb-2 text-right font-semibold">
                {{ t("% del total", "% of total") }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="d in consumption"
              :key="d.deviceId"
              class="border-b border-slate-50 last:border-0 dark:border-navy-800/50"
            >
              <td class="py-3 font-medium text-slate-900 dark:text-white">
                <span class="flex items-center gap-2">
                  {{ d.deviceName }}
                  <UiBadge
                    v-if="isOverGoal(d)"
                    color="rose"
                  >
                    {{ t("Desviación", "Deviation") }}
                  </UiBadge>
                </span>
              </td>
              <td class="py-3 text-right text-slate-600 dark:text-slate-300">
                {{ fmtKwh(d.kwh) }}
              </td>
              <td class="py-3 text-right text-slate-600 dark:text-slate-300">
                {{ soles(d.cost) }}
              </td>
              <td class="py-3 text-right font-semibold text-blue-600 dark:text-blue-400">
                {{ d.pct }}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UiCard>
  </div>
</template>
