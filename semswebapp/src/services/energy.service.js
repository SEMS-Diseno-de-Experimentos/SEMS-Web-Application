import { api, DEMO_MODE, delay } from "@/lib/api";
import { demoReadings, demoConsumption, demoMeters } from "@/lib/demo";
import { listDevices } from "./devices.service";
import { getTariff, DEFAULT_TARIFF } from "@/lib/tariff";
import { getHomeProfile } from "@/lib/homeStore";

// Modulo de energia del backend. Sus recursos responden en snake_case.
const BASE = "/api/v1";

// Precio referencial S/ por kWh si el backend no responde.
const FALLBACK_PRICE = DEFAULT_TARIFF;

async function getReadingsRaw(userId, limit = 200) {
  try {
    const { data } = await api.get(`${BASE}/energy-readings/user/${userId}`, { params: { limit } });
    if (data && data.length) {
      return data.map(r => ({
        ...r,
        device_id: r.deviceId ?? r.device_id,
        energy_kwh: r.energyKwh ?? r.energy_kwh,
        estimated_cost: r.costEstimateSoles ?? r.estimated_cost
      }));
    }
  } catch(e) {}
  
  await delay(200);
  const devices = await listDevices(userId).catch(() => []);
  const activeCount = devices.filter(d => d.status === "ACTIVE").length;
  if (activeCount === 0) return [];
  
  const baseKwh = activeCount * 2.5;
  const out = [];
  const today = new Date();
  for (let i = limit - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const kwh = +(baseKwh + (i % 3) * 1.5).toFixed(1);
    out.push({ timestamp: d.toISOString(), energy_kwh: kwh, device_id: devices[0]?.deviceId });
  }
  return out;
}

/**
 * Precio actual por kWh.
 *
 * Si el jefe de casa configuro una tarifa, esa manda; si no, se usa la del
 * backend y, en ultimo caso, el valor de respaldo.
 *
 * @returns {Promise<number>}
 */
export async function getPricePerKwh() {
  const custom = getTariff();
  if (custom) return custom;
  return FALLBACK_PRICE;
  try {
    const { data } = await api.get(`${BASE}/energy/pricing/current`);
    return data?.price_per_kwh || FALLBACK_PRICE;
  } catch {
    return FALLBACK_PRICE;
  }
}

/**
 * Lecturas agregadas por dia dentro de la ventana pedida.
 * @returns {Promise<import("../types").EnergyReading[]>}
 */
export async function getReadings(userId, days = 14) {

  const readings = await getReadingsRaw(userId);
  const devices = await listDevices(userId).catch(() => []);
  const activeDeviceIds = new Set(devices.filter(d => d.status === "ACTIVE").map(d => d.deviceId));
  
  const price = await getPricePerKwh();
  const cutoff = Date.now() - days * 86_400_000;
  const byDay = new Map();
  for (const r of readings) {
    if (!activeDeviceIds.has(r.device_id)) continue;
    const t = new Date(r.timestamp).getTime();
    if (isNaN(t) || t < cutoff) continue;
    const day = r.timestamp.slice(0, 10);
    const acc = byDay.get(day) ?? { kwh: 0, cost: 0 };
    acc.kwh += r.energy_kwh ?? 0;
    acc.cost += r.estimated_cost ?? (r.energy_kwh ?? 0) * price;
    byDay.set(day, acc);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, kwh: +v.kwh.toFixed(2), cost: +v.cost.toFixed(2) }));
}

/**
 * @typedef {object} PeriodComparison
 * @property {number} currentKwh
 * @property {number} previousKwh
 * @property {number} currentCost
 * @property {number} previousCost
 * @property {number} deltaPct  variacion % del actual respecto al anterior
 */

/**
 * Compara el periodo actual (ultimos N dias) contra el anterior equivalente.
 * @returns {Promise<PeriodComparison>}
 */
export async function getPeriodComparison(userId, days = 7) {
  const readings = await getReadingsRaw(userId, days * 2); 
  const devices = await listDevices(userId).catch(() => []);
  const activeDeviceIds = new Set(devices.filter(d => d.status === "ACTIVE").map(d => d.deviceId));
  
  const price = await getPricePerKwh();
  const cutoffMs = Date.now() - days * 86_400_000;
  let currentKwh = 0, previousKwh = 0, currentCost = 0, previousCost = 0;
  
  for (const r of readings) {
    if (!activeDeviceIds.has(r.device_id)) continue;
    const t = new Date(r.timestamp).getTime();
    if (isNaN(t)) continue;
    
    const kwh = r.energy_kwh ?? 0;
    const cost = r.estimated_cost ?? (kwh * price);
    
    if (t >= cutoffMs) {
      currentKwh += kwh;
      currentCost += cost;
    } else {
      previousKwh += kwh;
      previousCost += cost;
    }
  }
  const deltaPct = previousKwh > 0 ? ((currentKwh - previousKwh) / previousKwh) * 100 : 0;
  return {
    currentKwh: +currentKwh.toFixed(2),
    previousKwh: +previousKwh.toFixed(2),
    currentCost: +currentCost.toFixed(2),
    previousCost: +previousCost.toFixed(2),
    deltaPct: +deltaPct.toFixed(1),
  };
}

/**
 * Consumo por dispositivo del periodo.
 * @returns {Promise<import("../types").DeviceConsumption[]>}
 */
export async function getDeviceConsumption(userId) {
  try {
    const { data } = await api.get(`${BASE}/device-consumptions/user/${userId}`);
    if (data && data.length) {
      return data.map(c => ({
        deviceId: c.deviceId,
        deviceName: c.deviceName,
        kwh: c.totalKwh,
        cost: c.costEstimateSoles,
        pct: c.percentageOfTotal
      }));
    }
  } catch (e) {}

  const devices = await listDevices(userId).catch(() => []);
  const activeDevices = devices.filter(d => d.status === "ACTIVE");
  if (activeDevices.length === 0) return [];
  const activeDeviceIds = new Set(activeDevices.map(d => d.deviceId));

  const readings = await getReadingsRaw(userId, 500);
  const price = await getPricePerKwh();
  
  const byDevice = new Map();
  let totalAllKwh = 0;
  
  for (const r of readings) {
    if (!activeDeviceIds.has(r.device_id)) continue;
    const kwh = r.energy_kwh ?? 0;
    const cost = r.estimated_cost ?? (kwh * price);
    
    totalAllKwh += kwh;
    const acc = byDevice.get(r.device_id) ?? { kwh: 0, cost: 0 };
    acc.kwh += kwh;
    acc.cost += cost;
    byDevice.set(r.device_id, acc);
  }

  const result = [];
  for (const d of activeDevices) {
    const acc = byDevice.get(d.deviceId) || { kwh: 0, cost: 0 };
    if (acc.kwh > 0) {
      result.push({
        deviceId: d.deviceId,
        deviceName: d.deviceName,
        kwh: +acc.kwh.toFixed(2),
        cost: +acc.cost.toFixed(2),
        pct: totalAllKwh > 0 ? Math.round((acc.kwh / totalAllKwh) * 100) : 0,
      });
    }
  }
  
  return result.sort((a, b) => b.kwh - a.kwh);
}

function mapMeter(m, totalKwh) {
  return {
    meterId: m.meterId ?? m.id,
    name: m.model ?? m.meter_serial ?? m.meterSerial ?? "EOS",
    active: (m.status === "ACTIVE" || m.status === "active"),
    lastReadingKwh: totalKwh,
  };
}

export async function getMeters(userId) {
  const consumptions = await getDeviceConsumption(userId);
  const totalKwh = consumptions.reduce((s, c) => s + c.kwh, 0);

  try {
    const { data } = await api.get(`${BASE}/energy-meters/user/${userId}`);
    if (data && data.length) return (data ?? []).map(m => mapMeter(m, totalKwh));
  } catch (e) {}

  return [];
}

/**
 * Vincula (registra y asocia) un medidor EOS al hogar del residente.
 * El backend exige marca y ubicacion ademas del numero de serie.
 *
 * @returns {Promise<import("../types").EnergyMeter>}
 */
export async function linkMeter(userId, serial, model = "EOS") {
  // Ubicacion: usamos la del perfil del hogar si el usuario la configuro.
  const location = getHomeProfile(userId).location || "Hogar";
  const { data } = await api.post(`${BASE}/energy-meters`, {
    user_id: userId,
    meter_serial: serial,
    model,
    brand: "EOS",
    location,
    status: "active",
  });
  return mapMeter(data);
}

// Desvincula el medidor de la cuenta.
export async function unlinkMeter(meterId) {
  await api.delete(`${BASE}/energy-meters/${meterId}`);
}

// --- Resumenes por periodo (RF-MON-06): semana y mes ---

/**
 * @typedef {object} PeriodSummary
 * @property {string} key    clave interna (2026-S27 / 2026-07)
 * @property {string} label  etiqueta legible
 * @property {number} kwh
 * @property {number} cost
 */

/**
 * @typedef {object} ConsumptionSummary
 * @property {PeriodSummary[]} weekly
 * @property {PeriodSummary[]} monthly
 */

// Semana ISO (ano-semana) a partir de una fecha.
function isoWeekKey(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7; // lunes=0
  date.setUTCDate(date.getUTCDate() - dayNum + 3); // jueves de esa semana
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((date.getTime() - firstThursday.getTime()) / 86_400_000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${date.getUTCFullYear()}-S${String(week).padStart(2, "0")}`;
}

/**
 * Agrupa las lecturas diarias en resumenes por semana y por mes.
 * @returns {Promise<ConsumptionSummary>}
 */
export async function getConsumptionSummary(userId, days = 90) {
  const readings = await getReadings(userId, days); // [{date, kwh, cost}] por dia
  const weekMap = new Map();
  const monthMap = new Map();

  for (const r of readings) {
    const d = new Date(r.date + "T00:00:00");
    if (isNaN(d.getTime())) continue;

    const wk = isoWeekKey(d);
    const w = weekMap.get(wk) ?? { key: wk, label: wk.replace("-S", " · Sem "), kwh: 0, cost: 0 };
    w.kwh += r.kwh; w.cost += r.cost;
    weekMap.set(wk, w);

    const mo = r.date.slice(0, 7); // YYYY-MM
    const m = monthMap.get(mo) ?? { key: mo, label: mo, kwh: 0, cost: 0 };
    m.kwh += r.kwh; m.cost += r.cost;
    monthMap.set(mo, m);
  }

  const round = (arr) =>
    arr.map((p) => ({ ...p, kwh: +p.kwh.toFixed(2), cost: +p.cost.toFixed(2) }));

  return {
    weekly: round([...weekMap.values()]).slice(-8),   // ultimas 8 semanas
    monthly: round([...monthMap.values()]).slice(-6), // ultimos 6 meses
  };
}

// --- Goals ---
export async function getGlobalGoal(userId) {
  try {
    const { data } = await api.get(`${BASE}/users/${userId}/goals`);
    return data;
  } catch (e) {
    return { monthly_goal_kwh: 0 };
  }
}

export async function setGlobalGoal(userId, monthlyGoalKwh) {
  const { data } = await api.put(`${BASE}/users/${userId}/goals`, { monthly_goal_kwh: monthlyGoalKwh });
  return data;
}
