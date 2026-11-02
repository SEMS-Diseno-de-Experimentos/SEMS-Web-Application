<script setup>
import { computed, ref } from "vue";
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import { storeToRefs } from "pinia";
import { Lightbulb, TriangleAlert, Trophy, Receipt, Check, LoaderCircle, RefreshCw } from "lucide-vue-next";
import UiCard from "@/components/ui/UiCard.vue";
import UiCardTitle from "@/components/ui/UiCardTitle.vue";
import UiButton from "@/components/ui/UiButton.vue";
import UiLoading from "@/components/ui/UiLoading.vue";
import UiErrorState from "@/components/ui/UiErrorState.vue";
import SeverityBadge from "@/components/ui/SeverityBadge.vue";
import UiEmptyState from "@/components/ui/UiEmptyState.vue";
import UpgradeGate from "@/components/UpgradeGate.vue";
import SiteComparisonCard from "@/components/SiteComparisonCard.vue";
import { listDevices } from "@/services/devices.service";
import {
  getRecommendations,
  applyRecommendation,
  getAnomalies,
  getBillPrediction,
  getRankings,
  recomputeInsights,
} from "@/services/analytics.service";
import { soles, kwh as fmtKwh, pct } from "@/lib/format";
import { useAuthStore } from "@/stores/auth";
import { useLangStore } from "@/stores/lang";
import { usePlanTier } from "@/composables/usePlan";
import { hasTier } from "@/lib/plan";

const qc = useQueryClient();
const { user } = storeToRefs(useAuthStore());
const { t } = useLangStore();
const tier = usePlanTier();

// La analitica avanzada es de plan Plus en adelante.
const allowed = computed(() => hasTier(tier.value, "pro"));

// `enabled` incluye el plan: sin acceso no tiene sentido pedir los datos.
const enabled = computed(() => Boolean(user.value) && allowed.value);

// Los equipos se piden una vez: las anomalias y el ranking solo los usan para
// poner nombre donde el backend manda un identificador.
const { data: devices } = useQuery({
  queryKey: computed(() => ["devices", user.value?.id]),
  queryFn: () => listDevices(user.value.id),
  enabled,
});

const conEquipos = computed(() =>
  devices.value === undefined ? null : { devices: devices.value }
);
const listoConEquipos = computed(() => enabled.value && conEquipos.value !== null);

const { data: recs, isLoading: loadingRecs, isError: errorRecs } = useQuery({
  queryKey: computed(() => ["recommendations", user.value?.id]),
  queryFn: () => getRecommendations(user.value.id),
  enabled,
});

const { data: anomalies, isLoading: loadingAnomalies, isError: errorAnomalies } = useQuery({
  queryKey: computed(() => ["anomalies", user.value?.id]),
  queryFn: () => getAnomalies(user.value.id, conEquipos.value),
  enabled: listoConEquipos,
});

const { data: prediction } = useQuery({
  queryKey: computed(() => ["billPrediction", user.value?.id]),
  queryFn: () => getBillPrediction(user.value.id),
  enabled,
});

const { data: rankings, isLoading: loadingRankings, isError: errorRankings } = useQuery({
  queryKey: computed(() => ["rankings", user.value?.id]),
  queryFn: () => getRankings(user.value.id, conEquipos.value),
  enabled: listoConEquipos,
});

const apply = useMutation({
  mutationFn: applyRecommendation,
  onSuccess: () => qc.invalidateQueries({ queryKey: ["recommendations"] }),
});

// Recalculo a peticion. El motor ya corre solo con cada lectura; esto evita
// tener que esperarlo cuando acabas de cargar datos y quieres ver el efecto.
const recalculado = ref(null);

const recompute = useMutation({
  mutationFn: () => recomputeInsights(user.value.id),
  onSuccess: (r) => {
    recalculado.value = r;
    for (const k of ["recommendations", "anomalies", "bill-prediction", "rankings"]) {
      qc.invalidateQueries({ queryKey: [k] });
    }
  },
});

const resumenRecalculo = computed(() => {
  const r = recalculado.value;
  if (!r) return null;
  const total = r.anomalies + r.recommendations + r.billPredictions;
  if (total === 0) {
    return t(
      "Sin hallazgos nuevos: no hay consumo suficiente todavía.",
      "No new findings: not enough measured usage yet.",
    );
  }
  return t(
    `${r.anomalies} anomalías, ${r.recommendations} recomendaciones y ${r.billPredictions} proyecciones.`,
    `${r.anomalies} anomalies, ${r.recommendations} recommendations and ${r.billPredictions} forecasts.`,
  );
});

function isApplying(id) {
  return apply.isPending.value && apply.variables.value === id;
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="font-display text-2xl font-extrabold text-slate-900 dark:text-white">
          {{ t("Analítica", "Analytics") }}
        </h2>
        <p class="text-sm text-slate-500 dark:text-slate-400">
          {{
            t(
              "Recomendaciones, anomalías y proyección de tu factura.",
              "Recommendations, anomalies and your bill forecast."
            )
          }}
        </p>
      </div>

      <UiButton
        v-if="allowed"
        variant="outline"
        :disabled="recompute.isPending.value"
        @click="recompute.mutate()"
      >
        <LoaderCircle
          v-if="recompute.isPending.value"
          class="mr-1.5 h-4 w-4 animate-spin"
        />
        <RefreshCw
          v-else
          class="mr-1.5 h-4 w-4"
        />
        {{ t("Recalcular hallazgos", "Recompute findings") }}
      </UiButton>
    </div>

    <p
      v-if="resumenRecalculo"
      class="-mt-3 text-sm text-slate-500 dark:text-slate-400"
    >
      {{ resumenRecalculo }}
    </p>

    <UpgradeGate
      v-if="!allowed"
      required="pro"
      :title="t('Analítica avanzada', 'Advanced analytics')"
      :description="
        t(
          'Las recomendaciones personalizadas, la detección de anomalías y la proyección de factura están disponibles desde el plan Plus.',
          'Personalized recommendations, anomaly detection and bill forecasting are available from the Plus plan.'
        )
      "
    />

    <template v-else>
      <!-- Proyeccion de factura -->
      <UiCard class="bg-gradient-to-br from-blue-600 to-blue-700 text-white dark:from-blue-600 dark:to-blue-800">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <span class="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
              <Receipt class="h-6 w-6" />
            </span>
            <div>
              <p class="text-sm text-blue-100/90">
                {{ t("Proyección de tu factura", "Your bill forecast") }}
              </p>
              <p class="font-display text-3xl font-extrabold">
                {{ prediction ? soles(prediction.projectedCost) : "—" }}
              </p>
              <p
                v-if="!prediction"
                class="text-xs text-blue-100/80"
              >
                {{ t(
                  "Hace falta consumo medido del periodo para proyectarla.",
                  "Measured usage for the period is needed to forecast it.",
                ) }}
              </p>
            </div>
          </div>
          <div
            v-if="prediction"
            class="text-right text-sm text-blue-100/90"
          >
            <p>{{ fmtKwh(prediction.projectedKwh) }} {{ t("estimados", "estimated") }}</p>
            <p>
              {{ t("Confianza", "Confidence") }} {{ pct(prediction.confidence * 100) }} ·
              {{ t("al", "to") }} {{ prediction.closingDate }}
            </p>
          </div>
        </div>
      </UiCard>

      <div class="grid gap-6 lg:grid-cols-2">
        <!-- Recomendaciones -->
        <UiCard>
          <UiCardTitle>{{ t("Recomendaciones", "Recommendations") }}</UiCardTitle>
          <UiLoading v-if="loadingRecs" />
          <UiErrorState v-else-if="errorRecs" />
          <UiEmptyState
            v-else-if="(recs?.length ?? 0) === 0"
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
              v-for="r in recs"
              :key="r.id"
              class="rounded-lg border border-slate-100 p-3.5 dark:border-navy-800"
            >
              <div class="flex items-start gap-3">
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
                  <div class="mt-2.5">
                    <span
                      v-if="r.applied"
                      class="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400"
                    >
                      <Check class="h-3.5 w-3.5" /> {{ t("Aplicada", "Applied") }}
                    </span>
                    <UiButton
                      v-else
                      variant="outline"
                      class="!py-1.5 !text-xs"
                      :disabled="apply.isPending.value"
                      @click="apply.mutate(r.id)"
                    >
                      <LoaderCircle
                        v-if="isApplying(r.id)"
                        class="h-3.5 w-3.5 animate-spin"
                      />
                      {{ t("Aplicar", "Apply") }}
                    </UiButton>
                  </div>
                </div>
              </div>
            </li>
          </ul>
        </UiCard>

        <!-- Comparacion entre locales -->
        <SiteComparisonCard
          v-if="user"
          :user-id="user.id"
          class="lg:col-span-2"
        />

        <div class="space-y-6">
          <!-- Ranking -->
          <UiCard>
            <UiCardTitle>{{ t("Ranking de consumo", "Usage ranking") }}</UiCardTitle>
            <UiLoading v-if="loadingRankings" />
            <UiErrorState v-else-if="errorRankings" />
            <UiEmptyState
              v-else-if="(rankings?.length ?? 0) === 0"
              :message="t('Sin equipos que ordenar.', 'No equipment to rank.')"
              :hint="t(
                'El ranking compara equipos; el reparto por zona está en Monitoreo.',
                'The ranking compares equipment; the split by zone is under Monitoring.',
              )"
            />
            <ul
              v-else
              class="space-y-2"
            >
              <li
                v-for="r in rankings"
                :key="r.rank"
                class="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50 dark:hover:bg-navy-800"
              >
                <span
                  :class="[
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold',
                    r.rank === 1
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                      : 'bg-slate-100 text-slate-500 dark:bg-navy-800 dark:text-slate-400',
                  ]"
                >
                  <Trophy
                    v-if="r.rank === 1"
                    class="h-3.5 w-3.5"
                  />
                  <template v-else>{{ r.rank }}</template>
                </span>
                <span class="flex-1 truncate text-sm font-medium text-slate-900 dark:text-white">
                  {{ r.deviceName }}
                </span>
                <span class="text-sm text-slate-500 dark:text-slate-400">{{ fmtKwh(r.kwh) }}</span>
                <span class="w-16 text-right text-sm font-semibold text-blue-600 dark:text-blue-400">
                  {{ soles(r.cost) }}
                </span>
              </li>
            </ul>
          </UiCard>

          <!-- Anomalias -->
          <UiCard>
            <UiCardTitle>{{ t("Anomalías detectadas", "Detected anomalies") }}</UiCardTitle>
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
                class="flex items-start gap-3"
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
                </div>
              </li>
            </ul>
          </UiCard>
        </div>
      </div>
    </template>
  </div>
</template>
