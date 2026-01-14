<template>
  <Transition name="slide-fade">
    <div v-if="isVisible" :class="['error-alert', `alert-${type}`]" role="alert">
      <span class="alert-icon">{{ icon }}</span>
      <div class="alert-content">
        <p class="alert-title">{{ title }}</p>
        <p v-if="message" class="alert-message">{{ message }}</p>
      </div>
      <button v-if="dismissible" class="alert-close" @click="onClose" aria-label="Закрыть">
        ×
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type AlertType = 'error' | 'success' | 'warning' | 'info'

interface Props {
  isVisible?: boolean
  type?: AlertType
  title?: string
  message?: string
  dismissible?: boolean
  autoClose?: boolean
  duration?: number
}

const props = withDefaults(defineProps<Props>(), {
  isVisible: false,
  type: 'error',
  title: 'Ошибка',
  message: '',
  dismissible: true,
  autoClose: true,
  duration: 5000
})

const emit = defineEmits<{
  close: []
}>()

const icon = computed(() => {
  const icons: Record<AlertType, string> = {
    error: '✕',
    success: '✓',
    warning: '⚠',
    info: 'ⓘ'
  }
  return icons[props.type] || icons.error
})

const onClose = () => {
  emit('close')
}

// Auto-close functionality
if (props.autoClose && props.isVisible) {
  setTimeout(() => {
    onClose()
  }, props.duration)
}
</script>

<style scoped>
.error-alert {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  margin: 1rem 0;
  border-radius: 8px;
  border-left: 4px solid;
  background: transparent;
  animation: slideIn 0.3s ease;
  position: relative;
}

.alert-error {
  background: rgba(201, 105, 102, 0.1);
  border-left-color: var(--accent-pink, #7a2d3a);
  color: var(--accent-pink, #7a2d3a);
}

.alert-success {
  background: rgba(109, 176, 128, 0.1);
  border-left-color: var(--success-green, #6db080);
  color: var(--success-green, #6db080);
}

.alert-warning {
  background: rgba(147, 55, 66, 0.1);
  border-left-color: var(--primary-pink, #933742);
  color: var(--primary-pink, #933742);
}

.alert-info {
  background: rgba(217, 67, 102, 0.05);
  border-left-color: var(--secondary-pink, #D94366);
  color: #666;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.alert-icon {
  flex-shrink: 0;
  font-weight: bold;
  font-size: 1.2rem;
  line-height: 1.4;
}

.alert-content {
  flex: 1;
}

.alert-title {
  font-weight: 600;
  font-size: 0.95rem;
  margin: 0;
  line-height: 1.3;
}

.alert-message {
  font-size: 0.875rem;
  margin: 0.25rem 0 0 0;
  opacity: 0.9;
  line-height: 1.4;
}

.alert-close {
  flex-shrink: 0;
  background: none;
  border: none;
  color: inherit;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background-color 0.2s ease;
  min-height: auto;
  min-width: auto;
  box-shadow: none;
}

.alert-close:hover {
  background-color: rgba(0, 0, 0, 0.05);
  transform: none;
}

/* Transitions */
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
}

.slide-fade-enter-from {
  transform: translateX(-20px);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateX(20px);
  opacity: 0;
}

/* Адаптивность */
@media (max-width: 640px) {
  .error-alert {
    gap: 0.5rem;
    padding: 0.875rem;
    font-size: 0.9rem;
  }

  .alert-title {
    font-size: 0.9rem;
  }

  .alert-message {
    font-size: 0.8rem;
  }

  .alert-close {
    width: 24px;
    height: 24px;
    font-size: 1.3rem;
  }
}
</style>
