<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { LoaderCircle } from "lucide-vue-next";
import AuthShell from "@/components/AuthShell.vue";
import UiField from "@/components/ui/UiField.vue";
import { useAuthStore } from "@/stores/auth";
import { useLangStore } from "@/stores/lang";

const router = useRouter();
const authStore = useAuthStore();
const { loading } = storeToRefs(authStore);
const { t } = useLangStore();

const fullName = ref("");
const email = ref("");
const password = ref("");
const error = ref("");

async function onSubmit() {
  error.value = "";
  try {
    await authStore.register(fullName.value, email.value, password.value);
    router.push("/");
  } catch {
    error.value = t(
      "No se pudo crear la cuenta. Intenta nuevamente.",
      "Could not create the account. Please try again."
    );
  }
}
</script>

<template>
  <AuthShell
    :title="t('Crea tu cuenta', 'Create your account')"
    :subtitle="t('Empieza tu prueba gratis de 30 días.', 'Start your 30-day free trial.')"
  >
    <form
      class="space-y-4"
      @submit.prevent="onSubmit"
    >
      <UiField :label="t('Nombre completo', 'Full name')">
        <input
          v-model="fullName"
          type="text"
          required
          :placeholder="t('Tu nombre', 'Your name')"
          class="input-field"
        >
      </UiField>

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
          minlength="6"
          :placeholder="t('Mínimo 6 caracteres', 'At least 6 characters')"
          class="input-field"
        >
      </UiField>

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
        {{ t("Crear cuenta gratis", "Create free account") }}
      </button>
    </form>

    <p class="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
      {{ t("¿Ya tienes cuenta?", "Already have an account?") }}
      <RouterLink
        to="/login"
        class="font-semibold text-blue-600 hover:underline dark:text-blue-400"
      >
        {{ t("Inicia sesión", "Sign in") }}
      </RouterLink>
    </p>
  </AuthShell>
</template>
