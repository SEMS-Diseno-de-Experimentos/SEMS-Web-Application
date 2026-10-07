# SEMS — Web Application

Panel de control del **Smart Energy Management System**, escrito en **Vue 3 con
JavaScript y PrimeVue**, tal como exige el enunciado del curso:

> "Para el desarrollo de Frontend Web Applications, se hará uso de **Vue
> Framework**, utilizando HTML5, CSS3, JavaScript para aspectos estáticos de
> templates y **JavaScript como lenguaje de programación**. El lenguaje de
> diseño de Landing Page y Web Applications estará basado en **Material
> Design**. Como biblioteca de componentes de UI se utilizará **PrimeVue**."

Consume el backend en ASP.NET Core.

---

## Stack

| Pieza | Qué se usa | Por qué |
|---|---|---|
| Framework | Vue 3 (`<script setup>`) | Lo pide el enunciado |
| Lenguaje | JavaScript, sin TypeScript | Lo pide el enunciado |
| Componentes de UI | PrimeVue 4, preset **Material** | Lo pide el enunciado (PrimeVue + Material Design) |
| Estado | Pinia | Tiendas de sesión, tema e idioma |
| Rutas | Vue Router 4 | Con guard de sesión y carga diferida por página |
| Datos del servidor | TanStack Query (vue-query) | Caché y revalidación compartidas |
| Gráficos | PrimeVue `Chart` (Chart.js) | Queda dentro de la misma biblioteca de UI |
| Estilos | Tailwind CSS 4 | Utilidades de maquetación sobre el tema de PrimeVue |
| HTTP | axios | Interceptores de JWT y de 401 |
| Pagos | Stripe Elements | Los datos de tarjeta nunca tocan esta aplicación |

Los tipos de dominio se documentan con `@typedef` de **JSDoc** (`src/types/`).
No existen en ejecución, pero dejan el contrato con el backend escrito en un
solo sitio y el editor sigue autocompletando.

---

## Estructura

```
src/
├── main.js            arranque: Pinia, PrimeVue+Material, vue-query, router
├── App.vue            solo enruta; la estructura la deciden las rutas
├── router/            rutas y guard de sesión
├── layouts/
│   └── AppLayout.vue  barra lateral + superior de las pantallas con sesión
├── stores/            auth, theme, lang (sustituyen a los contextos de React)
├── composables/
│   └── usePlan.js     nivel de plan del usuario (free / plus / pro)
├── services/          una capa por módulo del backend
├── lib/               api, formato, tarifa, planes, datos demo, PDF
├── types/             typedefs de JSDoc
├── components/
│   ├── ui/            kit compartido: tarjeta, botón, insignia, modal…
│   └── charts/
└── views/             una vista por ruta
```

---

## Puesta en marcha

```bash
cp .env.example .env      # y rellenar si hace falta
npm install
npm run dev
```

Queda en `http://localhost:5173`. **Arranca en modo demo**
(`VITE_DEMO_MODE=true`): la interfaz completa funciona con datos de ejemplo, sin
levantar el backend. Para consumir el backend real, pon `VITE_DEMO_MODE=false` y
apunta `VITE_API_BASE_URL` a él.

```bash
npm run build     # compila a dist/
npm run preview   # sirve dist/ para revisarlo
npm run lint      # ESLint + Vue Style Guide
```

---

## El contrato JSON no es uniforme, y es a propósito

Los servicios del backend nacieron en lenguajes distintos y cada uno serializaba
a su manera. Los `services/` respetan eso campo por campo:

| Módulo | Peticiones | Respuestas |
|---|---|---|
| Devices | camelCase | camelCase |
| Energy · Analytics · Alerts · Payments | snake_case | snake_case |
| **Subscriptions** | **snake_case** | **PascalCase** |

La asimetría de Subscriptions parece un descuido y no lo es: viene del servicio
original, y el backend en C# la mantiene. Cambiarla aquí rompe la pantalla de
suscripción **en silencio**, porque el JSON sigue siendo válido.

---

## Seguridad

- **Las variables `VITE_` no son secretas.** Vite las incrusta en el paquete que
  se descarga el navegador. Solo van ahí valores públicos: la URL del backend,
  la clave *publicable* de Stripe (`pk_...`) y el client id de Google.
- **Nunca pongas el prefijo `VITE_` a un secreto.** La clave secreta de Stripe
  (`sk_...`), la del webhook (`whsec_...`), la de la base de datos y
  `JWT_SECRET` viven solo en el backend. En Vercel, las `VITE_` se marcan como
  **Config**, no como Secret.
- **`.env` está en `.gitignore` y no debe subirse.**
- **Los datos de tarjeta no pasan por esta aplicación.** Se escriben dentro de
  un iframe de Stripe; aquí solo llega un identificador `pm_...`.
- **El token de sesión se guarda en `localStorage`** y un interceptor de axios
  cierra la sesión ante un 401.

---

## Despliegue en Vercel

- **Root directory:** `semswebapp`
- **Framework preset:** Vite
- **Build command:** `npm run build` · **Output:** `dist`

`vercel.json` reescribe todas las rutas a `index.html`: sin eso, recargar en
`/devices` daría 404, porque el enrutado es del lado del cliente.
