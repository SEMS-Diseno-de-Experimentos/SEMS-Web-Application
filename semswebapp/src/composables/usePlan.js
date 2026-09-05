import { computed } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { storeToRefs } from "pinia";
import { getMySubscription } from "@/services/subscriptions.service";
import { useAuthStore } from "@/stores/auth";
import { tierFromName } from "@/lib/plan";

/**
 * Nivel del plan del usuario (free / plus / pro).
 *
 * Comparte la misma clave de cache que la pagina de Suscripcion, asi que aunque
 * lo usen el menu lateral y tres paginas a la vez solo se hace una peticion.
 *
 * @returns {import("vue").ComputedRef<import("@/lib/plan").PlanTier>}
 */
export function usePlanTier() {
  const { user } = storeToRefs(useAuthStore());

  const { data } = useQuery({
    queryKey: computed(() => ["subscription", user.value?.id]),
    queryFn: () => getMySubscription(user.value.id),
    enabled: computed(() => Boolean(user.value)),
  });

  return computed(() => tierFromName(data.value?.planName));
}
