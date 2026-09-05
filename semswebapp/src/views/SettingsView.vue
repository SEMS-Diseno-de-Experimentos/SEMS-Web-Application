<script setup>
import { ref, computed } from "vue";
import { storeToRefs } from "pinia";
import { User as UserIcon, Mail, Shield, Save, Check, Sun, Moon, Languages, Users } from "lucide-vue-next";
import UiCard from "@/components/ui/UiCard.vue";
import UiCardTitle from "@/components/ui/UiCardTitle.vue";
import UiBadge from "@/components/ui/UiBadge.vue";
import UiButton from "@/components/ui/UiButton.vue";
import UiField from "@/components/ui/UiField.vue";
import { useAuthStore } from "@/stores/auth";
import { useThemeStore } from "@/stores/theme";
import { useLangStore } from "@/stores/lang";

const authStore = useAuthStore();
const { user } = storeToRefs(authStore);

const themeStore = useThemeStore();
const { theme } = storeToRefs(themeStore);

const langStore = useLangStore();
const { lang } = storeToRefs(langStore);
const { t } = langStore;

// Datos editables del perfil. Se guardan en el navegador via updateProfile:
// el modulo de identidad no almacena el nombre para mostrar.
const fullName = ref(user.value?.fullName ?? "");
const segment = ref(user.value?.segment ?? "HOMEOWNER");
const saved = ref(false);

const dirty = computed(
  () =>
    fullName.value.trim() !== (user.value?.fullName ?? "") ||
    segment.value !== (user.value?.segment ?? "HOMEOWNER")
);

let savedTimer = null;
function onSave() {
  const name = fullName.value.trim();
  if (!name) return;
  authStore.updateProfile({ fullName: name, segment: segment.value });
  saved.value = true;
  clearTimeout(savedTimer);
  savedTimer = setTimeout(() => (saved.value = false), 2000);
}

const roleLabel = computed(
  () =>
    ({
      ADMIN: t("Administrador", "Administrator"),
      RESIDENT: t("Residente", "Resident"),
      GUEST: t("Invitado", "Guest"),
    }[user.value?.role ?? "RESIDENT"] ?? user.value?.role)
);

const segments = computed(() => [
  {
    value: "HOMEOWNER",
    label: t("Propietario de vivienda", "Homeowner"),
    desc: t("Dueño del hogar y del medidor.", "Owns the home and the meter."),
  },
  {
    value: "TENANT",
    label: t("Estudiante / Inquilino", "Student / Tenant"),
    desc: t("Alquila o comparte la vivienda.", "Rents or shares the home."),
  },
]);
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="font-display text-2xl font-extrabold text-slate-900 dark:text-white">
        {{ t("Configuración", "Settings") }}
      </h2>
      <p class="text-sm text-slate-500 dark:text-slate-400">
        {{ t("Administra tu cuenta y preferencias.", "Manage your account and preferences.") }}
      </p>
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <!-- Datos de la cuenta -->
      <UiCard>
        <UiCardTitle>
          {{ t("Datos de la cuenta", "Account details") }}
          <template #action>
            <UserIcon class="h-4 w-4 text-slate-400" />
          </template>
        </UiCardTitle>

        <form
          class="space-y-4"
          @submit.prevent="onSave"
        >
          <UiField :label="t('Nombre para mostrar', 'Display name')">
            <input
              v-model="fullName"
              :placeholder="t('Tu nombre', 'Your name')"
              class="input-field"
            >
          </UiField>

          <UiField :label="t('Correo electrónico', 'Email')">
            <div
              class="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500 dark:border-navy-800 dark:bg-navy-950/60 dark:text-slate-400"
            >
              <Mail class="h-4 w-4 shrink-0" />
              <span class="truncate">{{ user?.email }}</span>
            </div>
            <p class="mt-1 text-xs text-slate-400">
              {{ t("El correo no se puede cambiar aquí.", "Email can't be changed here.") }}
            </p>
          </UiField>

          <UiField :label="t('Rol', 'Role')">
            <div class="flex items-center gap-2">
              <span
                class="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300"
              >
                <Shield class="h-4 w-4" />
              </span>
              <UiBadge color="blue">
                {{ roleLabel }}
              </UiBadge>
            </div>
          </UiField>

          <div class="flex items-center gap-3 pt-1">
            <UiButton
              type="submit"
              :disabled="!dirty"
            >
              <Save class="h-4 w-4" /> {{ t("Guardar cambios", "Save changes") }}
            </UiButton>
            <span
              v-if="saved"
              class="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400"
            >
              <Check class="h-4 w-4" /> {{ t("Guardado", "Saved") }}
            </span>
          </div>
        </form>
      </UiCard>

      <div class="space-y-6">
        <!-- Segmento -->
        <UiCard>
          <UiCardTitle>
            {{ t("Segmento", "Segment") }}
            <template #action>
              <Users class="h-4 w-4 text-slate-400" />
            </template>
          </UiCardTitle>

          <p class="mb-3 text-xs text-slate-400">
            {{ t("Personaliza las recomendaciones según tu perfil.", "Tailors recommendations to your profile.") }}
          </p>

          <div class="space-y-2.5">
            <button
              v-for="s in segments"
              :key="s.value"
              type="button"
              :class="[
                'flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors',
                segment === s.value
                  ? 'border-blue-500 bg-blue-50/60 dark:border-blue-500/60 dark:bg-blue-500/10'
                  : 'border-slate-200 hover:border-slate-300 dark:border-navy-800 dark:hover:border-navy-700',
              ]"
              @click="segment = s.value"
            >
              <span
                :class="[
                  'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                  segment === s.value
                    ? 'border-blue-600 bg-blue-600'
                    : 'border-slate-300 dark:border-navy-600',
                ]"
              >
                <span
                  v-if="segment === s.value"
                  class="h-1.5 w-1.5 rounded-full bg-white"
                />
              </span>
              <span>
                <span class="block text-sm font-semibold text-slate-900 dark:text-white">{{ s.label }}</span>
                <span class="block text-xs text-slate-500 dark:text-slate-400">{{ s.desc }}</span>
              </span>
            </button>
          </div>

          <p class="mt-3 text-xs text-slate-400">
            {{ t("Recuerda guardar los cambios arriba.", "Remember to save changes above.") }}
          </p>
        </UiCard>

        <!-- Preferencias -->
        <UiCard>
          <UiCardTitle>
            {{ t("Preferencias", "Preferences") }}
            <template #action>
              <Languages class="h-4 w-4 text-slate-400" />
            </template>
          </UiCardTitle>

          <div class="space-y-4">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-sm font-semibold text-slate-900 dark:text-white">
                  {{ t("Idioma", "Language") }}
                </p>
                <p class="text-xs text-slate-400">
                  {{ t("Español o inglés.", "Spanish or English.") }}
                </p>
              </div>
              <div class="inline-flex rounded-lg border border-slate-200 p-0.5 dark:border-navy-800">
                <button
                  v-for="l in ['es', 'en']"
                  :key="l"
                  type="button"
                  :class="[
                    'rounded-md px-3 py-1.5 text-xs font-bold transition-colors',
                    lang === l
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white',
                  ]"
                  @click="langStore.setLang(l)"
                >
                  {{ l.toUpperCase() }}
                </button>
              </div>
            </div>

            <div class="flex items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-navy-800">
              <div>
                <p class="text-sm font-semibold text-slate-900 dark:text-white">
                  {{ t("Tema", "Theme") }}
                </p>
                <p class="text-xs text-slate-400">
                  {{ t("Claro u oscuro.", "Light or dark.") }}
                </p>
              </div>
              <button
                type="button"
                class="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-blue-400 hover:text-blue-600 dark:border-navy-800 dark:text-slate-300 dark:hover:text-blue-400"
                @click="themeStore.toggle()"
              >
                <Sun
                  v-if="theme === 'dark'"
                  class="h-4 w-4"
                />
                <Moon
                  v-else
                  class="h-4 w-4"
                />
                {{ theme === "dark" ? t("Oscuro", "Dark") : t("Claro", "Light") }}
              </button>
            </div>
          </div>
        </UiCard>
      </div>
    </div>
  </div>
</template>
