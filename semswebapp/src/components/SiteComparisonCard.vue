<script setup>
import { computed, ref } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { TrendingUp } from "lucide-vue-next";
import UiCard from "@/components/ui/UiCard.vue";
import UiCardTitle from "@/components/ui/UiCardTitle.vue";
import UiLoading from "@/components/ui/UiLoading.vue";
import UiErrorState from "@/components/ui/UiErrorState.vue";
import UiEmptyState from "@/components/ui/UiEmptyState.vue";
import UiSegmented from "@/components/ui/UiSegmented.vue";
import { getSiteComparison } from "@/services/energy.service";
import { getMyOrganization } from "@/services/organizations.service";
import { useLangStore } from "@/stores/lang";
import { soles, kwh as fmtKwh } from "@/lib/format";

/**
 * Comparacion entre los locales de la cadena (US39).
 *
 * El total por si solo no compara: un local grande consume mas que uno pequeno
 * sin que eso signifique nada. La columna que decide es el consumo por kW
 * contratado, que pone a todos en la misma escala; por eso se marca el local
 * con el valor mas alto.
 */
const props = defineProps({ userId: { type: String, required: true } });

const { t } = useLangStore();

const days = ref(30);
const dayOptions = [
  [7, "7d"],
  [30, "30d"],
  [90, "90d"],
];

const { data: organizacion } = useQuery({
  queryKey: computed(() => ["org", props.userId]),
  queryFn: () => getMyOrganization(props.userId),
});

const { data: comparacion, isLoading, isError } = useQuery({
  queryKey: computed(() => ["site-comparison", organizacion.value?.organizationId, days.value]),
  queryFn: () => getSiteComparison(organizacion.value.organizationId, days.value),
  enabled: computed(() => Boolean(organizacion.value?.organizationId)),
});

const locales = computed(() => comparacion.value?.sites ?? []);

// El mas intensivo por potencia contratada, que es lo comparable. Si ningun
// local tiene potencia registrada no se senala a ninguno.
const masIntensivo = computed(() => {
  let peor = null;
  for (const s of locales.value) {
    if (s.kwhPerContractedKw === null) continue;
    if (!peor || s.kwhPerContractedKw > peor.kwhPerContractedKw) peor = s;
  }
  return peor;
});
</script>

<template>
  <UiCard>
    <UiCardTitle>
      {{ t("Comparación entre locales", "Site comparison") }}
      <template #action>
        <UiSegmented
          v-model="days"
          :options="dayOptions"
        />
      </template>
    </UiCardTitle>

    <UiLoading v-if="isLoading" />
    <UiErrorState v-else-if="isError" />
    <UiEmptyState
      v-else-if="locales.length < 2"
      :message="t('Necesitas al menos dos locales.', 'You need at least two sites.')"
      :hint="t(
        'La comparación aparece cuando tu organización tiene más de un establecimiento.',
        'The comparison shows up once your organization has more than one establishment.',
      )"
    />
    <template v-else>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-navy-800">
              <th class="pb-2 font-semibold">
                {{ t("Local", "Site") }}
              </th>
              <th class="pb-2 text-right font-semibold">
                {{ t("Consumo", "Usage") }}
              </th>
              <th class="pb-2 text-right font-semibold">
                {{ t("Potencia", "Power") }}
              </th>
              <th class="pb-2 text-right font-semibold">
                kWh / kW
              </th>
              <th class="pb-2 text-right font-semibold">
                {{ t("Energía", "Energy") }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="s in locales"
              :key="s.siteId"
              class="border-b border-slate-50 last:border-0 dark:border-navy-800/60"
            >
              <td class="py-2.5">
                <p class="font-semibold text-slate-900 dark:text-white">
                  {{ s.siteName }}
                </p>
                <p class="text-xs text-slate-400">
                  {{ s.siteCode }} · {{ s.tariffCategory ?? t("sin tarifa", "no tariff") }}
                </p>
              </td>
              <td class="py-2.5 text-right">
                <p class="text-slate-700 dark:text-slate-200">
                  {{ fmtKwh(s.kwh) }}
                </p>
                <p class="text-xs text-slate-400">
                  {{ s.sharePercent }}%
                </p>
              </td>
              <td class="py-2.5 text-right text-slate-500 dark:text-slate-400">
                {{ s.contractedPowerKw ? `${s.contractedPowerKw} kW` : "—" }}
              </td>
              <td class="py-2.5 text-right">
                <span
                  v-if="s.kwhPerContractedKw !== null"
                  :class="[
                    'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-semibold',
                    masIntensivo && s.siteId === masIntensivo.siteId
                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                      : 'text-slate-700 dark:text-slate-200',
                  ]"
                >
                  <TrendingUp
                    v-if="masIntensivo && s.siteId === masIntensivo.siteId"
                    class="h-3.5 w-3.5"
                  />
                  {{ s.kwhPerContractedKw }}
                </span>
                <span
                  v-else
                  class="text-slate-400"
                >—</span>
              </td>
              <td class="py-2.5 text-right text-slate-500 dark:text-slate-400">
                {{ s.estimatedEnergyCost === null ? "—" : soles(s.estimatedEnergyCost) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="mt-3 text-xs text-slate-500 dark:text-slate-400">
        <template v-if="masIntensivo">
          {{ t("El más intensivo es", "The most intensive is") }}
          <span class="font-semibold text-slate-700 dark:text-slate-200">{{ masIntensivo.siteName }}</span>:
          {{ masIntensivo.kwhPerContractedKw }} {{ t("kWh por kW contratado", "kWh per contracted kW") }}.
        </template>
        {{ t(
          "Comparar totales entre locales de distinto tamaño no dice nada; por kW contratado, sí.",
          "Comparing totals across sites of different size says nothing; per contracted kW, it does.",
        ) }}
      </p>
    </template>
  </UiCard>
</template>
