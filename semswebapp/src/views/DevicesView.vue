<script setup>
import { ref, computed } from "vue";
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import { storeToRefs } from "pinia";
import { Plus } from "lucide-vue-next";
import UiCard from "@/components/ui/UiCard.vue";
import UiButton from "@/components/ui/UiButton.vue";
import UiLoading from "@/components/ui/UiLoading.vue";
import UiErrorState from "@/components/ui/UiErrorState.vue";
import DeviceCard from "@/components/DeviceCard.vue";
import DeviceModal from "@/components/DeviceModal.vue";
import { listDevices, createDevice, updateDevice, deleteDevice, updateDeviceStatus } from "@/services/devices.service";
import { saveDeviceExtras } from "@/lib/deviceExtras";
import { useAuthStore } from "@/stores/auth";
import { useLangStore } from "@/stores/lang";

const qc = useQueryClient();
const { user } = storeToRefs(useAuthStore());
const { t } = useLangStore();

const addOpen = ref(false);
const editing = ref(null);

const { data: devices, isLoading, isError } = useQuery({
  queryKey: computed(() => ["devices", user.value?.id]),
  queryFn: () => listDevices(user.value?.id),
});

const create = useMutation({
  mutationFn: async ({ payload, extras }) => {
    const device = await createDevice(payload);
    // Los extras se guardan con el id que devuelve el backend, no antes.
    saveDeviceExtras(device.deviceId, extras);
    return device;
  },
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ["devices"] });
    addOpen.value = false;
  },
});

const update = useMutation({
  mutationFn: async ({ id, payload, extras, originalStatus }) => {
    saveDeviceExtras(id, extras);
    const updated = await updateDevice(id, payload);
    if (payload.status !== originalStatus) {
      await updateDeviceStatus(id, payload.status);
      updated.status = payload.status;
    }
    return updated;
  },
  onSuccess: () => {
    // Cambiar el nombre de un dispositivo se ve en media aplicacion: consumo,
    // ranking, alertas y umbrales lo muestran. Se invalidan todas.
    ["devices", "consumption", "summary", "rankings", "alerts", "thresholds"].forEach((key) =>
      qc.invalidateQueries({ queryKey: [key] })
    );
    editing.value = null;
  },
});

const remove = useMutation({
  mutationFn: deleteDevice,
  onSuccess: (_data, deletedId) => {
    // Se quita de la lista en el acto en vez de recargar: la respuesta ya
    // confirmo el borrado y esperar otra vuelta se nota.
    qc.setQueriesData({ queryKey: ["devices"] }, (old) =>
      old ? old.filter((d) => d.deviceId !== deletedId) : old
    );
    qc.invalidateQueries({ queryKey: ["summary"] });
  },
});

const changeStatus = useMutation({
  mutationFn: async ({ id, status }) => {
    return await updateDeviceStatus(id, status);
  },
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ["devices"] });
  },
});

const count = computed(() => devices.value?.length ?? 0);

const modalOpen = computed(() => addOpen.value || Boolean(editing.value));
const saving = computed(() => create.isPending.value || update.isPending.value);

function closeModal() {
  addOpen.value = false;
  editing.value = null;
}

function onSubmit({ payload, extras }) {
  if (editing.value) {
    update.mutate({ id: editing.value.deviceId, payload, extras, originalStatus: editing.value.status });
  } else {
    create.mutate({ payload, extras });
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between gap-4">
      <div>
        <h2 class="font-display text-2xl font-extrabold text-slate-900 dark:text-white">
          {{ t("Dispositivos", "Devices") }}
        </h2>
        <p class="text-sm text-slate-500 dark:text-slate-400">
          {{ t("Gestiona los equipos vinculados a tu medidor.", "Manage the devices linked to your meter.") }}
        </p>
      </div>
      <UiButton
        @click="addOpen = true"
      >
        <Plus class="h-4 w-4" /> {{ t("Agregar", "Add") }}
      </UiButton>
    </div>



    <UiLoading v-if="isLoading" />
    <UiErrorState v-else-if="isError" />
    <UiCard
      v-else-if="!devices || devices.length === 0"
      class="text-center text-sm text-slate-400"
    >
      {{
        t(
          'Aún no tienes dispositivos registrados. Agrega el primero con el botón "Agregar".',
          'You have no devices yet. Add your first one with the "Add" button.'
        )
      }}
    </UiCard>
    <div
      v-else
      class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <DeviceCard
        v-for="d in devices"
        :key="d.deviceId"
        :device="d"
        :deleting="remove.isPending.value && remove.variables.value === d.deviceId"
        @edit="editing = d"
        @delete="remove.mutate(d.deviceId)"
        @status-change="changeStatus.mutate({ id: d.deviceId, status: $event })"
      />
    </div>

    <DeviceModal
      v-if="modalOpen"
      :key="editing?.deviceId ?? 'new'"
      :user-id="user?.id ?? ''"
      :device="editing"
      :loading="saving"
      @close="closeModal"
      @submit="onSubmit"
    />
  </div>
</template>
