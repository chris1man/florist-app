<template>
  <div :key="$route.fullPath" class="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-[#262626] p-0">
    <div class="w-full flex items-center justify-between px-2 sm:px-3 py-2 bg-[#e63a62] text-white shadow rounded-lg mt-2 mb-2 md:mt-4 md:mb-3 transition-all duration-300 relative" style="font-size: 0.95rem;">
      <div class="font-bold px-2 py-1 rounded" style="font-size: 0.95rem;">Детали заказа</div>
      <button @click="logout" class="bg-[#262626] text-white font-semibold px-3 py-1 rounded-md hover:bg-[#444] transition-colors duration-200 relative" style="font-size: 0.95rem;">Выйти</button>
    </div>
    <div v-if="showNotice" class="fixed top-0 left-0 w-full z-50 flex justify-center">
      <div class="bg-[#e63a62] text-white px-4 py-2 rounded-b-lg shadow text-center mt-0.5 animate-fade-in">
        Сначала возьмите заказ, чтобы просмотреть его детали
      </div>
    </div>
    <div class="w-full max-w-full bg-white dark:bg-[#232323] shadow mt-4 mb-4" style="border-radius: 10px; padding: 0.5rem 0.5rem;">
      <div class="flex flex-col items-center mb-3">
        <div v-if="order?.order_id" class="inline-flex items-center px-4 py-2 rounded-full text-lg font-bold bg-gradient-to-r from-[#e63a62] to-[#c72c4e] text-white shadow-xl mb-2 transform hover:scale-105 transition-transform duration-200">
          {{ order.order_id }}
        </div>
        <h2 class="text-2xl font-bold text-[#e63a62] text-center">
          Заказ №{{ order?.id }}
        </h2>
      </div>
      <div class="mb-2 text-base">
        <div><b>Имя:</b> {{ order?.name || '-' }}</div>
        <div><b>Стоимость:</b> {{ order?.price || order?.sale || '-' }}</div>
      </div>
      <div class="mb-4">
        <div class="font-semibold text-gray-700 dark:text-gray-200 mb-1">Детали заказа:</div>
        <div v-if="order?.custom_fields && order.custom_fields.length">
          <div v-for="field in order.custom_fields" :key="field.id" class="mb-1 text-base">
            <span class="font-semibold">{{ field.name }}: </span>
            <span>
              <template v-if="Array.isArray(field.values)">
                <template v-for="(v, i) in field.values" :key="i">
                  {{ typeof v === 'object' && v !== null && 'value' in v ? v.value : v }}<span v-if="i < field.values.length - 1">, </span>
                </template>
              </template>
              <template v-else-if="typeof field.values === 'object' && field.values !== null && 'value' in field.values">
                {{ field.values.value }}
              </template>
              <template v-else>
                {{ field.values || '-' }}
              </template>
            </span>
          </div>
        </div>
        <div v-else class="text-base text-gray-400">Нет дополнительных полей</div>
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
          <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onFileChange" />
          <div v-if="uploading" class="text-xs text-gray-500 mt-2">Загрузка...</div>
          
          <!-- Предпросмотр фото перед загрузкой -->
          <div v-if="previewImage" class="mt-4 flex flex-col items-center">
            <img :src="previewImage" alt="Предпросмотр" class="w-64 h-64 object-contain rounded shadow border border-gray-200 dark:border-gray-700" :style="{ transform: `rotate(${rotationAngle}deg)` }" />
            <div class="flex gap-2 mt-2">
              <button @click="rotateImage(-90)" class="px-3 py-1 rounded bg-blue-100 text-blue-700 text-sm font-semibold hover:bg-blue-200 transition-colors">⟲</button>
              <button @click="uploadPhoto" class="px-3 py-1 rounded bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors">Загрузить</button>
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
          <span v-if="order?.photo_status === 'uploaded_admin'" class="text-green-700 dark:text-green-400 font-semibold">Загружено админом</span>
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
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { authFetch } from '../utils/authFetch';
import { ref as vueRef } from 'vue';

const route = useRoute();
const router = useRouter();
const order = ref<any>(null);
const prevOrder = ref<any>(null);
const showNotice = ref(false);
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
        toast.error('Сначала возьмите заказ, чтобы просмотреть его детали', { timeout: 4000, hideProgressBar: false });
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
      toast.error('Сначала возьмите заказ, чтобы просмотреть его детали', { timeout: 4000, hideProgressBar: false });
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
    const res = await authFetch(`/api/orders/${id}/finalize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ action: 'to_admin' })
    });
    if (res.ok) {
      toast.success('Заказ успешно завершен и отправлен админу!');
      router.push('/orders');
    } else {
      toast.error('Не удалось завершить заказ в amoCRM');
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