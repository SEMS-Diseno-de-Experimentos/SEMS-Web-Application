<script setup>
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { LoaderCircle, CircleCheck, CircleX } from "lucide-vue-next";
import AuthShell from "@/components/AuthShell.vue";
import { verifyAccount } from "@/services/auth.service";
import { useLangStore } from "@/stores/lang";

const route = useRoute();
const { t } = useLangStore();

const state = ref("loading"); // loading | ok | error

// El token es de un solo uso: en cuanto el backend lo consume deja de servir.
// Por eso se verifica una unica vez, al montar.
onMounted(async () => {
  const token = route.query.token ?? "";
  if (!token) {
    state.value = "error";
    return;
  }
  try {
    await verifyAccount(token);
    state.value = "ok";
  } catch {
    state.value = "error";
  }
});
</script>

<template>
  <AuthShell
    :title="t('Verificación de cuenta', 'Account verification')"
    :subtitle="t('Estamos activando tu cuenta.', `We're activating your account.`)"
  >
    <div class="space-y-4 text-center">
      <template v-if="state === 'loading'">
        <LoaderCircle class="mx-auto h-8 w-8 animate-spin text-blue-600" />
        <p class="text-sm text-slate-600 dark:text-slate-300">
          {{ t("Verificando…", "Verifying…") }}
        </p>
      </template>

      <template v-else-if="state === 'ok'">
        <span
          class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
        >
          <CircleCheck class="h-6 w-6" />
        </span>
        <p class="text-sm text-slate-600 dark:text-slate-300">
          {{ t("¡Tu cuenta fue verificada! Ya puedes iniciar sesión.", "Your account is verified! You can sign in now.") }}
        </p>
        <RouterLink
          to="/login"
          class="inline-block rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          {{ t("Iniciar sesión", "Sign in") }}
        </RouterLink>
      </template>

      <template v-else>
        <span
          class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300"
        >
          <CircleX class="h-6 w-6" />
        </span>
        <p class="text-sm text-slate-600 dark:text-slate-300">
          {{ t("El enlace es inválido o expiró.", "The link is invalid or expired.") }}
        </p>
        <RouterLink
          to="/login"
          class="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
        >
          {{ t("Ir a iniciar sesión", "Go to sign in") }}
        </RouterLink>
      </template>
    </div>
  </AuthShell>
</template>
