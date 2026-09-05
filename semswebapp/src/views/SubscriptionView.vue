<script setup>
import { ref, computed, onMounted } from "vue";
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import { storeToRefs } from "pinia";
import { Check, CreditCard, Star, Plus, LoaderCircle, Download, Trash2 } from "lucide-vue-next";
import UiCard from "@/components/ui/UiCard.vue";
import UiCardTitle from "@/components/ui/UiCardTitle.vue";
import UiBadge from "@/components/ui/UiBadge.vue";
import UiButton from "@/components/ui/UiButton.vue";
import UiLoading from "@/components/ui/UiLoading.vue";
import UiErrorState from "@/components/ui/UiErrorState.vue";
import AddCardModal from "@/components/AddCardModal.vue";
import {
  getPlans,
  getMySubscription,
  changePlan,
  cancelSubscription,
  getPaymentMethods,
  getInvoices,
  createCheckoutSession,
  deletePaymentMethod,
} from "@/services/subscriptions.service";
import { soles } from "@/lib/format";
import { useAuthStore } from "@/stores/auth";
import { useLangStore } from "@/stores/lang";
import { STRIPE_ENABLED } from "@/lib/stripe";

const qc = useQueryClient();
const { user } = storeToRefs(useAuthStore());
const { t } = useLangStore();

const INV_COLOR = { PAID: "green", PENDING: "amber", FAILED: "rose" };

const PENDING_PLAN_KEY = "sems-pending-plan";

const addOpen = ref(false);
const payError = ref("");
const paidMsg = ref("");

const enabled = computed(() => Boolean(user.value));

const { data: sub, isLoading: loadingSub } = useQuery({
  queryKey: computed(() => ["subscription", user.value?.id]),
  queryFn: () => getMySubscription(user.value.id),
  enabled,
});

const { data: plans, isLoading: loadingPlans, isError: errorPlans } = useQuery({
  queryKey: ["plans"],
  queryFn: getPlans,
});

const { data: methods, isLoading: loadingMethods, isError: errorMethods } = useQuery({
  queryKey: computed(() => ["paymentMethods", user.value?.id]),
  queryFn: () => getPaymentMethods(user.value.id),
  enabled,
});

const { data: invoices, isLoading: loadingInvoices, isError: errorInvoices } = useQuery({
  queryKey: computed(() => ["invoices", user.value?.id]),
  queryFn: () => getInvoices(user.value.id),
  enabled,
});

const subLabel = computed(() => ({
  ACTIVE: t("Activa", "Active"),
  TRIAL: t("Prueba gratis", "Free trial"),
  CANCELED: t("Cancelada", "Canceled"),
  PAST_DUE: t("Pago pendiente", "Past due"),
}));

const invLabel = computed(() => ({
  PAID: t("Pagada", "Paid"),
  PENDING: t("Pendiente", "Pending"),
  FAILED: t("Fallida", "Failed"),
}));

/**
 * Elegir plan.
 *
 * Si el plan cuesta, se abre Stripe Checkout y el cambio se aplica al volver
 * del pago: aplicarlo antes dejaria al usuario con un plan que no pago si
 * abandona la pasarela. Si es gratis, se cambia directo.
 */
const choose = useMutation({
  mutationFn: async (plan) => {
    if (plan.price > 0) {
      // Se guarda el plan elegido para aplicarlo al regresar del pago.
      localStorage.setItem(PENDING_PLAN_KEY, JSON.stringify({ planId: plan.id }));
      const url = await createCheckoutSession({
        userId: user.value.id,
        amount: plan.price,
        subscriptionId: sub.value?.id,
        planName: plan.name,
      });
      if (url) {
        window.location.href = url; // pasa a la ventana de Stripe
        return;
      }
      // Sin URL (modo demo): se aplica el cambio directo.
    }
    await changePlan({ planId: plan.id, subscriptionId: sub.value?.id, userId: user.value.id });
  },
  onMutate: () => {
    payError.value = "";
    paidMsg.value = "";
  },
  onSuccess: (_data, plan) => {
    qc.setQueriesData({ queryKey: ["subscription", user.value?.id] }, (old) =>
      old
        ? { ...old, planId: plan.id, planName: plan.name, price: plan.price, period: plan.period, status: "ACTIVE" }
        : old
    );
    qc.invalidateQueries({ queryKey: ["invoices"] });
  },
  onError: () => {
    payError.value = t(
      "No se pudo iniciar el pago. Inténtalo de nuevo.",
      "Could not start the payment. Please try again."
    );
  },
});

// Pagar una factura pendiente: abre Stripe Checkout por ese monto.
const payInvoice = useMutation({
  mutationFn: async (amount) => {
    const url = await createCheckoutSession({
      userId: user.value.id,
      amount,
      subscriptionId: sub.value?.id,
    });
    if (url) window.location.href = url;
  },
  onError: () => {
    payError.value = t("No se pudo iniciar el pago.", "Could not start the payment.");
  },
});

const removeCard = useMutation({
  mutationFn: deletePaymentMethod,
  onSuccess: () => qc.invalidateQueries({ queryKey: ["paymentMethods"] }),
});

const cancel = useMutation({
  mutationFn: () => cancelSubscription(sub.value.id),
  onSuccess: () => {
    qc.setQueriesData({ queryKey: ["subscription", user.value?.id] }, (old) =>
      old ? { ...old, status: "CANCELED" } : old
    );
  },
});

// Al volver de Stripe Checkout: aplica el plan pendiente y limpia la URL.
onMounted(() => {
  const params = new URLSearchParams(window.location.search);

  if (params.get("paid") === "1") {
    const raw = localStorage.getItem(PENDING_PLAN_KEY);
    if (raw) {
      try {
        const { planId } = JSON.parse(raw);
        changePlan({ planId, subscriptionId: sub.value?.id, userId: user.value.id }).catch(() => {});
      } catch {
        /* dato corrupto: se ignora y se limpia igual */
      }
      localStorage.removeItem(PENDING_PLAN_KEY);
    }
    paidMsg.value = t(
      "¡Pago realizado! Tu comprobante llegará por correo.",
      "Payment complete! Your receipt will arrive by email."
    );
    qc.invalidateQueries({ queryKey: ["invoices"] });
    qc.invalidateQueries({ queryKey: ["subscription"] });
    window.history.replaceState({}, "", "/subscription");
  } else if (params.get("canceled") === "1") {
    payError.value = t("Pago cancelado.", "Payment canceled.");
    window.history.replaceState({}, "", "/subscription");
  }
});

function isChoosing(planId) {
  return choose.isPending.value && choose.variables.value?.id === planId;
}
function isRemoving(id) {
  return removeCard.isPending.value && removeCard.variables.value === id;
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="font-display text-2xl font-extrabold text-slate-900 dark:text-white">
        {{ t("Suscripción y pagos", "Subscription & payments") }}
      </h2>
      <p class="text-sm text-slate-500 dark:text-slate-400">
        {{ t("Gestiona tu plan, métodos de pago y facturas.", "Manage your plan, payment methods and invoices.") }}
      </p>
    </div>

    <!-- Suscripcion actual -->
    <UiCard class="bg-gradient-to-br from-blue-600 to-blue-700 text-white dark:from-blue-600 dark:to-blue-800">
      <div
        v-if="loadingSub"
        class="py-6 text-center text-blue-100"
      >
        {{ t("Cargando...", "Loading...") }}
      </div>
      <div
        v-else-if="sub"
        class="flex flex-wrap items-center justify-between gap-4"
      >
        <div>
          <p class="text-sm text-blue-100/90">
            {{ t("Tu plan actual", "Your current plan") }}
          </p>
          <div class="mt-1 flex items-center gap-3">
            <p class="font-display text-3xl font-extrabold">
              {{ sub.planName }}
            </p>
            <span class="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold">
              {{ subLabel[sub.status] }}
            </span>
          </div>
          <p class="mt-1 text-sm text-blue-100/80">
            {{ soles(sub.price) }} / {{ sub.period }} · {{ t("se renueva el", "renews on") }}
            {{ sub.renewalDate }}
          </p>
        </div>
        <button
          v-if="sub.status === 'ACTIVE'"
          type="button"
          :disabled="cancel.isPending.value"
          class="inline-flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/25 disabled:opacity-60"
          @click="cancel.mutate()"
        >
          <LoaderCircle
            v-if="cancel.isPending.value"
            class="h-4 w-4 animate-spin"
          />
          {{ t("Cancelar renovación", "Cancel renewal") }}
        </button>
      </div>
      <p
        v-else
        class="py-6 text-center text-blue-100"
      >
        {{ t("No tienes una suscripción activa.", "You have no active subscription.") }}
      </p>
    </UiCard>

    <!-- Planes -->
    <div>
      <h3 class="mb-4 font-display text-lg font-bold text-slate-900 dark:text-white">
        {{ t("Cambia de plan", "Change plan") }}
      </h3>

      <p
        v-if="paidMsg"
        class="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
      >
        {{ paidMsg }}
      </p>
      <p
        v-if="payError"
        class="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
      >
        {{ payError }}
      </p>

      <UiLoading v-if="loadingPlans" />
      <UiErrorState v-else-if="errorPlans || !plans" />
      <div
        v-else
        class="grid gap-5 lg:grid-cols-3"
      >
        <div
          v-for="plan in plans"
          :key="plan.id"
          :class="[
            'relative flex flex-col rounded-card border p-6',
            plan.recommended
              ? 'border-blue-600 bg-white shadow-md dark:bg-navy-900'
              : 'border-slate-200 bg-white dark:border-navy-800 dark:bg-navy-900',
          ]"
        >
          <span
            v-if="plan.recommended"
            class="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white"
          >
            <Star
              class="h-3 w-3"
              fill="white"
            /> {{ t("Recomendado", "Recommended") }}
          </span>

          <h4 class="font-display text-lg font-bold text-slate-900 dark:text-white">
            {{ plan.name }}
          </h4>
          <div class="mt-2 flex items-end gap-1">
            <span class="font-display text-3xl font-extrabold text-slate-900 dark:text-white">
              {{ soles(plan.price) }}
            </span>
            <span class="mb-1 text-sm text-slate-400">/{{ plan.period }}</span>
          </div>

          <ul class="mt-5 flex-1 space-y-2.5">
            <li
              v-for="f in plan.features"
              :key="f"
              class="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300"
            >
              <Check class="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
              {{ f }}
            </li>
          </ul>

          <div class="mt-6">
            <UiButton
              v-if="sub?.planId === plan.id"
              variant="outline"
              class="w-full"
              disabled
            >
              {{ t("Plan actual", "Current plan") }}
            </UiButton>
            <UiButton
              v-else
              :variant="plan.recommended ? 'primary' : 'outline'"
              class="w-full"
              :disabled="choose.isPending.value"
              @click="choose.mutate(plan)"
            >
              <LoaderCircle
                v-if="isChoosing(plan.id)"
                class="h-4 w-4 animate-spin"
              />
              {{
                plan.price > 0
                  ? `${t("Pagar", "Pay")} ${soles(plan.price)}`
                  : `${t("Elegir", "Choose")} ${plan.name}`
              }}
            </UiButton>
          </div>
        </div>
      </div>
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <!-- Metodos de pago -->
      <UiCard>
        <UiCardTitle>
          {{ t("Métodos de pago", "Payment methods") }}
          <template #action>
            <UiButton
              v-if="STRIPE_ENABLED"
              variant="ghost"
              class="!py-1 !text-xs"
              @click="addOpen = true"
            >
              <Plus class="h-3.5 w-3.5" /> {{ t("Agregar", "Add") }}
            </UiButton>
          </template>
        </UiCardTitle>

        <UiLoading v-if="loadingMethods" />
        <UiErrorState v-else-if="errorMethods || !methods" />
        <p
          v-else-if="methods.length === 0"
          class="py-6 text-center text-sm text-slate-400"
        >
          {{
            STRIPE_ENABLED
              ? t('Aún no tienes tarjetas. Agrega una con "Agregar".', 'No cards yet. Add one with "Add".')
              : t("No hay métodos de pago.", "No payment methods.")
          }}
        </p>
        <ul
          v-else
          class="space-y-3"
        >
          <li
            v-for="m in methods"
            :key="m.id"
            class="flex items-center gap-3 rounded-lg border border-slate-100 p-3 dark:border-navy-800"
          >
            <span
              class="flex h-9 w-12 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600 dark:bg-navy-800 dark:text-slate-300"
            >
              <CreditCard class="h-4 w-4" />
            </span>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-slate-900 dark:text-white">
                {{ m.brand }} •••• {{ m.last4 }}
              </p>
              <p class="text-xs text-slate-400">
                {{ t("Vence", "Expires") }} {{ String(m.expMonth).padStart(2, "0") }}/{{ m.expYear }}
              </p>
            </div>
            <UiBadge
              v-if="m.primary"
              color="blue"
            >
              {{ t("Principal", "Default") }}
            </UiBadge>
            <button
              type="button"
              :disabled="removeCard.isPending.value"
              :aria-label="t('Eliminar tarjeta', 'Delete card')"
              class="text-slate-300 transition-colors hover:text-rose-500 disabled:opacity-50 dark:text-navy-700 dark:hover:text-rose-400"
              @click="removeCard.mutate(m.id)"
            >
              <LoaderCircle
                v-if="isRemoving(m.id)"
                class="h-4 w-4 animate-spin"
              />
              <Trash2
                v-else
                class="h-4 w-4"
              />
            </button>
          </li>
        </ul>
      </UiCard>

      <!-- Facturas -->
      <UiCard>
        <UiCardTitle>{{ t("Historial de facturas", "Invoice history") }}</UiCardTitle>
        <UiLoading v-if="loadingInvoices" />
        <UiErrorState v-else-if="errorInvoices || !invoices" />
        <p
          v-else-if="invoices.length === 0"
          class="py-6 text-center text-sm text-slate-400"
        >
          {{ t("Aún no tienes pagos registrados.", "No payments yet.") }}
        </p>
        <ul
          v-else
          class="divide-y divide-slate-100 dark:divide-navy-800"
        >
          <li
            v-for="inv in invoices"
            :key="inv.id"
            class="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
          >
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-slate-900 dark:text-white">
                {{ inv.description }}
              </p>
              <p class="text-xs text-slate-400">
                {{ inv.date }} · {{ inv.id.slice(0, 8) }}
              </p>
            </div>
            <span class="text-sm font-semibold text-slate-900 dark:text-white">{{ soles(inv.amount) }}</span>
            <UiBadge :color="INV_COLOR[inv.status]">
              {{ invLabel[inv.status] }}
            </UiBadge>
            <button
              v-if="inv.status === 'PENDING'"
              type="button"
              :disabled="payInvoice.isPending.value"
              class="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
              @click="payInvoice.mutate(inv.amount)"
            >
              {{ t("Pagar", "Pay") }}
            </button>
            <button
              type="button"
              class="text-slate-400 transition-colors hover:text-blue-600"
              :aria-label="t('Descargar', 'Download')"
            >
              <Download class="h-4 w-4" />
            </button>
          </li>
        </ul>
      </UiCard>
    </div>

    <AddCardModal
      v-if="addOpen && user"
      :user-id="user.id"
      @close="addOpen = false"
      @saved="qc.invalidateQueries({ queryKey: ['paymentMethods'] })"
    />
  </div>
</template>
