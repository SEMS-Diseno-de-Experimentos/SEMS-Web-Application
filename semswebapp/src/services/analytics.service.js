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

// El modulo de analitica publica un contrato snake_case fijo, asi que cada
// campo se lee por su nombre. Estos dos ayudantes solo sustituyen el valor
// cuando falta o no es del tipo esperado, para que la vista no reciba undefined.
function num(v) {
  return typeof v === "number" && !isNaN(v) ? v : 0;
}
function str(v) {
  return typeof v === "string" ? v : "";
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
    id: str(r.id),
    title: str(r.title) || "Recomendación",
    detail: str(r.description),
    estimatedSaving: num(r.estimated_saving_amount),
    // La API publica `status` ("pending" / "applied") y `applied_at`. Aqui se
    // leian `applied` e `is_applied`, que no existen en ninguna respuesta: la
    // recomendacion aplicada volvia a aparecer como pendiente al recargar.
    applied: r.status === "applied" || Boolean(r.applied_at),
  }));
}

/**
 * Pide al backend recalcular los hallazgos del usuario (US35, US37, US38).
 *
 * Las lecturas ya disparan este calculo por su cuenta, con unos segundos de
 * espera para agrupar varias seguidas. Esto es el boton de "actualizar": sirve
 * para no esperar, no para suplir al calculo automatico.
 *
 * @returns {Promise<{anomalies: number, recommendations: number, billPredictions: number}>}
 */
export async function recomputeInsights(userId) {
  if (DEMO_MODE) {
    await delay(400);
    return { anomalies: 0, recommendations: 0, billPredictions: 0 };
  }
  const { data } = await api.post(`${BASE}/insights/recompute`, { user_id: userId });
  return {
    anomalies: (data?.anomalies ?? []).length,
    recommendations: (data?.recommendations ?? []).length,
    billPredictions: (data?.bill_predictions ?? []).length,
  };
}

export async function applyRecommendation(id) {
  if (DEMO_MODE) {
    await delay(200);
    return;
  }
  await api.patch(`${BASE}/recommendations/${id}/apply`);
}

/** @returns {Promise<import("../types").Anomaly[]>} */
export async function getAnomalies(userId, cargado = {}) {
  if (DEMO_MODE) {
    await delay();
    return demoAnomalies;
  }
  // Los dispositivos solo sirven para poner nombre donde el backend manda un
  // identificador; si quien llama ya los tiene, se los pasa.
  const [{ data }, devices] = await Promise.all([
    api.get(`${BASE}/anomalies/user/${userId}`),
    cargado.devices ?? listDevices(userId).catch(() => []),
  ]);
  // El backend manda el identificador del dispositivo en el campo y tambien
  // dentro del texto; lo reemplazamos por el nombre real para que la
  // descripcion se lea.
  const nameById = new Map(devices.map((d) => [d.deviceId, d.deviceName]));
  return (data ?? []).map((a) => {
    const id = str(a.device_id);
    const name = nameById.get(id) || (id ? `Dispositivo ${id.slice(0, 6)}` : "Dispositivo");
    let description = str(a.description);
    if (id) description = description.split(id).join(name);
    return {
      id: str(a.id),
      deviceName: name,
      description,
      severity: normSeverity(a.severity),
      detectedAt: str(a.detected_at),
      // Mismo caso que en las recomendaciones: la API manda `status`
      // ("open" / "resolved") y `resolved_at`, no un booleano.
      resolved: a.status === "resolved" || Boolean(a.resolved_at),
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
  // La prediccion no trae una confianza: trae el margen de error del modelo.
  // La confianza que ensena la pantalla es su complemento, porque un margen del
  // 12 % es tanto como decir que el importe se acertara en un 88 %.
  const margin = num(p.error_margin_percentage);
  return {
    projectedCost: num(p.estimated_amount),
    projectedKwh: num(p.estimated_kwh),
    confidence: Math.min(1, Math.max(0, 1 - margin / 100)),
    closingDate: str(p.period_end).slice(0, 10) || "fin de mes",
  };
}

/** @returns {Promise<import("../types").ConsumptionRanking[]>} */
export async function getRankings(userId, cargado = {}) {
  if (DEMO_MODE) {
    await delay();
    return demoRankings;
  }
  const { data } = await api.get(`${BASE}/consumption-rankings/user/${userId}`);
  const root = Array.isArray(data) ? data[0] : data;
  const items = (root?.rankings ?? (Array.isArray(data) ? data : [])) ?? [];

  const devices = cargado.devices ?? (await listDevices(userId).catch(() => []));
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
        kwh: num(r.total_kwh),
        cost: num(r.estimated_amount),
      };
    });
}
