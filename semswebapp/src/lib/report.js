import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * @typedef {object} ReportData
 * @property {string} userName
 * @property {import("../types").DashboardSummary | null} summary
 * @property {import("../types").DeviceConsumption[]} consumption
 * @property {import("../types").EnergyReading[]} readings
 * @property {number} days
 * @property {"es" | "en"} lang
 */

const money = (n) => `S/ ${n.toFixed(2)}`;
const kwh = (n) => `${n.toFixed(2)} kWh`;

/**
 * Genera el PDF de consumo energetico y lo descarga.
 *
 * El documento tiene tres tablas: resumen, consumo por dispositivo y lecturas
 * diarias, que es justo lo que la pantalla de Reportes le promete al usuario.
 *
 * @param {ReportData} d
 */
export function generateConsumptionReport(d) {
  const es = d.lang === "es";
  const T = (a, b) => (es ? a : b);
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  // Donde termino la ultima tabla, para encadenar la siguiente debajo.
  const lastY = () => doc.lastAutoTable?.finalY ?? 0;
  const now = new Date();
  const stamp = now.toLocaleString(es ? "es-PE" : "en-US");

  // Encabezado con barra azul
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageW, 26, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("SEMS", 14, 12);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(T("Reporte de consumo energético", "Energy consumption report"), 14, 20);

  // Metadatos
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  doc.text(`${T("Usuario", "User")}: ${d.userName}`, 14, 36);
  doc.text(`${T("Periodo", "Period")}: ${T("últimos", "last")} ${d.days} ${T("días", "days")}`, 14, 42);
  doc.text(`${T("Generado", "Generated")}: ${stamp}`, 14, 48);

  const heading = (text, y) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(text, 14, y);
  };

  // ---------------------------------------------------------------- resumen
  let y = 60;
  heading(T("Resumen", "Summary"), y);
  y += 4;

  const s = d.summary;
  autoTable(doc, {
    startY: y,
    theme: "grid",
    headStyles: { fillColor: [37, 99, 235] },
    head: [[T("Indicador", "Metric"), T("Valor", "Value")]],
    body: [
      [T("Gasto actual", "Current spend"), money(s?.currentMonthCost ?? 0)],
      [T("Proyección de factura", "Bill forecast"), money(s?.projectedCost ?? 0)],
      [T("Consumo total", "Total usage"), kwh(s?.totalKwh ?? 0)],
      [T("Dispositivos activos", "Active devices"), String(s?.activeDevices ?? 0)],
    ],
  });

  // ------------------------------------------------ consumo por dispositivo
  y = lastY() + 12;
  heading(T("Consumo por dispositivo", "Usage by device"), y);
  y += 4;

  autoTable(doc, {
    startY: y,
    theme: "grid",
    headStyles: { fillColor: [37, 99, 235] },
    head: [[T("Dispositivo", "Device"), T("Consumo", "Usage"), T("Costo", "Cost"), "%"]],
    body: d.consumption.length
      ? d.consumption.map((c) => [c.deviceName, kwh(c.kwh), money(c.cost), `${c.pct}%`])
      : [[T("Sin datos en el periodo", "No data for this period"), "—", "—", "—"]],
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
    },
  });

  // -------------------------------------------------------- lecturas diarias
  y = lastY() + 12;
  heading(T("Lecturas diarias", "Daily readings"), y);
  y += 4;

  autoTable(doc, {
    startY: y,
    theme: "grid",
    headStyles: { fillColor: [37, 99, 235] },
    head: [[T("Fecha", "Date"), T("Consumo", "Usage"), T("Costo", "Cost")]],
    body: d.readings.length
      ? d.readings.map((r) => [r.date, kwh(r.kwh), money(r.cost)])
      : [[T("Sin lecturas en el periodo", "No readings for this period"), "—", "—"]],
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "right" },
    },
  });

  // ------------------------------------------------------------------- pie
  // Se numera al final, cuando ya se sabe cuantas paginas ocuparon las tablas.
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `SEMS · Energix — ${T("Página", "Page")} ${i}/${pages}`,
      pageW / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: "center" }
    );
  }

  const fname = `SEMS_${T("reporte", "report")}_${now.toISOString().slice(0, 10)}.pdf`;
  doc.save(fname);
}
