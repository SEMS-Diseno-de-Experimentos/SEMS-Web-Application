<script setup>
import { ref, computed } from "vue";
import { storeToRefs } from "pinia";
import { User as UserIcon, Mail, Shield, Save, Check, Sun, Moon, Languages } from "lucide-vue-next";
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
const saved = ref(false);

const dirty = computed(
  () =>
    fullName.value.trim() !== (user.value?.fullName ?? "")
);

let savedTimer = null;
function onSave() {
  const name = fullName.value.trim();
  if (!name) return;
  authStore.updateProfile({ fullName: name });
  saved.value = true;
  clearTimeout(savedTimer);
  savedTimer = setTimeout(() => (saved.value = false), 2000);
}
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
