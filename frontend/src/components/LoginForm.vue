<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-pink-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-500 px-4">
    <form
      @submit.prevent="onLogin"
      class="bg-white dark:bg-gray-800 shadow-xl rounded-xl p-6 sm:p-8 w-full max-w-sm flex flex-col gap-6 animate-fade-in"
    >
      <!-- App Icon -->
      <div class="flex justify-center mb-4">
        <div class="w-16 h-16 bg-[#E63A62] rounded-2xl flex items-center justify-center shadow-lg">
          <svg class="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.03 16.03,17 13,17V20H16V22H8V20H11V17C7.97,17 5,14.03 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z"/>
          </svg>
        </div>
      </div>
      
      <div class="text-center">
        <h2 class="text-2xl font-bold text-[#E63A62] dark:text-[#E63A62] mb-2">Флорист</h2>
        <p class="text-gray-600 dark:text-gray-400 text-sm">Войдите в приложение</p>
      </div>
      
      <div class="space-y-4">
        <div>
          <label class="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Логин</label>
          <input 
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
          <label class="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Пароль</label>
          <input 
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
        class="w-full py-3 rounded-xl font-semibold text-white bg-[#E63A62] hover:bg-[#c72c4e] active:bg-[#a82444] transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
  @apply w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#E63A62] focus:border-[#E63A62] transition-all duration-200;
  font-size: 16px; /* Prevent iOS zoom */
}

.input:focus {
  @apply shadow-lg;
}

.input::placeholder {
  @apply text-gray-400 dark:text-gray-500;
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