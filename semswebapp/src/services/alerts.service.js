import { api, DEMO_MODE, delay } from "@/lib/api";
import { demoAlerts, demoThresholds, demoPreferences } from "@/lib/demoExtra";
import { listDevices } from "./devices.service";

// Modulo de alertas del backend.
const BASE = "/api/v1";

// --- Normalizacion: el backend usa snake_case y minusculas ---
function str(...vals) {
  for (const v of vals) if (typeof v === "string" && v) return v;
  return "";
}
function normSeverity(s) {
  const u = String(s ?? "").toUpperCase();
  return u === "HIGH" || u === "MEDIUM" || u === "LOW" ? u : "MEDIUM";
}
function normStatus(s) {
  switch (String(s ?? "").toLowerCase()) {
    case "resolved":
    case "closed":
    case "dismissed":
      return "RESOLVED";
    case "acknowledged":
      return "ACKNOWLEDGED";
    default:
      return "ACTIVE"; // open / pending / active
  }
}
function normType(t) {
  const s = String(t ?? "").toLowerCase();
  if (s.includes("anomaly")) return "ANOMALY";
  if (s.includes("inactiv")) return "INACTIVITY";
  return "THRESHOLD";
}

const channelLabel = {
  EMAIL: "Correo electrónico",
  SMS: "SMS",
  PUSH: "Notificación push",
};

/** @returns {Promise<import("../types/alerts").Alert[]>} */
export async function getAlerts(userId) {
  const { data } = await api.get(`${BASE}/users/${userId}/alerts`);
  const backendAlerts = data || [];

  const devices = await listDevices(userId).catch(() => []);
  const nameById = new Map(devices.map((d) => [d.deviceId, d.deviceName]));
  
  return backendAlerts.map((a) => {
    const dId = str(a.device_id, a.deviceId, a.DeviceId);
    return {
      id: str(a.alert_id, a.alertId, a.AlertId),
      type: normType(a.alert_type || a.alertType || a.AlertType),
      title: str(a.title, a.Title, a.message, a.Message, "Alerta"),
      deviceName: nameById.get(dId) || (dId ? `Dispositivo ${dId.slice(0, 6)}` : ""),
      message: str(a.message, a.Message),
      severity: normSeverity(a.severity || a.Severity),
      status: normStatus(a.status || a.Status),
      createdAt: str(a.triggered_at, a.triggeredAt, a.TriggeredAt).slice(0, 16).replace("T", " "),
    };
  });
}

/**
 * Cuenta de alertas sin resolver (para el KPI del dashboard).
 *
 * Si falla devuelve 0 en vez de propagar: un contador es lo ultimo que deberia
 * tumbar el panel entero.
 *
 * @returns {Promise<number>}
 */
export async function getUnreadAlertCount(userId) {
  const alerts = await getAlerts(userId);
  return alerts.filter((a) => a.status !== "RESOLVED").length;
}

export async function updateAlertStatus(id, status) {
  // El backend espera el estado en minusculas; al resolver enviamos resolved_at.
  const backendStatus = status === "RESOLVED" ? "resolved" : status === "ACKNOWLEDGED" ? "acknowledged" : "open";
  const body = { status: backendStatus };
  if (status === "RESOLVED") body.resolved_at = new Date().toISOString();
  await api.patch(`${BASE}/alerts/${id}/status`, body);
}

/** @returns {Promise<import("../types/alerts").Threshold[]>} */
export async function getThresholds(userId) {
  const [{ data }, devices] = await Promise.all([
    api.get(`${BASE}/users/${userId}/thresholds`),
    listDevices(userId).catch(() => []),
  ]);
  const nameById = new Map(devices.map((d) => [d.deviceId, d.deviceName]));
  return (data ?? []).map((t) => {
    const dId = str(t.device_id, t.deviceId, t.DeviceId);
    return {
      id: str(t.threshold_id, t.thresholdId, t.ThresholdId),
      deviceName: nameById.get(dId) || str(t.threshold_name, t.thresholdName, t.ThresholdName) || (dId ? `Dispositivo ${dId.slice(0, 6)}` : "Umbral"),
      maxKwhPerDay: t.threshold_value ?? t.thresholdValue ?? t.ThresholdValue ?? 0,
      enabled: Boolean(t.active ?? t.Active),
    };
  });
}

/**
 * Crea un umbral de consumo para un dispositivo del usuario.
 * @param {{userId: string, deviceId: string, thresholdName: string, thresholdValue: number, metric?: string, operator?: string}} payload
 */
export async function createThreshold(payload) {
  await api.post(`${BASE}/thresholds`, {
    user_id: payload.userId,
    device_id: payload.deviceId,
    threshold_name: payload.thresholdName,
    threshold_value: payload.thresholdValue,
    metric: payload.metric ?? "consumption_kwh",
    operator: payload.operator ?? ">",
    active: true,
  });
}

/** @returns {Promise<import("../types/alerts").NotificationPreference[]>} */
export async function getNotificationPreferences(userId) {
  const { data } = await api.get(`${BASE}/users/${userId}/notification-preferences`);
  return (data ?? []).map((p) => {
    const channel = String(p.channel ?? "email").toUpperCase();
    return {
      channel,
      label: channelLabel[channel] ?? channel,
      enabled: Boolean(p.enabled),
    };
  });
}

export async function updateNotificationPreference(userId, channel, enabled) {
  await api.post(`${BASE}/notification-preferences`, {
    user_id: userId,
    channel: channel.toLowerCase(),
    enabled,
    min_severity: "medium",
  });
}
