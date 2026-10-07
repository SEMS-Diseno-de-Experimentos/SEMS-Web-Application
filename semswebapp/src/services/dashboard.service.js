import { getReadings, getPricePerKwh } from "./energy.service";
import { listDevices } from "./devices.service";
import { getUnreadAlertCount } from "./alerts.service";
import { getBillPrediction, getRecommendations } from "./analytics.service";

/**
 * Resumen del dashboard.
 */
export async function getDashboardSummary(userId) {
  const [devicesRes, alertsRes, predictionRes, readingsRes] = await Promise.allSettled([
    listDevices(userId),
    getUnreadAlertCount(userId),
    getBillPrediction(userId),
    getReadings(userId, 30), // Get last 30 days
  ]);

  const devices = devicesRes.status === "fulfilled" ? devicesRes.value : [];
  const activeDevices = devices.filter((d) => d.status === "ACTIVE");
  const unreadAlerts = alertsRes.status === "fulfilled" ? alertsRes.value : 0;
  const prediction = predictionRes.status === "fulfilled" ? predictionRes.value : { projectedCost: 0, projectedKwh: 0 };
  const readings = readingsRes.status === "fulfilled" ? readingsRes.value : [];

  let currentKwh = 0;
  let currentCost = 0;
  for (const r of readings) {
    currentKwh += r.kwh;
    currentCost += r.cost;
  }

  // Calculate savings from applied recommendations
  let savingAmount = 0;
  try {
    const recs = await getRecommendations(userId);
    for (const r of recs) {
      if (r.applied) savingAmount += r.estimatedSaving || 0;
    }
  } catch (e) {}

  return {
    currentMonthCost: +currentCost.toFixed(2),
    savingAmount: +savingAmount.toFixed(2),
    savingPct: currentCost > 0 ? +(savingAmount / currentCost * 100).toFixed(1) : 0,
    projectedCost: +prediction.projectedCost.toFixed(2),
    totalKwh: +currentKwh.toFixed(2),
    activeDevices: activeDevices.length,
    unreadAlerts,
  };
}
