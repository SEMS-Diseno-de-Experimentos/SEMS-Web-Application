import { api, DEMO_MODE, delay } from "@/lib/api";
import {
  demoPlans,
  demoSubscription,
  demoPaymentMethods,
  demoInvoices,
} from "@/lib/demoExtra";

// Suscripciones y pagos. Ambos modulos exponen sus rutas bajo /api/v1.
const BASE = "/api/v1";

// ---------------------------------------------------------------------------
// OJO CON EL CASING: el contrato de estos dos modulos NO es uniforme.
//
//   Suscripciones -> peticiones en snake_case, RESPUESTAS EN PascalCase
//   Pagos         -> todo en snake_case
//
// Parece un descuido y no lo es: viene del servicio original y el backend en
// C# lo respeta campo por campo. "Arreglarlo" aqui rompe la pantalla de
// suscripcion en silencio, porque el JSON sigue siendo valido.
// ---------------------------------------------------------------------------

/** @returns {"mes" | "año"} */
function periodLabel(billing) {
  const b = String(billing ?? "").toLowerCase();
  return b.startsWith("year") || b.startsWith("annual") || b === "yearly" ? "año" : "mes";
}

function planFeatures(p) {
  const feats = (p.PlanFeatures ?? [])
    .filter((f) => (f.FeatureCode ?? "").toUpperCase() !== "STRIPE_PRICE_ID")
    .map((f) => f.FeatureName || f.FeatureValue || "")
    .filter(Boolean);
  if (feats.length > 0) return feats;
  return p.Description ? [p.Description] : [];
}

/** @returns {import("../types/billing").SubscriptionPlan} */
function mapPlan(p) {
  return {
    id: p.PlanID ?? "",
    name: p.Name ?? "Plan",
    price: p.Price ?? 0,
    period: periodLabel(p.BillingPeriod),
    features: planFeatures(p),
    recommended: (p.Name ?? "").toLowerCase().includes("pro"),
  };
}

/** @returns {import("../types/billing").SubscriptionStatus} */
function normSubStatus(s) {
  switch (String(s ?? "").toUpperCase()) {
    case "CANCELLED":
    case "CANCELED":
      return "CANCELED";
    case "TRIAL":
    case "TRIALING":
      return "TRIAL";
    case "PAST_DUE":
    case "UNPAID":
      return "PAST_DUE";
    default:
      return "ACTIVE";
  }
}

/** @returns {Promise<import("../types/billing").SubscriptionPlan[]>} */
export async function getPlans() {
  if (DEMO_MODE) {
    await delay();
    return demoPlans;
  }
  const { data } = await api.get(`${BASE}/subscription-plans`);
  return (data ?? []).map(mapPlan);
}

/**
 * Suscripcion actual del usuario, con nombre y precio del plan resueltos.
 * @returns {Promise<import("../types/billing").Subscription | null>}
 */
export async function getMySubscription(userId) {
  if (DEMO_MODE) {
    await delay(300);
    return demoSubscription;
  }
  const [subsRes, plansRes] = await Promise.allSettled([
    api.get(`${BASE}/subscriptions/users/${userId}`),
    api.get(`${BASE}/subscription-plans`),
  ]);
  const subs = subsRes.status === "fulfilled" ? subsRes.value.data ?? [] : [];
  const plans = plansRes.status === "fulfilled" ? (plansRes.value.data ?? []).map(mapPlan) : [];
  if (subs.length === 0) return null;

  // Preferimos una activa; si no, la primera.
  const raw = subs.find((s) => normSubStatus(s.Status) === "ACTIVE") ?? subs[0];
  const plan = plans.find((p) => p.id === raw.PlanID);
  return {
    id: raw.SubscriptionID ?? "",
    planId: raw.PlanID ?? "",
    planName: plan?.name ?? raw.PlanID ?? "Plan",
    status: normSubStatus(raw.Status),
    renewalDate: (raw.EndDate ?? "").slice(0, 10) || "—",
    price: plan?.price ?? 0,
    period: plan?.period ?? "mes",
  };
}

/**
 * Cambia de plan si ya hay suscripcion; si no, crea una nueva.
 * @param {{planId: string, subscriptionId?: string, userId: string}} args
 */
export async function changePlan(args) {
  if (DEMO_MODE) {
    await delay(400);
    return;
  }
  if (args.subscriptionId) {
    await api.patch(`${BASE}/subscriptions/${args.subscriptionId}/change-plan`, { new_plan_id: args.planId });
  } else {
    await api.post(`${BASE}/subscriptions`, { plan_id: args.planId, user_id: args.userId });
  }
}

export async function cancelSubscription(subscriptionId) {
  if (DEMO_MODE) {
    await delay(300);
    return;
  }
  await api.patch(`${BASE}/subscriptions/${subscriptionId}/cancel`);
}

/** @returns {Promise<import("../types/billing").PaymentMethod[]>} */
export async function getPaymentMethods(userId) {
  if (DEMO_MODE) {
    await delay(250);
    return demoPaymentMethods;
  }
  const { data } = await api.get(`${BASE}/payment-methods/user/${userId}`);
  return (data ?? []).map((m) => ({
    id: m.payment_method_id,
    brand: m.brand ? m.brand.charAt(0).toUpperCase() + m.brand.slice(1) : "Tarjeta",
    last4: m.last4 ?? "····",
    expMonth: m.exp_month ?? 0,
    expYear: m.exp_year ?? 0,
    primary: Boolean(m.is_default),
  }));
}

/**
 * Registra en el backend una tarjeta YA TOKENIZADA por Stripe (pm_xxx).
 *
 * El numero completo y el CVV nunca pasan por aqui: los captura el formulario
 * de Stripe y no tocan ni esta aplicacion ni la base de datos.
 */
export async function addPaymentMethod(userId, stripePaymentMethodId) {
  if (DEMO_MODE) {
    await delay(300);
    return;
  }
  await api.post(`${BASE}/payment-methods`, {
    user_id: userId,
    type: "card",
    stripe_payment_method_id: stripePaymentMethodId,
    is_default: true,
  });
}

export async function deletePaymentMethod(paymentMethodId) {
  if (DEMO_MODE) {
    await delay(200);
    return;
  }
  await api.delete(`${BASE}/payment-methods/${paymentMethodId}`);
}

/**
 * Procesa un pago via Stripe (crea el intento de pago y el comprobante).
 * @param {{userId: string, paymentMethodId: string, amount: number, subscriptionId?: string, currency?: string}} args
 */
export async function processPayment(args) {
  if (DEMO_MODE) {
    await delay(500);
    return;
  }
  await api.post(`${BASE}/payments/process`, {
    user_id: args.userId,
    payment_method_id: args.paymentMethodId,
    subscription_id: args.subscriptionId,
    amount: args.amount,
    currency: (args.currency ?? "pen").toLowerCase(),
    payment_method: "card",
  });
}

/**
 * Historial de facturas.
 *
 * El modulo de pagos no expone "facturas por usuario", asi que se arma desde
 * los pagos registrados.
 *
 * @returns {Promise<import("../types/billing").Invoice[]>}
 */
export async function getInvoices(userId) {
  if (DEMO_MODE) {
    await delay();
    return demoInvoices;
  }
  const { data } = await api.get(`${BASE}/payments/user/${userId}`);
  return (data ?? []).map((p) => ({
    id: p.payment_id,
    date: (p.paid_at || p.created_at || "").slice(0, 10),
    amount: p.amount ?? 0,
    status: p.status === "paid" ? "PAID" : p.status === "failed" ? "FAILED" : "PENDING",
    description: `Pago ${String(p.currency ?? "PEN").toUpperCase()}`,
  }));
}

/**
 * Crea una sesion de Stripe Checkout y devuelve la URL a la que redirigir.
 *
 * Con esto el pago ocurre en la pagina de Stripe (RF-BILL-02): la aplicacion
 * nunca toca datos de tarjeta.
 *
 * @param {{userId: string, amount: number, subscriptionId?: string, planName?: string}} args
 * @returns {Promise<string>} la URL de Stripe, o cadena vacia en modo demo
 */
export async function createCheckoutSession(args) {
  if (DEMO_MODE) {
    await delay(300);
    return ""; // en demo no hay redireccion real
  }
  const origin = window.location.origin;
  const { data } = await api.post(`${BASE}/payments/checkout-session`, {
    user_id: args.userId,
    subscription_id: args.subscriptionId,
    amount: args.amount,
    currency: "pen",
    product_name: args.planName ? `SEMS ${args.planName}` : "SEMS",
    success_url: `${origin}/subscription?paid=1`,
    cancel_url: `${origin}/subscription?canceled=1`,
  });
  return data.url;
}
