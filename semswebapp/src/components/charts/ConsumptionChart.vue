<script setup>
import { computed } from "vue";
import { storeToRefs } from "pinia";
import Chart from "primevue/chart";
import { useThemeStore } from "@/stores/theme";
import { useLangStore } from "@/stores/lang";

/**
 * Grafico de area del consumo diario.
 *
 * Sustituye al de recharts, que es solo para React. Aqui se usa el componente
 * Chart de PrimeVue (que envuelve a Chart.js), con lo que el grafico queda
 * dentro de la misma biblioteca de componentes que pide el enunciado.
 */
const props = defineProps({
  data: { type: Array, required: true },
  metric: { type: String, default: "kwh" }, // kwh | cost
});

const { theme } = storeToRefs(useThemeStore());
const { t } = useLangStore();

const dark = computed(() => theme.value === "dark");
const axisColor = computed(() => (dark.value ? "#64748b" : "#94a3b8"));
const gridColor = computed(() => (dark.value ? "#1b2748" : "#e2e8f0"));

function formatDate(iso) {
  const date = new Date(iso + "T00:00:00");
  if (isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("es-PE", { day: "2-digit", month: "short" });
}

const chartData = computed(() => ({
  labels: props.data.map((r) => formatDate(r.date)),
  datasets: [
    {
      data: props.data.map((r) => r[props.metric]),
      borderColor: "#2563eb",
      borderWidth: 2.5,
      tension: 0.4,
      pointRadius: 0,
      pointHoverRadius: 4,
      pointHoverBackgroundColor: "#2563eb",
      fill: true,
      // El degradado se pinta sobre el lienzo, asi que hay que esperar a que
      // Chart.js haya calculado el area del grafico. En el primer render aun no
      // existe: se devuelve un color plano y en el siguiente ya hay degradado.
      backgroundColor: (ctx) => {
        const { chart } = ctx;
        if (!chart.chartArea) return "rgba(37, 99, 235, 0.2)";
        const g = chart.ctx.createLinearGradient(0, chart.chartArea.top, 0, chart.chartArea.bottom);
        g.addColorStop(0, "rgba(37, 99, 235, 0.35)");
        g.addColorStop(1, "rgba(37, 99, 235, 0)");
        return g;
      },
    },
  ],
}));

const chartOptions = computed(() => ({
  maintainAspectRatio: false,
  // Sin esto, el tooltip solo aparece justo encima del punto.
  interaction: { mode: "index", intersect: false },
  plugins: {
    legend: { display: false }, // una sola serie: la leyenda no aporta nada
    tooltip: {
      backgroundColor: dark.value ? "#0e1730" : "#ffffff",
      borderColor: gridColor.value,
      borderWidth: 1,
      titleColor: dark.value ? "#e2e8f0" : "#0f172a",
      bodyColor: dark.value ? "#e2e8f0" : "#0f172a",
      padding: 10,
      cornerRadius: 12,
      displayColors: false,
      callbacks: {
        label: (item) =>
          props.metric === "cost"
            ? `${t("Costo", "Cost")}: S/ ${Number(item.raw).toFixed(2)}`
            : `${t("Consumo", "Usage")}: ${item.raw} kWh`,
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: { color: axisColor.value, font: { size: 11 }, maxRotation: 0, autoSkipPadding: 24 },
    },
    y: {
      grid: { color: gridColor.value, drawTicks: false },
      border: { display: false },
      ticks: { color: axisColor.value, font: { size: 11 }, padding: 8 },
    },
  },
}));
</script>

<template>
  <Chart
    type="line"
    :data="chartData"
    :options="chartOptions"
    class="h-[260px] w-full"
  />
</template>
