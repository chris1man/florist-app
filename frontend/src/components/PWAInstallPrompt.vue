<template>
  <Transition name="install-prompt" appear>
    <div 
      v-if="showInstallPrompt" 
      class="fixed bottom-4 left-4 right-4 z-50 bg-white dark:bg-gray-800 shadow-xl rounded-xl p-3 border border-gray-200 dark:border-gray-700"
      style="margin-bottom: env(safe-area-inset-bottom)"
    >
      <div class="flex items-center gap-3">
        <!-- App Icon -->
        <div class="w-10 h-10 bg-[#E63A62] rounded-lg flex items-center justify-center flex-shrink-0">
          <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.03 16.03,17 13,17V20H16V22H8V20H11V17C7.97,17 5,14.03 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z"/>
          </svg>
        </div>
        
        <!-- Content -->
        <div class="flex-1 min-w-0">
          <h4 class="font-semibold text-gray-900 dark:text-white text-sm leading-tight">
            Установить Флорист
          </h4>
          <p class="text-gray-600 dark:text-gray-400 text-xs leading-tight">
            Добавьте на главный экран
          </p>
        </div>
        
        <!-- Actions -->
        <div class="flex items-center gap-2 flex-shrink-0">
          <button
            @click="dismissInstallPrompt"
            class="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Позже
          </button>
          <button
            @click="installApp"
            class="px-4 py-1.5 bg-[#E63A62] hover:bg-[#c72c4e] text-white text-xs font-medium rounded-lg transition-colors"
          >
            Установить
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const showInstallPrompt = ref(false)
const deferredPrompt = ref<any>(null)

// Check if app is already installed
const isAppInstalled = () => {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone ||
    document.referrer.includes('android-app://')
  )
}

// Check if prompt was previously dismissed
const wasPromptDismissed = () => {
  const dismissed = localStorage.getItem('pwa-install-dismissed')
  if (dismissed) {
    const dismissedTime = new Date(dismissed).getTime()
    const now = new Date().getTime()
    const threeDays = 3 * 24 * 60 * 60 * 1000
    return now - dismissedTime < threeDays
  }
  return false
}

const handleBeforeInstallPrompt = (e: Event) => {
  console.log('beforeinstallprompt получен')
  e.preventDefault()
  deferredPrompt.value = e
  
  // Показываем кнопку если приложение не установлено
  if (!isAppInstalled() && !wasPromptDismissed()) {
    console.log('Показываю кнопку автоматической установки')
    showInstallPrompt.value = true
  }
}

const installApp = async () => {
  console.log('Кнопка установки нажата')
  
  if (deferredPrompt.value) {
    try {
      await deferredPrompt.value.prompt()
      const { outcome } = await deferredPrompt.value.userChoice
      console.log('Результат установки:', outcome)
      
      if (outcome === 'accepted') {
        console.log('Приложение успешно установлено!')
      }
      
      showInstallPrompt.value = false
      deferredPrompt.value = null
    } catch (error) {
      console.error('Ошибка при установке:', error)
      showInstallPrompt.value = false
    }
  } else {
    console.log('Автоматическая установка недоступна')
    showInstallPrompt.value = false
  }
}

const dismissInstallPrompt = () => {
  console.log('Install prompt dismissed')
  showInstallPrompt.value = false
  localStorage.setItem('pwa-install-dismissed', new Date().toISOString())
}

onMounted(() => {
  console.log('PWAInstallPrompt запущен')
  
  // Слушаем событие установки
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  
  // Слушаем успешную установку
  window.addEventListener('appinstalled', () => {
    console.log('Приложение установлено!')
    showInstallPrompt.value = false
  })
  
  // Показываем кнопку через некоторое время
  setTimeout(() => {
    if (!isAppInstalled() && !wasPromptDismissed() && deferredPrompt.value) {
      console.log('Показываю кнопку установки')
      showInstallPrompt.value = true
    }
  }, 2000)
})

onUnmounted(() => {
  window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
})
</script>

<style scoped>
.install-prompt-enter-active,
.install-prompt-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.install-prompt-enter-from {
  opacity: 0;
  transform: translateY(100%);
}

.install-prompt-leave-to {
  opacity: 0;
  transform: translateY(100%);
}

/* iOS specific styles */
@supports (-webkit-touch-callout: none) {
  .ios-install-hint {
    @apply block;
  }
}
</style>