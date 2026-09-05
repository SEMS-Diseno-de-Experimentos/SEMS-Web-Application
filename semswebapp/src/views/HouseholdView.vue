<script setup>
import { ref, computed } from "vue";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { storeToRefs } from "pinia";
import { Home, Target, Save, Check, Coins } from "lucide-vue-next";
import UiCard from "@/components/ui/UiCard.vue";
import UiCardTitle from "@/components/ui/UiCardTitle.vue";
import UiBadge from "@/components/ui/UiBadge.vue";
import UiButton from "@/components/ui/UiButton.vue";
import UiField from "@/components/ui/UiField.vue";
import UiLoading from "@/components/ui/UiLoading.vue";
import UiErrorState from "@/components/ui/UiErrorState.vue";
import { getDashboardSummary } from "@/services/dashboard.service";
import { getDeviceConsumption } from "@/services/energy.service";
import { kwh as fmtKwh } from "@/lib/format";
import { getHomeProfile, saveHomeProfile, getGoals, saveGoals } from "@/lib/homeStore";
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
const goals = ref(getGoals(uid.value));
const { flag: savedGoals, mark: markGoals } = useSavedFlag();

function onSaveGoals() {
  saveGoals(uid.value, goals.value);
  markGoals();
}

const totalKwh = computed(() => summary.value?.totalKwh ?? 0);
const monthlyPct = computed(() =>
  goals.value.monthlyKwh > 0
    ? Math.min(100, Math.round((totalKwh.value / goals.value.monthlyKwh) * 100))
    : 0
);
const overGoal = computed(() => goals.value.monthlyKwh > 0 && totalKwh.value > goals.value.monthlyKwh);

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
        {{ t("Mi hogar", "My home") }}
      </h2>
      <p class="text-sm text-slate-500 dark:text-slate-400">
        {{ t("Perfil del hogar y metas de consumo.", "Home profile and consumption goals.") }}
      </p>
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <!-- Perfil del hogar -->
      <UiCard>
        <UiCardTitle>
          {{ t("Perfil del hogar", "Home profile") }}
          <template #action>
            <Home class="h-4 w-4 text-slate-400" />
          </template>
        </UiCardTitle>

        <form
          class="space-y-4"
          @submit.prevent="onSaveProfile"
        >
          <UiField :label="t('Tipo de vivienda', 'Housing type')">
            <select
              v-model="profile.housingType"
              class="input-field"
            >
              <option
                v-for="[val, label] in housingTypes"
                :key="val"
                :value="val"
              >
                {{ label }}
              </option>
            </select>
          </UiField>

          <UiField :label="t('Número de ambientes', 'Number of rooms')">
            <input
              v-model.number="profile.rooms"
              type="number"
              min="1"
              max="30"
              class="input-field"
            >
          </UiField>

          <UiField :label="t('Ubicación referencial', 'Reference location')">
            <input
              v-model="profile.location"
              :placeholder="t('Ej: Miraflores, Lima', 'e.g. Miraflores, Lima')"
              class="input-field"
            >
          </UiField>

          <div class="flex items-center gap-3">
            <UiButton type="submit">
              <Save class="h-4 w-4" /> {{ t("Guardar perfil", "Save profile") }}
            </UiButton>
            <span
              v-if="savedProfile"
              class="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400"
            >
              <Check class="h-4 w-4" /> {{ t("Guardado", "Saved") }}
            </span>
          </div>
        </form>
      </UiCard>

      <!-- Metas de consumo -->
      <UiCard>
        <UiCardTitle>
          {{ t("Metas de consumo", "Consumption goals") }}
          <template #action>
            <Target class="h-4 w-4 text-slate-400" />
          </template>
        </UiCardTitle>

        <UiField :label="t('Meta mensual (kWh)', 'Monthly goal (kWh)')">
          <input
            v-model.number="goals.monthlyKwh"
            type="number"
            min="0"
            step="1"
            :placeholder="t('Ej: 250', 'e.g. 250')"
            class="input-field"
          >
        </UiField>

        <div
          v-if="goals.monthlyKwh > 0"
          class="mt-3"
        >
          <div class="mb-1 flex items-center justify-between gap-2 text-sm">
            <span class="text-slate-500 dark:text-slate-400">
              {{ fmtKwh(totalKwh) }} / {{ fmtKwh(goals.monthlyKwh) }}
            </span>
            <UiBadge :color="overGoal ? 'rose' : 'green'">
              {{ overGoal ? t("Superada", "Exceeded") : `${monthlyPct}%` }}
            </UiBadge>
          </div>
          <div class="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-navy-800">
            <div
              :class="['h-full rounded-full', overGoal ? 'bg-rose-500' : 'bg-blue-600']"
              :style="{ width: `${monthlyPct}%` }"
            />
          </div>
        </div>

        <!-- Metas por dispositivo -->
        <div class="mt-5">
          <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            {{ t("Por dispositivo", "By device") }}
          </p>
          <UiLoading v-if="loadingConsumption" />
          <UiErrorState v-else-if="errorConsumption || !consumption" />
          <p
            v-else-if="consumption.length === 0"
            class="py-3 text-center text-xs text-slate-400"
          >
            {{ t("Sin dispositivos con consumo.", "No devices with usage yet.") }}
          </p>
          <ul
            v-else
            class="space-y-2.5"
          >
            <li
              v-for="d in consumption"
              :key="d.deviceId"
              class="flex items-center gap-3"
            >
              <span class="min-w-0 flex-1 truncate text-sm text-slate-700 dark:text-slate-200">
                {{ d.deviceName }}
                <span class="ml-1 text-xs text-slate-400">({{ fmtKwh(d.kwh) }})</span>
              </span>
              <input
                :value="deviceGoal(d.deviceId) || ''"
                type="number"
                min="0"
                step="0.1"
                placeholder="kWh"
                class="w-24 shrink-0 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-blue-500 dark:border-navy-700 dark:bg-navy-950 dark:text-white"
                @input="setDeviceGoal(d.deviceId, $event.target.value)"
              >
              <UiBadge
                v-if="isOver(d)"
                color="rose"
              >
                !
              </UiBadge>
            </li>
          </ul>
        </div>

        <div class="mt-5 flex items-center gap-3">
          <UiButton @click="onSaveGoals">
            <Save class="h-4 w-4" /> {{ t("Guardar metas", "Save goals") }}
          </UiButton>
          <span
            v-if="savedGoals"
            class="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400"
          >
            <Check class="h-4 w-4" /> {{ t("Guardado", "Saved") }}
          </span>
        </div>
      </UiCard>
    </div>

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
</template>
