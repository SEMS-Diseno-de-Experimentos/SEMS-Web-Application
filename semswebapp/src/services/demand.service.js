import { api, DEMO_MODE, delay } from "@/lib/api";

// Modulo de alertas del backend. Sus recursos responden en snake_case.
const BASE = "/api/v1";

/**
 * Reglas de aviso de demanda (US28 a US31).
 *
 * Es la pieza que diferencia al producto. En una tarifa comercial el recibo no
 * solo cobra la energia consumida: cobra tambien la potencia, y esa se mide por
 * el pico mas alto del mes. Un pico de quince minutos encarece el mes entero, y
 * lo que exceda de la potencia contratada se cobra a precio de penalizacion.
 *
 * De ahi la regla: se avisa *antes* de llegar al tope contratado, con un margen
 * configurable, para que haya tiempo de apagar algo. Avisar despues no sirve de
 * nada, porque el pico ya quedo registrado.
 */

function mapRule(r) {
  return {
    id: r.demand_rule_id,
    siteId: r.site_id,
    userId: r.user_id,
    name: r.rule_name,
    contractedPowerKw: r.contracted_power_kw ?? 0,
    warningPercent: r.warning_percent ?? 0,
    warningThresholdKw: r.warning_threshold_kw ?? 0,
    active: Boolean(r.active),
    createdAt: r.created_at,
  };
}

const demoRules = [
  {
    id: "demo-rule-1",
    siteId: "demo-site-1",
    name: "Aviso de demanda",
    contractedPowerKw: 120,
    warningPercent: 85,
    warningThresholdKw: 102,
    active: true,
    createdAt: new Date().toISOString(),
  },
];

/**
 * Reglas de un local.
 * @returns {Promise<ReturnType<typeof mapRule>[]>}
 */
export async function listDemandRules(siteId) {
  if (DEMO_MODE) {
    await delay(250);
    return demoRules;
  }
  const { data } = await api.get(`${BASE}/sites/${siteId}/demand-rules`);
  return (data ?? []).map(mapRule);
}

/**
 * Crea una regla de aviso para un local (US28).
 *
 * @param {{siteId: string, userId: string, name?: string,
 *          contractedPowerKw: number, warningPercent?: number}} rule
 */
export async function createDemandRule(rule) {
  if (DEMO_MODE) {
    await delay(300);
    const umbral = (rule.contractedPowerKw * (rule.warningPercent ?? 80)) / 100;
    return {
      id: crypto.randomUUID(),
      siteId: rule.siteId,
      name: rule.name || "Aviso de demanda",
      contractedPowerKw: rule.contractedPowerKw,
      warningPercent: rule.warningPercent ?? 80,
      warningThresholdKw: Math.round(umbral * 100) / 100,
      active: true,
      createdAt: new Date().toISOString(),
    };
  }
  const { data } = await api.post(`${BASE}/demand-rules`, {
    site_id: rule.siteId,
    user_id: rule.userId,
    rule_name: rule.name || null,
    contracted_power_kw: rule.contractedPowerKw,
    warning_percent: rule.warningPercent ?? null,
    active: true,
  });
  return mapRule(data);
}

/**
 * Evalua una demanda contra las reglas del local y devuelve los avisos que
 * genera (US29, US30 y US31).
 *
 * Por debajo del umbral no devuelve nada, y eso tambien es informacion: deja
 * ver que la regla no esta disparando por cualquier cosa.
 *
 * @returns {Promise<{alertId: string, title: string, message: string,
 *                    severity: string, triggeredAt: string}[]>}
 */
export async function evaluateDemand(siteId, demandKw) {
  if (DEMO_MODE) {
    await delay(400);
    const regla = demoRules[0];
    if (demandKw > regla.contractedPowerKw) {
      return [{
        alertId: crypto.randomUUID(),
        title: "Exceso de potencia contratada",
        message: `La demanda de ${demandKw} kW supera los ${regla.contractedPowerKw} kW contratados.`,
        severity: "critical",
        triggeredAt: new Date().toISOString(),
      }];
    }
    if (demandKw >= regla.warningThresholdKw) {
      return [{
        alertId: crypto.randomUUID(),
        title: "Demanda cerca del tope contratado",
        message: `La demanda de ${demandKw} kW se acerca a los ${regla.contractedPowerKw} kW contratados.`,
        severity: "warning",
        triggeredAt: new Date().toISOString(),
      }];
    }
    return [];
  }
  const { data } = await api.post(`${BASE}/sites/${siteId}/demand-evaluations`, {
    demand_kw: demandKw,
  });
  return (data ?? []).map((a) => ({
    alertId: a.alert_id,
    title: a.title,
    message: a.message,
    severity: a.severity,
    triggeredAt: a.triggered_at,
  }));
}
