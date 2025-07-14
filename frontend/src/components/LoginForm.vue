<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#262626] to-white dark:from-[#262626] dark:to-[#181818] transition-colors duration-500">
    <form
      @submit.prevent="onLogin"
      class="bg-white dark:bg-[#232323] shadow-xl rounded-xl p-8 w-full max-w-sm flex flex-col gap-6 animate-fade-in"
    >
      <h2 class="text-2xl font-bold text-center text-[#e63a62]">Вход для флориста</h2>
      <div>
        <label class="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Логин</label>
        <input v-model="login" type="text" required autofocus class="input" />
      </div>
      <div>
        <label class="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Пароль</label>
        <input v-model="password" type="password" required class="input" />
      </div>
      <button
        :disabled="loading"
        class="w-full py-2 rounded-lg font-semibold text-white bg-[#e63a62] hover:bg-[#c72c4e] transition-colors duration-200 shadow-md disabled:opacity-60"
      >
        <span v-if="!loading">Войти</span>
        <span v-else>Вход...</span>
      </button>
      <p v-if="error" class="text-red-500 text-center">{{ error }}</p>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, defineEmits } from 'vue';

const emit = defineEmits(['login-success']);
const login = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');

async function onLogin() {
  error.value = '';
  loading.value = true;
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: login.value, password: password.value })
    });
    if (!res.ok) {
      const data = await res.json();
      error.value = data.error || 'Ошибка входа';
      loading.value = false;
      return;
    }
    const data = await res.json();
    localStorage.setItem('token', data.token);
    emit('login-success');
  } catch (e) {
    error.value = 'Ошибка сети';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.input {
  @apply w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-[#232323] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#e63a62] transition;
}
@keyframes fade-in {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
  animation: fade-in 0.7s cubic-bezier(.4,0,.2,1);
}
</style> 