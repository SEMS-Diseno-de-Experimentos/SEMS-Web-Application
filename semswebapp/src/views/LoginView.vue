<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { LoaderCircle } from "lucide-vue-next";
import AuthShell from "@/components/AuthShell.vue";
import GoogleSignInButton from "@/components/GoogleSignInButton.vue";
import UiField from "@/components/ui/UiField.vue";
import { useAuthStore } from "@/stores/auth";
import { useLangStore } from "@/stores/lang";
import { DEMO_MODE } from "@/lib/api";

const router = useRouter();
const authStore = useAuthStore();
const { loading } = storeToRefs(authStore);
const { t } = useLangStore();

// En modo demo se rellenan las credenciales para poder entrar de un clic.
const email = ref(DEMO_MODE ? "demo@energix.pe" : "");
const password = ref(DEMO_MODE ? "demo1234" : "");
const error = ref("");

async function onSubmit() {
  error.value = "";
  try {
    await authStore.login(email.value, password.value);
    router.push("/");
  } catch {
    error.value = t(
      "No se pudo iniciar sesión. Verifica tus credenciales.",
      "Could not sign in. Check your credentials."
    );
  }
}

async function onGoogle(idToken) {
  error.value = "";
  try {
    await authStore.loginWithGoogle(idToken);
    router.push("/");
  } catch {
    error.value = t("No se pudo iniciar sesión con Google.", "Could not sign in with Google.");
  }
}
</script>

<template>
  <AuthShell
    :title="t('Bienvenido de nuevo', 'Welcome back')"
    :subtitle="t('Ingresa para ver el consumo de tu hogar.', `Sign in to see your home's energy usage.`)"
  >
    <form
      class="space-y-4"
      @submit.prevent="onSubmit"
    >
      <UiField :label="t('Correo electrónico', 'Email')">
        <input
          v-model="email"
          type="email"
          required
          placeholder="tucorreo@ejemplo.com"
          class="input-field"
        >
      </UiField>

      <UiField :label="t('Contraseña', 'Password')">
        <input
          v-model="password"
          type="password"
          required
          placeholder="••••••••"
          class="input-field"
        >
      </UiField>

      <div class="-mt-1 text-right">
        <RouterLink
          to="/forgot-password"
          class="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
        >
          {{ t("¿Olvidaste tu contraseña?", "Forgot your password?") }}
        </RouterLink>
      </div>

      <p
        v-if="error"
        class="text-sm text-rose-600"
      >
        {{ error }}
      </p>

      <button
        type="submit"
        :disabled="loading"
        class="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition-all hover:bg-blue-700 disabled:opacity-60"
      >
        <LoaderCircle
          v-if="loading"
          class="h-4 w-4 animate-spin"
        />
        {{ t("Iniciar sesión", "Sign in") }}
      </button>

      <div class="relative py-1 text-center">
        <span class="relative z-10 bg-white px-3 text-xs text-slate-400 dark:bg-navy-950">
          {{ t("o continúa con", "or continue with") }}
        </span>
        <div class="absolute inset-x-0 top-1/2 h-px bg-slate-200 dark:bg-navy-800" />
      </div>

      <GoogleSignInButton @credential="onGoogle" />
    </form>

    <p class="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
      {{ t("¿No tienes cuenta?", "Don't have an account?") }}
      <RouterLink
        to="/register"
        class="font-semibold text-blue-600 hover:underline dark:text-blue-400"
      >
        {{ t("Regístrate gratis", "Sign up free") }}
      </RouterLink>
    </p>

    <p
      v-if="DEMO_MODE"
      class="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
    >
      {{
        t(
          "Modo demo activo: ingresa con cualquier correo y contraseña.",
          "Demo mode: sign in with any email and password."
        )
      }}
    </p>
  </AuthShell>
</template>
