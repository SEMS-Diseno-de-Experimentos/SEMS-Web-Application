<script setup>
import { ref } from "vue";
import { LoaderCircle, ArrowLeft, MailCheck } from "lucide-vue-next";
import AuthShell from "@/components/AuthShell.vue";
import UiField from "@/components/ui/UiField.vue";
import { forgotPassword } from "@/services/auth.service";
import { useLangStore } from "@/stores/lang";

const { t } = useLangStore();

const email = ref("");
const loading = ref(false);
const sent = ref(false);

// No se distingue entre exito y fallo a proposito: el mensaje es el mismo
// exista o no el correo. Si cambiara, cualquiera podria averiguar que
// direcciones estan registradas probandolas una a una.
async function onSubmit() {
  loading.value = true;
  try {
    await forgotPassword(email.value);
  } finally {
    loading.value = false;
    sent.value = true;
  }
}
</script>

<template>
  <AuthShell
    :title="t('Recupera tu contraseña', 'Reset your password')"
    :subtitle="t('Te enviaremos un enlace a tu correo.', `We'll email you a reset link.`)"
  >
    <div
      v-if="sent"
      class="space-y-4 text-center"
    >
      <span
        class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
      >
        <MailCheck class="h-6 w-6" />
      </span>
      <p class="text-sm text-slate-600 dark:text-slate-300">
        {{
          t(
            "Si el correo existe, te enviamos un enlace para restablecer tu contraseña. Revisa tu bandeja (y spam).",
            "If the email exists, we sent a link to reset your password. Check your inbox (and spam)."
          )
        }}
      </p>
      <RouterLink
        to="/login"
        class="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
      >
        <ArrowLeft class="h-4 w-4" /> {{ t("Volver a iniciar sesión", "Back to sign in") }}
      </RouterLink>
    </div>

    <form
      v-else
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
      <button
        type="submit"
        :disabled="loading"
        class="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition-all hover:bg-blue-700 disabled:opacity-60"
      >
        <LoaderCircle
          v-if="loading"
          class="h-4 w-4 animate-spin"
        />
        {{ t("Enviar enlace", "Send link") }}
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
