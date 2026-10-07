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
} from "@/services/alerts.service";
import { listDevices } from "@/services/devices.service";
import { useAuthStore } from "@/stores/auth";
import { useLangStore } from "@/stores/lang";

const qc = useQueryClient();
const { user } = storeToRefs(useAuthStore());
const { t } = useLangStore();

const STATUS_COLOR = { ACTIVE: "rose", ACKNOWLEDGED: "amber", RESOLVED: "green" };

const tab = ref("ALL");

const enabled = computed(() => Boolean(user.value));

const { data: alerts, isLoading: loadingAlerts, isError: errorAlerts } = useQuery({
  queryKey: computed(() => ["alerts", user.value?.id]),
  queryFn: () => getAlerts(user.value.id),
  enabled,
});

// no thresholds or prefs

const { data: devices } = useQuery({
  queryKey: computed(() => ["devices", user.value?.id]),
  queryFn: () => listDevices(user.value.id),
  enabled,
});

const resolve = useMutation({
  mutationFn: (id) => updateAlertStatus(id, "RESOLVED"),
  onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
});

const acknowledge = useMutation({
  mutationFn: (id) => updateAlertStatus(id, "ACKNOWLEDGED"),
  onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
});

const undo = useMutation({
  mutationFn: (id) => updateAlertStatus(id, "ACTIVE"),
  onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
});

// no thresholds mutations

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

// No prefs logic

function isResolving(id) {
  return resolve.isPending && resolve.variables === id;
}
function isAcknowledging(id) {
  return acknowledge.isPending && acknowledge.variables === id;
}
function isUndoing(id) {
  return undo.isPending && undo.variables === id;
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
            "Avisos de dispositivos.",
            "Device alerts."
          )
        }}
      </p>
    </div>

    <div class="grid gap-6">
      <!-- Bandeja de alertas -->
      <UiCard>
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
                <div class="flex gap-2">
                  <template v-if="a.status !== 'RESOLVED'">
                    <UiButton
                      v-if="a.status === 'ACTIVE'"
                      variant="ghost"
                      class="!py-1 !text-xs"
                      :disabled="acknowledge.isPending"
                      @click="acknowledge.mutate(a.id)"
                    >
                      <LoaderCircle
                        v-if="isAcknowledging(a.id)"
                        class="h-3.5 w-3.5 animate-spin"
                      />
                      {{ t("Reconocer", "Acknowledge") }}
                    </UiButton>
                    <UiButton
                      variant="ghost"
                      class="!py-1 !text-xs !text-emerald-600 hover:!bg-emerald-50 dark:hover:!bg-emerald-500/10"
                      :disabled="resolve.isPending"
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
                  </template>
                  <template v-else>
                    <UiButton
                      variant="ghost"
                      class="!py-1 !text-xs !text-amber-600 hover:!bg-amber-50 dark:hover:!bg-amber-500/10"
                      :disabled="undo.isPending"
                      @click="undo.mutate(a.id)"
                    >
                      <LoaderCircle
                        v-if="isUndoing(a.id)"
                        class="h-3.5 w-3.5 animate-spin"
                      />
                      {{ t("Deshacer", "Undo") }}
                    </UiButton>
                  </template>
                </div>
              </div>
            </div>
          </li>
        </ul>
      </UiCard>
    </div>
  </div>
</template>
