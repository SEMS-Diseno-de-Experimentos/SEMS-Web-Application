<script setup>
import { ref, watch } from "vue";
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
  // El backend exige el local al registrar: el medidor, el contrato y la
  // factura son del local, no de quien da de alta el equipo. La zona es
  // opcional, porque al abrir un local puede que aun no esten definidas.
  sites: { type: Array, default: () => [] },
  zones: { type: Array, default: () => [] },
});

const emit = defineEmits(["close", "submit", "site-change"]);

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
  siteId: props.device?.siteId ?? props.sites[0]?.siteId ?? "",
  zoneId: props.device?.zoneId ?? "",
});

// Al cambiar de local hay que recargar sus zonas y olvidar la elegida, que
// pertenecia al local anterior. La primera ejecucion no borra nada: al editar
// un dispositivo su zona ya viene puesta y perderla seria un cambio silencioso.
watch(() => form.value.siteId, (siteId, anterior) => {
  if (anterior !== undefined) form.value.zoneId = "";
  emit("site-change", siteId);
}, { immediate: true });
const location = ref(initExtras.location);
const profileId = ref(initExtras.profileId);

function onSubmit() {
  emit("submit", {
    // zoneId vacio tiene que viajar como nulo: el backend acepta que falte,
    // pero no una cadena vacia donde espera un identificador.
    payload: {
      ...form.value,
      zoneId: form.value.zoneId || null,
      ...(props.device ? {} : { userId: props.userId }),
    },
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
        <UiField :label="t('Local', 'Site')">
          <select
            v-model="form.siteId"
            required
            class="input-field"
          >
            <option
              v-if="sites.length === 0"
              value=""
            >
              {{ t("Sin locales", "No sites") }}
            </option>
            <option
              v-for="s in sites"
              :key="s.siteId"
              :value="s.siteId"
            >
              {{ s.name }}
            </option>
          </select>
        </UiField>

        <UiField :label="t('Zona (opcional)', 'Zone (optional)')">
          <select
            v-model="form.zoneId"
            class="input-field"
            :disabled="zones.length === 0"
          >
            <option value="">
              {{ zones.length === 0 ? t("Sin zonas", "No zones") : t("Sin asignar", "Unassigned") }}
            </option>
            <option
              v-for="z in zones"
              :key="z.zoneId"
              :value="z.zoneId"
            >
              {{ z.name }}
            </option>
          </select>
        </UiField>
      </div>

      <p
        v-if="sites.length === 0"
        class="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300"
      >
        {{ t(
          "Necesitas al menos un local antes de registrar dispositivos: el consumo y la factura se atribuyen al local. Regístralo en Mis locales.",
          "You need at least one site before registering devices: usage and billing belong to the site. Register one under My sites."
        ) }}
      </p>

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
