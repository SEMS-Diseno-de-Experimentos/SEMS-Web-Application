// Niveles de plan y que desbloquea cada uno.
//
// Los niveles se llaman como los planes que vende el producto —Básico, Pro y
// Enterprise— y no free/plus/pro. No es cosmetico: el nivel se deducia del
// nombre del plan buscando "plus" y "pro", de modo que un cliente de Básico o
// de Enterprise caia en el nivel mas bajo y seguia viendo el muro de "mejora tu
// plan" en Analitica y en Reportes, que es justo lo que habia pagado.

/** @typedef {"basico" | "pro" | "enterprise"} PlanTier */

const ORDER = ["basico", "pro", "enterprise"];

/** @type {Record<PlanTier, string>} */
export const TIER_LABEL = {
  basico: "Básico",
  pro: "Pro",
  enterprise: "Enterprise",
};

/**
 * Deriva el nivel a partir del nombre del plan de la suscripcion.
 *
 * Reconoce tambien los nombres antiguos (Free, Plus) para que una suscripcion
 * creada antes del cambio de catalogo siga valiendo lo mismo. "Enterprise" se
 * comprueba antes que "pro" porque el nombre antiguo "Pro" era el nivel mas
 * alto y hoy es el intermedio.
 *
 * @param {string} [name]
 * @returns {PlanTier}
 */
export function tierFromName(name) {
  const n = (name ?? "").toLowerCase();
  if (n.includes("enterprise")) return "enterprise";
  if (n.includes("pro") || n.includes("plus")) return "pro";
  return "basico";
}

/**
 * El nivel actual alcanza el requerido? (basico < pro < enterprise)
 * @param {PlanTier} current
 * @param {PlanTier} required
 */
export function hasTier(current, required) {
  return ORDER.indexOf(current) >= ORDER.indexOf(required);
}

/**
 * Locales incluidos en cada plan, igual que el cupo que aplica el backend.
 *
 * Tenerlo aqui es lo que permite avisar antes de intentar el alta, en vez de
 * dejar que el servidor responda 409 con el formulario ya rellenado.
 */
export const SITE_LIMIT = {
  basico: 1,
  pro: 5,
  enterprise: Number.POSITIVE_INFINITY,
};

// Limite de dispositivos vinculados por plan (Enterprise = ilimitado).
export const DEVICE_LIMIT = {
  basico: 3,
  pro: 10,
  enterprise: Number.POSITIVE_INFINITY,
};
