<script setup>
import { computed, ref } from "vue";
import { Target, Save, Check } from "lucide-vue-next";
import UiCard from "@/components/ui/UiCard.vue";
import UiCardTitle from "@/components/ui/UiCardTitle.vue";
import UiButton from "@/components/ui/UiButton.vue";
import UiField from "@/components/ui/UiField.vue";
import UiEmptyState from "@/components/ui/UiEmptyState.vue";
import { getGoals, saveGoals } from "@/lib/goalsStore";
import { useLangStore } from "@/stores/lang";
import { kwh as fmtKwh } from "@/lib/format";

/**
 * Metas de consumo: una mensual y una por equipo.
 *
 * Vive junto al monitoreo porque es ahi donde se comparan con lo medido. Antes
 * estaba en una pantalla de "perfil del establecimiento" cuyos otros campos
 * duplicaban datos del backend.
 */
const props = defineProps({
  userId: { type: String, required: true },
  consumption: { type: Array, default: () => [] },
});

const { t } = useLangStore();

const goals = ref(getGoals(props.userId));
const guardado = ref(false);
let timer = null;

function onSave() {
  saveGoals(props.userId, goals.value);
  guardado.value = true;
  clearTimeout(timer);
  timer = setTimeout(() => (guardado.value = false), 2000);
}

const equipos = computed(() => props.consumption ?? []);
</script>

<template>
  <UiCard>
    <UiCardTitle>
      {{ t("Metas de consumo", "Usage goals") }}
      <template #action>
        <Target class="h-4 w-4 text-slate-300 dark:text-navy-700" />
      </template>
    </UiCardTitle>

    <form
      class="space-y-4"
      @submit.prevent="onSave"
    >
      <UiField :label="t('Meta mensual (kWh)', 'Monthly goal (kWh)')">
        <input
          v-model.number="goals.monthlyKwh"
          type="number"
          min="0"
          class="input-field"
        >
      </UiField>

      <div>
        <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          {{ t("Por dispositivo", "Per device") }}
        </p>
        <UiEmptyState
          v-if="equipos.length === 0"
          :message="t('Sin equipos con consumo medido.', 'No equipment with measured usage.')"
          :hint="t(
            'Las metas por equipo aparecen cuando hay consumo que comparar.',
            'Per-device goals show up once there is usage to compare against.',
          )"
        />
        <ul
          v-else
          class="space-y-2"
        >
          <li
            v-for="d in equipos"
            :key="d.deviceId"
            class="flex items-center justify-between gap-3"
          >
            <span class="min-w-0 flex-1 truncate text-sm text-slate-700 dark:text-slate-200">
              {{ d.deviceName }}
              <span class="text-xs text-slate-400">{{ fmtKwh(d.kwh) }}</span>
            </span>
            <input
              v-model.number="goals.perDevice[d.deviceId]"
              type="number"
              min="0"
              class="input-field w-28"
              :placeholder="t('kWh', 'kWh')"
            >
          </li>
        </ul>
      </div>

      <div class="flex items-center gap-3">
        <UiButton type="submit">
          <Save class="h-4 w-4" /> {{ t("Guardar metas", "Save goals") }}
        </UiButton>
        <span
          v-if="guardado"
          class="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400"
        >
          <Check class="h-4 w-4" /> {{ t("Guardado", "Saved") }}
        </span>
      </div>
      <p class="text-xs text-slate-400">
        {{ t(
          "Las metas se guardan en este navegador.",
          "Goals are stored in this browser.",
        ) }}
      </p>
    </form>
  </UiCard>
</template>
