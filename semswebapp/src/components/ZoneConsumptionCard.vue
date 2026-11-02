<script setup>
import { computed, ref, watch } from "vue";
import { useQuery } from "@tanstack/vue-query";
import UiCard from "@/components/ui/UiCard.vue";
import UiCardTitle from "@/components/ui/UiCardTitle.vue";
import UiLoading from "@/components/ui/UiLoading.vue";
import UiErrorState from "@/components/ui/UiErrorState.vue";
import UiEmptyState from "@/components/ui/UiEmptyState.vue";
import UiSegmented from "@/components/ui/UiSegmented.vue";
import { getZoneConsumption } from "@/services/energy.service";
import { getMyOrganization, listSites } from "@/services/organizations.service";
import { useLangStore } from "@/stores/lang";
import { soles, kwh as fmtKwh } from "@/lib/format";

/**
 * Consumo de un local repartido entre sus zonas (US26).
 *
 * Es la pregunta que justifica medir por zona: no cuanto gasta el local, sino
 * donde. En un supermercado las camaras de frio y la climatizacion se llevan
 * la mayor parte, y verlo en reparto es lo que permite decidir donde actuar.
 */
const props = defineProps({ userId: { type: String, required: true } });

const { t } = useLangStore();

const ZONE_COLORS = ["#2563eb", "#0ea5e9", "#6366f1", "#f59e0b", "#10b981", "#ec4899", "#14b8a6"];
const SIN_ZONA = "#94a3b8";

const siteId = ref("");
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

const { data: locales } = useQuery({
  queryKey: computed(() => ["sites", organizacion.value?.organizationId]),
  queryFn: () => listSites(organizacion.value.organizationId),
  enabled: computed(() => Boolean(organizacion.value?.organizationId)),
});

watch(locales, (lista) => {
  if (!siteId.value && lista?.length) siteId.value = lista[0].siteId;
});

const { data: desglose, isLoading, isError } = useQuery({
  queryKey: computed(() => ["zone-consumption", siteId.value, days.value]),
  queryFn: () => getZoneConsumption(siteId.value, days.value),
  enabled: computed(() => Boolean(siteId.value)),
});

// El reparto incluye los medidores que aun no tienen zona: omitirlos haria que
// los porcentajes no sumaran cien y el desglose mentiria.
const filas = computed(() => {
  if (!desglose.value) return [];
  const zonas = desglose.value.zones.map((z, i) => ({
    ...z,
    color: ZONE_COLORS[i % ZONE_COLORS.length],
    etiqueta: z.zoneName,
  }));
  if (desglose.value.unassigned.meterCount > 0 || desglose.value.unassigned.kwh > 0) {
    zonas.push({
      ...desglose.value.unassigned,
      color: SIN_ZONA,
      etiqueta: t("Sin zona asignada", "No zone assigned"),
    });
  }
  return zonas;
});

const vacio = computed(() => (desglose.value?.totalKwh ?? 0) === 0);
</script>

<template>
  <UiCard>
    <UiCardTitle>
      {{ t("Consumo por zona", "Usage by zone") }}
      <template #action>
        <UiSegmented
          v-model="days"
          :options="dayOptions"
        />
      </template>
    </UiCardTitle>

    <div
      v-if="(locales?.length ?? 0) > 1"
      class="mb-4"
    >
      <select
        v-model="siteId"
        class="input-field"
      >
        <option
          v-for="s in locales"
          :key="s.siteId"
          :value="s.siteId"
        >
          {{ s.name }}
        </option>
      </select>
    </div>

    <UiEmptyState
      v-if="!siteId"
      :message="t('Todavía no tienes locales.', 'No sites yet.')"
      :hint="t('Registra uno en Mis locales para ver su reparto.', 'Register one under My sites to see its split.')"
    />
    <UiLoading v-else-if="isLoading" />
    <UiErrorState v-else-if="isError" />
    <UiEmptyState
      v-else-if="vacio"
      :message="t('Sin consumo medido en este periodo.', 'No measured usage in this period.')"
      :hint="t(
        'Vincula medidores a las zonas del local y el reparto aparecerá aquí.',
        'Link meters to the site zones and the split will show up here.',
      )"
    />
    <template v-else>
      <ul class="space-y-3.5">
        <li
          v-for="z in filas"
          :key="z.zoneId ?? 'sin-zona'"
        >
          <div class="mb-1 flex items-center justify-between gap-2 text-sm">
            <span class="flex min-w-0 items-center gap-2 text-slate-700 dark:text-slate-200">
              <span
                class="h-2.5 w-2.5 shrink-0 rounded-full"
                :style="{ background: z.color }"
              />
              <span class="truncate">{{ z.etiqueta }}</span>
              <span class="shrink-0 text-xs text-slate-400">
                {{ z.meterCount }} {{ z.meterCount === 1 ? t("medidor", "meter") : t("medidores", "meters") }}
              </span>
            </span>
            <span class="shrink-0 text-right">
              <span class="font-medium text-slate-700 dark:text-slate-200">{{ fmtKwh(z.kwh) }}</span>
              <span class="ml-2 text-xs text-slate-400">{{ z.sharePercent }}%</span>
            </span>
          </div>
          <div class="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-navy-800">
            <div
              class="h-full rounded-full"
              :style="{ width: `${z.sharePercent}%`, background: z.color }"
            />
          </div>
          <p
            v-if="z.estimatedEnergyCost !== null"
            class="mt-1 text-[11px] text-slate-400"
          >
            {{ t("Energía", "Energy") }}: {{ soles(z.estimatedEnergyCost) }}
          </p>
        </li>
      </ul>

      <p class="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-navy-800 dark:text-slate-400">
        {{ t("Total del periodo", "Period total") }}:
        <span class="font-semibold text-slate-700 dark:text-slate-200">{{ fmtKwh(desglose.totalKwh) }}</span>
        ·
        {{ t("la energía de hora punta se valoriza a su precio", "peak-hour energy is priced at its own rate") }}
      </p>
    </template>
  </UiCard>
</template>
