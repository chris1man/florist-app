<template>
  <div :key="$route.fullPath" class="min-h-screen bg-white dark:bg-[#262626] p-0 w-full transition-colors duration-500">
    <header class="w-full flex items-center justify-between px-2 sm:px-3 py-2 bg-[#e63a62] text-white shadow rounded-lg mt-2 mb-4 md:mt-4 md:mb-6 transition-all duration-300 relative" style="font-size: 0.95rem;">
      <div class="font-bold flex items-center gap-2 px-2 py-1 rounded" style="font-size: 0.95rem;">
        <span :class="['inline-block w-2 h-2 rounded-full', wsConnected ? 'bg-green-400 animate-pulse' : 'bg-gray-400']"></span>
        {{ user.name ? `Флорист: ${user.name}` : 'Флорист' }}
      </div>
      <button @click="fetchOrders" class="bg-white text-[#e63a62] font-semibold px-3 py-1 rounded-md hover:bg-[#fbe7ed] transition-colors duration-200 relative" style="font-size: 0.95rem;">
        Перезагрузить
      </button>
    </header>
    <div class="w-full px-1 md:px-2 pt-0">
      <h1 class="text-base font-semibold mb-2 text-[#e63a62] text-center inline-block px-1 py-0 rounded relative">
        Доступные заказы
      </h1>
      <div v-if="loading" class="text-center py-6 text-gray-500">Загрузка...</div>
      <div v-else>
        <!-- Desktop: таблица -->
        <table class="hidden md:table w-full bg-transparent animate-fade-in relative text-sm">
          <thead>
            <tr class="text-[#e63a62]">
              <th class="p-3 text-left font-semibold">Название</th>
              <th class="p-3 text-left font-semibold">Дата</th>
              <th class="p-3 text-left font-semibold">Время</th>
              <th class="p-3 text-left font-semibold">Адрес</th>
              <th class="p-3 text-left font-semibold">Статус</th>
              <th class="p-3"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in orders" :key="order.id" class="hover:bg-[#fbe7ed] dark:hover:bg-[#2a2a2a] transition">
              <td class="p-3 font-semibold text-base relative">
                {{ order.name }}
              </td>
              <td class="p-3 relative">
                {{ order.date }}
              </td>
              <td class="p-3 relative">
                {{ order.time }}
              </td>
              <td class="p-3 relative">
                {{ order.address }}
              </td>
              <td class="p-3 relative">
                <span v-if="order.status === 'Свободен'" class="text-green-600 font-bold">Свободен</span>
                <span v-else-if="order.status.startsWith('Взял')" class="text-[#e63a62] font-bold">{{ order.status }}</span>
                <span v-else-if="order.status === 'Выполнен'" class="text-gray-500 font-bold">Выполнен</span>
              </td>
              <td class="p-3 relative">
                <button
                  v-if="order.status === 'Свободен'"
                  @click="takeOrder(order.id)"
                  class="px-4 py-2 rounded-lg bg-[#e63a62] text-white font-semibold hover:bg-[#c72c4e] transition-colors duration-200"
                >Взять</button>
                <button
                  v-else-if="order.status.startsWith('Взял') && order.taken_by && order.taken_by.id === user.id"
                  @click="openOrder(order.id)"
                  class="px-4 py-2 rounded-lg bg-[#262626] text-white font-semibold hover:bg-[#444] transition-colors duration-200"
                >Открыть</button>
              </td>
            </tr>
          </tbody>
        </table>
        <!-- Mobile: карточки -->
        <div class="md:hidden flex flex-col gap-2 animate-fade-in">
          <div v-for="order in orders" :key="order.id" class="rounded-xl bg-[#f7f8fa] dark:bg-[#232323] p-2 flex flex-col gap-1 w-full relative shadow-sm">
            <div class="font-semibold text-base text-[#e63a62] pb-1 relative">
              {{ order.name }}
            </div>
            <div class="flex flex-wrap gap-4 text-sm text-gray-700 dark:text-gray-300">
              <span class="pb-0.5 relative">
                <b>Дата:</b> {{ order.date }}
              </span>
              <span class="pb-0.5 relative">
                <b>Время:</b> {{ order.time }}
              </span>
              <span class="pb-0.5 relative">
                <b>Адрес:</b> {{ order.address }}
              </span>
            </div>
            <div class="flex items-center gap-2 mt-2">
              <span v-if="order.status === 'Свободен'" class="text-green-600 font-bold px-2 py-1 rounded">Свободен</span>
              <span v-else-if="order.status.startsWith('Взял')" class="text-[#e63a62] font-bold px-2 py-1 rounded">{{ order.status }}</span>
              <span v-else-if="order.status === 'Выполнен'" class="text-gray-500 font-bold px-2 py-1 rounded">Выполнен</span>
              <button
                v-if="order.status === 'Свободен'"
                @click="takeOrder(order.id)"
                class="ml-auto px-4 py-2 rounded-lg bg-[#e63a62] text-white font-semibold hover:bg-[#c72c4e] transition-colors duration-200"
              >Взять</button>
              <button
                v-else-if="order.status.startsWith('Взял') && order.taken_by && order.taken_by.id === user.id"
                @click="openOrder(order.id)"
                class="ml-auto px-4 py-2 rounded-lg bg-[#262626] text-white font-semibold hover:bg-[#444] transition-colors duration-200"
              >Открыть</button>
            </div>
          </div>
        </div>
        <div v-if="orders.length === 0" class="text-center text-gray-500 py-10">Нет доступных заказов</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { authFetch } from '../utils/authFetch';

const orders = ref<any[]>([]);
const loading = ref(true);
const user = ref<{ id: number; name: string }>({ id: 0, name: '' });
const toast = useToast();

let ws: WebSocket | null = null;
const wsConnected = ref(false);
const router = useRouter();
const isUnmounted = ref(false);

async function checkActiveOrder() {
  if (isUnmounted.value) return;
  const res = await authFetch('/api/my-active-order');
  if (res.ok) {
    const data = await res.json();
    // Проверяем query-параметр
    const url = new URL(window.location.href);
    const fromAction = url.searchParams.get('fromAction');
    if (data.orderId) {
      if (!fromAction) {
        toast.error('Сначала завершите или отпустите текущий заказ', { timeout: 4000, hideProgressBar: false });
      }
      router.replace({ path: `/orders/${data.orderId}` });
    }
  }
}

async function fetchOrders() {
  if (isUnmounted.value) return;
  loading.value = true;
  const res = await authFetch('/api/orders');
  if (res.ok) {
    const data = await res.json();
    orders.value = data.orders;
    checkActiveOrder();
  }
  loading.value = false;
}

async function takeOrder(id: string) {
  const res = await authFetch(`/api/orders/${id}/take`, {
    method: 'POST',
  });
  if (res.ok) {
    sessionStorage.setItem('justTaken', '1');
    setTimeout(() => {
      router.push({ path: `/orders/${id}`, query: { fromAction: '1' } });
    }, 150);
  }
}

function openOrder(id: string) {
  sessionStorage.setItem('justTaken', '1');
  setTimeout(() => {
    router.push({ path: `/orders/${id}`, query: { fromAction: '1' } });
  }, 150);
}

function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return {};
  }
}

onMounted(async () => {
  // Получаем пользователя из токена (payload)
  const token = localStorage.getItem('token');
  if (token) {
    try {
      const payload = parseJwt(token);
      user.value = { id: payload.id, name: payload.name };
    } catch {}
  }
  await checkActiveOrder();
  await fetchOrders();
  // WebSocket auto-update
  const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const wsHost = window.location.hostname;
  // Для production не указываем порт, чтобы работало через nginx (wss://flor.makiapp.ru/)
  let wsUrl = `${wsProtocol}://${wsHost}/ws`;
  if (import.meta.env.PROD) {
    wsUrl = 'wss://flor.makiapp.ru/ws';
  }
  ws = new WebSocket(wsUrl);
  ws.onopen = () => {
    wsConnected.value = true;
  };
  ws.onclose = () => {
    wsConnected.value = false;
  };
  ws.onerror = () => {
    wsConnected.value = false;
  };
  ws.onmessage = (event) => {
    if (isUnmounted.value) return;
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'orders_updated') {
        fetchOrders();
        checkActiveOrder();
      }
    } catch {}
  };
});

onUnmounted(() => {
  isUnmounted.value = true;
  if (ws) {
    ws.close();
    ws = null;
    wsConnected.value = false;
  }
});
</script>

<style scoped>
@keyframes fade-in {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
  animation: fade-in 0.7s cubic-bezier(.4,0,.2,1);
}
</style> 