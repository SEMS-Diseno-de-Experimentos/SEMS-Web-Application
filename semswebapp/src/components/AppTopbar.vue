<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { Menu, Moon, Sun, LogOut, ChevronDown, Settings } from "lucide-vue-next";
import { useThemeStore } from "@/stores/theme";
import { useLangStore } from "@/stores/lang";
import { useAuthStore } from "@/stores/auth";
import { DEMO_MODE } from "@/lib/api";

defineProps({ title: { type: String, required: true } });
defineEmits(["menu"]);

const router = useRouter();

const themeStore = useThemeStore();
const { theme } = storeToRefs(themeStore);

const langStore = useLangStore();
const { lang } = storeToRefs(langStore);
const { t } = langStore;

const authStore = useAuthStore();
const { user } = storeToRefs(authStore);

const menuOpen = ref(false);

const initials = computed(() =>
  (user.value?.fullName ?? "U")
    .split(" ")
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase()
);

const segmentLabel = computed(() =>
  user.value?.segment === "HOMEOWNER"
    ? t("Propietario de vivienda", "Homeowner")
    : t("Estudiante / Inquilino", "Student / Tenant")
);

function goToSettings() {
  menuOpen.value = false;
  router.push("/settings");
}
</script>

<template>
  <header
    class="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/85 px-5 backdrop-blur-md dark:border-navy-800 dark:bg-navy-950/85"
  >
    <div class="flex items-center gap-3">
      <button
        type="button"
        class="text-slate-500 lg:hidden"
        :aria-label="t('Abrir menú', 'Open menu')"
        @click="$emit('menu')"
      >
        <Menu class="h-6 w-6" />
      </button>
      <h1 class="font-display text-lg font-bold text-slate-900 dark:text-white">
        {{ title }}
      </h1>
      <span
        v-if="DEMO_MODE"
        class="hidden rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 sm:inline dark:bg-amber-500/15 dark:text-amber-300"
      >
        {{ t("Modo demo", "Demo mode") }}
      </span>
    </div>

    <div class="flex items-center gap-2">
      <button
        type="button"
        class="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-xs font-bold text-slate-600 transition-colors hover:border-blue-400 hover:text-blue-600 dark:border-navy-800 dark:text-slate-300 dark:hover:text-blue-400"
        :aria-label="t('Cambiar idioma', 'Change language')"
        :title="t('Cambiar idioma', 'Change language')"
        @click="langStore.toggle()"
      >
        {{ lang === "es" ? "EN" : "ES" }}
      </button>

      <button
        type="button"
        class="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:border-blue-400 hover:text-blue-600 dark:border-navy-800 dark:text-slate-300 dark:hover:text-blue-400"
        :aria-label="t('Cambiar tema', 'Toggle theme')"
        @click="themeStore.toggle()"
      >
        <Sun
          v-if="theme === 'dark'"
          class="h-[18px] w-[18px]"
        />
        <Moon
          v-else
          class="h-[18px] w-[18px]"
        />
      </button>

      <div class="relative">
        <button
          type="button"
          class="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-slate-100 dark:hover:bg-navy-800"
          @click="menuOpen = !menuOpen"
        >
          <span class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
            {{ initials }}
          </span>
          <span class="hidden text-sm font-medium text-slate-700 sm:block dark:text-slate-200">
            {{ user?.fullName ?? t("Usuario", "User") }}
          </span>
          <ChevronDown class="h-4 w-4 text-slate-400" />
        </button>

        <template v-if="menuOpen">
          <!-- Capa invisible: un clic en cualquier parte cierra el menu -->
          <div
            class="fixed inset-0 z-10"
            @click="menuOpen = false"
          />
          <div
            class="absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-navy-800 dark:bg-navy-900"
          >
            <div class="border-b border-slate-100 px-4 py-3 dark:border-navy-800">
              <p class="text-sm font-semibold text-slate-900 dark:text-white">
                {{ user?.fullName }}
              </p>
              <p class="truncate text-xs text-slate-400">
                {{ user?.email }}
              </p>
              <span
                v-if="user?.segment"
                class="mt-1.5 inline-block rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
              >
                {{ segmentLabel }}
              </span>
            </div>
            <button
              type="button"
              class="flex w-full items-center gap-2 border-b border-slate-100 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 dark:border-navy-800 dark:text-slate-200 dark:hover:bg-navy-800"
              @click="goToSettings"
            >
              <Settings class="h-4 w-4" />
              {{ t("Configuración", "Settings") }}
            </button>
            <button
              type="button"
              class="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
              @click="authStore.logout()"
            >
              <LogOut class="h-4 w-4" />
              {{ t("Cerrar sesión", "Sign out") }}
            </button>
          </div>
        </template>
      </div>
    </div>
  </header>
</template>
