<script setup>
import { ref } from "vue";
import { LoaderCircle } from "lucide-vue-next";
import UiModal from "./ui/UiModal.vue";
import UiField from "./ui/UiField.vue";
import UiButton from "./ui/UiButton.vue";
import { CONSUMPTION_PROFILES, getDeviceExtras } from "@/lib/deviceExtras";
import { useLangStore } from "@/stores/lang";

// Alta y edicion de dispositivo. Es el mismo formulario: si llega `device`
// edita, si no crea.
const props = defineProps({
  userId: { type: String, required: true },
  device: { type: Object, default: null },
  loading: { type: Boolean, default: false },
});

const emit = defineEmits(["close", "submit"]);

const { t } = useLangStore();

const DEVICE_TYPES = [
  "meter", "AIR_CONDITIONER", "REFRIGERATOR", "WATER_HEATER", "TV",
  "WASHING_MACHINE", "MICROWAVE", "THERMOSTAT", "SENSOR", "smart_plug", "Mobile",
];
const PROTOCOLS = ["WIFI", "BLUETOOTH", "ZIGBEE", "MATTER"];

const isEdit = Boolean(props.device);

const form = ref({
  deviceName: props.device?.deviceName ?? "",
  deviceType: props.device?.deviceType ?? "meter",
  brand: props.device?.brand ?? "",
  model: props.device?.model ?? "",
  connectionProtocol: props.device?.connectionProtocol ?? "WIFI",
  externalDeviceCode: props.device?.externalDeviceCode ?? "",
  status: props.device?.status ?? "ACTIVE",
});

function onSubmit() {
  emit("submit", {
    payload: props.device ? { ...form.value } : { ...form.value, userId: props.userId },
    extras: { location: "", profileId: "none" },
  });
}

function profileLabel(p) {
  return p.watts > 0 ? `${p.name} (${p.watts} W)` : p.name;
}
</script>

<template>
  <UiModal
    :title="isEdit ? t('Editar dispositivo', 'Edit device') : t('Agregar dispositivo', 'Add device')"
    @close="$emit('close')"
  >
    <form
      class="space-y-4"
      @submit.prevent="onSubmit"
    >
      <UiField :label="t('Nombre del dispositivo', 'Device name')">
        <input
          v-model="form.deviceName"
          required
          :placeholder="t('Ej: Medidor cocina', 'e.g. Kitchen meter')"
          class="input-field"
        >
      </UiField>

      <div class="grid grid-cols-2 gap-3">
        <UiField :label="t('Tipo', 'Type')">
          <select
            v-model="form.deviceType"
            class="input-field"
          >
            <option
              v-for="opt in DEVICE_TYPES"
              :key="opt"
              :value="opt"
            >
              {{ opt }}
            </option>
          </select>
        </UiField>
        <UiField :label="t('Conexión', 'Connection')">
          <select
            v-model="form.connectionProtocol"
            class="input-field"
          >
            <option
              v-for="p in PROTOCOLS"
              :key="p"
              :value="p"
            >
              {{ p }}
            </option>
          </select>
        </UiField>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <UiField :label="t('Marca', 'Brand')">
          <input
            v-model="form.brand"
            required
            placeholder="Ej: Itron"
            class="input-field"
          >
        </UiField>
        <UiField :label="t('Modelo', 'Model')">
          <input
            v-model="form.model"
            required
            placeholder="Ej: EM100"
            class="input-field"
          >
        </UiField>
      </div>

      <UiField :label="t('Código externo', 'External code')">
        <input
          v-model="form.externalDeviceCode"
          required
          placeholder="Ej: MED-001"
          class="input-field"
        >
      </UiField>

      <UiField :label="t('Estado', 'Status')">
        <select
          v-model="form.status"
          class="input-field"
        >
          <option value="ACTIVE">{{ t("Activo", "Active") }}</option>
          <option value="INACTIVE">{{ t("Inactivo", "Inactive") }}</option>
          <option value="MAINTENANCE">{{ t("En mantenimiento", "Maintenance") }}</option>
        </select>
      </UiField>



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
          {{ isEdit ? t("Guardar cambios", "Save changes") : t("Guardar", "Save") }}
        </UiButton>
      </div>
    </form>
  </UiModal>
</template>
