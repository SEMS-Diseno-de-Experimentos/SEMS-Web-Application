// Pruebas del CSV de Reportes (issue #4). Se corren con `npm test`, que usa el
// runner nativo de Node: la logica es pura y no necesita navegador ni Vite.
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildConsumptionCsv, csvFileName, escapeCsvField } from "./reportCsv.js";

const BOM = "﻿";

/** @returns {import("./report.js").ReportData} */
const sample = (over = {}) => ({
  userName: "Ana",
  summary: { currentMonthCost: 120.5, projectedCost: 300, totalKwh: 450.25, activeDevices: 3 },
  consumption: [{ deviceId: "d1", deviceName: "Cámara de frío", kwh: 200, cost: 90.456, pct: 44 }],
  readings: [{ date: "2026-11-10", kwh: 15.5, cost: 7.2 }],
  days: 30,
  lang: "es",
  ...over,
});

const lines = (csv) => csv.slice(BOM.length).split("\r\n");

test("empieza con BOM y separa las filas con CRLF", () => {
  const csv = buildConsumptionCsv(sample());
  assert.ok(csv.startsWith(BOM));
  assert.ok(csv.includes("\r\n"));
  assert.ok(!/[^\r]\n/.test(csv), "no debe haber saltos de linea sueltos");
});

test("trae las tres secciones con encabezados en espanol", () => {
  const l = lines(buildConsumptionCsv(sample()));
  assert.ok(l.includes("Resumen"));
  assert.ok(l.includes("Consumo por dispositivo"));
  assert.ok(l.includes("Lecturas diarias"));
  assert.ok(l.includes("Dispositivo,Consumo (kWh),Costo (S/),%"));
  assert.ok(l.includes("Fecha,Consumo (kWh),Costo (S/)"));
});

test("traduce los encabezados al ingles", () => {
  const l = lines(buildConsumptionCsv(sample({ lang: "en" })));
  assert.ok(l.includes("Summary"));
  assert.ok(l.includes("Usage by device"));
  assert.ok(l.includes("Daily readings"));
  assert.ok(l.includes("Device,Usage (kWh),Cost (S/),%"));
});

test("los numeros van sin unidad, con punto decimal y dos decimales", () => {
  const l = lines(buildConsumptionCsv(sample()));
  assert.ok(l.includes("Cámara de frío,200.00,90.46,44"));
  assert.ok(l.includes("2026-11-10,15.50,7.20"));
  assert.ok(l.includes("Consumo total,450.25,kWh"));
  assert.ok(l.includes("Periodo,30,días"));
});

test("escapa comas, comillas y saltos de linea segun RFC 4180", () => {
  assert.equal(escapeCsvField("Horno, grande"), '"Horno, grande"');
  assert.equal(escapeCsvField('Aire "central"'), '"Aire ""central"""');
  assert.equal(escapeCsvField("linea1\nlinea2"), '"linea1\nlinea2"');
  assert.equal(escapeCsvField("Simple"), "Simple");
});

test("neutraliza nombres que una hoja de calculo leeria como formula", () => {
  for (const evil of ["=HYPERLINK(\"x\")", "+1", "-2", "@SUM(A1)", "\tTab", "\rCR"]) {
    assert.ok(escapeCsvField(evil).replace(/^"/, "").startsWith("'"), evil);
  }
  const l = lines(buildConsumptionCsv(sample({
    consumption: [{ deviceId: "x", deviceName: "=1+1", kwh: 1, cost: 1, pct: 100 }],
  })));
  assert.ok(l.includes("'=1+1,1.00,1.00,100"));
});

test("los numeros negativos no se tratan como formula", () => {
  const l = lines(buildConsumptionCsv(sample({
    readings: [{ date: "2026-11-10", kwh: -1.5, cost: 0 }],
  })));
  assert.ok(l.includes("2026-11-10,-1.50,0.00"));
});

test("una seccion sin datos lo dice en vez de quedar vacia", () => {
  const l = lines(buildConsumptionCsv(sample({ consumption: [], readings: [], summary: null })));
  assert.ok(l.includes("Sin datos en el periodo"));
  assert.ok(l.includes("Sin lecturas en el periodo"));
  assert.ok(l.includes("Consumo total,0.00,kWh"));
});

test("el nombre del archivo sigue el idioma y la fecha", () => {
  const d = new Date("2026-11-11T15:00:00Z");
  assert.equal(csvFileName("es", d), "SEMS_reporte_2026-11-11.csv");
  assert.equal(csvFileName("en", d), "SEMS_report_2026-11-11.csv");
});
