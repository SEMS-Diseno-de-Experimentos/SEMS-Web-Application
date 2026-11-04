<script setup>
import { ref, computed, watch } from "vue";
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import { Gauge, Plus, Trash2, LoaderCircle, QrCode } from "lucide-vue-next";
import UiCard from "./ui/UiCard.vue";
import UiCardTitle from "./ui/UiCardTitle.vue";
import UiBadge from "./ui/UiBadge.vue";
import UiButton from "./ui/UiButton.vue";
import UiLoading from "./ui/UiLoading.vue";
import UiErrorState from "./ui/UiErrorState.vue";
import QrScannerModal from "./QrScannerModal.vue";
import {
  getMeters,
  linkMeter,
  unlinkMeter,
  reassignMeterZone,
} from "@/services/energy.service";
import { getMyOrganization, listSites, listZones } from "@/services/organizations.service";
import { useLangStore } from "@/stores/lang";
import { kwh as fmtKwh } from "@/lib/format";

const props = defineProps({ userId: { type: String, required: true } });

const { t } = useLangStore();
const qc = useQueryClient();

const serial = ref("");
const error = ref("");
const scanOpen = ref(false);

// El local es obligatorio al dar de alta: la tarifa, la potencia contratada y
// el recibo son del suministro, no de la persona que registra el equipo. La
// zona es opcional, porque un local puede abrir antes de definirlas.
const siteId = ref("");
const zoneId = ref("");

/**
 * Lee el codigo de serie desde el texto del QR.
 *
 * Acepta texto plano (el propio serial) o un JSON con `serial`/`meter_serial`,
 * porque los medidores no traen todos el mismo formato de etiqueta.
 */
function parseMeterQr(text) {
  const raw = (text ?? "").trim();
  try {
    const obj = JSON.parse(raw);
    const found = String(obj.serial ?? obj.meter_serial ?? obj.serialNumber ?? obj.serie ?? "");
    if (found) return { serial: found, model: obj.model ? String(obj.model) : undefined };
  } catch {
    /* no era JSON: se trata como serial plano */
  }
  return { serial: raw };
}

const { data: meters, isLoading, isError } = useQuery({
  queryKey: computed(() => ["meters", props.userId]),
  queryFn: () => getMeters(props.userId),
});

const { data: organizacion } = useQuery({
  queryKey: computed(() => ["org", props.userId]),
  queryFn: () => getMyOrganization(props.userId),
});

const { data: locales } = useQuery({
  queryKey: computed(() => ["sites", organizacion.value?.organizationId]),
  queryFn: () => listSites(organizacion.value.organizationId),
  enabled: computed(() => Boolean(organizacion.value?.organizationId)),
});

const { data: zonas } = useQuery({
  queryKey: computed(() => ["zones", siteId.value]),
  queryFn: () => listZones(siteId.value),
  enabled: computed(() => Boolean(siteId.value)),
});

// Se preselecciona el primer local para que el alta no obligue a tocar el
// selector cuando solo hay uno.
watch(locales, (lista) => {
  if (!siteId.value && lista?.length) siteId.value = lista[0].siteId;
});

// Al cambiar de local, la zona elegida deja de ser valida.
watch(siteId, () => {
  zoneId.value = "";
});

const nombrePorId = computed(() => {
  const mapa = new Map();
  for (const s of locales.value ?? []) mapa.set(s.siteId, s.name);
  for (const z of zonas.value ?? []) mapa.set(z.zoneId, z.name);
  return mapa;
});

/** Texto de ubicacion de un medidor: local y, si la tiene, zona. */
function ubicacion(m) {
  const local = nombrePorId.value.get(m.siteId);
  const zona = nombrePorId.value.get(m.zoneId);
  if (!local && !zona) return null;
  return zona ? `${local ?? "?"} · ${zona}` : local;
}

const link = useMutation({
  mutationFn: ({ serial: s, model }) => linkMeter(props.userId, s, {
    model,
    siteId: siteId.value,
    zoneId: zoneId.value || null,
  }),
  onSuccess: () => {
    serial.value = "";
    error.value = "";
    qc.invalidateQueries({ queryKey: ["meters", props.userId] });
  },
  onError: () => {
    error.value = t(
      "No se pudo vincular el medidor. Revisa el código de serie.",
      "Couldn't link the meter. Check the serial code."
    );
  },
});

const unlink = useMutation({
  mutationFn: (meterId) => unlinkMeter(meterId),
  onSuccess: () => qc.invalidateQueries({ queryKey: ["meters", props.userId] }),
});

// Traslado entre zonas del mismo local (US22). A otro local no se puede: seria
// otro suministro, con otra tarifa y otro recibo.
const mover = useMutation({
  mutationFn: ({ meterId, zone }) => reassignMeterZone(meterId, zone || null),
  onSuccess: () => {
    error.value = "";
    qc.invalidateQueries({ queryKey: ["meters", props.userId] });
  },
  onError: () => {
    error.value = t(
      "No se pudo trasladar el medidor. La zona tiene que ser del mismo local.",
      "Couldn't move the meter. The zone must belong to the same site."
    );
  },
});

function onLink() {
  const s = serial.value.trim();
  if (!s) return;
  if (!siteId.value) {
    error.value = t(
      "Elige el local donde está instalado el medidor.",
      "Pick the site where the meter is installed."
    );
    return;
  }
  link.mutate({ serial: s });
}

// Resultado del escaneo: se muestra el serial y se vincula sin pasos extra.
function onScan(text) {
  scanOpen.value = false;
  const { serial: s, model } = parseMeterQr(text);
  if (!s) return;
  serial.value = s;
  if (!siteId.value) {
    error.value = t(
      "Elige el local donde está instalado el medidor.",
      "Pick the site where the meter is installed."
    );
    return;
  }
  link.mutate({ serial: s, model });
}

function confirmUnlink(meterId) {
  if (window.confirm(t("¿Desvincular este medidor de tu cuenta?", "Unlink this meter from your account?"))) {
    unlink.mutate(meterId);
  }
}
</script>

<template>
  <UiCard>
    <UiCardTitle>
      {{ t("Medidores EOS", "EOS meters") }}
      <template #action>
        <Gauge class="h-4 w-4 text-slate-400" />
      </template>
    </UiCardTitle>

    <QrScannerModal
      v-if="scanOpen"
      @result="onScan"
      @close="scanOpen = false"
    />

    <UiLoading v-if="isLoading" />
    <UiErrorState v-else-if="isError" />
    <p
      v-else-if="(meters?.length ?? 0) === 0"
      class="py-3 text-sm text-slate-400"
    >
      {{ t("Aún no tienes un medidor vinculado.", "You don't have a meter linked yet.") }}
    </p>
    <ul
      v-else
      class="space-y-2.5"
    >
      <li
        v-for="m in meters"
        :key="m.meterId"
        class="flex items-center justify-between gap-3 rounded-lg border border-slate-100 p-3 dark:border-navy-800"
      >
        <div class="flex min-w-0 items-center gap-3">
          <span
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300"
          >
            <Gauge class="h-5 w-5" />
          </span>
          <div class="min-w-0">
            <p class="truncate font-semibold text-slate-900 dark:text-white">
              {{ m.name }}
            </p>
            <p class="text-xs text-slate-400">
              {{ t("Lectura acumulada", "Total reading") }}: {{ fmtKwh(m.lastReadingKwh) }}
            </p>
            <p
              v-if="ubicacion(m)"
              class="truncate text-xs text-slate-400"
            >
              {{ ubicacion(m) }}
            </p>
            <!-- Los medidores dados de alta antes de que el local fuera
                 obligatorio no lo tienen, y conviene que se vea. -->
            <p
              v-else
              class="text-xs text-amber-600 dark:text-amber-400"
            >
              {{ t("Sin local asignado", "No site assigned") }}
            </p>
          </div>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <!-- Traslado de zona: solo entre zonas del local del medidor. -->
          <select
            v-if="m.siteId && m.siteId === siteId"
            :value="m.zoneId ?? ''"
            :disabled="mover.isPending.value"
            :title="t('Trasladar a otra zona', 'Move to another zone')"
            class="max-w-[9rem] rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs outline-none focus:border-blue-500 disabled:opacity-50 dark:border-navy-700 dark:bg-navy-950 dark:text-white"
            @change="mover.mutate({ meterId: m.meterId, zone: $event.target.value })"
          >
            <option value="">
              {{ t("Sin zona", "No zone") }}
            </option>
            <option
              v-for="z in zonas ?? []"
              :key="z.zoneId"
              :value="z.zoneId"
            >
              {{ z.name }}
            </option>
          </select>
          <UiBadge :color="m.active ? 'green' : 'slate'">
            <span
              :class="[
                'h-1.5 w-1.5 rounded-full',
                m.active ? 'bg-emerald-500 animate-pulse-soft' : 'bg-slate-400',
              ]"
            />
            {{ m.active ? t("En línea", "Online") : t("Desconectado", "Offline") }}
          </UiBadge>
          <button
            type="button"
            :disabled="unlink.isPending.value"
            :title="t('Desvincular', 'Unlink')"
            class="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-500/10"
            @click="confirmUnlink(m.meterId)"
          >
            <LoaderCircle
              v-if="unlink.isPending.value"
              class="h-4 w-4 animate-spin"
            />
            <Trash2
              v-else
              class="h-4 w-4"
            />
          </button>
        </div>
      </li>
    </ul>

    <!-- Vincular un medidor: por QR o escribiendo el codigo de serie -->
    <div
      v-if="(locales?.length ?? 0) === 0"
      class="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
    >
      {{ t(
        "Registra un local antes de dar de alta un medidor: su consumo se atribuye al suministro del local.",
        "Register a site before adding a meter: its consumption is credited to the site's supply point."
      ) }}
    </div>

    <div
      v-else
      class="mt-4 grid gap-2 sm:grid-cols-2"
    >
      <label class="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {{ t("Local", "Site") }}
        <select
          v-model="siteId"
          class="input-field mt-1 normal-case"
        >
          <option
            v-for="s in locales"
            :key="s.siteId"
            :value="s.siteId"
          >
            {{ s.name }}
          </option>
        </select>
      </label>
      <label class="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {{ t("Zona (opcional)", "Zone (optional)") }}
        <select
          v-model="zoneId"
          class="input-field mt-1 normal-case"
        >
          <option value="">
            {{ t("Sin zona", "No zone") }}
          </option>
          <option
            v-for="z in zonas ?? []"
            :key="z.zoneId"
            :value="z.zoneId"
          >
            {{ z.name }}
          </option>
        </select>
      </label>
    </div>

    <form
      class="mt-2 flex flex-col gap-2 sm:flex-row"
      @submit.prevent="onLink"
    >
      <input
        v-model="serial"
        :placeholder="t('Código de serie del medidor EOS', 'EOS meter serial code')"
        class="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-navy-700 dark:bg-navy-950 dark:text-white"
      >
      <button
        type="button"
        class="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-blue-400 hover:text-blue-600 dark:border-navy-700 dark:text-slate-300 dark:hover:text-blue-400"
        @click="error = ''; scanOpen = true"
      >
        <QrCode class="h-4 w-4" />
        {{ t("Escanear QR", "Scan QR") }}
      </button>
      <UiButton
        type="submit"
        :disabled="link.isPending.value || !serial.trim() || !siteId"
      >
        <LoaderCircle
          v-if="link.isPending.value"
          class="h-4 w-4 animate-spin"
        />
        <Plus
          v-else
          class="h-4 w-4"
        />
        {{ t("Vincular medidor", "Link meter") }}
      </UiButton>
    </form>

    <p
      v-if="error"
      class="mt-2 text-xs text-rose-600 dark:text-rose-400"
    >
      {{ error }}
    </p>
  </UiCard>
</template>
