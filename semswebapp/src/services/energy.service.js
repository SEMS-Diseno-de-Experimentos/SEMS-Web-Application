import { api, DEMO_MODE, delay } from "@/lib/api";
import {
  demoReadings,
  demoRawReadings,
  demoConsumption,
  demoMeters,
  demoZoneConsumption,
  demoSiteComparison,
  demoCurrentConsumption,
} from "@/lib/demo";
import { listDevices } from "./devices.service";

// Modulo de energia del backend. Sus recursos responden en snake_case.
const BASE = "/api/v1";

/**
 * Lecturas crudas del usuario, tal como las devuelve el backend.
 *
 * Esta exportada porque varias vistas necesitan lo mismo por distintos
 * caminos: el grafico diario, el desglose por equipo y el resumen. Pidiendola
 * una vez y pasandola a cada calculo, el panel hace una peticion donde antes
 * hacia cuatro identicas.
 */
export async function getReadingsRaw(userId, limit = 200) {
  if (DEMO_MODE) {
    await delay();
    return demoRawReadings();
  }
  const { data } = await api.get(`${BASE}/energy-readings/user/${userId}`, { params: { limit } });
  return data ?? [];
}

/**
 * Lecturas agregadas por dia dentro de la ventana pedida.
 * @returns {Promise<import("../types").EnergyReading[]>}
 */
export async function getReadings(userId, days = 14, cargado = {}) {
  if (DEMO_MODE) { await delay(); return demoReadings(days); }
  const readings = cargado.readings ?? (await getReadingsRaw(userId));
  return aggregateByDay(readings, days);
}

/**
 * Agrupa lecturas crudas por dia dentro de la ventana pedida.
 *
 * Es una funcion pura: no pide nada. Asi el mismo conjunto de lecturas sirve
 * para varias ventanas (14 dias en el grafico, 30 en el resumen) sin volver a
 * consultar el backend.
 *
 * @returns {import("../types").EnergyReading[]}
 */
export function aggregateByDay(readings, days = 14) {
  const cutoff = Date.now() - days * 86_400_000;
  const byDay = new Map();
  for (const r of readings) {
    const t = new Date(r.timestamp).getTime();
    if (isNaN(t) || t < cutoff) continue;
    const day = r.timestamp.slice(0, 10);
    const acc = byDay.get(day) ?? { kwh: 0, cost: 0 };
    acc.kwh += r.energy_kwh ?? 0;
    // El coste viene ya calculado con la tarifa del local y la franja en que
    // se midio. Antes se multiplicaba aqui por un precio plano, que para un
    // suministro comercial no existe: la energia de hora punta vale mas.
    acc.cost += r.estimated_cost ?? 0;
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
export async function getPeriodComparison(userId, days = 7, cargado = {}) {
  const readings = await getReadings(userId, days * 2, cargado); // agregadas por dia
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
export async function getDeviceConsumption(userId, cargado = {}) {
  if (DEMO_MODE) { await delay(); return demoConsumption; }

  // Dispositivos vigentes del usuario: sirven para poner nombre y para
  // descartar los que ya fueron eliminados (no deben seguir apareciendo).
  // Si quien llama ya los tiene, los pasa y no se vuelven a pedir.
  const devices = cargado.devices ?? (await listDevices(userId).catch(() => []));
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
  const readings = cargado.readings ?? (await getReadingsRaw(userId));
  const kwhByDevice = new Map();
  const costByDevice = new Map();
  for (const r of readings) {
    // Una lectura de medidor sin equipo es consumo del local y no entra en el
    // desglose por equipo. Antes entraba con identificador nulo y reventaba el
    // mapeo, de modo que quien mide por medidor —el caso de un local con zonas—
    // veia un error rojo en vez de una lista vacia.
    if (!r.device_id) continue;
    if (!exists(r.device_id)) continue; // lecturas de dispositivos eliminados
    kwhByDevice.set(r.device_id, (kwhByDevice.get(r.device_id) ?? 0) + (r.energy_kwh ?? 0));
    costByDevice.set(r.device_id, (costByDevice.get(r.device_id) ?? 0) + (r.estimated_cost ?? 0));
  }
  const total = [...kwhByDevice.values()].reduce((s, k) => s + k, 0) || 1;
  return [...kwhByDevice.entries()]
    .sort(([, a], [, b]) => b - a)
    .map(([deviceId, kwh]) => ({
      deviceId,
      deviceName: nameById.get(deviceId) ?? `Dispositivo ${deviceId.slice(0, 6)}`,
      kwh: +kwh.toFixed(3),
      cost: +(costByDevice.get(deviceId) ?? 0).toFixed(2),
      pct: Math.round((kwh / total) * 100),
    }));
}

/** @returns {import("../types").ZoneShare} */
function mapZoneShare(z) {
  return {
    zoneId: z.zone_id ?? null,
    zoneName: z.zone_name ?? null,
    zoneType: z.zone_type ?? null,
    meterCount: z.meter_count ?? 0,
    kwh: z.kwh ?? 0,
    sharePercent: z.share_percent ?? 0,
    estimatedEnergyCost: z.estimated_energy_cost ?? null,
  };
}

/**
 * Consumo de un local repartido entre sus zonas (US26).
 *
 * El backend reparte las lecturas segun la zona del medidor y separa la energia
 * de punta de la de fuera de punta para ponerle precio; aqui solo se traduce la
 * forma del recurso.
 *
 * @returns {Promise<import("../types").ZoneConsumption>}
 */
export async function getZoneConsumption(siteId, days = 30) {
  if (DEMO_MODE) {
    await delay();
    return demoZoneConsumption;
  }
  const { data } = await api.get(`${BASE}/sites/${siteId}/zone-consumption`, { params: { days } });
  return {
    siteId: data.site_id,
    siteName: data.site_name,
    days: data.days,
    totalKwh: data.total_kwh ?? 0,
    currency: data.currency ?? "PEN",
    zones: (data.zones ?? []).map(mapZoneShare),
    unassigned: mapZoneShare(data.unassigned ?? {}),
  };
}

/**
 * Consumo de cada local de la organizacion, para compararlos (US39).
 *
 * Trae tambien el consumo por kW contratado: entre locales de distinto tamano
 * el total no dice nada, y es esa cifra la que senala cual gasta de mas.
 *
 * @returns {Promise<import("../types").SiteComparison>}
 */
export async function getSiteComparison(organizationId, days = 30) {
  if (DEMO_MODE) {
    await delay();
    return demoSiteComparison;
  }
  const { data } = await api.get(`${BASE}/organizations/${organizationId}/site-consumption`, {
    params: { days },
  });
  return {
    organizationId: data.organization_id,
    days: data.days,
    totalKwh: data.total_kwh ?? 0,
    currency: data.currency ?? "PEN",
    sites: (data.sites ?? []).map((s) => ({
      siteId: s.site_id,
      siteCode: s.site_code,
      siteName: s.site_name,
      contractedPowerKw: s.contracted_power_kw ?? null,
      tariffCategory: s.tariff_category ?? null,
      meterCount: s.meter_count ?? 0,
      kwh: s.kwh ?? 0,
      sharePercent: s.share_percent ?? 0,
      estimatedEnergyCost: s.estimated_energy_cost ?? null,
      kwhPerContractedKw: s.kwh_per_contracted_kw ?? null,
      peakDemandKw: s.peak_demand_kw ?? 0,
    })),
  };
}

/**
 * Potencia que el local esta tomando ahora mismo (US24).
 *
 * Suma la ultima lectura de cada medidor del local, no el consumo acumulado:
 * la pregunta que responde es "como esta operando en este momento", que es la
 * que decide si hay que bajar carga antes de fijar el pico del mes.
 *
 * `occupancyPercent` llega nulo cuando el local no tiene potencia contratada
 * registrada, y `measuredAt` cuando ningun medidor ha reportado todavia.
 *
 * @returns {Promise<import("../types").CurrentConsumption>}
 */
export async function getCurrentConsumption(siteId) {
  if (DEMO_MODE) {
    await delay();
    return demoCurrentConsumption;
  }
  const { data } = await api.get(`${BASE}/sites/${siteId}/consumption/current`);
  return {
    siteId: data.site_id,
    siteName: data.site_name,
    meterCount: data.meter_count ?? 0,
    powerKw: data.power_kw ?? 0,
    contractedPowerKw: data.contracted_power_kw ?? null,
    occupancyPercent: data.occupancy_percent ?? null,
    measuredAt: data.measured_at ?? null,
  };
}

/** @returns {import("../types").EnergyMeter} */
function mapMeter(m) {
  return {
    meterId: m.id,
    name: m.model || m.meter_serial,
    serial: m.meter_serial,
    siteId: m.site_id ?? null,
    zoneId: m.zone_id ?? null,
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
 * Vincula (registra y asocia) un medidor EOS al establecimiento.
 * El backend exige marca y ubicacion ademas del numero de serie.
 *
 * @returns {Promise<import("../types").EnergyMeter>}
 */
export async function linkMeter(userId, serial, opts = {}) {
  const { model = "EOS", siteId, zoneId } = opts;
  if (DEMO_MODE) {
    await delay(300);
    return {
      meterId: crypto.randomUUID(),
      name: model || serial,
      serial,
      siteId: siteId ?? null,
      zoneId: zoneId ?? null,
      active: true,
      lastReadingKwh: 0,
    };
  }
  const { data } = await api.post(`${BASE}/energy-meters`, {
    user_id: userId,
    site_id: siteId,
    zone_id: zoneId || null,
    meter_serial: serial,
    model,
    brand: "EOS",
    status: "active",
  });
  return mapMeter(data);
}

/**
 * Medidores instalados en un local (US20).
 *
 * Es la cobertura de medicion del local: cuantos puntos se estan midiendo y
 * cuales quedan sin medir.
 *
 * @returns {Promise<import("../types").EnergyMeter[]>}
 */
export async function listMetersBySite(siteId) {
  if (DEMO_MODE) {
    await delay(250);
    return demoMeters.filter((m) => !m.siteId || m.siteId === siteId);
  }
  const { data } = await api.get(`${BASE}/energy-meters/site/${siteId}`);
  return (data ?? []).map(mapMeter);
}

/**
 * Medidores de una zona concreta del local (US21).
 * @returns {Promise<import("../types").EnergyMeter[]>}
 */
export async function listMetersByZone(zoneId) {
  if (DEMO_MODE) {
    await delay(250);
    return demoMeters.filter((m) => m.zoneId === zoneId);
  }
  const { data } = await api.get(`${BASE}/energy-meters/zone/${zoneId}`);
  return (data ?? []).map(mapMeter);
}

/**
 * Traslada un medidor a otra zona del mismo local (US22).
 *
 * Pasar null lo deja sin zona, que es valido: sigue siendo del local. A otro
 * local no se puede mover, porque seria otro suministro y otro recibo.
 *
 * @returns {Promise<import("../types").EnergyMeter>}
 */
export async function reassignMeterZone(meterId, zoneId) {
  if (DEMO_MODE) {
    await delay(200);
    return { meterId, zoneId: zoneId || null };
  }
  const { data } = await api.patch(`${BASE}/energy-meters/${meterId}/zone`, {
    zone_id: zoneId || null,
  });
  return mapMeter(data);
}

/**
 * Tarifa comercial vigente para una categoria del pliego (US27).
 *
 * Es la diferencia con una tarifa domestica: no hay un unico precio por kWh,
 * sino precio en punta, precio fuera de punta y un cargo por potencia que no
 * depende de cuanta energia se gasto sino del pico mas alto del mes.
 *
 * @param {string} category BT5B, BT3, BT4, MT2 o MT3
 */
export async function getCommercialTariff(category) {
  if (DEMO_MODE) {
    await delay(200);
    return {
      provider: "Plus Energia",
      tariffCategory: category,
      currency: "PEN",
      energyPeakPerKwh: 0.281,
      energyOffPeakPerKwh: 0.2395,
      powerPerKwMonth: 58.4,
      excessPowerPerKwMonth: 87.6,
      fixedCharge: 12.8,
      igv: 0.18,
      peakHours: "18:00-23:00",
      peakEveryDay: true,
      inPeakNow: new Date().getHours() >= 18 && new Date().getHours() < 23,
    };
  }
  const { data } = await api.get(`${BASE}/energy/tariffs/${category}`);
  return {
    provider: data.provider,
    tariffCategory: data.tariff_category,
    currency: data.currency,
    energyPeakPerKwh: data.energy_peak_per_kwh ?? 0,
    energyOffPeakPerKwh: data.energy_off_peak_per_kwh ?? 0,
    powerPerKwMonth: data.power_per_kw_month ?? 0,
    excessPowerPerKwMonth: data.excess_power_per_kw_month ?? 0,
    fixedCharge: data.fixed_charge ?? 0,
    igv: data.igv ?? 0,
    peakHours: data.peak_hours,
    // Que dias cuentan como punta depende del suministro: la exclusion de
    // domingos no es automatica, la concede la distribuidora a quien la pide.
    peakEveryDay: data.peak_every_day !== false,
    inPeakNow: Boolean(data.in_peak_now),
  };
}

/**
 * Estima el recibo del mes y desglosa cuanto pesa el cargo por potencia (US36).
 *
 * El desglose es lo util: ver que una parte del recibo no se paga por consumir
 * sino por el pico es lo que justifica vigilar la demanda.
 */
export async function estimateBill({ tariffCategory, kwhPeak, kwhOffPeak, maxDemandKw,
  contractedPowerKw }) {
  const payload = {
    tariff_category: tariffCategory,
    kwh_peak: kwhPeak,
    kwh_off_peak: kwhOffPeak,
    max_demand_kw: maxDemandKw,
    contracted_power_kw: contractedPowerKw,
  };
  if (DEMO_MODE) {
    await delay(300);
    const energia = kwhPeak * 0.281 + kwhOffPeak * 0.2395;
    const dentro = Math.min(maxDemandKw, contractedPowerKw);
    const exceso = Math.max(maxDemandKw - contractedPowerKw, 0);
    const potencia = dentro * 58.4 + exceso * 87.6;
    const subtotal = energia + potencia + 12.8;
    return {
      currency: "PEN",
      energyCost: +energia.toFixed(2),
      powerCost: +potencia.toFixed(2),
      fixedCharge: 12.8,
      subtotal: +subtotal.toFixed(2),
      igv: +(subtotal * 0.18).toFixed(2),
      total: +(subtotal * 1.18).toFixed(2),
      excessKw: +exceso.toFixed(2),
      hasExcess: exceso > 0,
      powerSharePct: +((potencia / subtotal) * 100).toFixed(1),
    };
  }
  const { data } = await api.post(`${BASE}/energy/bill-estimate`, payload);
  // El peso de la potencia lo calcula el backend: es su respuesta a US36 y no
  // tiene sentido recalcularla aqui con otro redondeo.
  return {
    currency: data.currency,
    energyCost: data.energy_cost ?? 0,
    powerCost: data.power_cost ?? 0,
    fixedCharge: data.fixed_charge ?? 0,
    subtotal: data.subtotal ?? 0,
    igv: data.igv ?? 0,
    total: data.total ?? 0,
    excessKw: data.excess_power_kw ?? 0,
    hasExcess: Boolean(data.has_power_excess),
    powerSharePct: data.power_share_pct ?? null,
  };
}

/**
 * Desvincula el medidor de la cuenta. No borra nada: el historico de lecturas
 * se conserva y el medidor puede volver a vincularse registrando el mismo
 * numero de serie. Deja de aparecer en la lista del usuario.
 */
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
export async function getConsumptionSummary(userId, days = 90, cargado = {}) {
  const readings = await getReadings(userId, days, cargado); // [{date, kwh, cost}] por dia
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
