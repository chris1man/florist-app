import * as fs from 'fs';
import * as path from 'path';

interface WebhookItem {
  id: string;
  data: any;
  timestamp: number;
  retries: number;
  priority: number;
}

export class WebhookQueue {
  private queue: WebhookItem[] = [];
  private processing = false;
  private maxRetries = 3;
  private maxQueueSize = 1000;
  private processingDelay = 100; // ms между обработками
  private queueFile = path.join(process.cwd(), 'backend', 'webhook_queue_backup.json');

  constructor() {
    // Автосохранение очереди при завершении процесса
    process.on('SIGTERM', () => this.saveQueue());
    process.on('SIGINT', () => this.saveQueue());
    process.on('beforeExit', () => this.saveQueue());

    // Восстанавливаем очередь при создании экземпляра
    this.restoreQueue();
  }

  // Добавление вебхука в очередь
  async add(data: any, priority = 0): Promise<string> {
    const id = `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const item: WebhookItem = {
      id,
      data,
      timestamp: Date.now(),
      retries: 0,
      priority
    };

    // Добавляем в очередь с сортировкой по приоритету
    this.queue.push(item);
    this.queue.sort((a, b) => b.priority - a.priority);

    // Ограничиваем размер очереди
    if (this.queue.length > this.maxQueueSize) {
      const removed = this.queue.splice(this.maxQueueSize);
      console.warn(`⚠️ Очередь переполнена. Удалено ${removed.length} элементов`);
    }

    console.log(`📨 Вебхук добавлен в очередь: ${id}, размер очереди: ${this.queue.length}`);

    // Запускаем обработку если она не идет
    if (!this.processing) {
      setTimeout(() => this.processQueue(), this.processingDelay);
    }

    return id;
  }

  // Основной цикл обработки
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    console.log(`🚀 Начинаем обработку очереди. Элементов: ${this.queue.length}`);

    while (this.queue.length > 0) {
      const item = this.queue.shift()!;

      try {
        await this.processWebhook(item);

        console.log(`✅ Вебхук обработан: ${item.id}, время обработки: ${Date.now() - item.timestamp}ms`);

      } catch (error: any) {
        item.retries++;

        console.error(`❌ Ошибка обработки вебхука ${item.id}:`, error.message);

        // Возвращаем в очередь если не превышен лимит попыток
        if (item.retries < this.maxRetries) {
          this.queue.unshift(item);
          console.log(`🔄 Вебхук ${item.id} возвращен в очередь, попытка ${item.retries}/${this.maxRetries}`);
        } else {
          console.error(`💀 Вебхук ${item.id} отброшен после ${item.retries} попыток`);
        }
      }

      // Небольшая пауза между обработками
      await new Promise(resolve => setTimeout(resolve, this.processingDelay));
    }

    this.processing = false;
    console.log('✅ Обработка очереди завершена');
  }

  // Обработка одного вебхука
  private async processWebhook(item: WebhookItem): Promise<void> {
    const { data } = item;

    // Здесь будет вызвана функция обработки вебхуков из основного файла
    if ((global as any).webhookProcessor) {
      await (global as any).webhookProcessor(data);
    }
  }

  // Сохранение очереди в файл (для восстановления после рестарта)
  private saveQueue(): void {
    if (this.queue.length > 0) {
      try {
        // Создаем директорию если её нет
        const dir = path.dirname(this.queueFile);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(this.queueFile, JSON.stringify(this.queue, null, 2));
        console.log(`💾 Сохранена очередь из ${this.queue.length} элементов`);
      } catch (error: any) {
        console.error('❌ Ошибка сохранения очереди:', error.message);
      }
    }
  }

  // Восстановление очереди при запуске
  private restoreQueue(): void {
    if (fs.existsSync(this.queueFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.queueFile, 'utf8'));

        // Фильтруем актуальные элементы (не старше 1 часа)
        const now = Date.now();
        this.queue = data.filter((item: WebhookItem) => {
          return now - item.timestamp < 60 * 60 * 1000; // 1 час
        });

        console.log(`🔄 Восстановлена очередь из ${this.queue.length} элементов`);

        // Удаляем файл после восстановления
        fs.unlinkSync(this.queueFile);

        // Продолжаем обработку если есть элементы
        if (this.queue.length > 0 && !this.processing) {
          setTimeout(() => this.processQueue(), 1000);
        }
      } catch (error: any) {
        console.error('❌ Ошибка восстановления очереди:', error.message);
      }
    }
  }

  // Получение статистики очереди
  getStats() {
    return {
      queueSize: this.queue.length,
      processing: this.processing,
      maxRetries: this.maxRetries,
      oldestItem: this.queue.length > 0 ?
        Date.now() - this.queue[this.queue.length - 1].timestamp : 0,
      newestItem: this.queue.length > 0 ?
        Date.now() - this.queue[0].timestamp : 0
    };
  }

  // Очистка очереди (для экстренных случаев)
  clear(): number {
    const cleared = this.queue.length;
    this.queue = [];
    return cleared;
  }

  // Принудительная обработка (для тестирования)
  forceProcess(): void {
    if (!this.processing) {
      setTimeout(() => this.processQueue(), 10);
    }
  }
}

// Глобальный экземпляр очереди
export const webhookQueue = new WebhookQueue();