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
const PROTOCOLS = ["WIFI", "BLUETOOTH"];

const isEdit = Boolean(props.device);
// La ubicacion y el perfil de consumo no los guarda el backend: viven en el
// navegador, asi que se leen aparte del resto del dispositivo.
const initExtras = props.device
  ? getDeviceExtras(props.device.deviceId)
  : { location: "", profileId: "none" };

const form = ref({
  deviceName: props.device?.deviceName ?? "",
  deviceType: props.device?.deviceType ?? "meter",
  brand: props.device?.brand ?? "",
  model: props.device?.model ?? "",
  connectionProtocol: props.device?.connectionProtocol ?? "WIFI",
  externalDeviceCode: props.device?.externalDeviceCode ?? "",
});
const location = ref(initExtras.location);
const profileId = ref(initExtras.profileId);

function onSubmit() {
  emit("submit", {
    payload: props.device ? { ...form.value } : { ...form.value, userId: props.userId },
    extras: { location: location.value, profileId: profileId.value },
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

      <UiField :label="t('Ubicación', 'Location')">
        <input
          v-model="location"
          :placeholder="t('Ej: Cocina, 1er piso', 'e.g. Kitchen, 1st floor')"
          class="input-field"
        >
      </UiField>

      <UiField :label="t('Perfil de consumo (potencia nominal)', 'Consumption profile (nominal power)')">
        <select
          v-model="profileId"
          class="input-field"
        >
          <option
            v-for="p in CONSUMPTION_PROFILES"
            :key="p.id"
            :value="p.id"
          >
            {{ profileLabel(p) }}
          </option>
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
