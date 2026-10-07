<script setup>
import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { LoaderCircle, ArrowLeft } from "lucide-vue-next";
import AuthShell from "@/components/AuthShell.vue";
import UiField from "@/components/ui/UiField.vue";
import { resetPassword } from "@/services/auth.service";
import { useLangStore } from "@/stores/lang";

const route = useRoute();
const router = useRouter();
const { t } = useLangStore();

// El token viaja en el enlace del correo: /reset-password?token=...
const token = computed(() => route.query.token ?? "");

const password = ref("");
const confirm = ref("");
const loading = ref(false);
const error = ref("");

async function onSubmit() {
  error.value = "";
  if (password.value.length < 6) {
    error.value = t(
      "La contraseña debe tener al menos 6 caracteres.",
      "Password must be at least 6 characters."
    );
    return;
  }
  if (password.value !== confirm.value) {
    error.value = t("Las contraseñas no coinciden.", "Passwords don't match.");
    return;
  }

  loading.value = true;
  try {
    await resetPassword(token.value, password.value);
    router.replace("/login");
  } catch {
    error.value = t(
      "El enlace es inválido o expiró. Solicita uno nuevo.",
      "The link is invalid or expired. Request a new one."
    );
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <AuthShell
    :title="t('Nueva contraseña', 'New password')"
    :subtitle="t('Crea una contraseña nueva para tu cuenta.', 'Create a new password for your account.')"
  >
    <div
      v-if="!token"
      class="space-y-4 text-center"
    >
      <p class="text-sm text-rose-600 dark:text-rose-400">
        {{
          t(
            "Falta el token del enlace. Abre el enlace desde tu correo.",
            "The link token is missing. Open the link from your email."
          )
        }}
      </p>
      <RouterLink
        to="/forgot-password"
        class="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
      >
        {{ t("Solicitar un nuevo enlace", "Request a new link") }}
      </RouterLink>
    </div>

    <form
      v-else
      class="space-y-4"
      @submit.prevent="onSubmit"
    >
      <UiField :label="t('Nueva contraseña', 'New password')">
        <input
          v-model="password"
          type="password"
          required
          placeholder="••••••••"
          class="input-field"
        >
      </UiField>
      <UiField :label="t('Confirmar contraseña', 'Confirm password')">
        <input
          v-model="confirm"
          type="password"
          required
          placeholder="••••••••"
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
        {{ t("Cambiar contraseña", "Change password") }}
      </button>
      <RouterLink
        to="/login"
        class="flex items-center justify-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
      >
        <ArrowLeft class="h-4 w-4" /> {{ t("Volver", "Back") }}
      </RouterLink>
    </form>
  </AuthShell>
</template>
