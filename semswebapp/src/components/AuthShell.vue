<script setup>
import { Zap } from "lucide-vue-next";
import { useLangStore } from "@/stores/lang";

// Marco de las pantallas sin sesion: panel de marca a la izquierda y
// formulario a la derecha. Lo comparten login, registro, recuperacion,
// restablecimiento y verificacion de cuenta.
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, required: true },
});

const { t } = useLangStore();
</script>

<template>
  <div class="grid min-h-screen lg:grid-cols-2">
    <!-- Panel de marca: se oculta en pantallas pequenas para dejar sitio al formulario -->
    <div
      class="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-blue-600 to-blue-800 p-12 text-white lg:flex"
    >
      <div class="flex items-center gap-2.5">
        <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
          <Zap
            class="h-6 w-6 text-white"
            fill="white"
          />
        </span>
        <span class="font-display text-2xl font-extrabold">SEMS</span>
      </div>
      <div>
        <h2 class="font-display text-4xl font-extrabold leading-tight">
          {{ t("Controla tu energía.", "Take control of your energy.") }}<br>
          {{ t("Reduce tu factura.", "Lower your bill.") }}
        </h2>
        <p class="mt-4 max-w-md text-blue-100/90">
          {{
            t(
              "Monitorea el consumo de tu hogar en tiempo real, recibe alertas y ahorra hasta un 30% en tu recibo de luz.",
              "Monitor your home's usage in real time, get alerts and save up to 30% on your electricity bill."
            )
          }}
        </p>
      </div>
      <p class="text-sm text-blue-100/70">
        {{ t("Un producto de Energix · Lima, Perú", "An Energix product · Lima, Peru") }}
      </p>
    </div>

    <!-- Formulario -->
    <div class="flex items-center justify-center p-6 sm:p-12">
      <div class="w-full max-w-sm">
        <div class="mb-8 lg:hidden">
          <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
            <Zap
              class="h-6 w-6 text-white"
              fill="white"
            />
          </span>
        </div>
        <h1 class="font-display text-2xl font-extrabold text-slate-900 dark:text-white">
          {{ title }}
        </h1>
        <p class="mt-1 mb-6 text-sm text-slate-500 dark:text-slate-400">
          {{ subtitle }}
        </p>
        <slot />
      </div>
    </div>
  </div>
</template>
