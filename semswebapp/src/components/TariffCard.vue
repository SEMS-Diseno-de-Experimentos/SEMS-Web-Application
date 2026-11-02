<script setup>
import { computed, ref, watch } from "vue";
import { useQuery, useMutation } from "@tanstack/vue-query";
import { Zap, LoaderCircle, Calculator } from "lucide-vue-next";
import UiCard from "./ui/UiCard.vue";
import UiCardTitle from "./ui/UiCardTitle.vue";
import UiField from "./ui/UiField.vue";
import UiBadge from "./ui/UiBadge.vue";
import UiButton from "./ui/UiButton.vue";
import UiLoading from "./ui/UiLoading.vue";
import UiErrorState from "./ui/UiErrorState.vue";
import { getCommercialTariff, estimateBill } from "@/services/energy.service";
import { getMyOrganization, listSites } from "@/services/organizations.service";
import { useLangStore } from "@/stores/lang";
import { soles } from "@/lib/format";

/**
 * Tarifa del local (US27) y peso del cargo por potencia en el recibo (US36).
 *
 * La diferencia con una tarifa domestica es que aqui el recibo suma tres
 * conceptos, no uno: energia en punta, energia fuera de punta y potencia. El
 * tercero no depende de cuanta energia se gasto sino del pico mas alto del mes,
 * y es el que la gente no ve venir. Separarlo en el desglose es lo que explica
 * por que conviene vigilar la demanda y no solo el consumo acumulado.
 */
const props = defineProps({ userId: { type: String, required: true } });

const { t } = useLangStore();

const siteId = ref("");
const kwhPunta = ref("");
const kwhFuera = ref("");
const demandaMaxima = ref("");

const { data: organizacion } = useQuery({
  queryKey: computed(() => ["org", props.userId]),
  queryFn: () => getMyOrganization(props.userId),
});

const { data: locales } = useQuery({
  queryKey: computed(() => ["sites", organizacion.value?.organizationId]),
  queryFn: () => listSites(organizacion.value.organizationId),
  enabled: computed(() => Boolean(organizacion.value?.organizationId)),
});

watch(locales, (lista) => {
  if (!siteId.value && lista?.length) siteId.value = lista[0].siteId;
});

const local = computed(
  () => (locales.value ?? []).find((s) => s.siteId === siteId.value) ?? null
);

const { data: tarifa, isLoading, isError } = useQuery({
  queryKey: computed(() => ["tariff", local.value?.tariffCategory]),
  queryFn: () => getCommercialTariff(local.value.tariffCategory),
  enabled: computed(() => Boolean(local.value?.tariffCategory)),
});

const estimar = useMutation({
  mutationFn: () => estimateBill({
    tariffCategory: local.value.tariffCategory,
    kwhPeak: Number(kwhPunta.value || 0),
    kwhOffPeak: Number(kwhFuera.value || 0),
    maxDemandKw: Number(demandaMaxima.value || 0),
    contractedPowerKw: Number(local.value.contractedPowerKw),
  }),
});

const estimacion = computed(() => estimar.data.value ?? null);

/** Que porcentaje del recibo se paga por el pico y no por consumir. */
const pesoDeLaPotencia = computed(() => estimacion.value?.powerSharePct ?? null);

function onEstimar() {
  if (!local.value) return;
  estimar.mutate();
}
</script>

<template>
  <UiCard>
    <UiCardTitle>
      {{ t("Tarifa del local", "Site tariff") }}
      <template #action>
        <Zap class="h-4 w-4 text-slate-400" />
      </template>
    </UiCardTitle>

    <UiField :label="t('Local', 'Site')">
      <select
        v-model="siteId"
        class="input-field"
      >
        <option
          v-for="s in locales ?? []"
          :key="s.siteId"
          :value="s.siteId"
        >
          {{ s.name }} — {{ s.tariffCategory }}
        </option>
      </select>
    </UiField>

    <p
      v-if="(locales?.length ?? 0) === 0"
      class="mt-3 text-sm text-slate-400"
    >
      {{ t("Registra un local para ver su tarifa.", "Register a site to see its tariff.") }}
    </p>

    <template v-else>
      <UiLoading v-if="isLoading" />
      <UiErrorState v-else-if="isError" />
      <template v-else-if="tarifa">
        <div class="mt-4 flex items-center gap-2">
          <UiBadge color="slate">
            {{ tarifa.tariffCategory }}
          </UiBadge>
          <UiBadge :color="tarifa.inPeakNow ? 'amber' : 'green'">
            {{ tarifa.inPeakNow
              ? t("Ahora en hora punta", "Peak hours now")
              : t("Fuera de punta", "Off-peak now") }}
          </UiBadge>
          <span class="text-xs text-slate-400">
            {{ tarifa.peakHours }}
            {{ tarifa.peakEveryDay
              ? t("todos los días", "every day")
              : t("de lunes a sábado", "Monday to Saturday") }}
          </span>
        </div>

        <dl class="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <dt class="text-xs text-slate-400">
              {{ t("Energía en punta", "Peak energy") }}
            </dt>
            <dd class="text-sm font-semibold text-slate-900 dark:text-white">
              {{ soles(tarifa.energyPeakPerKwh) }} / kWh
            </dd>
          </div>
          <div>
            <dt class="text-xs text-slate-400">
              {{ t("Energía fuera de punta", "Off-peak energy") }}
            </dt>
            <dd class="text-sm font-semibold text-slate-900 dark:text-white">
              {{ soles(tarifa.energyOffPeakPerKwh) }} / kWh
            </dd>
          </div>
          <div>
            <dt class="text-xs text-slate-400">
              {{ t("Potencia", "Power") }}
            </dt>
            <dd class="text-sm font-semibold text-slate-900 dark:text-white">
              {{ soles(tarifa.powerPerKwMonth) }} / kW {{ t("al mes", "per month") }}
            </dd>
          </div>
          <div>
            <dt class="text-xs text-slate-400">
              {{ t("Exceso sobre lo contratado", "Above contracted power") }}
            </dt>
            <dd class="text-sm font-semibold text-rose-600 dark:text-rose-400">
              {{ soles(tarifa.excessPowerPerKwMonth) }} / kW
            </dd>
          </div>
        </dl>

        <!-- Estimacion: para ver el peso del cargo por potencia (US36) -->
        <form
          class="mt-5 space-y-3 border-t border-slate-100 pt-4 dark:border-navy-800"
          @submit.prevent="onEstimar"
        >
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {{ t("Estimar el recibo del mes", "Estimate this month's bill") }}
          </p>
          <div class="grid gap-3 sm:grid-cols-3">
            <UiField :label="t('kWh en punta', 'Peak kWh')">
              <input
                v-model="kwhPunta"
                type="number"
                min="0"
                class="input-field"
              >
            </UiField>
            <UiField :label="t('kWh fuera de punta', 'Off-peak kWh')">
              <input
                v-model="kwhFuera"
                type="number"
                min="0"
                class="input-field"
              >
            </UiField>
            <UiField :label="t('Demanda máxima kW', 'Max demand kW')">
              <input
                v-model="demandaMaxima"
                type="number"
                min="0"
                step="0.1"
                class="input-field"
              >
            </UiField>
          </div>
          <UiButton
            type="submit"
            :disabled="estimar.isPending.value"
          >
            <LoaderCircle
              v-if="estimar.isPending.value"
              class="h-4 w-4 animate-spin"
            />
            <Calculator
              v-else
              class="h-4 w-4"
            />
            {{ t("Calcular", "Calculate") }}
          </UiButton>
        </form>

        <div
          v-if="estimacion"
          class="mt-4 rounded-lg border border-slate-100 p-3 dark:border-navy-800"
        >
          <dl class="space-y-1.5 text-sm">
            <div class="flex justify-between">
              <dt class="text-slate-500 dark:text-slate-400">
                {{ t("Energía", "Energy") }}
              </dt>
              <dd class="font-medium text-slate-900 dark:text-white">
                {{ soles(estimacion.energyCost) }}
              </dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-slate-500 dark:text-slate-400">
                {{ t("Potencia", "Power") }}
              </dt>
              <dd class="font-medium text-slate-900 dark:text-white">
                {{ soles(estimacion.powerCost) }}
              </dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-slate-500 dark:text-slate-400">
                {{ t("Cargo fijo", "Fixed charge") }}
              </dt>
              <dd class="font-medium text-slate-900 dark:text-white">
                {{ soles(estimacion.fixedCharge) }}
              </dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-slate-500 dark:text-slate-400">
                {{ t("IGV", "VAT") }}
              </dt>
              <dd class="font-medium text-slate-900 dark:text-white">
                {{ soles(estimacion.igv) }}
              </dd>
            </div>
            <div class="flex justify-between border-t border-slate-100 pt-1.5 dark:border-navy-800">
              <dt class="font-semibold text-slate-900 dark:text-white">
                {{ t("Total", "Total") }}
              </dt>
              <dd class="font-bold text-slate-900 dark:text-white">
                {{ soles(estimacion.total) }}
              </dd>
            </div>
          </dl>

          <!-- Lo que de verdad responde US36. -->
          <p
            v-if="pesoDeLaPotencia !== null"
            class="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300"
          >
            {{ t("El", "Power accounts for") }} <strong>{{ pesoDeLaPotencia }}%</strong>
            {{ t(
              "del recibo se paga por la potencia, no por la energía consumida: depende del pico más alto del mes.",
              "of the bill, not the energy consumed: it depends on the month's highest peak."
            ) }}
          </p>
          <p
            v-if="estimacion.hasExcess"
            class="mt-2 text-xs font-semibold text-rose-600 dark:text-rose-400"
          >
            {{ t("Exceso de", "Exceeded by") }} {{ estimacion.excessKw }} kW
            {{ t("sobre los", "over the") }} {{ local.contractedPowerKw }} kW
            {{ t("contratados, cobrado a precio de penalización.", "contracted, charged at the penalty rate.") }}
          </p>
        </div>
      </template>
    </template>
  </UiCard>
</template>
