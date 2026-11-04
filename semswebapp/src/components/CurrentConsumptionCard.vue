<script setup>
import { computed, ref, watch } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { Activity } from "lucide-vue-next";
import UiCard from "@/components/ui/UiCard.vue";
import UiCardTitle from "@/components/ui/UiCardTitle.vue";
import UiLoading from "@/components/ui/UiLoading.vue";
import UiErrorState from "@/components/ui/UiErrorState.vue";
import UiEmptyState from "@/components/ui/UiEmptyState.vue";
import { getCurrentConsumption } from "@/services/energy.service";
import { getMyOrganization, listSites } from "@/services/organizations.service";
import { useLangStore } from "@/stores/lang";

/**
 * Potencia que el local esta tomando ahora mismo (US24).
 *
 * Es la vista que contesta "como esta operando en este momento". Importa
 * porque el cargo por potencia del mes lo fija el pico, y el pico dura
 * minutos: para reaccionar hay que ver la demanda mientras ocurre, no en el
 * recibo. Por eso la tarjeta se refresca sola cada minuto.
 */
const props = defineProps({ userId: { type: String, required: true } });

const { t } = useLangStore();

// Los mismos cortes que usa la regla de demanda: avisa al 85 % y el exceso
// empieza al pasar del 100 %.
const AVISO = 85;
const EXCESO = 100;

const siteId = ref("");

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

const { data: actual, isLoading, isError } = useQuery({
  queryKey: computed(() => ["current-consumption", siteId.value]),
  queryFn: () => getCurrentConsumption(siteId.value),
  enabled: computed(() => Boolean(siteId.value)),
  refetchInterval: 60_000,
});

const ocupacion = computed(() => actual.value?.occupancyPercent ?? null);

/** Verde operando normal, ambar cerca del umbral de aviso, rojo en exceso. */
const nivel = computed(() => {
  const o = ocupacion.value;
  if (o === null) return "neutro";
  if (o >= EXCESO) return "exceso";
  if (o >= AVISO) return "aviso";
  return "normal";
});

const COLOR = {
  normal: { texto: "text-emerald-600 dark:text-emerald-400", barra: "bg-emerald-500" },
  aviso: { texto: "text-amber-600 dark:text-amber-400", barra: "bg-amber-500" },
  exceso: { texto: "text-rose-600 dark:text-rose-400", barra: "bg-rose-500" },
  neutro: { texto: "text-slate-700 dark:text-slate-200", barra: "bg-slate-400" },
};

const color = computed(() => COLOR[nivel.value]);

// La barra se recorta al 100 % para no desbordar; el exceso se dice con el
// texto, no estirando la barra fuera de su caja.
const anchoBarra = computed(() => Math.min(ocupacion.value ?? 0, 100));

const mensaje = computed(() => {
  if (ocupacion.value === null) return null;
  if (nivel.value === "exceso") {
    const exceso = actual.value.powerKw - actual.value.contractedPowerKw;
    return t(
      `Estás ${exceso.toFixed(1)} kW por encima de lo contratado: este periodo ya tiene recargo.`,
      `You are ${exceso.toFixed(1)} kW above the contracted power: this period already carries a surcharge.`,
    );
  }
  if (nivel.value === "aviso") {
    const margen = actual.value.contractedPowerKw - actual.value.powerKw;
    return t(
      `Quedan ${margen.toFixed(1)} kW de margen. Reducir carga ahora evita el recargo del mes.`,
      `${margen.toFixed(1)} kW of headroom left. Shedding load now avoids this month's surcharge.`,
    );
  }
  return null;
});

const hora = computed(() => {
  if (!actual.value?.measuredAt) return null;
  return new Date(actual.value.measuredAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
});

const sinLecturas = computed(() => actual.value && actual.value.measuredAt === null);
</script>

<template>
  <UiCard>
    <UiCardTitle>
      {{ t("Consumo actual", "Current usage") }}
      <template #action>
        <select
          v-if="(locales?.length ?? 0) > 1"
          v-model="siteId"
          class="input-field !w-auto !py-1 text-sm"
        >
          <option
            v-for="s in locales"
            :key="s.siteId"
            :value="s.siteId"
          >
            {{ s.name }}
          </option>
        </select>
      </template>
    </UiCardTitle>

    <UiEmptyState
      v-if="!siteId"
      :message="t('Todavía no tienes locales.', 'No sites yet.')"
      :hint="t('Registra uno en Mis locales para ver su demanda.', 'Register one under My sites to see its demand.')"
    />
    <UiLoading v-else-if="isLoading" />
    <UiErrorState v-else-if="isError" />
    <UiEmptyState
      v-else-if="sinLecturas"
      :message="t('Ningún medidor ha reportado todavía.', 'No meter has reported yet.')"
      :hint="t(
        'En cuanto llegue la primera lectura verás aquí la potencia del local.',
        'As soon as the first reading arrives you will see the site demand here.',
      )"
    />
    <template v-else>
      <div class="flex items-end gap-3">
        <Activity
          class="mb-1 h-5 w-5 shrink-0"
          :class="color.texto"
        />
        <span
          class="text-3xl font-semibold tabular-nums"
          :class="color.texto"
        >
          {{ actual.powerKw.toFixed(1) }}
        </span>
        <span class="mb-1 text-sm text-slate-500 dark:text-slate-400">kW</span>
        <span
          v-if="actual.contractedPowerKw"
          class="mb-1 ml-auto text-sm text-slate-500 dark:text-slate-400"
        >
          {{ t("de", "of") }}
          <span class="font-medium text-slate-700 dark:text-slate-200">
            {{ actual.contractedPowerKw }} kW
          </span>
          {{ t("contratados", "contracted") }}
        </span>
      </div>

      <div
        v-if="ocupacion !== null"
        class="mt-3"
      >
        <div class="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-navy-800">
          <div
            class="h-full rounded-full transition-all"
            :class="color.barra"
            :style="{ width: `${anchoBarra}%` }"
          />
        </div>
        <p
          class="mt-1.5 text-sm font-medium"
          :class="color.texto"
        >
          {{ ocupacion.toFixed(1) }}% {{ t("de la potencia contratada", "of contracted power") }}
        </p>
      </div>

      <p
        v-if="mensaje"
        class="mt-2 text-sm text-slate-600 dark:text-slate-300"
      >
        {{ mensaje }}
      </p>

      <p class="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-navy-800 dark:text-slate-400">
        {{ actual.meterCount }}
        {{ actual.meterCount === 1 ? t("medidor en el local", "meter at the site") : t("medidores en el local", "meters at the site") }}
        <template v-if="hora">
          · {{ t("última lectura", "last reading") }} {{ hora }}
        </template>
      </p>
    </template>
  </UiCard>
</template>
