<script setup>
import { computed } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { storeToRefs } from "pinia";
import { TrendingDown, Zap, Cpu, Receipt, Lightbulb, TriangleAlert } from "lucide-vue-next";
import UiCard from "@/components/ui/UiCard.vue";
import UiCardTitle from "@/components/ui/UiCardTitle.vue";
import UiBadge from "@/components/ui/UiBadge.vue";
import UiLoading from "@/components/ui/UiLoading.vue";
import UiErrorState from "@/components/ui/UiErrorState.vue";
import SeverityBadge from "@/components/ui/SeverityBadge.vue";
import KpiCard from "@/components/KpiCard.vue";
import ConsumptionChart from "@/components/charts/ConsumptionChart.vue";
import UiEmptyState from "@/components/ui/UiEmptyState.vue";
import GettingStartedCard from "@/components/GettingStartedCard.vue";
import { summarize, SUMMARY_DAYS } from "@/services/dashboard.service";
import {
  aggregateByDay,
  getDeviceConsumption,
  getMeters,
  getReadingsRaw,
} from "@/services/energy.service";
import { listDevices } from "@/services/devices.service";
import { getUnreadAlertCount } from "@/services/alerts.service";
import { getMyOrganization, listSites } from "@/services/organizations.service";
import { getRecommendations, getAnomalies } from "@/services/analytics.service";
import { soles, kwh as fmtKwh, pct } from "@/lib/format";
import { useAuthStore } from "@/stores/auth";
import { useLangStore } from "@/stores/lang";

const { user } = storeToRefs(useAuthStore());
const { t } = useLangStore();

const DEVICE_COLORS = ["#2563eb", "#0ea5e9", "#6366f1", "#f59e0b", "#10b981", "#94a3b8"];

// Dias que se pintan en el grafico. Las lecturas se piden una sola vez para la
// ventana larga del resumen y aqui solo se recortan.
const CHART_DAYS = 14;

// Todas las consultas siguen el mismo patron: clave reactiva con el id del
// usuario y `enabled` para no lanzarlas antes de que haya sesion.
//
// Se desestructuran a proposito: vue-query devuelve un objeto de refs, y solo
// las variables sueltas se desenvuelven solas en la plantilla. Usar
// `query.isLoading` directamente daria siempre verdadero, porque lo que se
// evalua es el ref y no su valor.
const enabled = computed(() => Boolean(user.value));

// Las lecturas crudas se piden UNA vez y de ahi sale todo lo que depende de
// ellas: el grafico diario, el resumen y, si hace falta, el desglose por
// equipo. Antes cada uno las pedia por su cuenta y el mismo GET salia cuatro
// veces por carga del panel.
const { data: rawReadings, isLoading: loadingReadings, isError: errorReadings } = useQuery({
  queryKey: computed(() => ["readings-raw", user.value?.id]),
  queryFn: () => getReadingsRaw(user.value.id),
  enabled,
});

const { data: devices, isLoading: loadingDevices, isError: errorDevices } = useQuery({
  queryKey: computed(() => ["devices", user.value?.id]),
  queryFn: () => listDevices(user.value.id),
  enabled,
});

const { data: unreadAlerts } = useQuery({
  queryKey: computed(() => ["alerts-unread", user.value?.id]),
  queryFn: () => getUnreadAlertCount(user.value.id),
  enabled,
});

// El desglose por equipo espera a los tres anteriores y se los pasa, asi que
// solo consulta su propio endpoint.
const datosBase = computed(() =>
  rawReadings.value !== undefined && devices.value !== undefined
    ? { readings: rawReadings.value, devices: devices.value }
    : null
);

const { data: consumption, isLoading: loadingConsumption, isError: errorConsumption } = useQuery({
  queryKey: computed(() => ["consumption", user.value?.id]),
  queryFn: () => getDeviceConsumption(user.value.id, datosBase.value),
  enabled: computed(() => Boolean(user.value) && datosBase.value !== null),
});

// Lecturas por dia: la ventana larga para el resumen, recortada para el grafico.
const readings = computed(() => aggregateByDay(rawReadings.value ?? [], SUMMARY_DAYS));
const chartReadings = computed(() => readings.value.slice(-CHART_DAYS));

const summary = computed(() =>
  summarize({
    consumption: consumption.value ?? [],
    readings: readings.value,
    devices: devices.value ?? [],
    unreadAlerts: unreadAlerts.value ?? 0,
  })
);

const loadingSummary = computed(() => loadingReadings.value || loadingDevices.value);
const errorSummary = computed(() => errorReadings.value && errorDevices.value);

// Una cuenta sin lecturas ni equipos acaba de empezar: solo en ese caso vale la
// pena averiguar que le falta, para no cargar al resto con tres consultas mas.
const cuentaNueva = computed(
  () => rawReadings.value?.length === 0 && devices.value?.length === 0
);
const revisarAlta = computed(() => Boolean(user.value) && cuentaNueva.value);

const { data: organization } = useQuery({
  queryKey: computed(() => ["my-organization", user.value?.id]),
  queryFn: () => getMyOrganization(user.value.id),
  enabled: revisarAlta,
});

const { data: sites } = useQuery({
  queryKey: computed(() => ["sites", organization.value?.organizationId]),
  queryFn: () => listSites(organization.value.organizationId),
  enabled: computed(() => revisarAlta.value && Boolean(organization.value?.organizationId)),
});

const { data: meters } = useQuery({
  queryKey: computed(() => ["meters", user.value?.id]),
  queryFn: () => getMeters(user.value.id),
  enabled: revisarAlta,
});

const { data: recs, isLoading: loadingRecs, isError: errorRecs } = useQuery({
  queryKey: computed(() => ["recommendations", user.value?.id]),
  queryFn: () => getRecommendations(user.value.id),
  enabled,
});

const { data: anomalies, isLoading: loadingAnomalies, isError: errorAnomalies } = useQuery({
  queryKey: computed(() => ["anomalies", user.value?.id]),
  queryFn: () => getAnomalies(user.value.id, { devices: devices.value ?? [] }),
  enabled: computed(() => Boolean(user.value) && devices.value !== undefined),
});

const firstName = computed(() => user.value?.fullName?.split(" ")[0] ?? "👋");
const topRecs = computed(() => (recs.value ?? []).slice(0, 3));

// Textos de las dos tarjetas que antes afirmaban cosas sin tener los datos.
const ahorro = computed(() =>
  summary.value.savingAmount === null ? "—" : soles(summary.value.savingAmount)
);
const ahorroPie = computed(() =>
  summary.value.savingPct === null
    ? t("Aún sin histórico para comparar", "No history to compare yet")
    : `${pct(summary.value.savingPct)} ${t("vs. la quincena anterior", "vs. the previous fortnight")}`
);
const proyeccionPie = computed(() =>
  summary.value.projectedCost === null
    ? t("Sin lecturas todavía", "No readings yet")
    : `${t("Proyección", "Forecast")}: ${soles(summary.value.projectedCost)}`
);

function colorAt(i) {
  return DEVICE_COLORS[i % DEVICE_COLORS.length];
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="font-display text-2xl font-extrabold text-slate-900 dark:text-white">
        {{ t("Hola", "Hi") }}, {{ firstName }}
      </h2>
      <p class="text-sm text-slate-500 dark:text-slate-400">
        {{ t("Este es el resumen energético de tu establecimiento.", `This is your establishment's energy overview.`) }}
      </p>
    </div>

    <GettingStartedCard
      v-if="cuentaNueva"
      :has-organization="Boolean(organization)"
      :site-count="sites?.length ?? 0"
      :meter-count="meters?.length ?? 0"
      :device-count="devices?.length ?? 0"
    />

    <!-- Indicadores -->
    <UiLoading v-if="loadingSummary" />
    <UiErrorState v-else-if="errorSummary" />
    <div
      v-else
      class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <KpiCard
        :icon="TrendingDown"
        tone="green"
        :label="t('Ahorro de la quincena', 'Savings this fortnight')"
        :value="ahorro"
        :hint="ahorroPie"
      />
      <KpiCard
        :icon="Receipt"
        tone="blue"
        :label="t('Gasto actual', 'Current spend')"
        :value="soles(summary.currentMonthCost)"
        :hint="proyeccionPie"
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

    <div class="grid gap-6 lg:grid-cols-3">
      <!-- Grafico -->
      <UiCard class="lg:col-span-2">
        <UiCardTitle>
          {{ t("Consumo diario", "Daily usage") }}
          <template #action>
            <UiBadge color="blue">
              {{ t("Últimos 14 días", "Last 14 days") }}
            </UiBadge>
          </template>
        </UiCardTitle>
        <UiLoading v-if="loadingReadings" />
        <UiErrorState v-else-if="errorReadings" />
        <UiEmptyState
          v-else-if="chartReadings.length === 0"
          :message="t('Todavía no hay lecturas.', 'No readings yet.')"
          :hint="t(
            'Vincula un medidor en Monitoreo y el consumo diario aparecerá aquí.',
            'Link a meter under Monitoring and daily usage will show up here.',
          )"
        />
        <ConsumptionChart
          v-else
          :data="chartReadings"
          metric="kwh"
        />
      </UiCard>

      <!-- Consumo por dispositivo -->
      <UiCard>
        <UiCardTitle>{{ t("Por dispositivo", "By device") }}</UiCardTitle>
        <UiLoading v-if="loadingConsumption" />
        <UiErrorState v-else-if="errorConsumption" />
        <UiEmptyState
          v-else-if="(consumption?.length ?? 0) === 0"
          :message="t('Sin consumo por equipo.', 'No per-device usage.')"
          :hint="t(
            'Registra tus equipos para ver cuánto gasta cada uno.',
            'Register your equipment to see how much each one spends.',
          )"
        />
        <ul
          v-else
          class="space-y-3.5"
        >
          <li
            v-for="(d, i) in consumption"
            :key="d.deviceId"
          >
            <div class="mb-1 flex items-center justify-between text-sm">
              <span class="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                <span
                  class="h-2.5 w-2.5 rounded-full"
                  :style="{ background: colorAt(i) }"
                />
                {{ d.deviceName }}
              </span>
              <span class="font-medium text-slate-500 dark:text-slate-400">{{ soles(d.cost) }}</span>
            </div>
            <div class="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-navy-800">
              <div
                class="h-full rounded-full"
                :style="{ width: `${d.pct}%`, background: colorAt(i) }"
              />
            </div>
          </li>
        </ul>
      </UiCard>
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <!-- Recomendaciones -->
      <UiCard>
        <UiCardTitle>
          {{ t("Recomendaciones", "Recommendations") }}
          <template #action>
            <UiBadge color="green">
              {{ t("Ahorro potencial", "Potential savings") }}
            </UiBadge>
          </template>
        </UiCardTitle>
        <UiLoading v-if="loadingRecs" />
        <UiErrorState v-else-if="errorRecs" />
        <UiEmptyState
          v-else-if="topRecs.length === 0"
          :message="t('Aún no hay recomendaciones.', 'No recommendations yet.')"
          :hint="t(
            'Salen del consumo medido: con unos días de lecturas empiezan a aparecer.',
            'They come from measured usage: a few days of readings and they start showing up.',
          )"
        />
        <ul
          v-else
          class="space-y-3"
        >
          <li
            v-for="r in topRecs"
            :key="r.id"
            class="flex items-start gap-3 rounded-lg border border-slate-100 p-3 dark:border-navy-800"
          >
            <span
              class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
            >
              <Lightbulb class="h-4 w-4" />
            </span>
            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm font-semibold text-slate-900 dark:text-white">
                  {{ r.title }}
                </p>
                <span class="shrink-0 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  +{{ soles(r.estimatedSaving) }}/{{ t("mes", "mo") }}
                </span>
              </div>
              <p class="mt-0.5 text-xs leading-snug text-slate-500 dark:text-slate-400">
                {{ r.detail }}
              </p>
            </div>
          </li>
        </ul>
      </UiCard>

      <!-- Anomalias -->
      <UiCard>
        <UiCardTitle>
          {{ t("Anomalías recientes", "Recent anomalies") }}
          <template #action>
            <RouterLink
              to="/analytics"
              class="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
            >
              {{ t("Ver todo", "View all") }}
            </RouterLink>
          </template>
        </UiCardTitle>
        <UiLoading v-if="loadingAnomalies" />
        <UiErrorState v-else-if="errorAnomalies" />
        <UiEmptyState
          v-else-if="(anomalies?.length ?? 0) === 0"
          :message="t('Ninguna anomalía detectada.', 'No anomalies detected.')"
          :hint="t('Es la respuesta buena.', 'That is the good answer.')"
        />
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
  </div>
</template>
