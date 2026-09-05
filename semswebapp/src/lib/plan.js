// Niveles de plan y que desbloquea cada uno.

/** @typedef {"free" | "plus" | "pro"} PlanTier */

const ORDER = ["free", "plus", "pro"];

/** @type {Record<PlanTier, string>} */
export const TIER_LABEL = { free: "Free", plus: "Plus", pro: "Pro" };

/**
 * Deriva el nivel a partir del nombre del plan de la suscripcion.
 * @param {string} [name]
 * @returns {PlanTier}
 */
export function tierFromName(name) {
  const n = (name ?? "").toLowerCase();
  if (n.includes("pro")) return "pro";
  if (n.includes("plus")) return "plus";
  return "free";
}

/**
 * El nivel actual alcanza el requerido? (free < plus < pro)
 * @param {PlanTier} current
 * @param {PlanTier} required
 */
export function hasTier(current, required) {
  return ORDER.indexOf(current) >= ORDER.indexOf(required);
}

// Limite de dispositivos vinculados por plan (Pro = ilimitado).
export const DEVICE_LIMIT = {
  free: 3,
  plus: 10,
  pro: Number.POSITIVE_INFINITY,
};
