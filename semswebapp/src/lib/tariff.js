const KEY = "sems-tariff";

// Tarifa referencial S/ por kWh si nadie la ha configurado.
export const DEFAULT_TARIFF = 0.78;

/** @returns {number | null} la tarifa guardada, o null si no hay una valida */
export function getTariff() {
  const raw = localStorage.getItem(KEY);
  if (raw == null) return null;
  const n = Number(raw);
  return isNaN(n) || n <= 0 ? null : n;
}

export function saveTariff(price) {
  if (!price || price <= 0) {
    localStorage.removeItem(KEY);
    return;
  }
  localStorage.setItem(KEY, String(price));
}
