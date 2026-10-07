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

export async function getRecommendations(userId) {
  try {
    const { data } = await api.get(`${BASE}/recommendations/user/${userId}`);
    if (data && data.length) {
      return data.map((r) => ({
        id: str(r.id, r.recommendation_id),
        title: str(r.title, r.name, "Recomendación"),
        detail: str(r.description, r.detail, r.message),
        estimatedSaving: num(r.estimated_savings_amount, r.savings_amount, r.estimated_amount, r.savings_soles),
        applied: Boolean(r.applied ?? r.is_applied ?? false),
      }));
    }
  } catch (e) {}
  return [];
}

export async function applyRecommendation(id) {
  try {
    await api.patch(`${BASE}/recommendations/${id}/apply`);
  } catch (e) {}
}

/** @returns {Promise<import("../types").Anomaly[]>} */
export async function getAnomalies(userId) {
  try {
    const [{ data }, devices] = await Promise.all([
      api.get(`${BASE}/anomalies/user/${userId}`),
      listDevices(userId).catch(() => []),
    ]);
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
  } catch (e) {}
  return [];
}

export async function getBillPrediction(userId) {
  let basePrediction = { projectedCost: 0, projectedKwh: 0, confidence: 0.95, closingDate: "fin de mes" };
  try {
    const { data } = await api.get(`${BASE}/bill-predictions/user/${userId}`);
    if (data) {
      const p = Array.isArray(data) ? data[0] : data;
      basePrediction = { projectedCost: num(p.estimated_amount), projectedKwh: num(p.estimated_kwh), confidence: 0.9, closingDate: "fin de mes" };
    }
  } catch (e) {}

  // Adjust prediction based on applied recommendations
  try {
    const recs = await getRecommendations(userId);
    let savingCost = 0;
    for (const r of recs) {
      if (r.applied) savingCost += r.estimatedSaving || 0;
    }
    basePrediction.projectedCost = Math.max(0, basePrediction.projectedCost - savingCost);
  } catch (e) {}

  return basePrediction;
}

export async function getRankings(userId) {
  try {
    const { data } = await api.get(`${BASE}/consumption-rankings/user/${userId}`);
    if (data && data.length) {
      return data;
    }
  } catch (e) {}
  return [];
}
