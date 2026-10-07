<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";

// Client ID de Google (configuralo en Vercel como VITE_GOOGLE_CLIENT_ID).
// Es publico por diseno: identifica a la aplicacion, no autentica nada.
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const emit = defineEmits(["credential"]);

const container = ref(null);
let script = null;

// Renderiza el boton oficial de Google Identity Services. Cuando el usuario
// inicia sesion, Google entrega un ID token que se envia al backend, que es
// quien lo verifica contra Google.
function init() {
  if (!window.google || !container.value) return;
  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: (resp) => emit("credential", resp.credential),
  });
  window.google.accounts.id.renderButton(container.value, {
    theme: "outline",
    size: "large",
    width: 320,
    text: "continue_with",
    shape: "rectangular",
  });
}

onMounted(() => {
  if (!GOOGLE_CLIENT_ID) return;

  if (window.google) {
    init();
    return;
  }

  // El script se carga una sola vez aunque se monte el boton en varias
  // pantallas (login y registro).
  const id = "google-gsi-script";
  script = document.getElementById(id);
  if (!script) {
    script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.id = id;
    document.body.appendChild(script);
  }
  script.addEventListener("load", init);
});

onBeforeUnmount(() => {
  script?.removeEventListener("load", init);
});
</script>

<template>
  <!-- Sin client id configurado no se muestra nada -->
  <div
    v-if="GOOGLE_CLIENT_ID"
    ref="container"
    class="flex justify-center"
  />
</template>
