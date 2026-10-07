// Niveles de plan y que desbloquea cada uno.

/** @typedef {"free" | "basico" | "pro" | "enterprise"} PlanTier */

const ORDER = ["free", "basico", "pro", "enterprise"];

/** @type {Record<PlanTier, string>} */
export const TIER_LABEL = { free: "Free", basico: "Básico", pro: "Pro", enterprise: "Enterprise" };

/**
 * Deriva el nivel a partir del nombre del plan de la suscripcion.
 * @param {string} [name]
 * @returns {PlanTier}
 */
export function tierFromName(name) {
  const n = (name ?? "").toLowerCase();
  if (n.includes("enterprise")) return "enterprise";
  if (n.includes("pro")) return "pro";
  if (n.includes("básico") || n.includes("basico")) return "basico";
  return "free";
}

/**
 * El nivel actual alcanza el requerido?
 * @param {PlanTier} current
 * @param {PlanTier} required
 */
export function hasTier(current, required) {
  return ORDER.indexOf(current) >= ORDER.indexOf(required);
}

// Limite de dispositivos vinculados por plan
export const DEVICE_LIMIT = {
  free: Number.POSITIVE_INFINITY,
  basico: Number.POSITIVE_INFINITY,
  pro: Number.POSITIVE_INFINITY,
  enterprise: Number.POSITIVE_INFINITY,
};
