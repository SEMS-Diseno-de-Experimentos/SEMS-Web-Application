<script setup>
import { computed } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { storeToRefs } from "pinia";
import { TrendingDown, Zap, Cpu, Receipt, TriangleAlert, Hand } from "lucide-vue-next";
import UiCard from "@/components/ui/UiCard.vue";
import UiCardTitle from "@/components/ui/UiCardTitle.vue";
import UiBadge from "@/components/ui/UiBadge.vue";
import UiLoading from "@/components/ui/UiLoading.vue";
import UiErrorState from "@/components/ui/UiErrorState.vue";
import SeverityBadge from "@/components/ui/SeverityBadge.vue";
import KpiCard from "@/components/KpiCard.vue";
import ConsumptionChart from "@/components/charts/ConsumptionChart.vue";
import { getDashboardSummary } from "@/services/dashboard.service";
import { getReadings } from "@/services/energy.service";
import { getAnomalies } from "@/services/analytics.service";
import { soles, kwh as fmtKwh, pct } from "@/lib/format";
import { useAuthStore } from "@/stores/auth";
import { useLangStore } from "@/stores/lang";

const { user } = storeToRefs(useAuthStore());
const { t } = useLangStore();

const enabled = computed(() => Boolean(user.value));

const { data: summary, isLoading: loadingSummary, isError: errorSummary } = useQuery({
  queryKey: computed(() => ["summary", user.value?.id]),
  queryFn: () => getDashboardSummary(user.value.id),
  enabled,
});

const { data: readings, isLoading: loadingReadings, isError: errorReadings } = useQuery({
  queryKey: computed(() => ["readings", user.value?.id, 14]),
  queryFn: () => getReadings(user.value.id, 14),
  enabled,
});

const { data: anomalies, isLoading: loadingAnomalies, isError: errorAnomalies } = useQuery({
  queryKey: computed(() => ["anomalies", user.value?.id]),
  queryFn: () => getAnomalies(user.value.id),
  enabled,
});

const firstName = computed(() => user.value?.fullName?.split(" ")[0] ?? "Usuario");
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="font-display flex items-center text-2xl font-extrabold text-slate-900 dark:text-white">
        {{ t("Hola", "Hi") }}, {{ firstName }}!
      </h2>
      <p class="text-sm text-slate-500 dark:text-slate-400">
        {{ t("Este es el resumen energético de tu hogar.", `This is your home's energy overview.`) }}
      </p>
    </div>

    <!-- Indicadores -->
    <UiLoading v-if="loadingSummary" />
    <UiErrorState v-else-if="errorSummary || !summary" />
    <div
      v-else
      class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <KpiCard
        :icon="TrendingDown"
        tone="green"
        :label="t('Ahorro este mes', 'Savings this month')"
        :value="soles(summary.savingAmount)"
        :hint="`${pct(summary.savingPct)} ${t('vs. tu promedio', 'vs. your average')}`"
      />
      <KpiCard
        :icon="Receipt"
        tone="blue"
        :label="t('Gasto actual', 'Current spend')"
        :value="soles(summary.currentMonthCost)"
        :hint="`${t('Proyección', 'Forecast')}: ${soles(summary.projectedCost)}`"
      />
      <KpiCard
        :icon="Zap"
        tone="amber"
        :label="t('Consumo total', 'Total usage')"
        :value="fmtKwh(summary.totalKwh)"
        :hint="t('Mes en curso', 'Current month')"
      />
      <KpiCard
        :icon="Cpu"
        tone="slate"
        :label="t('Dispositivos activos', 'Active devices')"
        :value="String(summary.activeDevices)"
        :hint="`${summary.unreadAlerts} ${t('alertas sin leer', 'unread alerts')}`"
      />
    </div>

    <!-- Grafico de consumo diario -->
    <UiCard>
      <UiCardTitle>
        {{ t("Consumo diario", "Daily usage") }}
        <template #action>
          <UiBadge color="blue">
            {{ t("Últimos 14 días", "Last 14 days") }}
          </UiBadge>
        </template>
      </UiCardTitle>
      <UiLoading v-if="loadingReadings" />
      <UiErrorState v-else-if="errorReadings || !readings" />
      <ConsumptionChart
        v-else
        :data="readings"
        metric="kwh"
      />
    </UiCard>

    <!-- Anomalias / Requieren atencion -->
    <UiCard>
      <UiCardTitle>
        {{ t("Requieren atención", "Needs attention") }}
        <template #action>
          <RouterLink
            to="/alerts"
            class="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
          >
            {{ t("Ver todo", "View all") }}
          </RouterLink>
        </template>
      </UiCardTitle>
      <UiLoading v-if="loadingAnomalies" />
      <UiErrorState v-else-if="errorAnomalies || !anomalies" />
      <div
        v-else-if="anomalies.length === 0"
        class="py-8 text-center text-sm text-slate-400"
      >
        {{ t("No hay anomalías detectadas.", "No anomalies detected.") }}
      </div>
      <ul
        v-else
        class="space-y-3"
      >
        <li
          v-for="a in anomalies"
          :key="a.id"
          class="flex items-start gap-3 rounded-lg border border-slate-100 p-3 dark:border-navy-800"
        >
          <span
            class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300"
          >
            <TriangleAlert class="h-4 w-4" />
          </span>
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm font-semibold text-slate-900 dark:text-white">
                {{ a.deviceName }}
              </p>
              <SeverityBadge :severity="a.severity" />
            </div>
            <p class="mt-0.5 text-xs leading-snug text-slate-500 dark:text-slate-400">
              {{ a.description }}
            </p>
            <p class="mt-1 text-[11px] text-slate-400">
              {{ a.detectedAt }}
            </p>
          </div>
        </li>
      </ul>
    </UiCard>
  </div>
</template>
