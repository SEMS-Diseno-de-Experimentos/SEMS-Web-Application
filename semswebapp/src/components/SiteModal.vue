<script setup>
import { ref } from "vue";
import { LoaderCircle } from "lucide-vue-next";
import UiModal from "./ui/UiModal.vue";
import UiField from "./ui/UiField.vue";
import UiButton from "./ui/UiButton.vue";
import UiToggle from "./ui/UiToggle.vue";
import { useLangStore } from "@/stores/lang";

// Alta y edicion de un local. El codigo del local solo se pide al crearlo:
// identifica la sede y el backend no deja cambiarlo despues.
const props = defineProps({
  site: { type: Object, default: null },
  loading: { type: Boolean, default: false },
});

const emit = defineEmits(["close", "save"]);

const { t } = useLangStore();
const editing = Boolean(props.site);

const form = ref({
  siteCode: props.site?.siteCode ?? "",
  name: props.site?.name ?? "",
  address: props.site?.address ?? "",
  district: props.site?.district ?? "",
  floorAreaM2: props.site?.floorAreaM2 ?? "",
  contractedPowerKw: props.site?.contractedPowerKw ?? "",
  tariffCategory: props.site?.tariffCategory ?? "BT5B",
  excludesSundaysFromPeak: props.site?.excludesSundaysFromPeak ?? false,
});

// Las cinco categorias del pliego de OSINERGMIN. Las de media tension cobran
// por potencia, y eso cambia como se calcula la factura; se avisa en la ayuda.
const TARIFFS = [
  ["BT5B", t("BT5B — baja tensión, sin cargo por potencia", "BT5B — low voltage, no demand charge")],
  ["BT3", t("BT3 — baja tensión con cargo por potencia", "BT3 — low voltage with demand charge")],
  ["BT4", t("BT4 — baja tensión con cargo por potencia", "BT4 — low voltage with demand charge")],
  ["MT2", t("MT2 — media tensión con cargo por potencia", "MT2 — medium voltage with demand charge")],
  ["MT3", t("MT3 — media tensión con cargo por potencia", "MT3 — medium voltage with demand charge")],
];

function onSubmit() {
  emit("save", { ...form.value });
}
</script>

<template>
  <UiModal
    :title="editing ? t('Editar local', 'Edit site') : t('Nuevo local', 'New site')"
    max-width="max-w-lg"
    @close="$emit('close')"
  >
    <form
      class="space-y-4"
      @submit.prevent="onSubmit"
    >
      <div class="grid gap-4 sm:grid-cols-2">
        <UiField
          v-if="!editing"
          :label="t('Código del local', 'Site code')"
        >
          <input
            v-model="form.siteCode"
            required
            :placeholder="t('Ej: LIM-001', 'e.g. LIM-001')"
            class="input-field"
          >
        </UiField>

        <UiField :label="t('Nombre', 'Name')">
          <input
            v-model="form.name"
            required
            :placeholder="t('Ej: Miraflores', 'e.g. Miraflores')"
            class="input-field"
          >
        </UiField>

        <UiField :label="t('Dirección', 'Address')">
          <input
            v-model="form.address"
            :placeholder="t('Ej: Av. Larco 345', 'e.g. 345 Larco Ave')"
            class="input-field"
          >
        </UiField>

        <UiField :label="t('Distrito', 'District')">
          <input
            v-model="form.district"
            :placeholder="t('Ej: Miraflores', 'e.g. Miraflores')"
            class="input-field"
          >
        </UiField>

        <UiField :label="t('Área (m²)', 'Floor area (m²)')">
          <input
            v-model="form.floorAreaM2"
            type="number"
            min="0"
            step="1"
            :placeholder="t('Ej: 620', 'e.g. 620')"
            class="input-field"
          >
        </UiField>

        <UiField :label="t('Potencia contratada (kW)', 'Contracted power (kW)')">
          <input
            v-model="form.contractedPowerKw"
            type="number"
            min="0"
            step="0.1"
            required
            :placeholder="t('Ej: 95', 'e.g. 95')"
            class="input-field"
          >
        </UiField>
      </div>

      <UiField :label="t('Categoría tarifaria', 'Tariff category')">
        <select
          v-model="form.tariffCategory"
          required
          class="input-field"
        >
          <option
            v-for="[value, label] in TARIFFS"
            :key="value"
            :value="value"
          >
            {{ label }}
          </option>
        </select>
      </UiField>

      <div class="rounded-lg bg-slate-50 p-3 dark:bg-navy-800/60">
        <UiToggle v-model="form.excludesSundaysFromPeak">
          {{ t("Los domingos no cuentan como hora punta", "Sundays are not peak hours") }}
        </UiToggle>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {{ t(
            "Actívalo solo si tu distribuidora te concedió esa exclusión. Por defecto la hora punta es de 18:00 a 23:00 todos los días.",
            "Turn this on only if your utility granted that exclusion. By default peak hours run 18:00–23:00 every day."
          ) }}
        </p>
      </div>

      <div class="flex justify-end gap-2 pt-2">
        <UiButton
          variant="outline"
          type="button"
          @click="$emit('close')"
        >
          {{ t("Cancelar", "Cancel") }}
        </UiButton>
        <UiButton
          type="submit"
          :disabled="loading"
        >
          <LoaderCircle
            v-if="loading"
            class="h-4 w-4 animate-spin"
          />
          {{ editing ? t("Guardar", "Save") : t("Crear local", "Create site") }}
        </UiButton>
      </div>
    </form>
  </UiModal>
</template>
