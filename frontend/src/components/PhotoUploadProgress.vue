<template>
  <div v-if="isVisible" class="photo-upload-progress">
    <!-- Спиннер -->
    <div class="upload-spinner"></div>
    
    <!-- Статус -->
    <div class="upload-status">
      <p class="status-text">{{ statusText }}</p>
      <p v-if="progress > 0" class="progress-percent">{{ progress }}%</p>
    </div>
    
    <!-- Прогресс бар -->
    <div v-if="progress > 0" class="progress-bar-container">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progress + '%' }"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  isVisible?: boolean
  progress?: number
}

const props = withDefaults(defineProps<Props>(), {
  isVisible: false,
  progress: 0
})

const statusText = computed(() => {
  if (props.progress === 0) return 'Подготовка к загрузке...'
  if (props.progress < 50) return 'Загружаю фото...'
  if (props.progress < 100) return 'Завершаю загрузку...'
  return 'Загрузка завершена!'
})
</script>

<style scoped>
.photo-upload-progress {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  padding: 2rem;
  background: linear-gradient(
    135deg,
    rgba(217, 124, 122, 0.08),
    rgba(240, 182, 180, 0.08)
  );
  border-radius: 12px;
  border: 2px solid rgba(217, 124, 122, 0.15);
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.upload-spinner {
  width: 56px;
  height: 56px;
  border: 5px solid rgba(217, 124, 122, 0.1);
  border-top-color: var(--primary-pink, #8B4545);
  border-right-color: var(--primary-pink, #8B4545);
  border-radius: 50%;
  animation: spin 1.2s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.upload-status {
  text-align: center;
}

.status-text {
  font-size: 1rem;
  font-weight: 500;
  color: var(--primary-pink, #8B4545);
  margin: 0;
  line-height: 1.4;
}

.progress-percent {
  font-size: 0.875rem;
  color: var(--accent-pink, #c96966);
  margin: 0.5rem 0 0 0;
  font-weight: 600;
}

.progress-bar-container {
  width: 100%;
  max-width: 300px;
}

.progress-bar {
  width: 100%;
  height: 10px;
  background: rgba(217, 124, 122, 0.1);
  border-radius: 5px;
  overflow: hidden;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(
    90deg,
    var(--primary-pink, #8B4545),
    var(--secondary-pink, #f0b6b4)
  );
  border-radius: 5px;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 0 10px rgba(217, 124, 122, 0.3);
}

/* Адаптивность */
@media (max-width: 640px) {
  .photo-upload-progress {
    padding: 1.5rem;
    gap: 1rem;
  }

  .upload-spinner {
    width: 48px;
    height: 48px;
    border-width: 4px;
  }

  .status-text {
    font-size: 0.95rem;
  }

  .progress-bar-container {
    max-width: 100%;
  }
}
</style>
