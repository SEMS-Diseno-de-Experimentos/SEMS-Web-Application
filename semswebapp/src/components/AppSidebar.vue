<script setup>
import { computed } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { storeToRefs } from "pinia";
import {
  LayoutDashboard, Cpu, Activity, LineChart, Bell, FileText, Home, CreditCard, Zap, X, Lock,
} from "lucide-vue-next";
import { getMySubscription } from "@/services/subscriptions.service";
import { useAuthStore } from "@/stores/auth";
import { useLangStore } from "@/stores/lang";
import { usePlanTier } from "@/composables/usePlan";
import { hasTier } from "@/lib/plan";

defineProps({ open: { type: Boolean, default: false } });
defineEmits(["close"]);

const { t } = useLangStore();
const { user } = storeToRefs(useAuthStore());
const tier = usePlanTier();

// `min` marca las secciones que piden un plan superior. No se ocultan: se
// muestran con candado para que el usuario sepa que existen.
// `exact` en "/" es necesario: vue-router considera activa una ruta cuando es
// prefijo de la actual, asi que sin esto "Resumen" saldria resaltado en todas
// las paginas.
const nav = computed(() => [
  { to: "/", label: t("Resumen", "Overview"), icon: LayoutDashboard, exact: true },
  { to: "/devices", label: t("Dispositivos", "Devices"), icon: Cpu },
  { to: "/monitoring", label: t("Monitoreo", "Monitoring"), icon: Activity },
  { to: "/analytics", label: t("Analítica", "Analytics"), icon: LineChart, min: "plus" },
  { to: "/alerts", label: t("Alertas", "Alerts"), icon: Bell },
  { to: "/reports", label: t("Reportes", "Reports"), icon: FileText, min: "plus" },
  { to: "/subscription", label: t("Suscripción", "Subscription"), icon: CreditCard },
  { to: "/household", label: t("Hogar", "Household"), icon: Home },
]);

// Comparte clave de cache con la pagina de Suscripcion: no genera peticion extra.
const { data: subscription } = useQuery({
  queryKey: computed(() => ["subscription", user.value?.id]),
  queryFn: () => getMySubscription(user.value.id),
  enabled: computed(() => Boolean(user.value)),
});

const planName = computed(() => subscription.value?.planName);
const isPaid = computed(() => Boolean(planName.value) && (subscription.value?.price ?? 0) > 0);
</script>

<template>
  <!-- Fondo oscuro solo en movil: al tocarlo se cierra el menu -->
  <div
    v-if="open"
    class="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm lg:hidden"
    @click="$emit('close')"
  />

  <aside
    :class="[
      'fixed inset-y-0 left-0 z-40 w-64 transform border-r border-slate-200 bg-white transition-transform dark:border-navy-800 dark:bg-navy-900 lg:translate-x-0',
      open ? 'translate-x-0' : '-translate-x-full',
    ]"
  >
    <div class="flex h-16 items-center justify-between px-5">
      <div class="flex items-center gap-2.5">
        <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600">
          <Zap
            class="h-5 w-5 text-white"
            fill="white"
          />
        </span>
        <span class="font-display text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
          SEMS
        </span>
      </div>
      <button
        type="button"
        class="text-slate-400 lg:hidden"
        :aria-label="t('Cerrar menú', 'Close menu')"
        @click="$emit('close')"
      >
        <X class="h-5 w-5" />
      </button>
    </div>

    <nav class="px-3 py-4">
      <p class="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
        {{ t("Panel", "Menu") }}
      </p>
      <ul class="space-y-1">
        <li
          v-for="item in nav"
          :key="item.to"
        >
          <RouterLink
            v-slot="{ isActive, isExactActive, href, navigate }"
            :to="item.to"
            custom
          >
            <a
              :href="href"
              :class="[
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                (item.exact ? isExactActive : isActive)
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-navy-800 dark:hover:text-white',
              ]"
              @click="navigate($event); $emit('close')"
            >
              <component
                :is="item.icon"
                class="h-5 w-5"
              />
              <span class="flex-1">{{ item.label }}</span>
              <Lock
                v-if="item.min && !hasTier(tier, item.min)"
                class="h-3.5 w-3.5 text-slate-400"
              />
            </a>
          </RouterLink>
        </li>
      </ul>
    </nav>

    <!-- Tarjeta de plan, anclada abajo -->
    <RouterLink
      to="/subscription"
      class="absolute inset-x-3 bottom-4 block rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 p-4 text-white transition-opacity hover:opacity-95"
      @click="$emit('close')"
    >
      <template v-if="isPaid">
        <p class="text-sm font-bold">
          {{ t("Plan", "Plan") }} {{ planName }}
        </p>
        <p class="mt-1 text-xs text-blue-100/90">
          {{ t("Tu plan está activo. Administra tu suscripción.", "Your plan is active. Manage your subscription.") }}
        </p>
      </template>
      <template v-else>
        <p class="text-sm font-bold">
          {{ t("Mejora tu plan", "Upgrade your plan") }}
        </p>
        <p class="mt-1 text-xs text-blue-100/90">
          {{ t("Desbloquea analítica avanzada y proyección de factura.", "Unlock advanced analytics and bill forecasting.") }}
        </p>
      </template>
    </RouterLink>
  </aside>
</template>
