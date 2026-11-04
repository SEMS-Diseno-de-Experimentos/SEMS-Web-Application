<script setup>
import { computed } from "vue";
import { Check, ArrowRight } from "lucide-vue-next";
import UiCard from "@/components/ui/UiCard.vue";
import UiCardTitle from "@/components/ui/UiCardTitle.vue";
import { useLangStore } from "@/stores/lang";

/**
 * Primeros pasos de una cuenta nueva.
 *
 * El panel de una cuenta recien creada estaba lleno de ceros y no decia que
 * hacer para que dejaran de serlo. Cada paso lleva a la pantalla que lo
 * resuelve, y la tarjeta desaparece cuando estan todos hechos.
 */
const props = defineProps({
  hasOrganization: { type: Boolean, default: false },
  siteCount: { type: Number, default: 0 },
  meterCount: { type: Number, default: 0 },
  deviceCount: { type: Number, default: 0 },
});

const { t } = useLangStore();

const steps = computed(() => [
  {
    done: props.hasOrganization,
    to: "/sites",
    title: t("Registra tu empresa", "Register your company"),
    detail: t(
      "Razón social y RUC: es lo que identifica tus recibos.",
      "Legal name and tax id: it is what identifies your bills."
    ),
  },
  {
    done: props.siteCount > 0,
    to: "/sites",
    title: t("Añade tu primer local", "Add your first site"),
    detail: t(
      "La tarifa y la potencia contratada son del local, no de la empresa.",
      "The tariff and the contracted power belong to the site, not the company."
    ),
  },
  {
    done: props.meterCount > 0,
    to: "/monitoring",
    title: t("Vincula un medidor", "Link a meter"),
    detail: t(
      "Sin medidor no hay lecturas, y sin lecturas el panel no tiene nada que mostrar.",
      "Without a meter there are no readings, and without readings there is nothing to show."
    ),
  },
  {
    done: props.deviceCount > 0,
    to: "/devices",
    title: t("Registra tus equipos", "Register your equipment"),
    detail: t(
      "Cámaras, climatización, iluminación: el desglose por equipo sale de aquí.",
      "Cold storage, HVAC, lighting: the per-device breakdown comes from here."
    ),
  },
]);

const pendientes = computed(() => steps.value.filter((s) => !s.done).length);
const hechos = computed(() => steps.value.length - pendientes.value);
</script>

<template>
  <UiCard v-if="pendientes > 0">
    <UiCardTitle>
      {{ t("Primeros pasos", "Getting started") }}
      <template #action>
        <span class="text-xs font-semibold text-slate-400">
          {{ hechos }}/{{ steps.length }}
        </span>
      </template>
    </UiCardTitle>
    <p class="-mt-1 mb-3 text-sm text-slate-500 dark:text-slate-400">
      {{
        t(
          "Tu panel se llena a medida que completas esto.",
          "Your overview fills up as you complete these."
        )
      }}
    </p>
    <ol class="space-y-2">
      <li
        v-for="(s, i) in steps"
        :key="s.title"
      >
        <RouterLink
          :to="s.to"
          class="flex items-start gap-3 rounded-lg border border-slate-100 p-3 transition hover:border-blue-200 hover:bg-blue-50/50 dark:border-navy-800 dark:hover:border-blue-500/30 dark:hover:bg-blue-500/5"
        >
          <span
            :class="[
              'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
              s.done
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300'
                : 'bg-slate-100 text-slate-500 dark:bg-navy-800 dark:text-slate-400',
            ]"
          >
            <Check
              v-if="s.done"
              class="h-3.5 w-3.5"
            />
            <template v-else>{{ i + 1 }}</template>
          </span>
          <div class="min-w-0 flex-1">
            <p
              :class="[
                'text-sm font-semibold',
                s.done
                  ? 'text-slate-400 line-through dark:text-slate-500'
                  : 'text-slate-900 dark:text-white',
              ]"
            >
              {{ s.title }}
            </p>
            <p
              v-if="!s.done"
              class="mt-0.5 text-xs leading-snug text-slate-500 dark:text-slate-400"
            >
              {{ s.detail }}
            </p>
          </div>
          <ArrowRight
            v-if="!s.done"
            class="mt-1 h-4 w-4 shrink-0 text-slate-300 dark:text-navy-700"
          />
        </RouterLink>
      </li>
    </ol>
  </UiCard>
</template>
