<script setup lang="ts">
import { provide, onMounted } from 'vue'
// import PWAInstallPrompt from './components/PWAInstallPrompt.vue' // PWA компонент отключен

// Provide refresh function for child components
const refreshApp = () => {
  window.location.reload()
}

provide('refreshApp', refreshApp)

onMounted(() => {
  // Компонент загружен
});
</script>

<template>
  <div id="app" class="status-bar-spacing">
    <router-view />
    <!-- PWAInstallPrompt компонент отключен -->
  </div>
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
