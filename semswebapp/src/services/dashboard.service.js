import { DEMO_MODE, delay } from "@/lib/api";
import { demoSummary } from "@/lib/demo";
import { getDeviceConsumption, getReadings } from "./energy.service";
import { listDevices } from "./devices.service";
import { getUnreadAlertCount } from "./alerts.service";

/** Dias de historia que se piden: dos quincenas, para poder comparar una con otra. */
export const SUMMARY_DAYS = 30;

function redondear(n) {
  return +n.toFixed(2);
}

/**
 * Arma el resumen a partir de datos ya cargados.
 *
 * Esta separado de la peticion a proposito: el panel ya consulta las lecturas y
 * el consumo por dispositivo para sus graficos, y antes el resumen los volvia a
 * pedir por su cuenta. Eran dos peticiones identicas por carga.
 *
 * @returns {import("../types").DashboardSummary}
 */
export function summarize({ consumption = [], readings = [], devices = [], unreadAlerts = 0 } = {}) {
  const consumptionKwh = consumption.reduce((s, c) => s + c.kwh, 0);
  const readingsKwh = readings.reduce((s, r) => s + r.kwh, 0);
  const consumptionCost = consumption.reduce((s, c) => s + c.cost, 0);
  const readingsCost = readings.reduce((s, r) => s + (r.cost ?? 0), 0);

  // El coste por dispositivo solo existe si hay dispositivos; quien mide el
  // local con un medidor y sin equipos tambien tiene gasto.
  const currentMonthCost = consumptionCost || readingsCost;
  const totalKwh = consumptionKwh || readingsKwh;
  const activeDevices = devices.filter((d) => d.status === "ACTIVE").length;

  return {
    currentMonthCost: redondear(currentMonthCost),
    ...comparacionDeQuincenas(readings),
    projectedCost: proyeccion(readings, currentMonthCost),
    totalKwh: redondear(totalKwh),
    activeDevices,
    unreadAlerts,
  };
}

/**
 * Ahorro frente a la quincena anterior.
 *
 * El panel mostraba "0% vs. tu promedio" en una cuenta recien creada: un
 * promedio que no existia y un ahorro que nadie habia calculado. Cuando no hay
 * con que comparar se devuelve null y la tarjeta lo dice en lugar de inventar
 * un cero.
 */
function comparacionDeQuincenas(readings) {
  const mitad = Math.floor(SUMMARY_DAYS / 2);
  const corte = Date.now() - mitad * 86_400_000;
  let actual = 0;
  let anterior = 0;
  let diasAnteriores = 0;

  for (const r of readings) {
    const fecha = new Date(r.date).getTime();
    if (Number.isNaN(fecha)) continue;
    const coste = r.cost ?? 0;
    if (fecha >= corte) {
      actual += coste;
    } else {
      anterior += coste;
      diasAnteriores += 1;
    }
  }

  if (diasAnteriores === 0 || anterior <= 0) {
    return { savingAmount: null, savingPct: null };
  }
  const ahorro = anterior - actual;
  return {
    savingAmount: redondear(ahorro),
    savingPct: +((ahorro / anterior) * 100).toFixed(1),
  };
}

/**
 * Gasto estimado al cierre del mes.
 *
 * Antes la "proyeccion" repetia el gasto actual, de modo que la tarjeta decia
 * dos veces el mismo numero. Esta reparte el gasto medido entre los dias con
 * lectura y lo extiende a los dias del mes.
 */
function proyeccion(readings, currentMonthCost) {
  const conLectura = readings.filter((r) => (r.cost ?? 0) > 0).length;
  if (conLectura === 0 || currentMonthCost <= 0) {
    return null;
  }
  const hoy = new Date();
  const diasDelMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
  const porDia = currentMonthCost / conLectura;
  return redondear(porDia * diasDelMes);
}

/**
 * Resumen del panel para las vistas que no cargan los datos por su cuenta.
 *
 * Se usa `allSettled` a proposito: si un modulo falla, el resumen se arma con
 * lo que si respondio en vez de quedarse en blanco entero.
 *
 * @returns {Promise<import("../types").DashboardSummary>}
 */
export async function getDashboardSummary(userId) {
  if (DEMO_MODE) { await delay(300); return demoSummary; }

  const [consumptionRes, devicesRes, readingsRes, alertsRes] = await Promise.allSettled([
    getDeviceConsumption(userId),
    listDevices(userId),
    getReadings(userId, SUMMARY_DAYS),
    getUnreadAlertCount(userId),
  ]);

  return summarize({
    consumption: consumptionRes.status === "fulfilled" ? consumptionRes.value : [],
    devices: devicesRes.status === "fulfilled" ? devicesRes.value : [],
    readings: readingsRes.status === "fulfilled" ? readingsRes.value : [],
    unreadAlerts: alertsRes.status === "fulfilled" ? alertsRes.value : 0,
  });
}
