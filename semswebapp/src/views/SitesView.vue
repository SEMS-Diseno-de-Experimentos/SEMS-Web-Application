<script setup>
import { ref, computed, watch } from "vue";
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import { storeToRefs } from "pinia";
import { Building2, Plus, Pencil, Trash2, Save, Check, LoaderCircle } from "lucide-vue-next";
import UiCard from "@/components/ui/UiCard.vue";
import UiCardTitle from "@/components/ui/UiCardTitle.vue";
import UiBadge from "@/components/ui/UiBadge.vue";
import UiButton from "@/components/ui/UiButton.vue";
import UiField from "@/components/ui/UiField.vue";
import UiToggle from "@/components/ui/UiToggle.vue";
import UiLoading from "@/components/ui/UiLoading.vue";
import UiErrorState from "@/components/ui/UiErrorState.vue";
import SiteModal from "@/components/SiteModal.vue";
import MembersCard from "@/components/MembersCard.vue";
import SiteMetersCard from "@/components/SiteMetersCard.vue";
import {
  getMyOrganization, createOrganization, updateOrganization,
  listSites, createSite, updateSite, archiveSite,
  listZones, createZone, archiveZone,
} from "@/services/organizations.service";
import { useAuthStore } from "@/stores/auth";
import { useLangStore } from "@/stores/lang";

const qc = useQueryClient();
const { user } = storeToRefs(useAuthStore());
const { t } = useLangStore();

const uid = computed(() => user.value?.id ?? "");
const enabled = computed(() => Boolean(user.value));

// La pantalla sigue el mock-up del informe: una fila de locales arriba para
// elegir cual se mira, y debajo el perfil de ese local y sus zonas. Un local no
// existe sin su organizacion, asi que si todavia no hay ninguna lo primero que
// aparece es el alta; tenerlo aqui evita que haya que adivinar que ese es el
// primer paso.
const {
  data: org, isLoading: loadingOrg, isError: errorOrg, refetch: refetchOrg,
} = useQuery({
  queryKey: computed(() => ["organization", uid.value]),
  queryFn: () => getMyOrganization(uid.value),
  enabled,
});

const BUSINESS_TYPES = [
  ["SUPERMARKET", t("Supermercado", "Supermarket")],
  ["CONVENIENCE_STORE", t("Tienda de conveniencia", "Convenience store")],
  ["DEPARTMENT_STORE", t("Tienda por departamentos", "Department store")],
  ["RESTAURANT", t("Restaurante", "Restaurant")],
  ["WAREHOUSE", t("Almacén", "Warehouse")],
  ["OTHER", t("Otro", "Other")],
];

const TARIFFS = ["BT5B", "BT3", "BT4", "MT2", "MT3"];

const ZONE_TYPES = [
  ["SALES_FLOOR", t("Sala de ventas", "Sales floor")],
  ["COLD_STORAGE", t("Cámaras de frío", "Cold storage")],
  ["WAREHOUSE", t("Almacén", "Warehouse")],
  ["KITCHEN", t("Cocina", "Kitchen")],
  ["OFFICES", t("Oficinas", "Offices")],
  ["HVAC", t("Climatización", "HVAC")],
  ["PARKING", t("Estacionamiento", "Parking")],
  ["OTHER", t("Otra", "Other")],
];

const etiqueta = (pares, valor) => pares.find(([v]) => v === valor)?.[1] ?? valor;

// ----------------------------------------------------------- organizacion
const orgForm = ref({ legalName: "", tradeName: "", taxId: "", businessType: "SUPERMARKET" });

// El RUC peruano son once digitos. Se valida aqui para no gastar un viaje al
// servidor, pero el backend tambien lo comprueba.
const rucValido = computed(() => /^\d{11}$/.test(orgForm.value.taxId.trim()));

const crearOrg = useMutation({
  mutationFn: () => createOrganization({ ...orgForm.value, ownerUserId: uid.value }),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ["organization"] });
    refetchOrg();
  },
});

const editandoOrg = ref(false);
const editOrgForm = ref({ legalName: "", tradeName: "", businessType: "SUPERMARKET" });

function abrirEdicionOrg() {
  editOrgForm.value = {
    legalName: org.value.legalName,
    tradeName: org.value.tradeName,
    businessType: org.value.businessType,
  };
  editandoOrg.value = true;
}

const guardarOrg = useMutation({
  mutationFn: () => updateOrganization(org.value.organizationId, editOrgForm.value),
  onSuccess: () => {
    editandoOrg.value = false;
    qc.invalidateQueries({ queryKey: ["organization"] });
    refetchOrg();
  },
});

// ------------------------------------------------------------------ locales
const orgId = computed(() => org.value?.organizationId ?? null);

const { data: sites, isLoading: loadingSites, isError: errorSites } = useQuery({
  queryKey: computed(() => ["sites", orgId.value]),
  queryFn: () => listSites(orgId.value),
  enabled: computed(() => Boolean(orgId.value)),
});

const seleccionadoId = ref("");
const seleccionado = computed(
  () => (sites.value ?? []).find((s) => s.siteId === seleccionadoId.value) ?? null
);

// Al cargar la lista, o al quedarse sin el local elegido porque se archivo, se
// pasa al primero disponible para que la pantalla nunca quede en blanco.
watch(sites, (lista) => {
  if (!lista?.length) {
    seleccionadoId.value = "";
  } else if (!lista.some((s) => s.siteId === seleccionadoId.value)) {
    seleccionadoId.value = lista[0].siteId;
  }
}, { immediate: true });

// ------------------------------------------------------------ perfil del local
// El formulario es una copia del local elegido: se edita en pantalla y solo
// viaja al servidor al guardar.
const perfil = ref(null);
const perfilGuardado = ref(false);

watch(seleccionado, (s) => {
  perfil.value = s
    ? {
        name: s.name,
        address: s.address,
        district: s.district,
        floorAreaM2: s.floorAreaM2 ?? "",
        contractedPowerKw: s.contractedPowerKw,
        tariffCategory: s.tariffCategory,
        excludesSundaysFromPeak: s.excludesSundaysFromPeak,
      }
    : null;
}, { immediate: true });

const guardarPerfil = useMutation({
  mutationFn: () => updateSite(seleccionado.value.siteId, { ...perfil.value, siteCode: seleccionado.value.siteCode }),
  onSuccess: () => {
    perfilGuardado.value = true;
    setTimeout(() => (perfilGuardado.value = false), 2000);
    qc.invalidateQueries({ queryKey: ["sites"] });
  },
});

const modalAbierto = ref(false);

const crearLocal = useMutation({
  mutationFn: (datos) => createSite(orgId.value, datos),
  onSuccess: (nuevo) => {
    qc.invalidateQueries({ queryKey: ["sites"] });
    modalAbierto.value = false;
    seleccionadoId.value = nuevo.siteId;
  },
});

const archivarLocal = useMutation({
  mutationFn: (siteId) => archiveSite(siteId),
  // Archivar un local deja sus dispositivos sin sede visible, asi que se
  // refresca tambien esa parte de la aplicacion.
  onSuccess: () => ["sites", "devices", "zones"].forEach((key) =>
    qc.invalidateQueries({ queryKey: [key] })),
});

function confirmarArchivado() {
  const s = seleccionado.value;
  const aviso = t(
    `¿Archivar el local "${s.name}"? Dejará de aparecer, y sus dispositivos quedarán sin sede.`,
    `Archive site "${s.name}"? It will no longer be listed, and its devices will be left without a site.`
  );
  if (window.confirm(aviso)) archivarLocal.mutate(s.siteId);
}

// -------------------------------------------------------------------- zonas
const { data: zones, isLoading: loadingZones } = useQuery({
  queryKey: computed(() => ["zones", seleccionadoId.value]),
  queryFn: () => listZones(seleccionadoId.value),
  enabled: computed(() => Boolean(seleccionadoId.value)),
});

const zonaForm = ref({ name: "", zoneType: "SALES_FLOOR", operatesOffHours: false });

const crearZona = useMutation({
  mutationFn: () => createZone(seleccionadoId.value, zonaForm.value),
  onSuccess: () => {
    zonaForm.value = { name: "", zoneType: "SALES_FLOOR", operatesOffHours: false };
    qc.invalidateQueries({ queryKey: ["zones"] });
  },
});

const archivarZona = useMutation({
  mutationFn: (zoneId) => archiveZone(zoneId),
  onSuccess: () => qc.invalidateQueries({ queryKey: ["zones"] }),
});
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="font-display text-2xl font-bold text-slate-900 dark:text-white">
        {{ t("Mis locales", "My sites") }}
      </h1>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {{ t("Perfil de cada local y sus zonas.", "Each site's profile and its zones.") }}
      </p>
    </div>

    <UiLoading v-if="loadingOrg" />
    <UiErrorState
      v-else-if="errorOrg"
      :message="t('No se pudo cargar tu organización.', `Couldn't load your organization.`)"
    />

    <!-- Sin organizacion: lo primero es darla de alta -->
    <UiCard v-else-if="!org">
      <UiCardTitle>
        <Building2 class="h-4 w-4 text-slate-400" />
        {{ t("Registra tu organización", "Register your organization") }}
      </UiCardTitle>
      <p class="mb-4 text-sm text-slate-500 dark:text-slate-400">
        {{ t(
          "Los locales se agrupan bajo una organización. Regístrala una vez y después podrás añadir todas tus sedes.",
          "Sites are grouped under an organization. Register it once and then you can add all your locations."
        ) }}
      </p>
      <form
        class="space-y-4"
        @submit.prevent="crearOrg.mutate()"
      >
        <div class="grid gap-4 sm:grid-cols-2">
          <UiField :label="t('Razón social', 'Legal name')">
            <input
              v-model="orgForm.legalName"
              required
              :placeholder="t('Ej: Comercial Los Andes S.A.C.', 'e.g. Los Andes Retail Inc.')"
              class="input-field"
            >
          </UiField>
          <UiField :label="t('Nombre comercial', 'Trade name')">
            <input
              v-model="orgForm.tradeName"
              :placeholder="t('Ej: Market Los Andes', 'e.g. Los Andes Market')"
              class="input-field"
            >
          </UiField>
          <UiField :label="t('RUC', 'Tax ID (RUC)')">
            <input
              v-model="orgForm.taxId"
              required
              inputmode="numeric"
              maxlength="11"
              placeholder="20512345678"
              class="input-field"
            >
            <p
              v-if="orgForm.taxId && !rucValido"
              class="mt-1 text-xs text-red-600 dark:text-red-400"
            >
              {{ t("El RUC son 11 dígitos.", "A RUC has 11 digits.") }}
            </p>
          </UiField>
          <UiField :label="t('Tipo de establecimiento', 'Business type')">
            <select
              v-model="orgForm.businessType"
              required
              class="input-field"
            >
              <option
                v-for="[value, label] in BUSINESS_TYPES"
                :key="value"
                :value="value"
              >
                {{ label }}
              </option>
            </select>
          </UiField>
        </div>
        <p
          v-if="crearOrg.isError.value"
          class="text-sm text-red-600 dark:text-red-400"
        >
          {{ t("No se pudo registrar. Revisa el RUC: puede estar ya en uso.", "Couldn't register. Check the RUC: it may already be in use.") }}
        </p>
        <UiButton
          type="submit"
          :disabled="!rucValido || crearOrg.isPending.value"
        >
          <LoaderCircle
            v-if="crearOrg.isPending.value"
            class="h-4 w-4 animate-spin"
          />
          {{ t("Registrar organización", "Register organization") }}
        </UiButton>
      </form>
    </UiCard>

    <template v-else>
      <!-- Ficha compacta de la organizacion. El tipo de establecimiento vive
           aqui y no en el local: el backend lo guarda en la organizacion. -->
      <UiCard>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <Building2 class="h-5 w-5 shrink-0 text-slate-400" />
            <div>
              <p class="font-semibold text-slate-900 dark:text-white">
                {{ org.tradeName || org.legalName }}
              </p>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                RUC {{ org.taxId }} · {{ etiqueta(BUSINESS_TYPES, org.businessType) }}
              </p>
            </div>
          </div>
          <UiButton
            v-if="!editandoOrg"
            variant="outline"
            @click="abrirEdicionOrg()"
          >
            <Pencil class="h-4 w-4" /> {{ t("Editar", "Edit") }}
          </UiButton>
        </div>

        <form
          v-if="editandoOrg"
          class="mt-4 space-y-4 border-t border-slate-200 pt-4 dark:border-navy-800"
          @submit.prevent="guardarOrg.mutate()"
        >
          <div class="grid gap-4 sm:grid-cols-3">
            <UiField :label="t('Razón social', 'Legal name')">
              <input
                v-model="editOrgForm.legalName"
                required
                class="input-field"
              >
            </UiField>
            <UiField :label="t('Nombre comercial', 'Trade name')">
              <input
                v-model="editOrgForm.tradeName"
                class="input-field"
              >
            </UiField>
            <UiField :label="t('Tipo de establecimiento', 'Business type')">
              <select
                v-model="editOrgForm.businessType"
                required
                class="input-field"
              >
                <option
                  v-for="[value, label] in BUSINESS_TYPES"
                  :key="value"
                  :value="value"
                >
                  {{ label }}
                </option>
              </select>
            </UiField>
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400">
            {{ t("El RUC no se puede cambiar.", "The RUC cannot be changed.") }}
          </p>
          <div class="flex gap-2">
            <UiButton
              type="submit"
              :disabled="guardarOrg.isPending.value"
            >
              <Save class="h-4 w-4" /> {{ t("Guardar", "Save") }}
            </UiButton>
            <UiButton
              variant="outline"
              type="button"
              @click="editandoOrg = false"
            >
              {{ t("Cancelar", "Cancel") }}
            </UiButton>
          </div>
        </form>
      </UiCard>

      <!-- Fila de locales: se elige cual se mira -->
      <div class="flex flex-wrap items-center gap-2">
        <template v-if="loadingSites">
          <UiLoading />
        </template>
        <template v-else>
          <button
            v-for="s in sites"
            :key="s.siteId"
            type="button"
            :aria-pressed="s.siteId === seleccionadoId"
            :class="[
              'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
              s.siteId === seleccionadoId
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-navy-800 dark:bg-navy-900 dark:text-slate-200 dark:hover:bg-navy-800',
            ]"
            @click="seleccionadoId = s.siteId"
          >
            {{ s.name }}
          </button>
          <UiButton
            class="ml-auto"
            @click="modalAbierto = true"
          >
            <Plus class="h-4 w-4" /> {{ t("Agregar local", "Add site") }}
          </UiButton>
        </template>
      </div>

      <UiErrorState
        v-if="errorSites"
        :message="t('No se pudieron cargar los locales.', `Couldn't load the sites.`)"
      />
      <UiCard v-else-if="!loadingSites && (!sites || sites.length === 0)">
        <p class="text-sm text-slate-500 dark:text-slate-400">
          {{ t(
            "Todavía no tienes locales. Registra el primero para poder dar de alta medidores y dispositivos.",
            "You have no sites yet. Register the first one so you can add meters and devices."
          ) }}
        </p>
      </UiCard>

      <div
        v-else-if="seleccionado && perfil"
        class="grid gap-6 lg:grid-cols-2"
      >
        <!-- Perfil del local -->
        <UiCard>
          <div class="flex flex-wrap items-center justify-between gap-3">
            <UiCardTitle>
              {{ t("Perfil del local", "Site profile") }}
              <span class="ml-1 font-mono text-xs font-normal text-slate-400">{{ seleccionado.siteCode }}</span>
            </UiCardTitle>
            <div class="flex items-center gap-2">
              <UiBadge v-if="perfilGuardado">
                <Check class="h-3 w-3" /> {{ t("Guardado", "Saved") }}
              </UiBadge>
              <UiButton
                variant="ghost"
                :title="t('Archivar local', 'Archive site')"
                :disabled="archivarLocal.isPending.value"
                @click="confirmarArchivado()"
              >
                <Trash2 class="h-4 w-4" />
              </UiButton>
            </div>
          </div>

          <form
            class="mt-4 space-y-4"
            @submit.prevent="guardarPerfil.mutate()"
          >
            <div class="grid gap-4 sm:grid-cols-2">
              <UiField :label="t('Nombre del local', 'Site name')">
                <input
                  v-model="perfil.name"
                  required
                  class="input-field"
                >
              </UiField>
              <UiField :label="t('Distrito', 'District')">
                <input
                  v-model="perfil.district"
                  class="input-field"
                >
              </UiField>
              <UiField :label="t('Dirección', 'Address')">
                <input
                  v-model="perfil.address"
                  class="input-field"
                >
              </UiField>
              <UiField :label="t('Área (m²)', 'Floor area (m²)')">
                <input
                  v-model="perfil.floorAreaM2"
                  type="number"
                  min="0"
                  step="1"
                  class="input-field"
                >
              </UiField>
              <UiField :label="t('Potencia contratada (kW)', 'Contracted power (kW)')">
                <input
                  v-model="perfil.contractedPowerKw"
                  type="number"
                  min="0"
                  step="0.1"
                  required
                  class="input-field"
                >
              </UiField>
              <UiField :label="t('Categoría tarifaria', 'Tariff category')">
                <select
                  v-model="perfil.tariffCategory"
                  required
                  class="input-field"
                >
                  <option
                    v-for="tc in TARIFFS"
                    :key="tc"
                    :value="tc"
                  >
                    {{ tc }}
                  </option>
                </select>
              </UiField>
            </div>

            <div class="flex flex-wrap gap-2">
              <UiBadge v-if="seleccionado.chargesForDemand">
                {{ t("Cobra por potencia", "Demand charge") }}
              </UiBadge>
            </div>

            <div class="rounded-lg bg-slate-50 p-3 dark:bg-navy-800/60">
              <UiToggle v-model="perfil.excludesSundaysFromPeak">
                {{ t("Excluir domingos de la hora punta", "Exclude Sundays from peak hours") }}
              </UiToggle>
              <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {{ t(
                  "Actívalo solo si tu distribuidora concedió esa exclusión. Por defecto la hora punta es de 18:00 a 23:00 todos los días.",
                  "Turn this on only if your utility granted that exclusion. By default peak hours run 18:00–23:00 every day."
                ) }}
              </p>
            </div>

            <UiButton
              type="submit"
              class="w-full"
              :disabled="guardarPerfil.isPending.value"
            >
              <LoaderCircle
                v-if="guardarPerfil.isPending.value"
                class="h-4 w-4 animate-spin"
              />
              {{ t("Guardar perfil", "Save profile") }}
            </UiButton>
          </form>
        </UiCard>

        <!-- Zonas del local -->
        <UiCard>
          <UiCardTitle>
            {{ t("Zonas del local", "Site zones") }}
          </UiCardTitle>

          <UiLoading v-if="loadingZones" />
          <p
            v-else-if="!zones || zones.length === 0"
            class="mt-4 text-sm text-slate-500 dark:text-slate-400"
          >
            {{ t("Sin zonas. Divide el local para saber dónde se consume.", "No zones yet. Split the site to see where energy goes.") }}
          </p>
          <ul
            v-else
            class="mt-4 space-y-2"
          >
            <li
              v-for="z in zones"
              :key="z.zoneId"
              class="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-navy-800/60"
            >
              <div class="min-w-0">
                <p class="truncate font-medium text-slate-900 dark:text-white">
                  {{ z.name }}
                </p>
                <p class="text-xs text-slate-500 dark:text-slate-400">
                  {{ etiqueta(ZONE_TYPES, z.zoneType) }}
                  <span v-if="z.operatesOffHours">· {{ t("opera fuera de horario", "runs off-hours") }}</span>
                </p>
              </div>
              <UiButton
                variant="ghost"
                :title="t('Archivar zona', 'Archive zone')"
                @click="archivarZona.mutate(z.zoneId)"
              >
                <Trash2 class="h-4 w-4" />
              </UiButton>
            </li>
          </ul>

          <form
            class="mt-4 space-y-3 border-t border-slate-200 pt-4 dark:border-navy-800"
            @submit.prevent="crearZona.mutate()"
          >
            <div class="grid gap-3 sm:grid-cols-2">
              <UiField :label="t('Nueva zona', 'New zone')">
                <input
                  v-model="zonaForm.name"
                  required
                  :placeholder="t('Ej: Cámaras de frío', 'e.g. Cold storage')"
                  class="input-field"
                >
              </UiField>
              <UiField :label="t('Tipo', 'Type')">
                <select
                  v-model="zonaForm.zoneType"
                  required
                  class="input-field"
                >
                  <option
                    v-for="[value, label] in ZONE_TYPES"
                    :key="value"
                    :value="value"
                  >
                    {{ label }}
                  </option>
                </select>
              </UiField>
            </div>
            <UiToggle v-model="zonaForm.operatesOffHours">
              {{ t("Opera fuera del horario comercial", "Runs outside business hours") }}
            </UiToggle>
            <UiButton
              type="submit"
              :disabled="crearZona.isPending.value"
            >
              <Plus class="h-4 w-4" /> {{ t("Añadir zona", "Add zone") }}
            </UiButton>
          </form>
        </UiCard>
      </div>

      <SiteMetersCard
        v-if="seleccionado"
        :site-id="seleccionado.siteId"
        :zones="zones ?? []"
      />

      <MembersCard
        :organization-id="org.organizationId"
        :sites="sites ?? []"
      />
    </template>

    <SiteModal
      v-if="modalAbierto"
      :loading="crearLocal.isPending.value"
      @close="modalAbierto = false"
      @save="crearLocal.mutate($event)"
    />
  </div>
</template>
