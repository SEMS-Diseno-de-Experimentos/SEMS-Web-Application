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
import { listDevices, createDevice, updateDevice, deleteDevice } from "@/services/devices.service";
import { saveDeviceExtras } from "@/lib/deviceExtras";
import { useAuthStore } from "@/stores/auth";
import { useLangStore } from "@/stores/lang";
import { usePlanTier } from "@/composables/usePlan";
import { DEVICE_LIMIT, TIER_LABEL } from "@/lib/plan";

const qc = useQueryClient();
const { user } = storeToRefs(useAuthStore());
const { t } = useLangStore();
const tier = usePlanTier();

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
  mutationFn: async ({ id, payload, extras }) => {
    saveDeviceExtras(id, extras);
    return updateDevice(id, payload);
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
  },
});

const limit = computed(() => DEVICE_LIMIT[tier.value]);
const count = computed(() => devices.value?.length ?? 0);
const atLimit = computed(() => count.value >= limit.value);
const hasLimit = computed(() => Number.isFinite(limit.value));
const tierLabel = computed(() => TIER_LABEL[tier.value]);

const modalOpen = computed(() => addOpen.value || Boolean(editing.value));
const saving = computed(() => create.isPending.value || update.isPending.value);

function closeModal() {
  addOpen.value = false;
  editing.value = null;
}

function onSubmit({ payload, extras }) {
  if (editing.value) {
    update.mutate({ id: editing.value.deviceId, payload, extras });
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
          <template v-if="hasLimit">
            · {{ count }}/{{ limit }} ({{ tierLabel }})
          </template>
        </p>
      </div>
      <UiButton
        :disabled="atLimit"
        @click="addOpen = true"
      >
        <Plus class="h-4 w-4" /> {{ t("Agregar", "Add") }}
      </UiButton>
    </div>

    <div
      v-if="atLimit"
      class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
    >
      {{
        t(
          `Alcanzaste el límite de ${limit} dispositivos de tu plan ${tierLabel}.`,
          `You reached your ${tierLabel} plan limit of ${limit} devices.`
        )
      }}
      <RouterLink
        to="/subscription"
        class="font-semibold underline"
      >
        {{ t("Mejora tu plan", "Upgrade your plan") }}
      </RouterLink>
      {{ t(" para vincular más.", " to link more.") }}
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
