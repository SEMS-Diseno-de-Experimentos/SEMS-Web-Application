// Reporte de consumo en CSV (issue #4).
//
// Lleva los mismos datos que el PDF de `report.js`, pero pensado para abrirlo
// en Excel o Google Sheets: numeros sin unidad ni simbolo de moneda (la unidad
// va en el encabezado), con punto decimal, para que la hoja los lea como
// numeros y se puedan sumar. Las funciones de armado son puras y se prueban en
// `reportCsv.test.js`; solo `downloadCsv` toca el navegador.

// Excel abre un CSV sin BOM como ANSI y rompe las tildes ("CÃ¡mara").
const BOM = "﻿";
// RFC 4180 separa los registros con CRLF.
const EOL = "\r\n";

// Un texto que empieza asi lo interpreta la hoja de calculo como formula. El
// nombre del dispositivo lo escribe el usuario, asi que es una entrada externa:
// sin esto, "=HYPERLINK(...)" se ejecutaria al abrir el archivo.
const FORMULA_START = /^[=+\-@\t\r]/;

const num = (n) => (Number.isFinite(n) ? n.toFixed(2) : "0.00");

/**
 * Escapa un campo de texto segun RFC 4180 y lo neutraliza si parece formula.
 * Solo para texto: los numeros se escriben tal cual, para que "-2.50" siga
 * siendo un numero negativo y no un texto con apostrofo.
 *
 * @param {string} value
 * @returns {string}
 */
export function escapeCsvField(value) {
  let s = String(value ?? "");
  if (FORMULA_START.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Una fila. Los `number` salen con dos decimales y sin escapar; todo lo demas
 * es texto y pasa por `escapeCsvField`. Los enteros que se quieren sin
 * decimales (dias, %, cantidad de equipos) se pasan como string.
 */
const row = (...cells) =>
  cells.map((c) => (typeof c === "number" ? num(c) : escapeCsvField(c))).join(",");

/**
 * Arma el CSV del reporte de consumo.
 *
 * @param {import("./report.js").ReportData} d
 * @returns {string}
 */
export function buildConsumptionCsv(d) {
  const T = (es, en) => (d.lang === "es" ? es : en);
  const s = d.summary;
  const lines = [];

  lines.push(row(T("Resumen", "Summary")));
  lines.push(row(T("Indicador", "Metric"), T("Valor", "Value"), T("Unidad", "Unit")));
  lines.push(row(T("Periodo", "Period"), String(d.days), T("días", "days")));
  lines.push(row(T("Gasto actual", "Current spend"), s?.currentMonthCost ?? 0, "S/"));
  lines.push(row(T("Proyección de factura", "Bill forecast"), s?.projectedCost ?? 0, "S/"));
  lines.push(row(T("Consumo total", "Total usage"), s?.totalKwh ?? 0, "kWh"));
  lines.push(row(T("Dispositivos activos", "Active devices"), String(s?.activeDevices ?? 0), ""));
  lines.push("");

  lines.push(row(T("Consumo por dispositivo", "Usage by device")));
  lines.push(row(T("Dispositivo", "Device"), T("Consumo (kWh)", "Usage (kWh)"), T("Costo (S/)", "Cost (S/)"), "%"));
  if (d.consumption.length) {
    for (const c of d.consumption) lines.push(row(c.deviceName, c.kwh, c.cost, String(c.pct)));
  } else {
    lines.push(row(T("Sin datos en el periodo", "No data for this period")));
  }
  lines.push("");

  lines.push(row(T("Lecturas diarias", "Daily readings")));
  lines.push(row(T("Fecha", "Date"), T("Consumo (kWh)", "Usage (kWh)"), T("Costo (S/)", "Cost (S/)")));
  if (d.readings.length) {
    for (const r of d.readings) lines.push(row(r.date, r.kwh, r.cost));
  } else {
    lines.push(row(T("Sin lecturas en el periodo", "No readings for this period")));
  }

  return BOM + lines.join(EOL) + EOL;
}

/**
 * Mismo patron de nombre que el PDF, para que ambos queden juntos al ordenar.
 * @param {"es" | "en"} lang
 * @param {Date} [now]
 */
export function csvFileName(lang, now = new Date()) {
  const base = lang === "es" ? "reporte" : "report";
  return `SEMS_${base}_${now.toISOString().slice(0, 10)}.csv`;
}

/**
 * Descarga el CSV en el navegador.
 * @param {string} content
 * @param {string} filename
 */
export function downloadCsv(content, filename) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  // Revocar en el mismo tick puede cortar la descarga en algunos navegadores.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
