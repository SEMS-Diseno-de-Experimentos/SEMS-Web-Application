<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import { storeToRefs } from "pinia";
import { LoaderCircle, CreditCard } from "lucide-vue-next";
import UiModal from "./ui/UiModal.vue";
import UiButton from "./ui/UiButton.vue";
import { stripePromise } from "@/lib/stripe";
import { addPaymentMethod } from "@/services/subscriptions.service";
import { useLangStore } from "@/stores/lang";
import { useThemeStore } from "@/stores/theme";

/**
 * Alta de tarjeta con Stripe Elements.
 *
 * No existe un envoltorio oficial de Stripe para Vue (el `@stripe/react-stripe-js`
 * que usaba la version anterior es solo para React), asi que se monta el
 * elemento a mano: `stripe.elements()` y `card.mount()`. Es la misma API que
 * usa por dentro el envoltorio de React.
 *
 * Lo importante no cambia: el numero de tarjeta y el CVV se escriben dentro de
 * un iframe de Stripe. Esta aplicacion nunca los ve; solo recibe de vuelta un
 * identificador (`pm_...`) que es lo unico que viaja al backend.
 */
const props = defineProps({ userId: { type: String, required: true } });
const emit = defineEmits(["close", "saved"]);

const { t } = useLangStore();
const { theme } = storeToRefs(useThemeStore());

const cardContainer = ref(null);
const loading = ref(false);
const ready = ref(false);
const error = ref("");

let stripe = null;
let elements = null;
let cardElement = null;

onMounted(async () => {
  stripe = await stripePromise;
  if (!stripe || !cardContainer.value) {
    error.value = t("El pago con tarjeta no está configurado.", "Card payments are not configured.");
    return;
  }

  const dark = theme.value === "dark";
  elements = stripe.elements();
  cardElement = elements.create("card", {
    style: {
      base: {
        fontSize: "15px",
        color: dark ? "#f8fafc" : "#0f172a",
        "::placeholder": { color: "#94a3b8" },
      },
      invalid: { color: "#e11d48" },
    },
  });
  cardElement.mount(cardContainer.value);
  ready.value = true;
});

onBeforeUnmount(() => {
  // Sin esto el iframe de Stripe queda huerfano al cerrar el dialogo.
  cardElement?.destroy();
});

async function submit() {
  if (!stripe || !cardElement) return;

  loading.value = true;
  error.value = "";

  const { error: err, paymentMethod } = await stripe.createPaymentMethod({
    type: "card",
    card: cardElement,
  });

  if (err || !paymentMethod) {
    error.value = err?.message ?? t("No se pudo validar la tarjeta.", "Could not validate the card.");
    loading.value = false;
    return;
  }

  try {
    await addPaymentMethod(props.userId, paymentMethod.id);
    emit("saved");
    emit("close");
  } catch {
    error.value = t(
      "No se pudo guardar la tarjeta. Inténtalo de nuevo.",
      "Could not save the card. Please try again."
    );
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UiModal
    :title="t('Agregar tarjeta', 'Add card')"
    @close="$emit('close')"
  >
    <form
      class="space-y-4"
      @submit.prevent="submit"
    >
      <div class="rounded-lg border border-slate-300 bg-white px-3.5 py-3 dark:border-navy-700 dark:bg-navy-950">
        <div ref="cardContainer" />
      </div>

      <p class="flex items-center gap-1.5 text-xs text-slate-400">
        <CreditCard class="h-3.5 w-3.5 shrink-0" />
        {{
          t(
            "Tarjeta de prueba: 4242 4242 4242 4242 · cualquier fecha futura · cualquier CVC",
            "Test card: 4242 4242 4242 4242 · any future date · any CVC"
          )
        }}
      </p>

      <p
        v-if="error"
        class="text-sm text-rose-600"
      >
        {{ error }}
      </p>

      <div class="flex justify-end gap-2 pt-1">
        <UiButton
          variant="outline"
          type="button"
          @click="$emit('close')"
        >
          {{ t("Cancelar", "Cancel") }}
        </UiButton>
        <UiButton
          type="submit"
          :disabled="loading || !ready"
        >
          <LoaderCircle
            v-if="loading"
            class="h-4 w-4 animate-spin"
          />
          {{ t("Guardar tarjeta", "Save card") }}
        </UiButton>
      </div>
    </form>
  </UiModal>
</template>
