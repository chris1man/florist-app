<template>
  <nav class="mobile-nav md:hidden">
    <div class="flex justify-around items-center py-2 px-4">
      <router-link
        to="/orders"
        class="nav-item"
        :class="{ active: $route.path === '/orders' }"
      >
        <svg class="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
        </svg>
        <span class="text-xs">Заказы</span>
      </router-link>

      <button
        @click="refreshOrders"
        class="nav-item"
        :class="{ loading: isRefreshing }"
      >
        <svg class="w-6 h-6 mb-1" :class="{ 'animate-spin': isRefreshing }" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z"/>
        </svg>
        <span class="text-xs">Обновить</span>
      </button>

      <button
        @click="logout"
        class="nav-item text-red-500"
      >
        <svg class="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
          <path d="M16,17V14H9V10H16V7L21,12L16,17M14,2A2,2 0 0,1 16,4V6H14V4H5V20H14V18H16V20A2,2 0 0,1 14,22H5A2,2 0 0,1 3,20V4A2,2 0 0,1 5,2H14Z"/>
        </svg>
        <span class="text-xs">Выход</span>
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const isRefreshing = ref(false)

const refreshOrders = async () => {
  isRefreshing.value = true
  // Emit refresh event to parent
  emit('refresh')
  setTimeout(() => {
    isRefreshing.value = false
  }, 1000)
}

const logout = () => {
  localStorage.removeItem('token')
  router.push('/login')
}

const emit = defineEmits(['refresh'])
</script>

<style scoped>
.nav-item {
  @apply flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-all duration-200 min-w-0 flex-1;
  min-height: 64px;
}

.nav-item:hover {
  @apply bg-gray-100 dark:bg-gray-700;
}

.nav-item.active {
  @apply text-[#E63A62] bg-pink-50 dark:bg-pink-900 dark:text-pink-400;
}

.nav-item.loading {
  @apply opacity-75;
}
</style>