import { createRouter, createWebHistory } from "vue-router";
import { tokenStore } from "@/lib/api";
import AppLayout from "@/layouts/AppLayout.vue";

/**
 * Rutas de la aplicacion.
 *
 * Las paginas van con `import()` para que Vite las parta en trozos: el usuario
 * que solo entra a iniciar sesion no se descarga el dashboard, la analitica ni
 * el generador de PDF.
 *
 * `meta.public` marca las rutas que se ven sin sesion; el resto pasa por el
 * guard de mas abajo, que es el equivalente al ProtectedRoute de React.
 */
const routes = [
  {
    path: "/login",
    name: "login",
    component: () => import("@/views/LoginView.vue"),
    meta: { public: true },
  },
  {
    path: "/register",
    name: "register",
    component: () => import("@/views/RegisterView.vue"),
    meta: { public: true },
  },
  {
    path: "/forgot-password",
    name: "forgot-password",
    component: () => import("@/views/ForgotPasswordView.vue"),
    meta: { public: true },
  },
  {
    path: "/reset-password",
    name: "reset-password",
    component: () => import("@/views/ResetPasswordView.vue"),
    meta: { public: true },
  },
  {
    path: "/verify",
    name: "verify",
    component: () => import("@/views/VerifyAccountView.vue"),
    meta: { public: true },
  },
  {
    path: "/",
    component: AppLayout,
    children: [
      { path: "", name: "dashboard", component: () => import("@/views/DashboardView.vue"), meta: { title: ["Resumen", "Overview"] } },
      { path: "devices", name: "devices", component: () => import("@/views/DevicesView.vue"), meta: { title: ["Dispositivos", "Devices"] } },
      { path: "monitoring", name: "monitoring", component: () => import("@/views/MonitoringView.vue"), meta: { title: ["Monitoreo", "Monitoring"] } },
      { path: "analytics", name: "analytics", component: () => import("@/views/AnalyticsView.vue"), meta: { title: ["Analítica", "Analytics"] } },
      { path: "alerts", name: "alerts", component: () => import("@/views/AlertsView.vue"), meta: { title: ["Alertas", "Alerts"] } },
      { path: "subscription", name: "subscription", component: () => import("@/views/SubscriptionView.vue"), meta: { title: ["Suscripción y pagos", "Subscription & payments"] } },
      { path: "reports", name: "reports", component: () => import("@/views/ReportsView.vue"), meta: { title: ["Reportes", "Reports"] } },
      { path: "sites", name: "sites", component: () => import("@/views/SitesView.vue"), meta: { title: ["Mis locales", "My sites"] } },
      // "Mi establecimiento" guardaba en el navegador el tipo de negocio, el
      // numero de zonas y la ubicacion: tres copias de datos que ya viven en la
      // organizacion y en el local. Se retiro, y la ruta antigua lleva a donde
      // se editan de verdad.
      { path: "establishment", redirect: { name: "sites" } },
      // "Mi hogar" era la pantalla del segmento residencial. El producto ya no
      // apunta ahi, pero el enlace puede estar guardado en un navegador: lleva
      // a los locales en vez de a un 404.
      { path: "household", redirect: { name: "sites" } },
      { path: "settings", name: "settings", component: () => import("@/views/SettingsView.vue"), meta: { title: ["Configuración", "Settings"] } },
    ],
  },
  {
    path: "/:pathMatch(.*)*",
    name: "not-found",
    component: () => import("@/views/NotFoundView.vue"),
    meta: { public: true },
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
  // Al cambiar de pagina, arriba del todo. Sin esto se hereda el scroll de la
  // pantalla anterior y parece que la nueva empieza a media altura.
  scrollBehavior: () => ({ top: 0 }),
});

// Guard de sesion: sin token, cualquier ruta privada manda al login.
router.beforeEach((to) => {
  if (to.meta.public) return true;
  if (tokenStore.get()) return true;
  return { name: "login", replace: true };
});

export default router;
