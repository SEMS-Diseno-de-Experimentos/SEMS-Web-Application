<script setup>
import { ref, computed, watch } from "vue";
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import { Users, Plus, Trash2, LoaderCircle } from "lucide-vue-next";
import UiCard from "./ui/UiCard.vue";
import UiCardTitle from "./ui/UiCardTitle.vue";
import UiBadge from "./ui/UiBadge.vue";
import UiButton from "./ui/UiButton.vue";
import UiField from "./ui/UiField.vue";
import UiLoading from "./ui/UiLoading.vue";
import UiErrorState from "./ui/UiErrorState.vue";
import { listMembers, grantMembership, revokeMembership } from "@/services/organizations.service";
import { useLangStore } from "@/stores/lang";

// Quien tiene acceso a la organizacion. Es lo que permite a un responsable de
// cadena delegar la operacion diaria en el personal de cada sede sin darle las
// llaves de todo.
const props = defineProps({
  organizationId: { type: String, required: true },
  sites: { type: Array, default: () => [] },
});

const qc = useQueryClient();
const { t } = useLangStore();

// El alcance lo decide el rol, y el dominio lo valida: un administrador manda
// en toda la cadena y no puede atarse a un local; un supervisor sin local no
// supervisa nada. El formulario lo refleja para no dejar enviar algo que el
// backend va a rechazar.
const ROLES = [
  {
    value: "ORG_ADMIN",
    label: t("Administrador", "Administrator"),
    desc: t("Manda en toda la organización.", "Runs the whole organization."),
    site: "prohibido",
  },
  {
    value: "SUPERVISOR",
    label: t("Supervisor", "Supervisor"),
    desc: t("Responsable de un local concreto.", "In charge of one specific site."),
    site: "obligatorio",
  },
  {
    value: "OPERATOR",
    label: t("Operario", "Operator"),
    desc: t("Consulta y opera el día a día.", "Views and runs day-to-day work."),
    site: "opcional",
  },
];

const roleInfo = (valor) => ROLES.find((r) => r.value === valor);
const roleLabel = (valor) => roleInfo(valor)?.label ?? valor;
const siteName = (siteId) => props.sites.find((s) => s.siteId === siteId)?.name ?? "—";

const { data: members, isLoading, isError } = useQuery({
  queryKey: computed(() => ["members", props.organizationId]),
  queryFn: () => listMembers(props.organizationId),
  enabled: computed(() => Boolean(props.organizationId)),
});

const form = ref({ email: "", role: "OPERATOR", siteId: "" });
const abierto = ref(false);

const alcance = computed(() => roleInfo(form.value.role)?.site ?? "opcional");

// Al pasar a administrador se limpia el local: el backend rechaza la
// combinacion y dejarlo puesto solo confundiria.
watch(() => form.value.role, () => {
  if (alcance.value === "prohibido") form.value.siteId = "";
});

const puedeEnviar = computed(() => {
  if (!form.value.email.trim()) return false;
  if (alcance.value === "obligatorio" && !form.value.siteId) return false;
  return true;
});

const dar = useMutation({
  mutationFn: () => grantMembership(props.organizationId, { ...form.value }),
  onSuccess: () => {
    form.value = { email: "", role: "OPERATOR", siteId: "" };
    abierto.value = false;
    qc.invalidateQueries({ queryKey: ["members"] });
  },
});

// El backend distingue entre "ese correo no existe" y el resto, y conviene
// decirlo: es el error que mas va a ocurrir y tiene arreglo obvio.
const mensajeError = computed(() => {
  const codigo = dar.error.value?.response?.status;
  if (codigo === 404) {
    return t(
      "Nadie está registrado con ese correo. La persona tiene que crear su cuenta primero.",
      "Nobody is registered with that email. They need to create their account first."
    );
  }
  const detalle = dar.error.value?.response?.data?.message;
  return detalle || t("No se pudo dar el acceso.", `Couldn't grant access.`);
});

const quitar = useMutation({
  mutationFn: (membershipId) => revokeMembership(props.organizationId, membershipId),
  onSuccess: () => qc.invalidateQueries({ queryKey: ["members"] }),
});

function confirmarQuitar(m) {
  const quien = m.email ?? t("esta persona", "this person");
  if (window.confirm(t(`¿Quitar el acceso de ${quien}?`, `Remove access for ${quien}?`))) {
    quitar.mutate(m.membershipId);
  }
}
</script>

<template>
  <UiCard>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <UiCardTitle>
        <Users class="h-4 w-4 text-slate-400" />
        {{ t("Quién tiene acceso", "Who has access") }}
      </UiCardTitle>
      <UiButton
        v-if="!abierto"
        variant="outline"
        @click="abierto = true"
      >
        <Plus class="h-4 w-4" /> {{ t("Dar acceso", "Grant access") }}
      </UiButton>
    </div>

    <UiLoading v-if="isLoading" />
    <UiErrorState
      v-else-if="isError"
      :message="t('No se pudo cargar quién tiene acceso.', `Couldn't load who has access.`)"
    />
    <ul
      v-else-if="members && members.length"
      class="mt-4 space-y-2"
    >
      <li
        v-for="m in members"
        :key="m.membershipId"
        class="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-navy-800/60"
      >
        <div class="min-w-0">
          <p class="truncate font-medium text-slate-900 dark:text-white">
            {{ m.email ?? t("(cuenta eliminada)", "(deleted account)") }}
          </p>
          <p class="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <UiBadge>{{ roleLabel(m.role) }}</UiBadge>
            <span v-if="m.siteId">{{ siteName(m.siteId) }}</span>
            <span v-else>{{ t("toda la organización", "whole organization") }}</span>
          </p>
        </div>
        <UiButton
          variant="ghost"
          :title="t('Quitar acceso', 'Remove access')"
          :disabled="quitar.isPending.value"
          @click="confirmarQuitar(m)"
        >
          <Trash2 class="h-4 w-4" />
        </UiButton>
      </li>
    </ul>
    <p
      v-else
      class="mt-4 text-sm text-slate-500 dark:text-slate-400"
    >
      {{ t("Nadie más tiene acceso todavía.", "Nobody else has access yet.") }}
    </p>

    <form
      v-if="abierto"
      class="mt-4 space-y-3 border-t border-slate-200 pt-4 dark:border-navy-800"
      @submit.prevent="dar.mutate()"
    >
      <div class="grid gap-3 sm:grid-cols-2">
        <UiField :label="t('Correo de la persona', `Person's email`)">
          <input
            v-model="form.email"
            type="email"
            required
            :placeholder="t('companero@empresa.pe', 'teammate@company.com')"
            class="input-field"
          >
        </UiField>
        <UiField :label="t('Rol', 'Role')">
          <select
            v-model="form.role"
            required
            class="input-field"
          >
            <option
              v-for="r in ROLES"
              :key="r.value"
              :value="r.value"
            >
              {{ r.label }}
            </option>
          </select>
        </UiField>
      </div>

      <p class="text-xs text-slate-500 dark:text-slate-400">
        {{ roleInfo(form.role)?.desc }}
      </p>

      <UiField
        v-if="alcance !== 'prohibido'"
        :label="alcance === 'obligatorio'
          ? t('Local a su cargo', 'Site in their charge')
          : t('Local (opcional)', 'Site (optional)')"
      >
        <select
          v-model="form.siteId"
          class="input-field"
          :required="alcance === 'obligatorio'"
        >
          <option value="">
            {{ alcance === "obligatorio"
              ? t("Elige un local", "Pick a site")
              : t("Toda la organización", "Whole organization") }}
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

      <p
        v-if="alcance === 'obligatorio' && sites.length === 0"
        class="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300"
      >
        {{ t(
          "Un supervisor tiene que estar a cargo de un local, y todavía no has registrado ninguno.",
          "A supervisor must be in charge of a site, and you haven't registered any yet."
        ) }}
      </p>

      <p
        v-if="dar.isError.value"
        class="text-sm text-red-600 dark:text-red-400"
      >
        {{ mensajeError }}
      </p>

      <div class="flex gap-2">
        <UiButton
          type="submit"
          :disabled="!puedeEnviar || dar.isPending.value"
        >
          <LoaderCircle
            v-if="dar.isPending.value"
            class="h-4 w-4 animate-spin"
          />
          {{ t("Dar acceso", "Grant access") }}
        </UiButton>
        <UiButton
          variant="outline"
          type="button"
          @click="abierto = false"
        >
          {{ t("Cancelar", "Cancel") }}
        </UiButton>
      </div>
    </form>
  </UiCard>
</template>
