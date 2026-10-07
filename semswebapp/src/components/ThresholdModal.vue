<script setup>
import { ref } from "vue";
import { LoaderCircle } from "lucide-vue-next";
import UiModal from "./ui/UiModal.vue";
import UiField from "./ui/UiField.vue";
import UiButton from "./ui/UiButton.vue";
import { useLangStore } from "@/stores/lang";

// Alta de umbral de consumo para un dispositivo.
const props = defineProps({
  userId: { type: String, required: true },
  devices: { type: Array, required: true }, // [{ id, name }]
  loading: { type: Boolean, default: false },
});

const emit = defineEmits(["close", "create"]);

const { t } = useLangStore();

const deviceId = ref(props.devices[0]?.id ?? "");
const thresholdName = ref("");
const thresholdValue = ref("");

function onSubmit() {
  emit("create", {
    userId: props.userId,
    deviceId: deviceId.value,
    thresholdName: thresholdName.value,
    thresholdValue: Number(thresholdValue.value),
  });
}
</script>

<template>
  <UiModal
    :title="t('Nuevo umbral', 'New threshold')"
    @close="$emit('close')"
  >
    <form
      class="space-y-4"
      @submit.prevent="onSubmit"
    >
      <UiField :label="t('Nombre del umbral', 'Threshold name')">
        <input
          v-model="thresholdName"
          required
          :placeholder="t('Ej: Consumo alto aire', 'e.g. High AC usage')"
          class="input-field"
        >
      </UiField>

      <UiField :label="t('Dispositivo', 'Device')">
        <select
          v-model="deviceId"
          required
          class="input-field"
        >
          <option
            v-if="devices.length === 0"
            value=""
          >
            {{ t("Sin dispositivos", "No devices") }}
          </option>
          <option
            v-for="d in devices"
            :key="d.id"
            :value="d.id"
          >
            {{ d.name }}
          </option>
        </select>
      </UiField>

      <UiField :label="t('Límite (kWh/día)', 'Limit (kWh/day)')">
        <input
          v-model="thresholdValue"
          required
          type="number"
          min="0"
          step="0.1"
          placeholder="8"
          class="input-field"
        >
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
          :disabled="loading || !deviceId"
        >
          <LoaderCircle
            v-if="loading"
            class="h-4 w-4 animate-spin"
          />
          {{ t("Guardar", "Save") }}
        </UiButton>
      </div>
    </form>
  </UiModal>
</template>
