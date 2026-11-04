<script setup>
import { computed, ref, watch } from "vue";
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import { Activity, LoaderCircle, Plus, Siren, TriangleAlert, CircleCheck } from "lucide-vue-next";
import UiCard from "./ui/UiCard.vue";
import UiCardTitle from "./ui/UiCardTitle.vue";
import UiField from "./ui/UiField.vue";
import UiBadge from "./ui/UiBadge.vue";
import UiButton from "./ui/UiButton.vue";
import UiLoading from "./ui/UiLoading.vue";
import UiErrorState from "./ui/UiErrorState.vue";
import { listDemandRules, createDemandRule, evaluateDemand } from "@/services/demand.service";
import { getMyOrganization, listSites } from "@/services/organizations.service";
import { useLangStore } from "@/stores/lang";

/**
 * Aviso de demanda: la pieza que diferencia al producto.
 *
 * En una tarifa comercial el recibo no solo cobra la energia consumida, cobra
 * tambien la potencia, y esa se mide por el pico mas alto del mes. Un pico de
 * quince minutos encarece el mes entero, y lo que pase de la potencia
 * contratada se cobra a precio de penalizacion.
 *
 * Por eso la regla avisa *antes* de llegar al tope, con un margen que el usuario
 * elige: avisar despues no sirve, porque el pico ya quedo registrado.
 */
const props = defineProps({ userId: { type: String, required: true } });

const { t } = useLangStore();
const qc = useQueryClient();

const siteId = ref("");
const nombre = ref("");
const margen = ref(85);
const demandaDePrueba = ref("");
const error = ref("");

const { data: organizacion } = useQuery({
  queryKey: computed(() => ["org", props.userId]),
  queryFn: () => getMyOrganization(props.userId),
});

const { data: locales } = useQuery({
  queryKey: computed(() => ["sites", organizacion.value?.organizationId]),
  queryFn: () => listSites(organizacion.value.organizationId),
  enabled: computed(() => Boolean(organizacion.value?.organizationId)),
});

// Al llegar los locales se elige el primero, para que la tarjeta sirva sin
// obligar a tocar el selector.
watch(locales, (lista) => {
  if (!siteId.value && lista?.length) siteId.value = lista[0].siteId;
});

const localElegido = computed(
  () => (locales.value ?? []).find((s) => s.siteId === siteId.value) ?? null
);

const { data: reglas, isLoading, isError } = useQuery({
  queryKey: computed(() => ["demand-rules", siteId.value]),
  queryFn: () => listDemandRules(siteId.value),
  enabled: computed(() => Boolean(siteId.value)),
});

const crear = useMutation({
  mutationFn: () => createDemandRule({
    siteId: siteId.value,
    userId: props.userId,
    name: nombre.value,
    contractedPowerKw: Number(localElegido.value?.contractedPowerKw ?? 0),
    warningPercent: Number(margen.value),
  }),
  onSuccess: () => {
    nombre.value = "";
    error.value = "";
    qc.invalidateQueries({ queryKey: ["demand-rules", siteId.value] });
  },
  onError: () => {
    error.value = t(
      "No se pudo crear la regla. Revisa la potencia contratada del local.",
      "Couldn't create the rule. Check the site's contracted power."
    );
  },
});

const avisos = ref(null);
const evaluar = useMutation({
  mutationFn: () => evaluateDemand(siteId.value, Number(demandaDePrueba.value)),
  onSuccess: (resultado) => {
    avisos.value = resultado;
    error.value = "";
  },
  onError: () => {
    error.value = t("No se pudo evaluar la demanda.", "Couldn't evaluate the demand.");
  },
});

const potenciaContratada = computed(() => localElegido.value?.contractedPowerKw ?? null);

const umbralPrevisto = computed(() => {
  if (!potenciaContratada.value) return null;
  return Math.round(potenciaContratada.value * (Number(margen.value) / 100) * 100) / 100;
});

function onCrear() {
  if (!siteId.value || !potenciaContratada.value) return;
  crear.mutate();
}

function onEvaluar() {
  const valor = Number(demandaDePrueba.value);
  if (!siteId.value || !Number.isFinite(valor) || valor <= 0) return;
  avisos.value = null;
  evaluar.mutate();
}

// El backend devuelve la severidad en mayusculas (WARNING, CRITICAL).
const SEVERIDAD = { critical: "rose", warning: "amber", info: "slate" };
const colorDeSeveridad = (s) => SEVERIDAD[String(s ?? "").toLowerCase()] ?? "slate";
</script>

<template>
  <UiCard>
    <UiCardTitle>
      {{ t("Aviso de demanda", "Demand warning") }}
      <template #action>
        <Activity class="h-4 w-4 text-slate-400" />
      </template>
    </UiCardTitle>

    <p class="mb-4 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
      {{ t(
        "La potencia se cobra por el pico más alto del mes, y lo que exceda lo contratado se penaliza. La regla avisa antes de llegar al tope para que haya tiempo de apagar algo.",
        "Power is charged on the month's highest peak, and anything above the contracted level is penalised. The rule warns before the cap is reached so there is time to switch something off."
      ) }}
    </p>

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
          {{ s.name }} — {{ s.contractedPowerKw }} kW
        </option>
      </select>
    </UiField>

    <p
      v-if="(locales?.length ?? 0) === 0"
      class="mt-2 text-sm text-slate-400"
    >
      {{ t("Registra un local para poder vigilar su demanda.", "Register a site to watch its demand.") }}
    </p>

    <template v-else>
      <!-- Reglas vigentes del local -->
      <div class="mt-5">
        <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          {{ t("Reglas del local", "Site rules") }}
        </p>
        <UiLoading v-if="isLoading" />
        <UiErrorState v-else-if="isError" />
        <p
          v-else-if="(reglas?.length ?? 0) === 0"
          class="text-sm text-slate-400"
        >
          {{ t("Este local aún no tiene aviso de demanda.", "This site has no demand warning yet.") }}
        </p>
        <ul
          v-else
          class="space-y-2"
        >
          <li
            v-for="r in reglas"
            :key="r.id"
            class="flex items-center justify-between gap-3 rounded-lg border border-slate-100 p-3 dark:border-navy-800"
          >
            <div class="min-w-0">
              <p class="truncate font-semibold text-slate-900 dark:text-white">
                {{ r.name || t("Aviso de demanda", "Demand warning") }}
              </p>
              <p class="text-xs text-slate-400">
                {{ t("Avisa a", "Warns at") }} {{ r.warningThresholdKw }} kW
                ({{ r.warningPercent }}% {{ t("de", "of") }} {{ r.contractedPowerKw }} kW)
              </p>
            </div>
            <UiBadge :color="r.active ? 'green' : 'slate'">
              {{ r.active ? t("Activa", "Active") : t("Inactiva", "Inactive") }}
            </UiBadge>
          </li>
        </ul>
      </div>

      <!-- Alta de una regla nueva -->
      <form
        class="mt-5 space-y-3 border-t border-slate-100 pt-4 dark:border-navy-800"
        @submit.prevent="onCrear"
      >
        <UiField :label="t('Nombre de la regla', 'Rule name')">
          <input
            v-model="nombre"
            :placeholder="t('Ej: Aviso tienda Miraflores', 'e.g. Miraflores store warning')"
            class="input-field"
          >
        </UiField>
        <UiField :label="t('Avisar al llegar a este % de lo contratado', 'Warn at this % of contracted power')">
          <input
            v-model="margen"
            type="number"
            min="50"
            max="99"
            class="input-field"
          >
        </UiField>
        <p
          v-if="umbralPrevisto"
          class="text-xs text-slate-500 dark:text-slate-400"
        >
          {{ t("Con", "With") }} {{ potenciaContratada }} kW {{ t("contratados, avisará a", "contracted, it will warn at") }}
          <strong>{{ umbralPrevisto }} kW</strong>.
        </p>
        <UiButton
          type="submit"
          :disabled="crear.isPending.value || !potenciaContratada"
        >
          <LoaderCircle
            v-if="crear.isPending.value"
            class="h-4 w-4 animate-spin"
          />
          <Plus
            v-else
            class="h-4 w-4"
          />
          {{ t("Crear regla", "Create rule") }}
        </UiButton>
      </form>

      <!-- Comprobar la regla con una demanda concreta -->
      <div class="mt-5 border-t border-slate-100 pt-4 dark:border-navy-800">
        <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          {{ t("Comprobar con una demanda", "Check against a demand") }}
        </p>
        <form
          class="flex flex-col gap-2 sm:flex-row"
          @submit.prevent="onEvaluar"
        >
          <input
            v-model="demandaDePrueba"
            type="number"
            min="0"
            step="0.1"
            :placeholder="t('Demanda en kW', 'Demand in kW')"
            class="input-field flex-1"
          >
          <UiButton
            type="submit"
            :disabled="evaluar.isPending.value || !demandaDePrueba"
          >
            <LoaderCircle
              v-if="evaluar.isPending.value"
              class="h-4 w-4 animate-spin"
            />
            <Siren
              v-else
              class="h-4 w-4"
            />
            {{ t("Evaluar", "Evaluate") }}
          </UiButton>
        </form>

        <!-- Que no salte ningun aviso tambien es informacion: deja ver que la
             regla no dispara por cualquier cosa. -->
        <div
          v-if="avisos !== null"
          class="mt-3"
        >
          <p
            v-if="avisos.length === 0"
            class="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400"
          >
            <CircleCheck class="h-4 w-4" />
            {{ t("Por debajo del umbral: ningún aviso.", "Below the threshold: no warning.") }}
          </p>
          <ul
            v-else
            class="space-y-2"
          >
            <li
              v-for="a in avisos"
              :key="a.alertId"
              class="rounded-lg border border-slate-100 p-3 dark:border-navy-800"
            >
              <div class="flex items-center gap-2">
                <TriangleAlert class="h-4 w-4 text-amber-500" />
                <p class="font-semibold text-slate-900 dark:text-white">
                  {{ a.title }}
                </p>
                <UiBadge :color="colorDeSeveridad(a.severity)">
                  {{ a.severity }}
                </UiBadge>
              </div>
              <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {{ a.message }}
              </p>
            </li>
          </ul>
        </div>
      </div>
    </template>

    <p
      v-if="error"
      class="mt-3 text-xs text-rose-600 dark:text-rose-400"
    >
      {{ error }}
    </p>
  </UiCard>
</template>
