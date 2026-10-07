<script setup>
import { ref, computed } from "vue";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { storeToRefs } from "pinia";
import { Building, Target, Save, Check, Coins } from "lucide-vue-next";
import UiCard from "@/components/ui/UiCard.vue";
import UiCardTitle from "@/components/ui/UiCardTitle.vue";
import UiBadge from "@/components/ui/UiBadge.vue";
import UiButton from "@/components/ui/UiButton.vue";
import UiField from "@/components/ui/UiField.vue";
import UiLoading from "@/components/ui/UiLoading.vue";
import UiErrorState from "@/components/ui/UiErrorState.vue";
import { getDashboardSummary } from "@/services/dashboard.service";
import { getDeviceConsumption, getGlobalGoal, setGlobalGoal } from "@/services/energy.service";
import { kwh as fmtKwh } from "@/lib/format";
import { getHomeProfile, saveHomeProfile } from "@/lib/homeStore";
import { getTariff, saveTariff, DEFAULT_TARIFF } from "@/lib/tariff";
import { useAuthStore } from "@/stores/auth";
import { useLangStore } from "@/stores/lang";

const qc = useQueryClient();
const { user } = storeToRefs(useAuthStore());
const { t } = useLangStore();

const uid = computed(() => user.value?.id ?? "anon");
const enabled = computed(() => Boolean(user.value));

const { data: summary } = useQuery({
  queryKey: computed(() => ["summary", user.value?.id]),
  queryFn: () => getDashboardSummary(user.value.id),
  enabled,
});

const { data: consumption, isLoading: loadingConsumption, isError: errorConsumption } = useQuery({
  queryKey: computed(() => ["consumption", user.value?.id]),
  queryFn: () => getDeviceConsumption(user.value.id),
  enabled,
});

// Aviso de "Guardado" que se apaga solo a los dos segundos.
function useSavedFlag() {
  const flag = ref(false);
  let timer = null;
  function mark() {
    flag.value = true;
    clearTimeout(timer);
    timer = setTimeout(() => (flag.value = false), 2000);
  }
  return { flag, mark };
}

// ------------------------------------------------------------ perfil del hogar
const profile = ref(getHomeProfile(uid.value));
const { flag: savedProfile, mark: markProfile } = useSavedFlag();

function onSaveProfile() {
  saveHomeProfile(uid.value, profile.value);
  markProfile();
}

const housingTypes = computed(() => [
  ["HOUSE", t("Casa", "House")],
  ["APARTMENT", t("Departamento", "Apartment")],
  ["ROOM", t("Habitación / cuarto", "Room")],
]);

// ------------------------------------------------------------------- metas
const { data: serverGoal, refetch: refetchGoal } = useQuery({
  queryKey: computed(() => ["goals", uid.value]),
  queryFn: () => getGlobalGoal(uid.value),
  enabled,
});

const monthlyGoalKwh = ref(0);

// Sincronizar el ref local cuando llegan datos del servidor
import { watch } from "vue";
watch(serverGoal, (newVal) => {
  if (newVal) {
    monthlyGoalKwh.value = newVal.monthly_goal_kwh ?? 0;
  }
}, { immediate: true });

const { flag: savedGoals, mark: markGoals } = useSavedFlag();

async function onSaveGoals() {
  await setGlobalGoal(uid.value, monthlyGoalKwh.value);
  markGoals();
  refetchGoal();
}

const totalKwh = computed(() => summary.value?.totalKwh ?? 0);
const monthlyPct = computed(() =>
  monthlyGoalKwh.value > 0
    ? Math.min(100, Math.round((totalKwh.value / monthlyGoalKwh.value) * 100))
    : 0
);
const overGoal = computed(() => monthlyGoalKwh.value > 0 && totalKwh.value > monthlyGoalKwh.value);

function deviceGoal(deviceId) {
  return goals.value.perDevice[deviceId] ?? 0;
}
function setDeviceGoal(deviceId, value) {
  goals.value = {
    ...goals.value,
    perDevice: { ...goals.value.perDevice, [deviceId]: Number(value) },
  };
}
function isOver(d) {
  const goal = deviceGoal(d.deviceId);
  return goal > 0 && d.kwh > goal;
}

// ------------------------------------------------------------------- tarifa
const tariff = ref(String(getTariff() ?? DEFAULT_TARIFF));
const { flag: savedTariff, mark: markTariff } = useSavedFlag();

function onSaveTariff() {
  saveTariff(Number(tariff.value));
  markTariff();
  // La tarifa entra en el calculo de todos los costos, asi que hay que
  // recalcular lo que ya estaba en cache; si no, se seguirian viendo los
  // importes de la tarifa anterior.
  ["consumption", "readings", "summary", "comparison"].forEach((key) =>
    qc.invalidateQueries({ queryKey: [key] })
  );
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="font-display text-2xl font-extrabold text-slate-900 dark:text-white">
        {{ t("Mi Organización", "My organization") }}
      </h2>
      <p class="text-sm text-slate-500 dark:text-slate-400">
        {{ t("Perfil de la organización y metas de consumo.", "Organization profile and consumption goals.") }}
      </p>
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <!-- Organization Profile (replacing Home profile) -->
      <UiCard class="lg:col-span-2">
        <div class="flex items-center gap-4">
          <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-900/30">
            <Building class="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 class="font-display text-xl font-bold text-slate-900 dark:text-white">
              Sede Principal
            </h3>
            <p class="font-medium text-blue-600 dark:text-blue-400">Suscripción Activa</p>
          </div>
        </div>
      </UiCard>

      <!-- Metas de consumo -->
      <UiCard>
        <UiCardTitle>
          {{ t("Metas de consumo", "Consumption goals") }}
          <template #action>
            <Target class="h-4 w-4 text-slate-400" />
          </template>
        </UiCardTitle>

        <p class="mb-4 text-sm text-slate-500 dark:text-slate-400">
          {{ t("Establece un límite mensual para recibir alertas si estás por superarlo.", "Set a monthly limit to receive alerts if you are about to exceed it.") }}
        </p>

        <UiField :label="t('Meta global (kWh/mes)', 'Global goal (kWh/month)')">
          <div class="relative flex items-center">
            <input
              v-model.number="monthlyGoalKwh"
              type="number"
              min="0"
              step="1"
              :placeholder="t('Ej: 250', 'e.g. 250')"
              class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pr-12 text-sm outline-none focus:border-blue-500 dark:border-navy-700 dark:bg-navy-950 dark:text-white dark:focus:border-blue-500"
            >
            <span class="absolute right-3 text-sm text-slate-400">kWh</span>
          </div>
        </UiField>

        <div class="mt-6 flex justify-end items-center gap-3">
          <span
            v-if="savedGoals"
            class="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400"
          >
            <Check class="h-4 w-4" /> {{ t("Guardado", "Saved") }}
          </span>
          <UiButton @click="onSaveGoals">
            {{ t("Guardar meta", "Save goal") }}
          </UiButton>
        </div>
      </UiCard>
    <!-- Tarifa energetica -->
    <UiCard>
      <UiCardTitle>
        {{ t("Tarifa energética", "Energy tariff") }}
        <template #action>
          <Coins class="h-4 w-4 text-slate-400" />
        </template>
      </UiCardTitle>

      <p class="mb-3 text-xs text-slate-400">
        {{
          t(
            "Precio por kWh que usa el cálculo de costos de tu hogar.",
            `Price per kWh used to estimate your home's costs.`
          )
        }}
      </p>

      <form
        class="flex flex-col gap-3 sm:flex-row sm:items-end"
        @submit.prevent="onSaveTariff"
      >
        <div class="sm:max-w-xs sm:flex-1">
          <UiField :label="t('Precio por kWh (S/)', 'Price per kWh (S/)')">
            <input
              v-model="tariff"
              type="number"
              min="0"
              step="0.01"
              :placeholder="String(DEFAULT_TARIFF)"
              class="input-field"
            >
          </UiField>
        </div>
        <div class="flex items-center gap-3">
          <UiButton type="submit">
            <Save class="h-4 w-4" /> {{ t("Guardar tarifa", "Save tariff") }}
          </UiButton>
          <span
            v-if="savedTariff"
            class="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400"
          >
            <Check class="h-4 w-4" /> {{ t("Guardado", "Saved") }}
          </span>
        </div>
      </form>
    </UiCard>
    </div>
  </div>
</template>
