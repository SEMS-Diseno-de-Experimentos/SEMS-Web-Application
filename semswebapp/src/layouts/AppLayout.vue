<script setup>
import { ref, computed } from "vue";
import { useRoute } from "vue-router";
import AppSidebar from "@/components/AppSidebar.vue";
import AppTopbar from "@/components/AppTopbar.vue";
import { useLangStore } from "@/stores/lang";

const route = useRoute();
const { t } = useLangStore();

const sidebarOpen = ref(false);

// El titulo lo declara cada ruta en meta.title como el par [es, en]. Asi vive
// junto a la definicion de la ruta y no en un mapa aparte que hay que acordarse
// de actualizar al agregar una pagina.
const title = computed(() => {
  const pair = route.meta?.title;
  return Array.isArray(pair) ? t(pair[0], pair[1]) : "SEMS";
});
</script>

<template>
  <div class="min-h-screen">
    <AppSidebar
      :open="sidebarOpen"
      @close="sidebarOpen = false"
    />

    <div class="lg:pl-64">
      <AppTopbar
        :title="title"
        @menu="sidebarOpen = true"
      />
      <main class="mx-auto max-w-7xl p-5 lg:p-8">
        <RouterView />
      </main>
    </div>
  </div>
</template>
