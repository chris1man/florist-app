<template>
  <div class="skeleton-container">
    <!-- Заголовок скелетон -->
    <div class="skeleton skeleton-title"></div>
    
    <!-- Список скелетонов -->
    <div v-for="i in count" :key="i" class="skeleton-item">
      <div class="skeleton skeleton-avatar"></div>
      <div class="skeleton-content">
        <div class="skeleton skeleton-text-large"></div>
        <div class="skeleton skeleton-text-small"></div>
        <div class="skeleton skeleton-text-small"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  count?: number;
}

withDefaults(defineProps<Props>(), {
  count: 3
})
</script>

<style scoped>
.skeleton-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.skeleton-title {
  width: 60%;
  height: 24px;
  margin-bottom: 1rem;
  border-radius: 4px;
}

.skeleton-item {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: rgba(217, 124, 122, 0.03);
  border-radius: 8px;
}

.skeleton-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  flex-shrink: 0;
}

.skeleton-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.skeleton-text-large {
  width: 100%;
  height: 16px;
  border-radius: 4px;
}

.skeleton-text-small {
  width: 80%;
  height: 12px;
  border-radius: 4px;
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--secondary-pink, #f0b6b4) 25%,
    rgba(240, 182, 180, 0.2) 50%,
    var(--secondary-pink, #f0b6b4) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes skeleton-pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* Адаптивность */
@media (max-width: 640px) {
  .skeleton-item {
    padding: 0.75rem;
    gap: 0.75rem;
  }

  .skeleton-avatar {
    width: 50px;
    height: 50px;
  }
}
</style>
