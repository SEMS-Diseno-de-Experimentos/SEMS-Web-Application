<script setup>
import { ref, computed } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { storeToRefs } from "pinia";
import { FileDown, FileText, LoaderCircle } from "lucide-vue-next";
import UiCard from "@/components/ui/UiCard.vue";
import UiCardTitle from "@/components/ui/UiCardTitle.vue";
import UiButton from "@/components/ui/UiButton.vue";
import UiLoading from "@/components/ui/UiLoading.vue";
import UiErrorState from "@/components/ui/UiErrorState.vue";
import UiSegmented from "@/components/ui/UiSegmented.vue";
import UpgradeGate from "@/components/UpgradeGate.vue";
import { getDashboardSummary } from "@/services/dashboard.service";
import { getReadings, getDeviceConsumption } from "@/services/energy.service";
import { generateConsumptionReport } from "@/lib/report";
import { soles, kwh as fmtKwh } from "@/lib/format";
import { useAuthStore } from "@/stores/auth";
import { useLangStore } from "@/stores/lang";
import { usePlanTier } from "@/composables/usePlan";
import { hasTier } from "@/lib/plan";

const { user } = storeToRefs(useAuthStore());
const langStore = useLangStore();
const { lang } = storeToRefs(langStore);
const { t } = langStore;
const tier = usePlanTier();

const days = ref(30);
const generating = ref(false);

// La generacion de reportes es de plan Plus en adelante.
const allowed = computed(() => hasTier(tier.value, "plus"));
const enabled = computed(() => Boolean(user.value) && allowed.value);

const { data: summary, isLoading: loadingSummary, isError: errorSummary } = useQuery({
  queryKey: computed(() => ["summary", user.value?.id]),
  queryFn: () => getDashboardSummary(user.value.id),
  enabled,
});

const { data: consumption, isLoading: loadingConsumption, isError: errorConsumption } = useQuery({
  queryKey: computed(() => ["consumption", user.value?.id]),
  queryFn: () => getDeviceConsumption(user.value.id),
  enabled,
});

const { data: readings, isLoading: loadingReadings, isError: errorReadings } = useQuery({
  queryKey: computed(() => ["readings", user.value?.id, days.value]),
  queryFn: () => getReadings(user.value.id, days.value),
  enabled,
});

const loading = computed(() => loadingSummary.value || loadingConsumption.value || loadingReadings.value);
const error = computed(() => errorSummary.value || errorConsumption.value || errorReadings.value);

const periods = [
  [7, "7d"],
  [14, "14d"],
  [30, "30d"],
];

function download() {
  generating.value = true;
  try {
    generateConsumptionReport({
      userName: user.value?.fullName ?? user.value?.email ?? "—",
      summary: summary.value ?? null,
      consumption: consumption.value ?? [],
      readings: readings.value ?? [],
      days: days.value,
      lang: lang.value,
    });
  } finally {
    generating.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="font-display text-2xl font-extrabold text-slate-900 dark:text-white">
        {{ t("Reportes", "Reports") }}
      </h2>
      <p class="text-sm text-slate-500 dark:text-slate-400">
        {{
          allowed
            ? t("Descarga el reporte de consumo de tu hogar en PDF.", `Download your home's consumption report as PDF.`)
            : t("Descarga reportes de consumo y gasto de tu hogar.", "Download consumption and cost reports for your home.")
        }}
      </p>
    </div>

    <UpgradeGate
      v-if="!allowed"
      required="plus"
      :title="t('Reportes mensuales', 'Monthly reports')"
      :description="
        t(
          'La generación de reportes en PDF está disponible desde el plan Plus.',
          'PDF report generation is available from the Plus plan.'
        )
      "
    />

    <UiCard v-else>
      <UiCardTitle>{{ t("Reporte de consumo", "Consumption report") }}</UiCardTitle>

      <div class="mb-5 flex flex-wrap items-center gap-3">
        <span class="text-sm text-slate-500 dark:text-slate-400">{{ t("Periodo", "Period") }}:</span>
        <UiSegmented
          v-model="days"
          :options="periods"
        />
      </div>

      <UiLoading v-if="loading" />
      <UiErrorState v-else-if="error" />
      <template v-else>
        <!-- Vista previa de lo que llevara el PDF -->
        <div class="grid gap-3 sm:grid-cols-3">
          <div class="rounded-lg border border-slate-100 p-4 dark:border-navy-800">
            <p class="text-xs text-slate-500 dark:text-slate-400">
              {{ t("Consumo total", "Total usage") }}
            </p>
            <p class="mt-1 font-display text-xl font-extrabold text-slate-900 dark:text-white">
              {{ fmtKwh(summary?.totalKwh ?? 0) }}
            </p>
          </div>
          <div class="rounded-lg border border-slate-100 p-4 dark:border-navy-800">
            <p class="text-xs text-slate-500 dark:text-slate-400">
              {{ t("Gasto actual", "Current spend") }}
            </p>
            <p class="mt-1 font-display text-xl font-extrabold text-slate-900 dark:text-white">
              {{ soles(summary?.currentMonthCost ?? 0) }}
            </p>
          </div>
          <div class="rounded-lg border border-slate-100 p-4 dark:border-navy-800">
            <p class="text-xs text-slate-500 dark:text-slate-400">
              {{ t("Dispositivos", "Devices") }}
            </p>
            <p class="mt-1 font-display text-xl font-extrabold text-slate-900 dark:text-white">
              {{ consumption?.length ?? 0 }}
            </p>
          </div>
        </div>

        <div class="mt-5 flex flex-wrap items-center gap-3">
          <UiButton
            :disabled="generating"
            @click="download"
          >
            <LoaderCircle
              v-if="generating"
              class="h-4 w-4 animate-spin"
            />
            <FileDown
              v-else
              class="h-4 w-4"
            />
            {{ t("Descargar PDF", "Download PDF") }}
          </UiButton>
          <span class="flex items-center gap-1.5 text-xs text-slate-400">
            <FileText class="h-3.5 w-3.5 shrink-0" />
            {{
              t(
                "Incluye resumen, consumo por dispositivo y lecturas diarias.",
                "Includes summary, per-device usage and daily readings."
              )
            }}
          </span>
        </div>
      </template>
    </UiCard>
  </div>
</template>
