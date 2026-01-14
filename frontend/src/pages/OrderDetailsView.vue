<template>
  <div :key="$route.fullPath" class="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-[#262626] p-0" :data-version="forceUpdate">
    <div class="w-full flex items-center justify-between px-3 py-1.5 bg-white dark:bg-[#2a2a2a] text-gray-800 dark:text-gray-200 shadow-sm rounded-full mt-2 mb-3 md:mt-3 md:mb-4 transition-all duration-300 relative" style="font-size: 0.75rem;">
      <div class="font-medium px-2 py-0.5 rounded-full text-xs">Детали заказа</div>
      <!-- Кнопка назад с иконкой -->
      <button @click="releaseOrder" class="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200" title="Назад">
        <svg class="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
        </svg>
      </button>
    </div>
    
    <div class="w-full max-w-4xl px-1 md:px-2">
      <div class="flex flex-col items-center mb-4">
        <div v-if="getOrderId()" class="inline-flex items-center px-6 py-3 rounded-2xl text-2xl font-black bg-gradient-to-br from-[#933742] to-[#7a2d3a] text-white shadow-lg mb-2 transform hover:scale-105 transition-transform duration-200">
          №{{ getOrderId() }}
        </div>
        <a
          v-if="order?.name"
          :href="`https://makilk.amocrm.ru/leads/detail/${order.id}`"
          target="_blank"
          class="text-[#933742] dark:text-[#D94366] text-lg md:text-xl font-bold hover:underline flex items-center gap-1 mb-2"
        >
          <span>{{ order.name }}</span>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
        </a>
      </div>

      <!-- Статус фото и Основная информация в ряд на десктопе -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div class="bg-gray-50 dark:bg-[#2a2a2a] rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm">
          <h3 class="text-sm uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500 mb-4 flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            Основная информация
          </h3>
          <div class="space-y-3 text-base">
            <div class="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
              <span class="text-gray-500">Дата:</span>
              <span class="font-bold text-gray-800 dark:text-gray-200">{{ order?.date || '—' }}</span>
            </div>
            <div class="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
              <span class="text-gray-500">Время:</span>
              <span class="font-bold text-[#933742] dark:text-[#D94366]">{{ order?.time || '—' }}</span>
            </div>
            <div class="flex flex-col border-b border-gray-100 dark:border-gray-800 pb-2">
              <span class="text-gray-500 mb-1">Адрес:</span>
              <span class="font-medium text-gray-800 dark:text-gray-200" v-html="formatLinks(order?.address || '—')"></span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">Телефон:</span>
              <a :href="`tel:${order?.phone}`" class="font-bold text-blue-600 dark:text-blue-400 hover:underline">{{ order?.phone || '—' }}</a>
            </div>
          </div>
        </div>

        <div class="flex flex-col gap-4">
          <div v-if="order?.photo_status" class="bg-gray-50 dark:bg-[#2a2a2a] rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm">
            <h3 class="text-sm uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500 mb-3">Статус фото</h3>
            <div class="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold"
              :class="{
                'bg-red-100 text-red-700': order?.photo_status === 'uploaded_admin',
                'bg-blue-100 text-blue-700': order?.photo_status === 'uploaded_florist',
                'bg-orange-100 text-orange-700': order?.photo_status === 'send_to_admin',
                'bg-gray-100 text-gray-700': !['uploaded_admin', 'uploaded_florist', 'send_to_admin'].includes(order?.photo_status)
              }">
              <span v-if="order?.photo_status === 'uploaded_admin'">Загружено админом</span>
              <span v-else-if="order?.photo_status === 'uploaded_florist'">Загружено флористом</span>
              <span v-else-if="order?.photo_status === 'send_to_admin'">Отправлено админу</span>
              <span v-else>{{ order.photo_status }}</span>
            </div>
          </div>

          <div v-if="order?.comment" class="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-5 border border-amber-100 dark:border-amber-900/30 shadow-sm flex-grow">
            <h3 class="text-sm uppercase tracking-wider font-bold text-amber-600 dark:text-amber-500 mb-2 flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/></svg>
              Комментарий
            </h3>
            <div class="text-gray-800 dark:text-gray-200 italic" v-html="formatLinks(order.comment)"></div>
          </div>
        </div>
      </div>

      <div class="mb-4 bg-gray-50 dark:bg-[#2a2a2a] rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm">
        <h3 class="text-sm uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500 mb-4 flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>
          Детали заказа
        </h3>
        <div v-if="order?.custom_fields && order.custom_fields.length" class="space-y-3">
          <div v-for="field in order.custom_fields" :key="field.id" class="flex flex-col border-b border-gray-100 dark:border-gray-800 pb-2 last:border-0">
            <span class="text-xs text-gray-400 mb-0.5">{{ field.name }}</span>
            <span class="text-base font-medium text-gray-800 dark:text-gray-200" v-html="formatLinks(field.value)"></span>
          </div>
        </div>
        <div v-else class="text-gray-500 italic">Нет дополнительных полей</div>
      </div>

      <div class="mb-4 bg-gray-50 dark:bg-[#2a2a2a] rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm">
        <h3 class="text-sm uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500 mb-3">Системная информация</h3>
        <div class="grid grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
          <div><span class="text-gray-400">ID:</span> {{ order?.id }}</div>
          <div><span class="text-gray-400">Статус:</span> {{ order?.status || '—' }}</div>
          <div v-if="order?.taken_by" class="col-span-2"><span class="text-gray-400">Взял:</span> {{ order.taken_by.name }}</div>
        </div>
      </div>

      <!-- Кнопка показать все поля -->
      <div class="mb-4 text-center">
        <button 
          @click="showAllFields = !showAllFields" 
          class="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          {{ showAllFields ? 'Скрыть' : 'Показать' }} все поля ({{ getAllFieldsSorted().length }})
        </button>
      </div>

      <!-- Все поля заказа -->
      <div v-if="showAllFields" class="mb-4 bg-gray-50 dark:bg-[#2a2a2a] rounded-lg p-4">
        <h3 class="text-lg font-bold text-[#933742] mb-3">Все поля заказа (алфавитный порядок)</h3>
        <div v-if="getAllFieldsSorted().length" class="grid gap-2">
          <div v-for="field in getAllFieldsSorted()" :key="field.key" class="text-sm">
            <strong>{{ field.key }}:</strong> <span v-html="formatLinks(field.value)"></span>
          </div>
        </div>
        <div v-else class="text-gray-500">Нет данных</div>
      </div>

      <!-- Сырые данные -->
      <div class="mb-4 text-center">
        <button 
          @click="showRawData = !showRawData" 
          class="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          {{ showRawData ? 'Скрыть' : 'Показать' }} сырые данные
        </button>
      </div>

      <div v-if="showRawData" class="mb-4 bg-gray-50 dark:bg-[#2a2a2a] rounded-lg p-4">
        <h3 class="text-lg font-bold text-[#933742] mb-3">Сырые данные заказа</h3>
        <pre class="bg-black text-green-400 p-4 rounded text-xs overflow-x-auto whitespace-pre-wrap">{{ JSON.stringify(order, null, 2) }}</pre>
      </div>

      <!-- Фото заказа -->
      <div class="mb-4 bg-gray-50 dark:bg-[#2a2a2a] rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm">
        <h3 class="text-sm uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500 mb-4 flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          Фото заказа
        </h3>
        
        <div v-if="order?.photo_url" class="flex flex-col items-center">
          <div class="relative group">
            <img
              :src="order.photo_url"
              :alt="'Фото заказа ' + getOrderId()"
              class="max-w-full h-auto rounded-xl shadow-md transition-transform duration-300"
              :style="{ transform: `rotate(${rotation}deg)` }"
              @load="imageLoaded = true"
              @error="imageError = true"
            />
            <div v-if="!imageLoaded && !imageError" class="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-xl">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#933742]"></div>
            </div>
            <div v-if="imageError" class="absolute inset-0 flex items-center justify-center text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl">
              Ошибка загрузки изображения
            </div>
          </div>
          
          <div class="mt-4 flex items-center gap-3">
            <button @click="rotateImage(-90)" class="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 transition-colors" title="Повернуть влево">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
            </button>
            
            <button v-if="user?.role === 'admin' || user?.role === 'florist'" @click="triggerPhotoUpload" class="px-6 py-2 rounded-xl bg-gradient-to-r from-[#933742] to-[#7a2d3a] text-white font-bold shadow-md hover:shadow-lg transition-all">
              Обновить фото
            </button>
            
            <button @click="rotateImage(90)" class="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 transition-colors" title="Повернуть вправо">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
            </button>
          </div>
        </div>

        <div v-else-if="!uploading && (user?.role === 'admin' || user?.role === 'florist')" class="flex flex-col items-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
          <svg class="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          <button @click="triggerPhotoUpload" class="px-6 py-2 rounded-xl bg-blue-600 text-white font-bold shadow-md hover:bg-blue-700 transition-colors">
            Загрузить фото
          </button>
          <p class="mt-2 text-sm text-gray-400">Фото еще не загружено</p>
        </div>
        
        <div v-if="uploading" class="flex flex-col items-center justify-center p-8">
          <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-[#933742] mb-3"></div>
          <span class="text-gray-500 font-medium">Загрузка фотографии...</span>
        </div>
      </div>

      <!-- Диалог выбора способа загрузки -->
      <div v-if="showPhotoChoice" class="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-40">
        <div class="bg-white dark:bg-[#232323] rounded-lg shadow-lg p-6 flex flex-col gap-4 min-w-[280px] max-w-[90vw]">
          <div class="text-lg font-semibold text-center mb-2">Как загрузить фото?</div>
          <button @click="choosePhotoMethod('camera')" class="px-4 py-2 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700 transition-colors">Сделать фото</button>
          <button @click="choosePhotoMethod('gallery')" class="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors">Выбрать из галереи</button>
          <button @click="showPhotoChoice = false" class="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">Отмена</button>
        </div>
      </div>

      <!-- Компонент камеры -->
      <div v-if="showCamera" class="fixed inset-0 flex flex-col items-center justify-center z-50 bg-black bg-opacity-70">
        <video ref="cameraVideo" autoplay playsinline class="w-full max-w-md"></video>
        <div class="mt-4 flex gap-4">
          <button
            @click="capturePhoto"
            class="w-16 h-16 rounded-full bg-white border-4 border-red-500"
          ></button>
          <button
            @click="closeCamera"
            class="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 font-semibold"
          >
            Отмена
          </button>
        </div>
      </div>

      <!-- Кнопки действий -->
      <div class="grid grid-cols-2 gap-3 mb-8">
        <button @click="releaseOrder" class="px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all flex items-center justify-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
          Отпустить
        </button>
        
        <button v-if="!order?.status || order.status !== 'выполнен'" @click="completeOrder" class="px-4 py-3 rounded-xl bg-gradient-to-r from-green-600 to-green-700 text-white font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
          Выполнено
        </button>
        
        <button v-if="order?.status === 'выполнен' && user?.role === 'florist' && !order?.photo_url" @click="sendToAdmin" class="px-4 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 col-span-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
          Отправить админу
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { authFetch } from '../utils/authFetch';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const order = ref<any>(null);
const loading = ref(true);
const uploading = ref(false);
const imageLoaded = ref(false);
const imageError = ref(false);
const showAllFields = ref(false);
const showRawData = ref(false);
const showPhotoChoice = ref(false);
const showCamera = ref(false);
const cameraStream = ref<MediaStream | null>(null);
const cameraVideo = ref<HTMLVideoElement | null>(null);
const selectedFile = ref<File | null>(null);
const rotation = ref(0);
const forceUpdate = ref(0);

const user = ref<{ id: number; name: string; role?: string } | null>(null);

function normalizeOrder(raw: any) {
  if (!raw) return raw;

  const normalized: any = { ...raw };

  // Плоские поля из custom_fields
  let date = normalized.date || '';
  let time = normalized.time || '';
  let address = normalized.address || '';
  let phone = normalized.phone || '';
  let orderId = normalized.orderId || normalized.order_id || '';

  const originalCustomFields = Array.isArray(raw.custom_fields) ? raw.custom_fields : [];
  const flatCustomFields = originalCustomFields.map((f: any) => {
    let value: any = '';

    if (Array.isArray(f.values)) {
      const v0 = f.values[0];
      if (v0 && typeof v0 === 'object' && 'value' in v0) {
        value = v0.value;
      } else {
        value = v0 ?? '';
      }
    } else if (f.values && typeof f.values === 'object' && 'value' in f.values) {
      value = f.values.value;
    } else if (f.values != null) {
      value = f.values;
    }

    // Заполняем удобные поля для шаблона (как в списке заказов)
    if (f.name === 'Дата' && !date) date = String(value);
    if (f.name === 'Время' && !time) time = String(value);
    if (f.name === 'Адрес доставки' && !address) address = String(value);
    if (f.name === 'Телефон' && !phone) phone = String(value);
    if (f.name === '№ID' && !orderId) orderId = String(value);

    return {
      id: f.id ?? f.name ?? String(Math.random()),
      name: f.name ?? f.id,
      value
    };
  });

  normalized.custom_fields = flatCustomFields;
  if (date) normalized.date = date;
  if (time) normalized.time = time;
  if (address) normalized.address = address;
  if (phone) normalized.phone = phone;
  if (orderId) normalized.orderId = orderId;

  // Фото: берём последний url из массива photos и кладём в photo_url
  if (!normalized.photos) normalized.photos = [];
  if (Array.isArray(normalized.photos) && normalized.photos.length > 0) {
    const last = normalized.photos[normalized.photos.length - 1];
    if (last && typeof last === 'object' && 'url' in last) {
      normalized.photo_url = last.url;
    }
  }

  if (!normalized.photo_status) normalized.photo_status = '';

  return normalized;
}

function getOrderId() {
  return order.value?.orderId || route.params.id;
}

function formatLinks(text: any) {
  if (!text || typeof text !== 'string') return text;
  
  // Регулярное выражение для поиска URL (http, https, или домены .ru, .com и т.д.)
  const urlRegex = /(https?:\/\/[^\s]+)|([a-zA-Z0-9.-]+\.(?:ru|com|net|org|info|biz|io|me)(?:\/[^\s]*)?)/gi;
  
  return text.replace(urlRegex, (url, group1, group2) => {
    let href = url;
    // Если это домен без протокола, добавляем https://
    if (!group1 && group2) {
      href = 'https://' + url;
    }
    return `<a href="${href}" target="_blank" class="text-blue-600 dark:text-blue-400 hover:underline break-all">${url}</a>`;
  });
}

function getAllFieldsSorted() {
  if (!order.value) return [];
  
  const allFields: { key: string; value: any }[] = [];
  
  // Добавляем основные поля
  Object.keys(order.value).forEach(key => {
    if (key !== 'custom_fields' && typeof order.value[key] !== 'object') {
      allFields.push({ key, value: order.value[key] });
    }
  });
  
  // Добавляем поля из custom_fields если есть
  if (order.value.custom_fields && Array.isArray(order.value.custom_fields)) {
    order.value.custom_fields.forEach((field: any) => {
      allFields.push({ key: field.name || field.id, value: field.value });
    });
  }
  
  // Сортируем по алфавиту
  return allFields.sort((a, b) => a.key.localeCompare(b.key, 'ru'));
}

async function fetchOrder() {
  loading.value = true;
  try {
    const res = await authFetch(`/api/orders/${route.params.id}`);
    if (res.ok) {
      const data = await res.json();
      order.value = normalizeOrder(data.order);
      forceUpdate.value++;
    } else {
      toast.error('Не удалось загрузить заказ');
      router.push('/orders');
    }
  } catch (error) {
    toast.error('Ошибка загрузки заказа');
    router.push('/orders');
  } finally {
    loading.value = false;
  }
}

async function completeOrder() {
  try {
    // Если фото уже есть, используем специальный эндпоинт для мгновенного закрытия в amoCRM
    const endpoint = order.value?.photo_url
      ? `/api/orders/${route.params.id}/complete-with-photo`
      : `/api/orders/${route.params.id}/complete`;

    const res = await authFetch(endpoint, {
      method: 'POST'
    });

    if (res.ok) {
      toast.success('Заказ завершен');
      // Если фото было, нас уже удалили из списка на бэкенде, выходим
      if (order.value?.photo_url) {
        router.push('/orders');
      } else {
        // Если фото нет, просто обновляем статус (появится кнопка "Отправить админу")
        await fetchOrder();
      }
    } else {
      const data = await res.json();
      toast.error(data.error || 'Ошибка при завершении заказа');
    }
  } catch (error) {
    toast.error('Ошибка при завершении заказа');
  }
}

async function releaseOrder() {
  try {
    const res = await authFetch(`/api/orders/${route.params.id}/release`, {
      method: 'POST'
    });
    if (res.ok) {
      toast.success('Заказ отпущен');
      router.push('/orders');
    } else {
      toast.error('Ошибка при отпуске заказа');
    }
  } catch (error) {
    toast.error('Ошибка при отпуске заказа');
  }
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

function triggerPhotoUpload() {
  showPhotoChoice.value = true;
}

function choosePhotoMethod(method: 'camera' | 'gallery') {
  showPhotoChoice.value = false;
  if (method === 'camera') {
    openCamera();
  } else {
    openGallery();
  }
}

function openGallery() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      selectedFile.value = file;
      uploadPhoto();
    }
  };
  input.click();
}

async function openCamera() {
  try {
    showCamera.value = true;
    cameraStream.value = await navigator.mediaDevices.getUserMedia({ video: true });
    if (cameraVideo.value) {
      cameraVideo.value.srcObject = cameraStream.value;
    }
  } catch (error) {
    toast.error('Не удалось получить доступ к камере');
    console.error('Camera error:', error);
    showCamera.value = false;
  }
}

function closeCamera() {
  if (cameraStream.value) {
    cameraStream.value.getTracks().forEach(track => track.stop());
    cameraStream.value = null;
  }
  showCamera.value = false;
  selectedFile.value = null;
}

function capturePhoto() {
  if (!cameraVideo.value) return;
  
  const canvas = document.createElement('canvas');
  canvas.width = cameraVideo.value.videoWidth;
  canvas.height = cameraVideo.value.videoHeight;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return;
  
  ctx.drawImage(cameraVideo.value, 0, 0, canvas.width, canvas.height);
  
  canvas.toBlob(blob => {
    if (blob) {
      const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
      selectedFile.value = file;
      closeCamera();
      uploadPhoto();
    }
  }, 'image/jpeg');
}

function rotateImage(degrees: number) {
  rotation.value += degrees;
  if (rotation.value >= 360) rotation.value -= 360;
  if (rotation.value < 0) rotation.value += 360;
}

async function uploadPhoto() {
  if (!selectedFile.value) return;
  
  uploading.value = true;
  
  try {
    const formData = new FormData();
    formData.append('photo', selectedFile.value);
    const token = localStorage.getItem('token');
    
    const res = await fetch(`/api/orders/${route.params.id}/photo`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });
    
    if (res.ok) {
      toast.success('Фото успешно загружено и отправлено в amoCRM');
      await fetchOrder();
      selectedFile.value = null;
      rotation.value = 0;
    } else {
      const data = await res.json();
      toast.error(data.error || 'Ошибка при загрузке фото');
    }
  } catch (error) {
    toast.error('Ошибка при загрузке фото');
  } finally {
    uploading.value = false;
  }
}


async function sendToAdmin() {
  try {
    const res = await authFetch(`/api/orders/${route.params.id}/send-to-admin`, {
      method: 'POST'
    });
    if (res.ok) {
      toast.success('Заказ отправлен админу');
      router.push('/orders');
    } else {
      toast.error('Ошибка при отправке заказа админу');
    }
  } catch (error) {
    toast.error('Ошибка при отправке заказа админу');
  }
}

onMounted(async () => {
  // Получаем пользователя из токена (payload)
  const token = localStorage.getItem('token');
  if (token) {
    try {
      const payload = parseJwt(token);
      user.value = { id: payload.id, name: payload.name, role: payload.role };
    } catch {}
  }
  
  await fetchOrder();
});

onUnmounted(() => {
  if (cameraStream.value) {
    cameraStream.value.getTracks().forEach(track => track.stop());
    cameraStream.value = null;
  }
});

// Автообновление при изменении маршрута
watch(() => route.params.id, async () => {
  await fetchOrder();
});
</script>

<style scoped>
/* Добавляем стили для поворота изображения */
img {
  transition: transform 0.3s ease;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>
