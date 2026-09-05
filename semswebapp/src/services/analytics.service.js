import { api, DEMO_MODE, delay } from "@/lib/api";
import {
  demoRecommendations,
  demoAnomalies,
  demoBillPrediction,
  demoRankings,
} from "@/lib/demo";
import { listDevices } from "./devices.service";

// Modulo de analitica del backend.
const BASE = "/api/v1/analytics";

// El backend ha ido cambiando de nombre algunos campos entre versiones. Estos
// dos ayudantes toman el primer valor utilizable de una lista de candidatos,
// que es mas robusto que fijar un solo nombre y quedarse en cero cuando cambia.
function num(...vals) {
  for (const v of vals) if (typeof v === "number" && !isNaN(v)) return v;
  return 0;
}
function str(...vals) {
  for (const v of vals) if (typeof v === "string" && v) return v;
  return "";
}
function normSeverity(s) {
  const u = String(s ?? "").toUpperCase();
  return u === "HIGH" || u === "MEDIUM" || u === "LOW" ? u : "LOW";
}

/** @returns {Promise<import("../types").Recommendation[]>} */
export async function getRecommendations(userId) {
  if (DEMO_MODE) {
    await delay();
    return demoRecommendations;
  }
  const { data } = await api.get(`${BASE}/recommendations/user/${userId}`);
  return (data ?? []).map((r) => ({
    id: str(r.id, r.recommendation_id),
    title: str(r.title, r.name, "Recomendación"),
    detail: str(r.description, r.detail, r.message),
    estimatedSaving: num(
      r.estimated_savings_amount, r.estimated_saving_amount, r.potential_savings_amount,
      r.potential_savings, r.savings_amount, r.monthly_savings, r.estimated_amount,
      r.estimated_saving_soles, r.estimated_savings_soles, r.estimated_savings,
      r.estimated_saving, r.savings_soles, r.savings
    ),
    applied: Boolean(r.applied ?? r.is_applied ?? false),
  }));
}

export async function applyRecommendation(id) {
  if (DEMO_MODE) {
    await delay(200);
    return;
  }
  await api.patch(`${BASE}/recommendations/${id}/apply`);
}

/** @returns {Promise<import("../types").Anomaly[]>} */
export async function getAnomalies(userId) {
  if (DEMO_MODE) {
    await delay();
    return demoAnomalies;
  }
  const [{ data }, devices] = await Promise.all([
    api.get(`${BASE}/anomalies/user/${userId}`),
    listDevices(userId).catch(() => []),
  ]);
  // El backend manda el identificador del dispositivo en el campo y tambien
  // dentro del texto; lo reemplazamos por el nombre real para que la
  // descripcion se lea.
  const nameById = new Map(devices.map((d) => [d.deviceId, d.deviceName]));
  return (data ?? []).map((a) => {
    const id = str(a.device_id);
    const name = nameById.get(id) || (id ? `Dispositivo ${id.slice(0, 6)}` : "Dispositivo");
    let description = str(a.description, a.message, a.detail);
    if (id) description = description.split(id).join(name);
    return {
      id: str(a.id, a.anomaly_id),
      deviceName: name,
      description,
      severity: normSeverity(a.severity),
      detectedAt: str(a.detected_at, a.created_at),
      resolved: Boolean(a.resolved ?? a.is_resolved ?? false),
    };
  });
}

/** @returns {Promise<import("../types").BillPrediction | null>} */
export async function getBillPrediction(userId) {
  if (DEMO_MODE) {
    await delay(300);
    return demoBillPrediction;
  }
  const { data } = await api.get(`${BASE}/bill-predictions/user/${userId}`);
  const p = Array.isArray(data) ? data[0] : data;
  if (!p) return null;
  let confidence = num(p.confidence, p.confidence_score);
  if (confidence > 1) confidence = confidence / 100;
  if (confidence === 0) {
    const margin = num(p.error_margin_percentage, p.error_margin);
    if (margin > 0) confidence = Math.max(0, 1 - margin / 100);
  }
  return {
    projectedCost: num(p.estimated_amount, p.projected_cost_soles, p.predicted_cost_soles, p.predicted_cost, p.projected_cost, p.estimated_cost),
    projectedKwh: num(p.estimated_kwh, p.projected_kwh, p.predicted_kwh),
    confidence,
    closingDate: (str(p.period_end, p.closing_date, p.prediction_date) || "").slice(0, 10) || "fin de mes",
  };
}

/** @returns {Promise<import("../types").ConsumptionRanking[]>} */
export async function getRankings(userId) {
  if (DEMO_MODE) {
    await delay();
    return demoRankings;
  }
  const { data } = await api.get(`${BASE}/consumption-rankings/user/${userId}`);
  const root = Array.isArray(data) ? data[0] : data;
  const items = (root?.rankings ?? (Array.isArray(data) ? data : [])) ?? [];

  const devices = await listDevices(userId).catch(() => []);
  const nameById = new Map(devices.map((d) => [d.deviceId, d.deviceName]));

  return items
    .filter((r) => {
      const id = str(r.device_id);
      return !id || devices.length === 0 || nameById.has(id);
    })
    .map((r, i) => {
      const id = str(r.device_id);
      const real = nameById.get(id);
      const name = str(r.device_name);
      return {
        rank: i + 1,
        deviceName: real || (name && name !== id ? name : `Dispositivo ${id.slice(0, 6)}`),
        kwh: num(r.total_kwh, r.kwh, r.consumption_kwh),
        cost: num(r.estimated_amount, r.cost_estimate_soles, r.cost_soles, r.cost),
      };
    });
}
