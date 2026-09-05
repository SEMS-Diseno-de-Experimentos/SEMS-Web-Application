<script setup>
import { ref, computed } from "vue";
import { Cpu, Wifi, Bluetooth, Trash2, Pencil, LoaderCircle } from "lucide-vue-next";
import UiCard from "./ui/UiCard.vue";
import UiBadge from "./ui/UiBadge.vue";
import UiButton from "./ui/UiButton.vue";
import { getDeviceExtras, profileById } from "@/lib/deviceExtras";
import { useLangStore } from "@/stores/lang";

const props = defineProps({
  device: { type: Object, required: true },
  deleting: { type: Boolean, default: false },
});

defineEmits(["edit", "delete"]);

const { t } = useLangStore();

const STATUS_COLOR = { ACTIVE: "green", INACTIVE: "slate", MAINTENANCE: "amber" };

const statusLabel = computed(() => ({
  ACTIVE: t("Activo", "Active"),
  INACTIVE: t("Inactivo", "Inactive"),
  MAINTENANCE: t("Mantenimiento", "Maintenance"),
}));

const confirming = ref(false);

const extras = computed(() => getDeviceExtras(props.device.deviceId));
const profile = computed(() => profileById(extras.value.profileId));
</script>

<template>
  <UiCard>
    <div class="flex items-start justify-between">
      <span
        class="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300"
      >
        <Cpu class="h-5 w-5" />
      </span>
      <div class="flex items-center gap-2">
        <UiBadge :color="STATUS_COLOR[device.status] ?? 'slate'">
          {{ statusLabel[device.status] ?? statusLabel.INACTIVE }}
        </UiBadge>
        <button
          type="button"
          :title="t('Editar dispositivo', 'Edit device')"
          class="text-slate-300 transition-colors hover:text-blue-500 dark:text-navy-700 dark:hover:text-blue-400"
          @click="$emit('edit')"
        >
          <Pencil class="h-4 w-4" />
        </button>
        <button
          type="button"
          :disabled="deleting"
          :title="t('Eliminar dispositivo', 'Delete device')"
          class="text-slate-300 transition-colors hover:text-rose-500 disabled:opacity-50 dark:text-navy-700 dark:hover:text-rose-400"
          @click="confirming = true"
        >
          <LoaderCircle
            v-if="deleting"
            class="h-4 w-4 animate-spin"
          />
          <Trash2
            v-else
            class="h-4 w-4"
          />
        </button>
      </div>
    </div>

    <h3 class="mt-4 font-semibold text-slate-900 dark:text-white">
      {{ device.deviceName }}
    </h3>
    <p class="text-xs text-slate-400">
      {{ device.deviceType }}
    </p>

    <div class="mt-4 space-y-2 border-t border-slate-100 pt-3 text-sm dark:border-navy-800">
      <div class="flex items-center justify-between gap-2">
        <span class="text-slate-500 dark:text-slate-400">{{ t("Marca / Modelo", "Brand / Model") }}</span>
        <span class="truncate font-medium text-slate-900 dark:text-white">
          {{ device.brand }} {{ device.model }}
        </span>
      </div>
      <div class="flex items-center justify-between gap-2">
        <span class="text-slate-500 dark:text-slate-400">{{ t("Conexión", "Connection") }}</span>
        <span class="inline-flex items-center gap-1 truncate font-medium text-slate-900 dark:text-white">
          <Bluetooth
            v-if="device.connectionProtocol === 'BLUETOOTH'"
            class="h-3.5 w-3.5"
          />
          <Wifi
            v-else
            class="h-3.5 w-3.5"
          />
          {{ device.connectionProtocol }}
        </span>
      </div>
      <div class="flex items-center justify-between gap-2">
        <span class="text-slate-500 dark:text-slate-400">{{ t("Código", "Code") }}</span>
        <span class="truncate font-medium text-slate-900 dark:text-white">
          {{ device.externalDeviceCode }}
        </span>
      </div>
      <div
        v-if="extras.location"
        class="flex items-center justify-between gap-2"
      >
        <span class="text-slate-500 dark:text-slate-400">{{ t("Ubicación", "Location") }}</span>
        <span class="truncate font-medium text-slate-900 dark:text-white">{{ extras.location }}</span>
      </div>
      <div
        v-if="profile.watts > 0"
        class="flex items-center justify-between gap-2"
      >
        <span class="text-slate-500 dark:text-slate-400">{{ t("Perfil / potencia", "Profile / power") }}</span>
        <span class="truncate font-medium text-slate-900 dark:text-white">
          {{ profile.name }} · {{ profile.watts }} W
        </span>
      </div>
    </div>

    <!-- Confirmacion en la propia tarjeta: borrar un dispositivo no se deshace -->
    <div
      v-if="confirming"
      class="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm dark:border-rose-500/30 dark:bg-rose-500/10"
    >
      <p class="text-rose-700 dark:text-rose-300">
        {{ t("¿Eliminar", "Delete") }} <strong>{{ device.deviceName }}</strong>?
        {{ t("Esta acción no se puede deshacer.", "This action cannot be undone.") }}
      </p>
      <div class="mt-2 flex justify-end gap-2">
        <UiButton
          variant="outline"
          class="!py-1.5 !text-xs"
          @click="confirming = false"
        >
          {{ t("Cancelar", "Cancel") }}
        </UiButton>
        <UiButton
          class="!bg-rose-600 !py-1.5 !text-xs hover:!bg-rose-700"
          @click="confirming = false; $emit('delete')"
        >
          {{ t("Eliminar", "Delete") }}
        </UiButton>
      </div>
    </div>
  </UiCard>
</template>
