<script setup>
import { computed, ref, watch } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { Gauge, TriangleAlert } from "lucide-vue-next";
import UiCard from "./ui/UiCard.vue";
import UiCardTitle from "./ui/UiCardTitle.vue";
import UiBadge from "./ui/UiBadge.vue";
import UiLoading from "./ui/UiLoading.vue";
import UiErrorState from "./ui/UiErrorState.vue";
import { listMetersBySite, listMetersByZone } from "@/services/energy.service";
import { useLangStore } from "@/stores/lang";

/**
 * Medidores instalados en el local (US20) y en una zona concreta (US21).
 *
 * Lo que responde es la cobertura de medicion: cuantos puntos se estan midiendo
 * y, sobre todo, que zonas se han quedado sin medir. Una camara de frio sin
 * medidor es consumo que no aparece en ningun desglose, y en un supermercado el
 * frio es la mayor parte de la factura.
 */
const props = defineProps({
  siteId: { type: String, required: true },
  zones: { type: Array, default: () => [] },
});

const { t } = useLangStore();

// Vacio = todo el local. Con una zona elegida se pregunta por esa zona, que es
// el caso de uso de US21.
const zonaFiltro = ref("");

watch(() => props.siteId, () => {
  zonaFiltro.value = "";
});

const { data: medidores, isLoading, isError } = useQuery({
  queryKey: computed(() => ["site-meters", props.siteId, zonaFiltro.value]),
  queryFn: () => (zonaFiltro.value
    ? listMetersByZone(zonaFiltro.value)
    : listMetersBySite(props.siteId)),
  enabled: computed(() => Boolean(props.siteId)),
});

const nombreDeZona = computed(() => {
  const mapa = new Map();
  for (const z of props.zones) mapa.set(z.zoneId, z.name);
  return mapa;
});

/** Medidores agrupados por zona, con los que no tienen zona al final. */
const porZona = computed(() => {
  const grupos = new Map();
  for (const m of medidores.value ?? []) {
    const clave = m.zoneId ?? "";
    if (!grupos.has(clave)) grupos.set(clave, []);
    grupos.get(clave).push(m);
  }
  return [...grupos.entries()]
    .sort(([a], [b]) => (a === "" ? 1 : b === "" ? -1 : a.localeCompare(b)))
    .map(([zoneId, lista]) => ({
      zoneId,
      nombre: zoneId
        ? nombreDeZona.value.get(zoneId) ?? t("Zona desconocida", "Unknown zone")
        : t("Sin zona asignada", "No zone assigned"),
      medidores: lista,
    }));
});

/** Zonas del local que no tienen ningun medidor: el hueco de medicion. */
const zonasSinMedidor = computed(() => {
  if (zonaFiltro.value) return [];
  const conMedidor = new Set((medidores.value ?? []).map((m) => m.zoneId).filter(Boolean));
  return props.zones.filter((z) => !conMedidor.has(z.zoneId));
});
</script>

<template>
  <UiCard>
    <UiCardTitle>
      {{ t("Medidores del local", "Site meters") }}
      <template #action>
        <Gauge class="h-4 w-4 text-slate-400" />
      </template>
    </UiCardTitle>

    <label class="block text-xs font-semibold uppercase tracking-wide text-slate-400">
      {{ t("Ver", "Show") }}
      <select
        v-model="zonaFiltro"
        class="input-field mt-1 normal-case"
      >
        <option value="">
          {{ t("Todo el local", "The whole site") }}
        </option>
        <option
          v-for="z in zones"
          :key="z.zoneId"
          :value="z.zoneId"
        >
          {{ z.name }}
        </option>
      </select>
    </label>

    <UiLoading v-if="isLoading" />
    <UiErrorState v-else-if="isError" />
    <p
      v-else-if="(medidores?.length ?? 0) === 0"
      class="mt-4 text-sm text-slate-500 dark:text-slate-400"
    >
      {{ zonaFiltro
        ? t("Esta zona no tiene medidores.", "This zone has no meters.")
        : t("Este local aún no tiene medidores instalados.", "This site has no meters installed yet.") }}
    </p>

    <template v-else>
      <p class="mt-4 text-xs text-slate-400">
        {{ medidores.length }}
        {{ medidores.length === 1 ? t("medidor", "meter") : t("medidores", "meters") }}
      </p>

      <div
        v-for="grupo in porZona"
        :key="grupo.zoneId || 'sin-zona'"
        class="mt-3"
      >
        <p class="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
          {{ grupo.nombre }}
        </p>
        <ul class="space-y-2">
          <li
            v-for="m in grupo.medidores"
            :key="m.meterId"
            class="flex items-center justify-between gap-3 rounded-lg border border-slate-100 p-2.5 dark:border-navy-800"
          >
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-slate-900 dark:text-white">
                {{ m.serial || m.name }}
              </p>
              <p
                v-if="m.name && m.name !== m.serial"
                class="truncate text-xs text-slate-400"
              >
                {{ m.name }}
              </p>
            </div>
            <UiBadge :color="m.active ? 'green' : 'slate'">
              {{ m.active ? t("Activo", "Active") : t("Inactivo", "Inactive") }}
            </UiBadge>
          </li>
        </ul>
      </div>
    </template>

    <!-- El hueco de medicion es el dato que realmente se busca aqui. -->
    <div
      v-if="zonasSinMedidor.length > 0"
      class="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
    >
      <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        {{ t("Sin medidor:", "No meter:") }}
        {{ zonasSinMedidor.map((z) => z.name).join(", ") }}.
        {{ t(
          "Su consumo no aparece en el desglose por zona.",
          "Their consumption does not show in the per-zone breakdown."
        ) }}
      </span>
    </div>
  </UiCard>
</template>
