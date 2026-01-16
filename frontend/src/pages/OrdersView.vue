<template>
  <div :key="$route.fullPath" class="min-h-screen bg-white dark:bg-[#262626] pt-4 px-2 md:px-4 w-full transition-colors duration-500">
   <header
    class="w-full md:max-w-2xl mx-auto flex items-center justify-between px-4 md:px-6 py-2 md:py-3 bg-white dark:bg-[#2a2a2a] text-gray-800 dark:text-gray-200 shadow-sm rounded-full mb-3 md:mb-4 transition-all duration-300"
    style="font-size: 0.75rem;"
   >
		  <div class="font-medium flex items-center gap-2 px-2 py-0.5 rounded-full">
			  <!-- Индикатор статуса WebSocket -->
			  <div class="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gray-100/80 dark:bg-gray-800/80">
				  <span
					  :class="[
						  'inline-block w-2 h-2 rounded-full',
						  wsConnected ? 'bg-emerald-500' : 'bg-red-500'
					  ]"
				  ></span>
				  <span
					  class="text-[0.68rem] font-semibold tracking-wide"
					  :class="wsConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'"
				  >
					  {{ wsConnected ? 'Онлайн' : 'Офлайн' }}
				  </span>
			  </div>
			  <span
				  v-if="user.role === 'admin'"
				  class="text-[0.7rem] text-gray-700 dark:text-gray-200 truncate max-w-[120px] md:max-w-none"
			  >
				  {{ user.name ? `Админ: ${user.name}` : 'Админ' }}
			  </span>
			  <span
				  v-else
				  class="text-[0.7rem] text-gray-700 dark:text-gray-200 truncate max-w-[120px] md:max-w-none"
			  >
				  {{ user.name ? `Флорист: ${user.name}` : 'Флорист' }}
			  </span>
		  </div>
		  <div class="flex items-center gap-1.5 md:gap-2">
			  <!-- Кнопка перезагрузки с иконкой -->
			  <button
				  @click="fetchOrders"
				  class="flex items-center justify-center p-1.5 md:p-2 rounded-full border border-gray-200/80 dark:border-gray-700/80 bg-gray-50/60 dark:bg-[#1f1f1f] hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
				  title="Перезагрузить"
			  >
				  <svg class="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
				  </svg>
			  </button>
			  <!-- Кнопка выхода с иконкой -->
			  <button
				  @click="logout"
				  class="flex items-center justify-center p-1.5 md:p-2 rounded-full border border-gray-200/80 dark:border-gray-700/80 bg-gray-50/60 dark:bg-[#1f1f1f] hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
				  title="Выйти"
			  >
				  <svg class="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
				  </svg>
			  </button>
		  </div>
	  </header>
    <div class="w-full px-1 md:px-2 pt-0">
      <!-- Табы для админа -->
        <div v-if="user.role === 'admin'" class="flex justify-center mb-4">
        <div class="bg-gray-100 dark:bg-gray-800 rounded-lg p-1 flex gap-1">
          <button 
            @click="activeTab = 'regular'"
            :class="[
              'px-4 py-2 rounded-md font-semibold transition-all duration-200',
              activeTab === 'regular' 
                ? 'bg-gradient-to-r from-[#933742] to-[#7a2d3a] text-white shadow-sm' 
                : 'text-gray-700 dark:text-gray-100 hover:text-gray-900 dark:hover:text-white'
            ]"
          >
            Обычные заказы
          </button>
          <button 
            @click="activeTab = 'photo_requests'"
            :class="[
              'px-4 py-2 rounded-md font-semibold transition-all duration-200',
              activeTab === 'photo_requests' 
                ? 'bg-gradient-to-r from-[#933742] to-[#7a2d3a] text-white shadow-sm' 
                : 'text-gray-700 dark:text-gray-100 hover:text-gray-900 dark:hover:text-white'
            ]"
          >
            Заявки на фото
            <span v-if="photoRequestsCount > 0" class="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {{ photoRequestsCount }}
            </span>
          </button>
        </div>
      </div>
      
      <h1 class="text-base font-semibold mb-2 text-[#933742] text-center inline-block px-1 py-0 rounded relative">
        <span v-if="user.role === 'admin'">
          {{ activeTab === 'photo_requests' ? 'Заявки на фото' : 'Доступные заказы' }}
        </span>
        <span v-else>Доступные заказы</span>
      </h1>
      <SkeletonLoader v-if="loading" :count="3" />
      <div v-else>
        <!-- Desktop: таблица -->
        <table class="hidden md:table w-full bg-transparent animate-fade-in relative text-sm">
          <thead>
            <tr class="text-[#933742]">
              <th class="p-3 text-left font-semibold">№ID</th>
              <th class="p-3 text-left font-semibold">Название</th>
              <th class="p-3 text-left font-semibold">Дата</th>
              <th class="p-3 text-left font-semibold">Время</th>
              <th class="p-3 text-left font-semibold">Адрес</th>
              <th class="p-3 text-left font-semibold">Статус</th>
              <th class="p-3"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in orders" :key="order.id" class="hover:bg-[#D94366] hover:bg-opacity-20 dark:hover:bg-[#933742] dark:hover:bg-opacity-10 transition">
              <td class="p-3 relative">
                <span v-if="order.orderId" class="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-gradient-to-r from-[#933742] to-[#7a2d3a] text-white shadow-lg transform hover:scale-105 transition-transform duration-200 cursor-default">
                  {{ order.orderId }}
                </span>
                <span v-else class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border-2 border-dashed border-gray-300">
                  Ожидание
                </span>
              </td>
              <td class="p-3 font-semibold text-base relative">
                <a
                  :href="`https://makilk.amocrm.ru/leads/detail/${order.id}`"
                  target="_blank"
                  class="text-[#933742] hover:underline hover:text-[#7a2d3a]"
                >
                  {{ order.name }}
                </a>
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
                <span v-if="order.status === 'Свободен'" class="text-[#933742] font-bold">Свободен</span>
                <span v-else-if="order.status.startsWith('Взял')" class="text-[#933742] font-bold">{{ order.status }}</span>
                <span v-else-if="order.status === 'Выполнен'" class="text-gray-500 font-bold">Выполнен</span>
              </td>
              <td class="p-3 relative">
                <button
                  v-if="order.status === 'Свободен'"
                  @click="takeOrder(order.id)"
                  class="px-4 py-2 rounded-lg bg-gradient-to-r from-[#933742] to-[#7a2d3a] text-white font-semibold hover:from-[#7a2d3a] hover:to-[#5a1d28] transition-all duration-200"
                >Взять</button>
                <button
                  v-else-if="order.status.startsWith('Взял') && order.taken_by && order.taken_by.id === user.id"
                  @click="openOrder(order.id)"
                  class="px-4 py-2 rounded-lg bg-[#262626] text-white font-semibold hover:bg-[#444] transition-colors duration-200"
                >Открыть</button>
                <!-- Кнопка загрузки фото для админа -->
                <button
                  v-if="user.role === 'admin' && activeTab === 'photo_requests' && order.photo_status === 'send_to_admin'"
                  @click="triggerPhotoUpload(order.id)"
                  class="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors duration-200"
                >Загрузить фото</button>
              </td>
            </tr>
          </tbody>
        </table>
        <!-- Mobile: карточки -->
        <div class="md:hidden flex flex-col gap-2 animate-fade-in">
          <div v-for="order in orders" :key="order.id" class="rounded-xl bg-[#f7f8fa] dark:bg-[#232323] p-2 flex flex-col gap-1 w-full relative shadow-sm">
            <div class="flex items-center justify-between pb-1">
              <div class="font-semibold text-base text-[#933742] relative">
                <a
                  :href="`https://makilk.amocrm.ru/leads/detail/${order.id}`"
                  target="_blank"
                  class="hover:underline"
                >
                  {{ order.name }}
                </a>
              </div>
              <div class="flex-shrink-0 ml-2">
                <span v-if="order.orderId" class="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-gradient-to-r from-[#933742] to-[#7a2d3a] text-white shadow-lg">
                  {{ order.orderId }}
                </span>
                <span v-else class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border-2 border-dashed border-gray-300">
                  Ожидание
                </span>
              </div>
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
              <span v-if="order.status === 'Свободен'" class="text-[#933742] font-bold px-2 py-1 rounded">Свободен</span>
              <span v-else-if="order.status.startsWith('Взял')" class="text-[#933742] font-bold px-2 py-1 rounded">{{ order.status }}</span>
              <span v-else-if="order.status === 'Выполнен'" class="text-gray-500 font-bold px-2 py-1 rounded">Выполнен</span>
              <button
                v-if="order.status === 'Свободен'"
                @click="takeOrder(order.id)"
                class="ml-auto px-4 py-2 rounded-lg bg-gradient-to-r from-[#933742] to-[#7a2d3a] text-white font-semibold hover:bg-gradient-to-r hover:from-[#7a2d3a] hover:to-[#5a1d28] transition-colors duration-200"
              >Взять</button>
              <button
                v-else-if="order.status.startsWith('Взял') && order.taken_by && order.taken_by.id === user.id"
                @click="openOrder(order.id)"
                class="ml-auto px-4 py-2 rounded-lg bg-[#262626] text-white font-semibold hover:bg-[#444] transition-colors duration-200"
              >Открыть</button>
              <!-- Кнопка загрузки фото для админа на мобильном -->
              <button
                v-if="user.role === 'admin' && activeTab === 'photo_requests' && order.photo_status === 'send_to_admin'"
                @click="triggerPhotoUpload(order.id)"
                class="ml-auto px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors duration-200"
              >Загрузить фото</button>
            </div>
          </div>
        </div>
        <div v-if="orders.length === 0" class="text-center text-gray-500 py-10">Заказов сейчас нет</div>
      </div>
      
      <!-- Оверлей загрузки фото -->
      <div v-if="uploading" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white dark:bg-gray-800 rounded-lg p-6 flex flex-col items-center gap-4">
          <img
            v-if="previewUrl"
            :src="previewUrl"
            alt="Предпросмотр"
            class="max-w-[240px] max-h-[240px] rounded-lg shadow"
          />
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#933742]"></div>
          <div class="text-lg font-semibold">Загружаем фото...</div>
        </div>
      </div>
      
      <!-- Диалог выбора способа загрузки -->
      <div v-if="showPhotoChoice" class="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-40">
        <div class="bg-white dark:bg-[#232323] rounded-lg shadow-lg p-6 flex flex-col gap-4 min-w-[280px] max-w-[90vw]">
          <div class="text-lg font-semibold text-center mb-2">Как загрузить фото?</div>
          <button @click="choosePhotoMethod('camera')" class="px-4 py-2 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700 transition-colors">Сделать фото</button>
          <button @click="choosePhotoMethod('gallery')" class="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors">Выбрать из галереи</button>
          <button @click="showPhotoChoice = false; uploadingOrderId = null" class="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">Отмена</button>
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
    </div>
  </div>
</template>

<script setup lang="ts">
import heic2any from 'heic2any';
// Добавляем вотчер для смены табов
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { authFetch } from '../utils/authFetch';

const orders = ref<any[]>([]);
const loading = ref(true);
const user = ref<{ id: number; name: string; role?: string }>({ id: 0, name: '' });
const toast = useToast();
const activeTab = ref('regular'); // 'regular' или 'photo_requests'
const photoRequestsCount = ref(0);
const uploading = ref(false);
const selectedFile = ref<File | null>(null);
const uploadingOrderId = ref<string | null>(null);
const showPhotoChoice = ref(false);
const showCamera = ref(false);
const cameraStream = ref<MediaStream | null>(null);
const cameraVideo = ref<HTMLVideoElement | null>(null);
const previewUrl = ref<string | null>(null);

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
        // Уведомление убрано по запросу пользователя
        // toast.error('Сначала завершите или отпустите текущий заказ', { timeout: 4000, hideProgressBar: false });
      }
      router.replace({ path: `/orders/${data.orderId}` });
    }
  }
}

async function fetchOrders() {
  if (isUnmounted.value) return;
  loading.value = true;
  
  // Для админа добавляем фильтр
  let url = '/api/orders';
  if (user.value.role === 'admin') {
    url += `?filter=${activeTab.value}`;
  }
  
  const res = await authFetch(url);
  if (res.ok) {
    const data = await res.json();
    orders.value = data.orders;
    
    // Если это админ, получаем количество заявок на фото
    if (user.value.role === 'admin' && activeTab.value === 'regular') {
      await fetchPhotoRequestsCount();
    }
    
    checkActiveOrder();
  }
  loading.value = false;
}

async function fetchPhotoRequestsCount() {
  if (user.value.role !== 'admin') return;
  
  const res = await authFetch('/api/orders?filter=photo_requests');
  if (res.ok) {
    const data = await res.json();
    photoRequestsCount.value = data.orders.length;
  }
}

function triggerPhotoUpload(orderId: string) {
  uploadingOrderId.value = orderId;
  // Показываем диалог выбора способа загрузки
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
  input.accept = 'image/jpeg,image/png,image/webp,image/heic,image/heif,image/*';
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
    cameraStream.value = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    });
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
  uploadingOrderId.value = null;
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

async function uploadPhoto() {
  if (!selectedFile.value || !uploadingOrderId.value) return;
  
  uploading.value = true;
  
  try {
    const fileToUpload = await prepareUploadFile(selectedFile.value);
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
    previewUrl.value = URL.createObjectURL(fileToUpload);
    const formData = new FormData();
    formData.append('photo', fileToUpload);
    
    const res = await authFetch(`/api/orders/${uploadingOrderId.value}/photo`, {
      method: 'POST',
      body: formData
    });
    
    const contentType = res.headers.get('content-type') || '';
    if (res.ok) {
      toast.success('Фото успешно загружено и отправлено в amoCRM');
      // Обновляем списки заказов
      await fetchOrders();
    } else if (contentType.includes('application/json')) {
      const data = await res.json();
      toast.error(data.error || `Ошибка при загрузке фото: ${res.status}`);
    } else {
      await res.text();
      toast.error(`Ошибка при загрузке фото: ${res.status}`);
    }
  } catch (error: any) {
    console.error('Upload error:', error);
    toast.error(`Ошибка при загрузке фото: ${error.message || 'неизвестная ошибка'}`);
  } finally {
    uploading.value = false;
    selectedFile.value = null;
    uploadingOrderId.value = null;
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value);
      previewUrl.value = null;
    }
  }
}

const MAX_UPLOAD_SIZE = 4 * 1024 * 1024;
const MAX_DIMENSION = 2000;
const JPEG_QUALITY = 0.85;

async function compressImageFile(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  if (file.size <= MAX_UPLOAD_SIZE) return file;

  const image = new Image();
  const objectUrl = URL.createObjectURL(file);

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('image_load_failed'));
      image.src = objectUrl;
    });

    const ratio = Math.min(MAX_DIMENSION / image.width, MAX_DIMENSION / image.height, 1);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.width * ratio);
    canvas.height = Math.round(image.height * ratio);

    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY);
    });

    if (!blob) return file;

    const newName = file.name.replace(/\.[^.]+$/, '.jpg');
    return new File([blob], newName, { type: 'image/jpeg' });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function convertHeicToJpeg(file: File): Promise<File> {
  const isHeic = file.type === 'image/heic'
    || file.type === 'image/heif'
    || /\.(heic|heif)$/i.test(file.name);
  if (!isHeic) return file;

  try {
    const converted = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.85
    });

    const blob = Array.isArray(converted) ? converted[0] : converted;
    const newName = file.name.replace(/\.[^.]+$/, '.jpg');
    return new File([blob], newName, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

async function prepareUploadFile(file: File): Promise<File> {
  const heicConverted = await convertHeicToJpeg(file);
  return compressImageFile(heicConverted);
}

async function takeOrder(id: string) {
  const res = await authFetch(`/api/orders/${id}/take`, {
    method: 'POST',
  });
  if (res.ok) {
    sessionStorage.setItem('justTaken', '1');
    router.push({ path: `/orders/${id}`, query: { fromAction: '1' } });
  }
}

function openOrder(id: string) {
  sessionStorage.setItem('justTaken', '1');
  router.push({ path: `/orders/${id}`, query: { fromAction: '1' } });
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
      user.value = { id: payload.id, name: payload.name, role: payload.role };
    } catch {}
  }
  await checkActiveOrder();
  await fetchOrders();
  
  // Вотчер для смены табов у админа
  if (user.value.role === 'admin') {
    watch(activeTab, () => {
      fetchOrders();
    });
  }
  // WebSocket auto-update
  const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const wsHost = window.location.hostname;
  const wsPort = import.meta.env.DEV ? ':5173' : '';
  // В режиме разработки используем проксирование через Vite
  let wsUrl = `${wsProtocol}://${wsHost}${wsPort}/ws`;
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
  // Останавливаем камеру при размонтировании
  if (cameraStream.value) {
    cameraStream.value.getTracks().forEach(track => track.stop());
    cameraStream.value = null;
  }
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
    previewUrl.value = null;
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
