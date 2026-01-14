<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f8f6f5] to-[#D94366] bg-opacity-20 dark:from-gray-900 dark:to-gray-800 transition-colors duration-500 px-4">
    <form
      @submit.prevent="onLogin"
      class="bg-white dark:bg-gray-800 shadow-xl rounded-xl p-6 sm:p-8 w-full max-w-sm flex flex-col gap-6 animate-fade-in"
    >
      <!-- App Icon -->
      <div class="flex justify-center mb-4">
        <div class="w-16 h-16 bg-[#933742] rounded-2xl flex items-center justify-center shadow-lg overflow-hidden">
          <img src="/favicon.svg" alt="Флорист" class="w-12 h-12" />
        </div>
      </div>
      
      <div class="text-center">
        <h2 class="text-2xl font-bold text-[#933742] dark:text-white mb-2">Флорист</h2>
        <p class="text-gray-600 dark:text-gray-400 text-sm">Войдите в приложение</p>
      </div>
      
      <div class="space-y-4">
        <div>
          <label for="login-input" class="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Логин</label>
          <input 
            id="login-input"
            v-model="login" 
            type="text" 
            required 
            autofocus 
            autocomplete="username"
            class="input" 
            placeholder="Введите логин"
          />
        </div>
        <div>
          <label for="password-input" class="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Пароль</label>
          <input 
            id="password-input"
            v-model="password" 
            type="password" 
            required 
            autocomplete="current-password"
            class="input" 
            placeholder="Введите пароль"
          />
        </div>
      </div>
      
      <button
        :disabled="loading"
        type="submit"
        class="w-full py-3 rounded-xl font-semibold text-white bg-[#933742] hover:bg-[#7a2d3a] active:bg-[#5a1d28] transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <svg v-if="loading" class="loading-spinner w-5 h-5" />
        <span>{{ loading ? 'Вход...' : 'Войти' }}</span>
      </button>
      
      <div v-if="error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
        <p class="text-red-600 dark:text-red-400 text-center text-sm">{{ error }}</p>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits<{ 'login-success': [] }>();
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
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  border: 1px solid #d1d5db;
  background-color: #f9fafb;
  color: #111827;
  font-size: 16px;
  transition: all 0.2s ease;
}

.dark .input {
  border-color: #4b5563;
  background-color: #374151;
  color: #f9fafb;
}

.input:focus {
  outline: none;
  border-color: #933742;
  box-shadow: 0 0 0 2px rgba(147, 55, 66, 0.1);
}

.dark .input:focus {
  border-color: #933742;
  box-shadow: 0 0 0 2px rgba(147, 55, 66, 0.2);
}

.input:focus {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.input::placeholder {
  color: #9ca3af;
}

.dark .input::placeholder {
  color: #6b7280;
}

@keyframes fade-in {
  from { 
    opacity: 0; 
    transform: translateY(20px) scale(0.95); 
  }
  to { 
    opacity: 1; 
    transform: translateY(0) scale(1); 
  }
}

.animate-fade-in {
  animation: fade-in 0.7s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Touch feedback for mobile */
@media (hover: none) {
  button:hover {
    transform: none;
  }
  
  button:active {
    transform: scale(0.98);
  }
}

/* Landscape mobile adjustments */
@media (max-height: 500px) and (orientation: landscape) {
  .min-h-screen {
    min-height: 100vh;
    padding: 1rem 0;
  }
  
  form {
    max-height: 90vh;
    overflow-y: auto;
  }
}
</style> 