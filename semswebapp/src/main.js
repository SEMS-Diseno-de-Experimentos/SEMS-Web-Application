import { createApp } from "vue";
import { createPinia } from "pinia";
import { VueQueryPlugin } from "@tanstack/vue-query";
import PrimeVue from "primevue/config";
import Material from "@primeuix/themes/material";

import App from "./App.vue";
import router from "./router";
import { queryClient } from "./lib/queryClient";
import { useAuthStore } from "./stores/auth";
import "./assets/main.css";

const app = createApp(App);

app.use(createPinia());

// PrimeVue con el preset Material: el enunciado pide Material Design como
// lenguaje de diseno y PrimeVue como biblioteca de componentes.
app.use(PrimeVue, {
  theme: {
    preset: Material,
    options: {
      // Mismo selector que usa Tailwind, para que un solo interruptor cambie
      // los componentes de PrimeVue y las utilidades a la vez.
      darkModeSelector: ".dark",
      // Las clases de PrimeVue se inyectan antes que las de Tailwind, de modo
      // que una utilidad puntual siempre puede ajustar un componente.
      cssLayer: { name: "primevue", order: "theme, base, primevue" },
    },
  },
  ripple: true,
});

app.use(VueQueryPlugin, { queryClient });
app.use(router);

// Si quedo un token de una sesion anterior, recupera el perfil antes de pintar.
// No se espera a que termine: el guard ya deja pasar por el token, y bloquear
// aqui dejaria la pantalla en blanco mientras responde el backend.
useAuthStore().restore();

app.mount("#app");
