<template>
  <!-- Force cache update -->
  <div :key="$route.fullPath" class="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-[#262626] p-0" :data-version="forceUpdate">
    <div class="w-full flex items-center justify-between px-2 sm:px-3 py-2 bg-[#e63a62] text-white shadow rounded-lg mt-2 mb-2 md:mt-4 md:mb-3 transition-all duration-300 relative" style="font-size: 0.95rem;">
      <div class="font-bold px-2 py-1 rounded" style="font-size: 0.95rem;">Детали заказа</div>
      <button @click="logout" class="bg-[#262626] text-white font-semibold px-3 py-1 rounded-md hover:bg-[#444] transition-colors duration-200 relative" style="font-size: 0.95rem;">Выйти</button>
    </div>
    <!-- Уведомление убрано по запросу пользователя -->
    <!-- <div v-if="showNotice" class="fixed top-0 left-0 w-full z-50 flex justify-center">
      <div class="bg-[#e63a62] text-white px-4 py-2 rounded-b-lg shadow text-center mt-0.5 animate-fade-in">
        Сначала возьмите заказ, чтобы просмотреть его детали
      </div>
    </div> -->
    <div class="w-full max-w-full bg-white dark:bg-[#232323] shadow mt-4 mb-4" style="border-radius: 10px; padding: 0.5rem 0.5rem;">
      <div class="flex flex-col items-center mb-3">
        <div v-if="getOrderId()" class="inline-flex items-center px-4 py-2 rounded-full text-lg font-bold bg-gradient-to-r from-[#e63a62] to-[#c72c4e] text-white shadow-xl mb-2 transform hover:scale-105 transition-transform duration-200">
          {{ getOrderId() }}
        </div>
        <h2 class="text-2xl font-bold text-center">
          <a
            :href="`https://makilk.amocrm.ru/leads/detail/${order?.id}`"
            target="_blank"
            class="text-[#e63a62] hover:text-[#c72c4e] transition-colors duration-200 hover:underline"
          >
            Заказ №{{ order?.id }}
          </a>
        </h2>
      </div>
      <!-- Основная информация о заказе -->
      <div class="mb-4 bg-gray-50 dark:bg-[#2a2a2a] rounded-lg p-4">
        <h3 class="text-lg font-bold text-[#e63a62] mb-3">Основная информация</h3>
        <div class="grid gap-2 text-base">
          <div><b>Название:</b> {{ order?.name || '-' }}</div>
          <div><b>ID сделки:</b> {{ order?.id || '-' }}</div>
          <div><b>Стоимость:</b> {{ formatPrice(order?.price) || order?.sale || '-' }}</div>
          <div><b>ID статуса:</b> {{ order?.status_id || '-' }}</div>
          <div><b>Старый ID статуса:</b> {{ order?.old_status_id || '-' }}</div>
          <div><b>ID ответственного:</b> {{ order?.responsible_user_id || '-' }}</div>
          <div><b>ID воронки:</b> {{ order?.pipeline_id || '-' }}</div>
          <div><b>ID аккаунта:</b> {{ order?.account_id || '-' }}</div>
        </div>
      </div>

      <!-- Временные метки -->
      <div class="mb-4 bg-gray-50 dark:bg-[#2a2a2a] rounded-lg p-4">
        <h3 class="text-lg font-bold text-[#e63a62] mb-3">Временные метки</h3>
        <div class="grid gap-2 text-base">
          <div><b>Дата создания:</b> {{ formatTimestamp(order?.date_create) || formatTimestamp(order?.created_at) }}</div>
          <div><b>Последнее изменение:</b> {{ formatTimestamp(order?.last_modified) || formatTimestamp(order?.updated_at) }}</div>
          <div><b>ID создавшего:</b> {{ order?.created_user_id || '-' }}</div>
          <div><b>ID изменившего:</b> {{ order?.modified_user_id || '-' }}</div>
        </div>
      </div>

      <!-- Детали заказа -->
      <div class="mb-4 bg-gray-50 dark:bg-[#2a2a2a] rounded-lg p-4">
        <h3 class="text-lg font-bold text-[#e63a62] mb-3">Детали заказа</h3>
        <div v-if="order?.custom_fields && order.custom_fields.length">
          <!-- Группировка полей по категориям -->
          <div v-if="getFieldsByCategory('delivery').length" class="mb-4">
            <h4 class="font-bold text-gray-700 dark:text-gray-200 mb-2">🚚 Доставка</h4>
            <div v-for="field in getFieldsByCategory('delivery')" :key="field.id" class="mb-2 pl-4 border-l-2 border-blue-300">
              <span class="font-semibold text-blue-700 dark:text-blue-400">{{ field.name }}:</span>
              <span class="ml-2" v-html="formatFieldValueWithLinks(field.values)"></span>
            </div>
          </div>

          <div v-if="getFieldsByCategory('recipient').length" class="mb-4">
            <h4 class="font-bold text-gray-700 dark:text-gray-200 mb-2">👤 Получатель</h4>
            <div v-for="field in getFieldsByCategory('recipient')" :key="field.id" class="mb-2 pl-4 border-l-2 border-green-300">
              <span class="font-semibold text-green-700 dark:text-green-400">{{ field.name }}:</span>
              <span class="ml-2" v-html="formatFieldValueWithLinks(field.values)"></span>
            </div>
          </div>

          <div v-if="getFieldsByCategory('payment').length" class="mb-4">
            <h4 class="font-bold text-gray-700 dark:text-gray-200 mb-2">💳 Оплата</h4>
            <div v-for="field in getFieldsByCategory('payment')" :key="field.id" class="mb-2 pl-4 border-l-2 border-purple-300">
              <span class="font-semibold text-purple-700 dark:text-purple-400">{{ field.name }}:</span>
              <span class="ml-2" v-html="formatFieldValueWithLinks(field.values)"></span>
            </div>
          </div>

          <div v-if="getFieldsByCategory('products').length" class="mb-4">
            <h4 class="font-bold text-gray-700 dark:text-gray-200 mb-2">🌸 Товары</h4>
            <div v-for="field in getFieldsByCategory('products')" :key="field.id" class="mb-2 pl-4 border-l-2 border-pink-300">
              <span class="font-semibold text-pink-700 dark:text-pink-400">{{ field.name }}:</span>
              <span class="ml-2" v-html="formatFieldValueWithLinks(field.values)"></span>
            </div>
          </div>

          <div v-if="getFieldsByCategory('identifiers').length" class="mb-4">
            <h4 class="font-bold text-gray-700 dark:text-gray-200 mb-2">🔖 Идентификаторы</h4>
            <div v-for="field in getFieldsByCategory('identifiers')" :key="field.id" class="mb-2 pl-4 border-l-2 border-yellow-300">
              <span class="font-semibold text-yellow-700 dark:text-yellow-400">{{ field.name }}:</span>
              <span class="ml-2" v-html="formatFieldValueWithLinks(field.values)"></span>
            </div>
          </div>

          <div v-if="getFieldsByCategory('other').length" class="mb-4">
            <h4 class="font-bold text-gray-700 dark:text-gray-200 mb-2">💬 Прочее</h4>
            <div v-for="field in getFieldsByCategory('other')" :key="field.id" class="mb-2 pl-4 border-l-2 border-gray-300">
              <span class="font-semibold text-gray-700 dark:text-gray-400">{{ field.name }}:</span>
              <span class="ml-2" v-html="formatFieldValueWithLinks(field.values)"></span>
            </div>
          </div>
        </div>
        <div v-else class="text-base text-gray-400">Нет дополнительных полей</div>
      </div>

      <!-- Системная информация -->
      <div class="mb-4 bg-gray-50 dark:bg-[#2a2a2a] rounded-lg p-4">
        <h3 class="text-lg font-bold text-[#e63a62] mb-3">Системная информация</h3>
        <div class="grid gap-2 text-sm text-gray-600 dark:text-gray-400">
          <div><b>Статус заказа:</b> {{ order?.status || 'Не указан' }}</div>
          <div v-if="order?.taken_by">
            <b>Взят флористом:</b> {{ order.taken_by.name }} (ID: {{ order.taken_by.id }})
          </div>
          <div v-else><b>Статус:</b> Свободен</div>
          <div><b>Статус фото:</b> {{ getPhotoStatusText(order?.photo_status) }}</div>
          <div v-if="order?.photos && order.photos.length"><b>Количество фото:</b> {{ order.photos.length }}</div>
        </div>
        
        <!-- Кнопка для просмотра сырых данных -->
        <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
          <div class="flex gap-2 flex-wrap">
            <button 
              @click="showRawData = !showRawData" 
              class="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              {{ showRawData ? 'Скрыть сырые данные' : 'Показать сырые данные' }}
            </button>
            <button 
              @click="showAllFields = !showAllFields" 
              class="px-3 py-1 rounded bg-blue-200 dark:bg-blue-700 text-blue-700 dark:text-blue-300 text-xs font-semibold hover:bg-blue-300 dark:hover:bg-blue-600 transition-colors"
            >
              {{ showAllFields ? 'Скрыть все поля' : 'Показать все поля' }}
            </button>
          </div>
        </div>
      </div>
      
      <!-- Все поля в алфавитном порядке -->
      <div v-if="showAllFields" class="mb-4 bg-gray-50 dark:bg-[#2a2a2a] rounded-lg p-4">
        <h3 class="text-lg font-bold text-[#e63a62] mb-3">Все поля заказа (алфавитный порядок)</h3>
        <div v-if="getAllFieldsSorted().length" class="grid gap-2">
          <div v-for="field in getAllFieldsSorted()" :key="field.id" class="border-l-4 border-gray-300 pl-3 py-1">
            <div class="font-semibold text-gray-800 dark:text-gray-200 text-sm">{{ field.name }}</div>
            <div class="text-gray-600 dark:text-gray-400 text-sm">ID: {{ field.id }}</div>
            <div class="text-gray-900 dark:text-gray-100" v-html="formatFieldValueWithLinks(field.values)"></div>
          </div>
        </div>
        <div v-else class="text-gray-400">Нет полей</div>
      </div>
      
      <!-- Сырые данные заказа -->
      <div v-if="showRawData" class="mb-4 bg-gray-50 dark:bg-[#2a2a2a] rounded-lg p-4">
        <h3 class="text-lg font-bold text-[#e63a62] mb-3">Сырые данные заказа</h3>
        <pre class="bg-black text-green-400 p-4 rounded text-xs overflow-x-auto whitespace-pre-wrap">{{ JSON.stringify(order, null, 2) }}</pre>
      </div>
      <!-- Блок с фото -->
      <div class="mb-4">
        <div class="font-semibold text-gray-700 dark:text-gray-200 mb-1">Фото заказа:</div>
        <div v-if="order?.photos && order.photos.length">
          <div class="flex flex-wrap gap-4">
            <div v-for="(photo, idx) in order.photos" :key="idx" class="flex flex-col items-center">
              <div @click="openPhotoModal(photo.url)" class="cursor-pointer">
                <img :src="photo.url" alt="Фото заказа" class="w-32 h-32 object-cover rounded shadow border border-gray-200 dark:border-gray-700" />
              </div>
              <div class="text-xs text-gray-500 mt-1">{{ photo.uploadedBy }}<span v-if="photo.date">, {{ new Date(photo.date).toLocaleString() }}</span></div>
              <button @click="detachPhoto(photo.url)" class="mt-2 px-3 py-1 rounded bg-red-100 text-red-700 text-xs font-semibold hover:bg-red-200 transition-colors">Открепить</button>
            </div>
          </div>
        </div>
        <div v-else class="text-base text-gray-400">Фото не загружено</div>
        <!-- Выбор способа загрузки фото -->
        <div v-if="canUploadPhoto" class="mt-4 flex flex-col items-center">
          <div class="flex gap-2 mb-4">
            <button
              @click="openCamera"
              class="px-4 py-2 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700 transition-colors"
            >
              Сделать фото
            </button>
            <button
              @click="triggerFileInput"
              class="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
            >
              Выбрать из галереи
            </button>
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
          
          <!-- Скрытый input для галереи -->
          <input 
            id="file-input"
            ref="fileInput" 
            type="file" 
            accept="image/*" 
            class="hidden" 
            @change="onFileChange" 
          />
          <div v-if="uploading" class="text-xs text-gray-500 mt-2">Загрузка...</div>
          
          <!-- Предпросмотр фото перед загрузкой -->
          <div v-if="previewImage" class="mt-4 flex flex-col items-center">
            <img :src="previewImage" alt="Предпросмотр" class="w-64 h-64 object-contain rounded shadow border border-gray-200 dark:border-gray-700" :style="{ transform: `rotate(${rotationAngle}deg)` }" />
            <div class="flex gap-2 mt-2">
              <button @click="rotateImage(-90)" class="px-3 py-1 rounded bg-blue-100 text-blue-700 text-sm font-semibold hover:bg-blue-200 transition-colors">⟲</button>
              <button @click="uploadPhoto" class="px-3 py-1 rounded bg-[#E63A62] text-white text-sm font-semibold hover:bg-[#c72c4e] transition-colors">Загрузить</button>
              <button @click="rotateImage(90)" class="px-3 py-1 rounded bg-blue-100 text-blue-700 text-sm font-semibold hover:bg-blue-200 transition-colors">⟳</button>
              <button @click="cancelPreview" class="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">Отменить</button>
            </div>
          </div>
        </div>
      </div>
      <!-- Выбор способа загрузки фото -->
      <div v-if="showPhotoChoice" class="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-40">
        <div class="bg-white dark:bg-[#232323] rounded-lg shadow-lg p-6 flex flex-col gap-4 min-w-[280px] max-w-[90vw]">
          <div class="text-lg font-semibold text-center mb-2">Как загрузить фото?</div>
          <button @click="choosePhotoUpload('self')" class="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors">Загрузить фото самому</button>
          <button @click="choosePhotoUpload('admin')" class="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">Отправить админу</button>
        </div>
      </div>
      
      <!-- Модальное окно для просмотра фото -->
      <div v-if="selectedPhotoUrl" class="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-80" @click="closePhotoModal">
        <div class="relative max-w-[90vw] max-h-[90vh]" @click.stop>
          <img :src="selectedPhotoUrl" alt="Увеличенное фото" class="max-w-full max-h-[90vh] object-contain" />
          <button @click="closePhotoModal" class="absolute top-2 right-2 w-8 h-8 rounded-full bg-black bg-opacity-50 text-white flex items-center justify-center hover:bg-opacity-70 transition-colors">
            ✕
          </button>
          
          <!-- Навигация по фото -->
          <div v-if="order?.photos && order.photos.length > 1" class="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
            <button @click.stop="prevPhoto" class="w-10 h-10 rounded-full bg-black bg-opacity-50 text-white flex items-center justify-center hover:bg-opacity-70 transition-colors">
              ←
            </button>
            <div class="text-white bg-black bg-opacity-50 px-3 py-1 rounded-lg">
              {{ currentPhotoIndex + 1 }} / {{ order.photos.length }}
            </div>
            <button @click.stop="nextPhoto" class="w-10 h-10 rounded-full bg-black bg-opacity-50 text-white flex items-center justify-center hover:bg-opacity-70 transition-colors">
              →
            </button>
          </div>
        </div>
      </div>
      
      <!-- Статус фото -->
      <div class="mb-4">
        <div class="font-semibold text-gray-700 dark:text-gray-200 mb-1">Статус фото:</div>
        <div class="text-base">
          <span v-if="order?.photo_status === 'uploaded_admin'" class="text-[#E63A62] dark:text-[#E63A62] font-semibold">Загружено админом</span>
          <span v-else-if="order?.photo_status === 'uploaded_florist'" class="text-blue-700 dark:text-blue-400 font-semibold">Загружено флористом</span>
          <span v-else-if="order?.photo_status === 'send_to_admin'" class="text-yellow-700 dark:text-yellow-400 font-semibold">Отправлено админу для проверки</span>
          <span v-else class="text-gray-400">Ожидает загрузки</span>
        </div>
      </div>
      <div class="flex gap-2 justify-center flex-wrap">
        <button @click="releaseOrder" class="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">Отпустить заказ</button>
        <button @click="completeOrder" class="px-4 py-2 rounded-lg bg-[#e63a62] text-white font-semibold hover:bg-[#c72c4e] transition-colors" v-if="!order?.status || order.status !== 'выполнен'">Выполнено</button>
        <!-- Кнопка "Отправить админу" для завершенных заказов -->
        <button 
          v-if="order?.status === 'выполнен' && order?.photo_status !== 'send_to_admin' && user.role !== 'admin'"
          @click="sendToAdmin" 
          class="px-4 py-2 rounded-lg bg-yellow-600 text-white font-semibold hover:bg-yellow-700 transition-colors"
        >
          Отправить админу
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Cache buster: force rebuild timestamp 1756112518
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { authFetch } from '../utils/authFetch';
import { ref as vueRef } from 'vue';


const route = useRoute();
const router = useRouter();
const order = ref<any>(null);
const prevOrder = ref<any>(null);
// const showNotice = ref(false); // Переменная больше не нужна
const user = ref<{ id: number; name: string; role?: string }>({ id: 0, name: '' });
let ws: WebSocket | null = null;
const toast = useToast();
const isUnmounted = ref(false);
const fileInput = vueRef<HTMLInputElement | null>(null);
const uploading = ref(false);
const showPhotoChoice = ref(false);
const canUploadPhoto = ref(false);
const previewImage = ref<string | null>(null);
const selectedFile = ref<File | null>(null);
const selectedPhotoUrl = ref<string | null>(null);
const rotationAngle = ref(0);
const currentPhotoIndex = ref(0);
const showCamera = ref(false);
const cameraStream = ref<MediaStream | null>(null);
const cameraVideo = ref<HTMLVideoElement | null>(null);
const showRawData = ref(false);
const showAllFields = ref(false);
const forceUpdate = ref(Date.now()); // Force cache update with current timestamp

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

// Функция получения Order ID из custom_fields
function getOrderId(): string {
  if (order.value?.order_id) {
    return order.value.order_id;
  }
  
  // Ищем в custom_fields
  const orderIdField = order.value?.custom_fields?.find((field: any) => 
    field.name && (field.name.includes('№ID') || field.name.includes('ID') || field.name.toLowerCase().includes('order_id'))
  );
  
  if (orderIdField) {
    return formatFieldValue(orderIdField.values);
  }
  
  return '';
}

function getField(order: any, name: string) {
  if (!order?.custom_fields) return '';
  const f = order.custom_fields.find((f: any) => f.name && f.name.toLowerCase().includes(name));
  if (!f) return '';
  if (Array.isArray(f.values)) {
    return f.values.map((v: any) => (typeof v === 'object' && v !== null && 'value' in v ? v.value : v)).join(', ');
  } else if (typeof f.values === 'object' && f.values !== null && 'value' in f.values) {
    return f.values.value;
  } else {
    return f.values || '';
  }
}

// Функция форматирования значений полей
  function formatFieldValue(values: any): string {
    let result = '';
    
    if (Array.isArray(values)) {
      result = values.map((v: any) => {
        if (typeof v === 'object' && v !== null && 'value' in v) {
          return v.value;
        }
        return v;
      }).join(', ');
    } else if (typeof values === 'object' && values !== null && 'value' in values) {
      result = values.value;
    } else {
      result = values || '-';
    }
    
    return result;
  }

// Функция для преобразования текста с URL в HTML с кликабельными ссылками
function formatFieldValueWithLinks(values: any): string {
  const text = formatFieldValue(values);
  
  // Регулярное выражение для поиска URL
  const urlRegex = /(https?:\/\/[^\s,]+)/gi;
  
  const result = text.replace(urlRegex, (url) => {
    return `<a href="${url}" target="_blank" class="text-blue-600 hover:text-blue-800 underline font-medium break-all">${url}</a>`;
  });
  
  return result;
}

// Функция форматирования цены
function formatPrice(price: string | number): string {
  if (!price) return '-';
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(numPrice)) return price.toString();
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0
  }).format(numPrice);
}

// Функция форматирования временных меток
function formatTimestamp(timestamp: string | number): string {
  if (!timestamp) return '-';
  const date = new Date(typeof timestamp === 'string' ? parseInt(timestamp) * 1000 : timestamp * 1000);
  if (isNaN(date.getTime())) return timestamp.toString();
  return date.toLocaleString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

// Функция категоризации полей
function getFieldsByCategory(category: 'delivery' | 'recipient' | 'payment' | 'products' | 'identifiers' | 'other') {
  if (!order.value?.custom_fields) {
    return [];
  }
  
  const categoryMap = {
    delivery: ['доставк', 'дата', 'время', 'адрес'],
    recipient: ['получател', 'ф.и.о', 'телефон'],
    payment: ['оплат', 'способ оплаты'],
    products: ['товар', 'ссылка'],
    identifiers: ['id', '№id', 'номер заказа'],
    other: ['пожелани', 'коммент', 'примечани', 'особ']
  };
  
  const keywords = categoryMap[category];
  
  const filtered = order.value.custom_fields.filter((field: any) => {
    const fieldName = field.name?.toLowerCase() || '';
    
    // Для категории "other" возвращаем поля, которые попали именно в эту категорию
    if (category === 'other') {
      return keywords.some(keyword => fieldName.includes(keyword));
    }
    
    // Для остальных категорий проверяем соответствие
    return keywords.some(keyword => fieldName.includes(keyword));
  }).filter((field: any) => {
    // Исключаем дубликаты между категориями
    const fieldName = field.name?.toLowerCase() || '';
    
    if (category === 'other') {
      // Для "other" исключаем поля, которые уже попали в другие категории
      const allOtherKeywords = [
        ...categoryMap.delivery,
        ...categoryMap.recipient,
        ...categoryMap.payment,
        ...categoryMap.products,
        ...categoryMap.identifiers
      ];
      
      return !allOtherKeywords.some(keyword => fieldName.includes(keyword));
    }
    
    return true;
  });
  
  return filtered;
}

// Функция получения всех полей в алфавитном порядке
function getAllFieldsSorted() {
  if (!order.value?.custom_fields) return [];
  
  return [...order.value.custom_fields].sort((a, b) => {
    const nameA = a.name?.toLowerCase() || '';
    const nameB = b.name?.toLowerCase() || '';
    return nameA.localeCompare(nameB, 'ru');
  });
}

// Функция получения текста статуса фото
function getPhotoStatusText(status: string): string {
  switch (status) {
    case 'uploaded_admin':
      return 'Загружено админом';
    case 'uploaded_florist':
      return 'Загружено флористом';
    case 'send_to_admin':
      return 'Отправлено админу для проверки';
    default:
      return 'Ожидает загрузки';
  }
}

function showOrderChangeToasts(newOrder: any, oldOrder: any) {
  if (isUnmounted.value) return;
  if (!oldOrder) return;
  if (newOrder.name !== oldOrder.name) toast.info('Изменено название заказа');
  if (getField(newOrder, 'время') !== getField(oldOrder, 'время')) toast.info('Изменено время доставки');
  if (getField(newOrder, 'адрес') !== getField(oldOrder, 'адрес')) toast.info('Изменён адрес доставки');
  if (getField(newOrder, 'коммент') !== getField(oldOrder, 'коммент')) toast.info('Изменён комментарий');
  if (getField(newOrder, 'товар') !== getField(oldOrder, 'товар')) toast.info('Изменён состав заказа');
}

async function loadOrder() {
  if (isUnmounted.value) return;
  
  const id = route.params.id;
  const token = localStorage.getItem('token');
  
  const res = await authFetch(`/api/orders/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (isUnmounted.value) return;
  if (res.ok) {
    const data = await res.json();
    
    // сравниваем изменения
    showOrderChangeToasts(data.order, prevOrder.value);
    prevOrder.value = JSON.parse(JSON.stringify(data.order));
    order.value = data.order;
    const fromAction = route.query.fromAction;
    const justTaken = sessionStorage.getItem('justTaken');
    if (!order.value.taken_by || order.value.taken_by.id !== user.value.id) {
      if (!fromAction && !justTaken && !isUnmounted.value) {
        // Уведомление убрано по запросу пользователя
      }
      sessionStorage.removeItem('justTaken');
      router.replace({ path: '/orders' });
    } else {
      if (justTaken) sessionStorage.removeItem('justTaken');
    }
  } else {
    const fromAction = route.query.fromAction;
    const justTaken = sessionStorage.getItem('justTaken');
    if (!fromAction && !justTaken && !isUnmounted.value) {
      // Уведомление убрано по запросу пользователя
    }
    sessionStorage.removeItem('justTaken');
    router.replace({ path: '/orders' });
  }
}

onMounted(() => {
  window.history.pushState(null, '', window.location.href);
  window.addEventListener('popstate', blockBack, false);
});
const blockBack = () => {
  window.history.pushState(null, '', window.location.href);
};

onMounted(async () => {
  const token = localStorage.getItem('token');
  if (token) {
    try {
      const payload = parseJwt(token);
      user.value = { id: payload.id, name: payload.name, role: payload.role };
    } catch {}
  }
  await loadOrder();
  // WebSocket для автообновления
  const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const wsHost = window.location.hostname;
  let wsUrl = `${wsProtocol}://${wsHost}/ws`;
  if (import.meta.env.PROD) {
    wsUrl = 'wss://flor.makiapp.ru/ws';
  }
  ws = new WebSocket(wsUrl);
  ws.onmessage = (event) => {
    if (isUnmounted.value) return;
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'orders_updated') {
        loadOrder();
      }
    } catch {}
  };
});

onUnmounted(() => {
  isUnmounted.value = true;
  if (ws) {
    ws.close();
    ws = null;
  }
  if (previewImage.value) {
    URL.revokeObjectURL(previewImage.value);
  }
  // Останавливаем камеру при размонтировании
  if (cameraStream.value) {
    cameraStream.value.getTracks().forEach(track => track.stop());
    cameraStream.value = null;
  }
  // Восстанавливаем прокрутку страницы
  document.body.style.overflow = '';
});

const releaseOrder = async () => {
  if (isUnmounted.value) return;
  const id = route.params.id;
  const token = localStorage.getItem('token');
  await authFetch(`/api/orders/${id}/release`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  router.push({ path: '/orders', query: { fromAction: '1' } });
};

const completeOrder = async () => {
  if (isUnmounted.value) return;
  const id = route.params.id;
  const token = localStorage.getItem('token');
  const res = await authFetch(`/api/orders/${id}/complete`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    try {
      const data = await res.json();
      toast.error(data.error || 'Не удалось завершить заказ');
    } catch {
      toast.error('Не удалось завершить заказ');
    }
  }
  await loadOrder();
  // После завершения заказа показываем выбор способа загрузки фото
  showPhotoChoice.value = true;
};

async function choosePhotoUpload(type: 'self' | 'admin') {
  showPhotoChoice.value = false;
  if (type === 'self') {
    canUploadPhoto.value = true;
  } else {
    canUploadPhoto.value = false;
    // Сценарий "Отправить админу"
    const id = route.params.id;
    const token = localStorage.getItem('token');
    const res = await authFetch(`/api/orders/${id}/send-to-admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });
    if (res.ok) {
      toast.success('Заказ отправлен админу для добавления фото!');
      router.push('/orders');
    } else {
      try {
        const data = await res.json();
        toast.error(data.error || 'Не удалось отправить заказ админу');
      } catch {
        toast.error('Не удалось отправить заказ админу');
      }
    }
  }
}

async function detachPhoto(url: string) {
  if (!order.value?.id) return;
  const token = localStorage.getItem('token');
  const res = await authFetch(`/api/orders/${order.value.id}/photo`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ url })
  });
  if (res.ok) {
    const data = await res.json();
    order.value = data.order;
    toast.success('Фото откреплено');
  } else {
    toast.error('Ошибка при откреплении фото');
  }
}

function triggerFileInput() {
  fileInput.value?.click();
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
      previewImage.value = URL.createObjectURL(blob);
      closeCamera();
    }
  }, 'image/jpeg');
}

async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  if (!input.files || !input.files[0] || !order.value?.id) return;
  
  const file = input.files[0];
  
  // Проверка типа файла
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
  if (!allowedTypes.includes(file.type)) {
    toast.error('Недопустимый формат файла. Разрешены только изображения (JPG, PNG, WEBP, HEIC)');
    if (fileInput.value) fileInput.value.value = '';
    return;
  }
  
  // Проверка размера файла (максимум 10 МБ)
  const maxSize = 10 * 1024 * 1024; // 10 МБ
  if (file.size > maxSize) {
    toast.error('Размер файла превышает 10 МБ');
    if (fileInput.value) fileInput.value.value = '';
    return;
  }
  
  selectedFile.value = file;
  
  // Создаем URL для предпросмотра
  previewImage.value = URL.createObjectURL(file);
}

function rotateImage(angle: number) {
  rotationAngle.value = (rotationAngle.value + angle) % 360;
}

async function uploadPhoto() {
  if (!selectedFile.value || !order.value?.id) return;
  
  uploading.value = true;
  
  try {
    // Если есть поворот, применяем его перед загрузкой
    let fileToUpload = selectedFile.value;
    
    if (rotationAngle.value !== 0) {
      fileToUpload = await rotateAndConvertToFile(selectedFile.value, rotationAngle.value);
    }
    
    const formData = new FormData();
    formData.append('photo', fileToUpload);
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/orders/${order.value.id}/photo`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });
    
    if (res.ok) {
      const data = await res.json();
      order.value = data.order;
      toast.success('Фото успешно загружено, завершаем заказ...');

      // Сценарий "Отправить самому"
      const id = route.params.id;
      const token = localStorage.getItem('token');
      const finalizeRes = await authFetch(`/api/orders/${id}/finalize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'self_complete', photoUrl: data.photoUrl })
      });

      if (finalizeRes.ok) {
        toast.success('Заказ успешно завершен!');
        router.push('/orders');
      } else {
        toast.error('Фото загружено, но не удалось завершить заказ в amoCRM');
      }
    } else {
      try {
        const data = await res.json();
        toast.error(data.error || 'Ошибка при загрузке фото');
      } catch {
        toast.error('Ошибка при загрузке фото');
      }
    }
  } catch (error) {
    console.error('Ошибка при обработке изображения:', error);
    toast.error('Ошибка при обработке изображения');
  } finally {
    uploading.value = false;
    // Очищаем предпросмотр
    cancelPreview();
  }
}

function cancelPreview() {
  if (previewImage.value) {
    URL.revokeObjectURL(previewImage.value);
  }
  previewImage.value = null;
  selectedFile.value = null;
  rotationAngle.value = 0;
  if (fileInput.value) fileInput.value.value = '';
}

// Функция для поворота изображения и конвертации в File
async function rotateAndConvertToFile(file: File, angle: number): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Не удалось создать контекст canvas'));
        return;
      }
      
      // Определяем размеры с учетом поворота
      if (Math.abs(angle) === 90 || Math.abs(angle) === 270) {
        canvas.width = img.height;
        canvas.height = img.width;
      } else {
        canvas.width = img.width;
        canvas.height = img.height;
      }
      
      // Центрируем и поворачиваем
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((angle * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      
      // Конвертируем canvas в blob
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Не удалось создать blob из canvas'));
          return;
        }
        
        // Создаем новый файл с тем же именем и типом
        const rotatedFile = new File([blob], file.name, { type: file.type });
        resolve(rotatedFile);
      }, file.type);
    };
    
    img.onerror = () => {
      reject(new Error('Ошибка загрузки изображения'));
    };
    
    img.src = URL.createObjectURL(file);
  });
}

// Сброс canUploadPhoto при загрузке заказа, если заказ не выполнен
watch(order, (val) => {
  if (!val || val.status !== 'выполнен') {
    canUploadPhoto.value = false;
  }
});

function openPhotoModal(url: string) {
  if (!order.value?.photos) return;
  
  // Находим индекс фото в массиве
  const index = order.value.photos.findIndex((photo: any) => photo.url === url);
  if (index !== -1) {
    currentPhotoIndex.value = index;
    selectedPhotoUrl.value = url;
    // Блокируем прокрутку страницы
    document.body.style.overflow = 'hidden';
  }
}

function closePhotoModal() {
  selectedPhotoUrl.value = null;
  // Восстанавливаем прокрутку страницы
  document.body.style.overflow = '';
}

function nextPhoto() {
  if (!order.value?.photos || order.value.photos.length <= 1) return;
  
  currentPhotoIndex.value = (currentPhotoIndex.value + 1) % order.value.photos.length;
  selectedPhotoUrl.value = order.value.photos[currentPhotoIndex.value].url;
}

function prevPhoto() {
  if (!order.value?.photos || order.value.photos.length <= 1) return;
  
  currentPhotoIndex.value = (currentPhotoIndex.value - 1 + order.value.photos.length) % order.value.photos.length;
  selectedPhotoUrl.value = order.value.photos[currentPhotoIndex.value].url;
}

  function logout() {
    try {
      localStorage.removeItem('token');
      sessionStorage.clear();
      if (ws) {
        ws.close();
        ws = null;
      }
    } finally {
      router.push('/login');
    }
  }
  
  // Функция отправки заказа админу
  async function sendToAdmin() {
    if (!order.value?.id) return;
    
    const id = route.params.id;
    const token = localStorage.getItem('token');
    const res = await authFetch(`/api/orders/${id}/send-to-admin`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (res.ok) {
      toast.success('Заказ отправлен админу для проверки фото');
      await loadOrder(); // Обновляем данные заказа
    } else {
      try {
        const data = await res.json();
        toast.error(data.error || 'Не удалось отправить заказ админу');
      } catch {
        toast.error('Не удалось отправить заказ админу');
      }
    }
  }
</script> 