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
  const { data } = await api.get(`${BASE}/energy-readings/user/${userId}`, { params: { limit } });
  return data ?? [];
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
  if (DEMO_MODE) return FALLBACK_PRICE;
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
  if (DEMO_MODE) { await delay(); return demoReadings(days); }
  const readings = await getReadingsRaw(userId);
  const price = await getPricePerKwh();
  const cutoff = Date.now() - days * 86_400_000;
  const byDay = new Map();
  for (const r of readings) {
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
  const readings = await getReadings(userId, days * 2); // agregadas por dia
  const cutoffMs = Date.now() - days * 86_400_000;
  let currentKwh = 0, previousKwh = 0, currentCost = 0, previousCost = 0;
  for (const r of readings) {
    const t = new Date(r.date).getTime();
    if (isNaN(t)) continue;
    if (t >= cutoffMs) {
      currentKwh += r.kwh;
      currentCost += r.cost;
    } else {
      previousKwh += r.kwh;
      previousCost += r.cost;
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
  if (DEMO_MODE) { await delay(); return demoConsumption; }

  // Dispositivos vigentes del usuario: sirven para poner nombre y para
  // descartar los que ya fueron eliminados (no deben seguir apareciendo).
  const devices = await listDevices(userId).catch(() => []);
  const nameById = new Map(devices.map((d) => [d.deviceId, d.deviceName]));
  const exists = (id) => devices.length === 0 || nameById.has(id);

  // 1) Agregados oficiales del backend (si hay). Si el endpoint falla
  //    (p. ej. 500), lo ignoramos y caemos a la estimacion por lecturas.
  let agg = [];
  try {
    const { data } = await api.get(
      `${BASE}/device-consumptions/user/${userId}`,
      { params: { limit: 50 } }
    );
    agg = data ?? [];
  } catch {
    agg = [];
  }
  agg = agg.filter((c) => exists(c.device_id));
  if (agg.length > 0) {
    const total = agg.reduce((s, c) => s + (c.total_kwh ?? 0), 0) || 1;
    return agg.map((c) => ({
      deviceId: c.device_id,
      deviceName: nameById.get(c.device_id) ?? c.device_name,
      kwh: +(c.total_kwh ?? 0).toFixed(2),
      cost: +(c.cost_estimate_soles ?? 0).toFixed(2),
      pct: Math.round(((c.total_kwh ?? 0) / total) * 100),
    }));
  }

  // 2) Estimacion: agrupa las lecturas por dispositivo.
  const [readings, price] = await Promise.all([
    getReadingsRaw(userId),
    getPricePerKwh(),
  ]);
  const kwhByDevice = new Map();
  for (const r of readings) {
    if (!exists(r.device_id)) continue; // lecturas de dispositivos eliminados
    kwhByDevice.set(r.device_id, (kwhByDevice.get(r.device_id) ?? 0) + (r.energy_kwh ?? 0));
  }
  const total = [...kwhByDevice.values()].reduce((s, k) => s + k, 0) || 1;
  return [...kwhByDevice.entries()]
    .sort(([, a], [, b]) => b - a)
    .map(([deviceId, kwh]) => ({
      deviceId,
      deviceName: nameById.get(deviceId) ?? `Dispositivo ${deviceId.slice(0, 6)}`,
      kwh: +kwh.toFixed(3),
      cost: +(kwh * price).toFixed(2),
      pct: Math.round((kwh / total) * 100),
    }));
}

/** @returns {import("../types").EnergyMeter} */
function mapMeter(m) {
  return {
    meterId: m.id,
    name: m.model || m.meter_serial,
    active: m.status === "active",
    lastReadingKwh: 0,
  };
}

/** @returns {Promise<import("../types").EnergyMeter[]>} */
export async function getMeters(userId) {
  if (DEMO_MODE) {
    await delay(250);
    return demoMeters;
  }
  const { data } = await api.get(`${BASE}/energy-meters/user/${userId}`);
  return (data ?? []).map(mapMeter);
}

/**
 * Vincula (registra y asocia) un medidor EOS al hogar del residente.
 * El backend exige marca y ubicacion ademas del numero de serie.
 *
 * @returns {Promise<import("../types").EnergyMeter>}
 */
export async function linkMeter(userId, serial, model = "EOS") {
  if (DEMO_MODE) {
    await delay(300);
    return { meterId: crypto.randomUUID(), name: model || serial, active: true, lastReadingKwh: 0 };
  }
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
  if (DEMO_MODE) {
    await delay(200);
    return;
  }
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
