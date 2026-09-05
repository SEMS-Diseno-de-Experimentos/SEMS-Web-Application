<script setup>
import { ref, computed } from "vue";
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import { storeToRefs } from "pinia";
import { Bell, Gauge, Check, LoaderCircle, Plus } from "lucide-vue-next";
import UiCard from "@/components/ui/UiCard.vue";
import UiCardTitle from "@/components/ui/UiCardTitle.vue";
import UiBadge from "@/components/ui/UiBadge.vue";
import UiButton from "@/components/ui/UiButton.vue";
import UiLoading from "@/components/ui/UiLoading.vue";
import UiErrorState from "@/components/ui/UiErrorState.vue";
import UiSegmented from "@/components/ui/UiSegmented.vue";
import UiToggle from "@/components/ui/UiToggle.vue";
import SeverityBadge from "@/components/ui/SeverityBadge.vue";
import ThresholdModal from "@/components/ThresholdModal.vue";
import {
  getAlerts,
  updateAlertStatus,
  getThresholds,
  createThreshold,
  getNotificationPreferences,
  updateNotificationPreference,
} from "@/services/alerts.service";
import { listDevices } from "@/services/devices.service";
import { kwh as fmtKwh } from "@/lib/format";
import { useAuthStore } from "@/stores/auth";
import { useLangStore } from "@/stores/lang";

const qc = useQueryClient();
const { user } = storeToRefs(useAuthStore());
const { t } = useLangStore();

const STATUS_COLOR = { ACTIVE: "rose", ACKNOWLEDGED: "amber", RESOLVED: "green" };

const tab = ref("ALL");
const thresholdOpen = ref(false);

const enabled = computed(() => Boolean(user.value));

const { data: alerts, isLoading: loadingAlerts, isError: errorAlerts } = useQuery({
  queryKey: computed(() => ["alerts", user.value?.id]),
  queryFn: () => getAlerts(user.value.id),
  enabled,
});

const { data: thresholds, isLoading: loadingThresholds, isError: errorThresholds } = useQuery({
  queryKey: computed(() => ["thresholds", user.value?.id]),
  queryFn: () => getThresholds(user.value.id),
  enabled,
});

const { data: prefs, isLoading: loadingPrefs, isError: errorPrefs } = useQuery({
  queryKey: computed(() => ["preferences", user.value?.id]),
  queryFn: () => getNotificationPreferences(user.value.id),
  enabled,
});

const { data: devices } = useQuery({
  queryKey: computed(() => ["devices", user.value?.id]),
  queryFn: () => listDevices(user.value.id),
  enabled,
});

const resolve = useMutation({
  mutationFn: (id) => updateAlertStatus(id, "RESOLVED"),
  onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
});

const addThreshold = useMutation({
  mutationFn: createThreshold,
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ["thresholds"] });
    thresholdOpen.value = false;
  },
});

const togglePref = useMutation({
  mutationFn: (p) => updateNotificationPreference(user.value.id, p.channel, !p.enabled),
  onSuccess: () => qc.invalidateQueries({ queryKey: ["preferences"] }),
});

const tabs = computed(() => [
  ["ALL", t("Todas", "All")],
  ["ACTIVE", t("Activas", "Active")],
  ["ACKNOWLEDGED", t("Vistas", "Seen")],
  ["RESOLVED", t("Resueltas", "Resolved")],
]);

const statusLabel = computed(() => ({
  ACTIVE: t("Activa", "Active"),
  ACKNOWLEDGED: t("Vista", "Seen"),
  RESOLVED: t("Resuelta", "Resolved"),
}));

const typeLabel = computed(() => ({
  THRESHOLD: t("Umbral", "Threshold"),
  ANOMALY: t("Anomalía", "Anomaly"),
  INACTIVITY: t("Inactividad", "Inactivity"),
}));

const filtered = computed(() =>
  (alerts.value ?? []).filter((a) => tab.value === "ALL" || a.status === tab.value)
);

// Los tres canales se muestran siempre, aunque el backend aun no tenga
// preferencia guardada para alguno: si no, el usuario no podria activarlo.
const channels = computed(() => [
  { channel: "PUSH", label: t("Plataforma web", "Web platform") },
  { channel: "EMAIL", label: t("Correo electrónico", "Email") },
  { channel: "SMS", label: t("SMS", "SMS") },
]);

function isEnabled(channel) {
  return (prefs.value ?? []).find((p) => p.channel === channel)?.enabled ?? false;
}

const deviceOptions = computed(() =>
  (devices.value ?? []).map((d) => ({ id: d.deviceId, name: d.deviceName }))
);

function isResolving(id) {
  return resolve.isPending.value && resolve.variables.value === id;
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="font-display text-2xl font-extrabold text-slate-900 dark:text-white">
        {{ t("Alertas", "Alerts") }}
      </h2>
      <p class="text-sm text-slate-500 dark:text-slate-400">
        {{
          t(
            "Avisos, umbrales y preferencias de notificación.",
            "Alerts, thresholds and notification preferences."
          )
        }}
      </p>
    </div>

    <div class="grid gap-6 lg:grid-cols-3">
      <!-- Bandeja de alertas -->
      <UiCard class="lg:col-span-2">
        <UiCardTitle>
          {{ t("Bandeja de alertas", "Alerts inbox") }}
          <template #action>
            <UiSegmented
              v-model="tab"
              :options="tabs"
            />
          </template>
        </UiCardTitle>

        <UiLoading v-if="loadingAlerts" />
        <UiErrorState v-else-if="errorAlerts" />
        <div
          v-else-if="filtered.length === 0"
          class="py-12 text-center text-sm text-slate-400"
        >
          {{ t("No hay alertas en esta categoría.", "No alerts in this category.") }}
        </div>
        <ul
          v-else
          class="space-y-3"
        >
          <li
            v-for="a in filtered"
            :key="a.id"
            class="flex items-start gap-3 rounded-lg border border-slate-100 p-3.5 dark:border-navy-800"
          >
            <span
              class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300"
            >
              <Bell class="h-4 w-4" />
            </span>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <p class="text-sm font-semibold text-slate-900 dark:text-white">
                  {{ a.title }}
                </p>
                <UiBadge color="slate">
                  {{ typeLabel[a.type] }}
                </UiBadge>
                <SeverityBadge :severity="a.severity" />
                <UiBadge :color="STATUS_COLOR[a.status]">
                  {{ statusLabel[a.status] }}
                </UiBadge>
              </div>
              <p class="mt-1 text-xs leading-snug text-slate-500 dark:text-slate-400">
                {{ a.message }}
              </p>
              <div class="mt-2 flex items-center justify-between gap-2">
                <span class="text-[11px] text-slate-400">
                  {{ a.deviceName ? `${a.deviceName} · ` : "" }}{{ a.createdAt }}
                </span>
                <UiButton
                  v-if="a.status !== 'RESOLVED'"
                  variant="ghost"
                  class="!py-1 !text-xs"
                  :disabled="resolve.isPending.value"
                  @click="resolve.mutate(a.id)"
                >
                  <LoaderCircle
                    v-if="isResolving(a.id)"
                    class="h-3.5 w-3.5 animate-spin"
                  />
                  <Check
                    v-else
                    class="h-3.5 w-3.5"
                  />
                  {{ t("Resolver", "Resolve") }}
                </UiButton>
              </div>
            </div>
          </li>
        </ul>
      </UiCard>

      <!-- Columna lateral -->
      <div class="space-y-6">
        <!-- Umbrales -->
        <UiCard>
          <UiCardTitle>
            {{ t("Umbrales", "Thresholds") }}
            <template #action>
              <button
                type="button"
                class="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
                @click="thresholdOpen = true"
              >
                <Plus class="h-3.5 w-3.5" /> {{ t("Agregar", "Add") }}
              </button>
            </template>
          </UiCardTitle>
          <UiLoading v-if="loadingThresholds" />
          <UiErrorState v-else-if="errorThresholds" />
          <p
            v-else-if="(thresholds?.length ?? 0) === 0"
            class="py-3 text-center text-xs text-slate-400"
          >
            {{ t("Aún no definiste umbrales.", "No thresholds defined yet.") }}
          </p>
          <ul
            v-else
            class="space-y-3"
          >
            <li
              v-for="th in thresholds"
              :key="th.id"
              class="flex items-center gap-3"
            >
              <span
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-navy-800 dark:text-slate-400"
              >
                <Gauge class="h-4 w-4" />
              </span>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-slate-900 dark:text-white">
                  {{ th.deviceName }}
                </p>
                <p class="text-xs text-slate-400">
                  {{ t("Máx.", "Max") }} {{ fmtKwh(th.maxKwhPerDay) }}/{{ t("día", "day") }}
                </p>
              </div>
              <UiBadge :color="th.enabled ? 'green' : 'slate'">
                {{ th.enabled ? t("Activo", "On") : "Off" }}
              </UiBadge>
            </li>
          </ul>
        </UiCard>

        <!-- Preferencias de notificacion -->
        <UiCard>
          <UiCardTitle>{{ t("Notificaciones", "Notifications") }}</UiCardTitle>
          <UiLoading v-if="loadingPrefs" />
          <UiErrorState v-else-if="errorPrefs" />
          <ul
            v-else
            class="space-y-3"
          >
            <li
              v-for="c in channels"
              :key="c.channel"
              class="flex items-center justify-between gap-3"
            >
              <span class="text-sm text-slate-700 dark:text-slate-200">{{ c.label }}</span>
              <UiToggle
                :model-value="isEnabled(c.channel)"
                @update:model-value="
                  togglePref.mutate({ channel: c.channel, label: c.label, enabled: isEnabled(c.channel) })
                "
              />
            </li>
          </ul>
        </UiCard>
      </div>
    </div>

    <ThresholdModal
      v-if="thresholdOpen && user"
      :user-id="user.id"
      :devices="deviceOptions"
      :loading="addThreshold.isPending.value"
      @close="thresholdOpen = false"
      @create="addThreshold.mutate($event)"
    />
  </div>
</template>
