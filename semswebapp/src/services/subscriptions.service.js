import { api, DEMO_MODE, delay } from "@/lib/api";
import {
  demoPlans,
  demoSubscription,
  demoPaymentMethods,
  demoInvoices,
} from "@/lib/demoExtra";
import { tierFromName } from "@/lib/plan";

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
    // El plan intermedio es el que se destaca. Antes el nivel se deducia
    // buscando "plus" en el nombre, que con el catalogo actual (Básico, Pro,
    // Enterprise) no es ninguno: la pagina de planes se quedaba sin
    // recomendacion.
    recommended: tierFromName(p.Name) === "pro",
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

// El catalogo de planes es el mismo para todos y cambia muy de vez en cuando,
// pero lo necesitan la pagina de suscripcion, el menu lateral y cada pantalla
// que comprueba el nivel del plan. Se recuerda un minuto para que una carga de
// pantalla no lo pida tres veces; no es cache de datos del usuario, asi que no
// hay nada que pueda quedarse obsoleto para nadie.
const VIGENCIA_PLANES = 60_000;
let peticionDePlanes = null;
let planesPedidosEn = 0;

/** @returns {Promise<import("../types/billing").SubscriptionPlan[]>} */
export async function getPlans() {
  if (DEMO_MODE) {
    await delay();
    return demoPlans;
  }
  // Se recuerda la PROMESA y no el resultado: la pantalla de suscripcion y la
  // consulta del plan contratado arrancan a la vez, y recordando solo el
  // resultado las dos salian antes de que ninguna hubiera respondido.
  if (!peticionDePlanes || Date.now() - planesPedidosEn >= VIGENCIA_PLANES) {
    planesPedidosEn = Date.now();
    peticionDePlanes = api.get(`${BASE}/subscription-plans`)
      .then(({ data }) => (data ?? []).map(mapPlan))
      .catch((fallo) => {
        // Un fallo no se cachea: la siguiente llamada vuelve a intentarlo.
        peticionDePlanes = null;
        throw fallo;
      });
  }
  return peticionDePlanes;
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
  // El catalogo solo sirve para poner nombre y precio al plan contratado, y
  // pasa por getPlans para no volver a pedirlo si ya se pidio hace nada.
  const [subsRes, plansRes] = await Promise.allSettled([
    api.get(`${BASE}/subscriptions/users/${userId}`),
    getPlans(),
  ]);
  const subs = subsRes.status === "fulfilled" ? subsRes.value.data ?? [] : [];
  const plans = plansRes.status === "fulfilled" ? plansRes.value : [];
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
 * Historial de comprobantes (US44).
 *
 * El modulo de pagos no expone "facturas por usuario", asi que la lista se arma
 * desde los pagos y cada uno se completa con su comprobante.
 *
 * Antes se quedaba en el pago y mostraba "Pago PEN" como descripcion: el numero
 * de comprobante y su PDF nunca llegaban a la pantalla, que es justo lo que uno
 * necesita para rendir el gasto. Ahora se pide el comprobante de cada pago.
 *
 * Un pago sin comprobante emitido no es un error: sigue en la lista sin numero,
 * porque el pago existe aunque la factura aun no se haya emitido. Por eso cada
 * consulta va por separado y un fallo suelto no tumba el historial.
 *
 * @returns {Promise<import("../types/billing").Invoice[]>}
 */
export async function getInvoices(userId) {
  if (DEMO_MODE) {
    await delay();
    return demoInvoices;
  }
  const { data } = await api.get(`${BASE}/payments/user/${userId}`);
  const pagos = data ?? [];
  const comprobantes = await Promise.all(
    pagos.map(async (p) => {
      try {
        const { data: inv } = await api.get(`${BASE}/invoices/payment/${p.payment_id}`);
        return inv;
      } catch {
        return null;
      }
    })
  );
  return pagos.map((p, i) => {
    const inv = comprobantes[i];
    return {
      id: inv?.invoice_id ?? p.payment_id,
      number: inv?.invoice_number ?? null,
      pdfUrl: inv?.pdf_url ?? null,
      date: (inv?.issued_at || p.paid_at || p.created_at || "").slice(0, 10),
      amount: inv?.total_amount ?? p.amount ?? 0,
      status: p.status === "paid" ? "PAID" : p.status === "failed" ? "FAILED" : "PENDING",
      description: inv?.invoice_number
        ? `Comprobante ${inv.invoice_number}`
        : `Pago ${String(p.currency ?? "PEN").toUpperCase()}`,
    };
  });
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
