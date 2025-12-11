/**
 * Централизованная конфигурация приложения
 * Использует переменные окружения с валидацией и значениями по умолчанию
 */

import dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config();

/**
 * Интерфейс конфигурации amoCRM
 */
interface AmoCRMConfig {
  /**
   * Базовый URL amoCRM API
   */
  baseUrl: string;

  /**
   * Токен доступа к amoCRM API
   */
  accessToken: string;

  /**
   * ID статусов в amoCRM
   */
  statusIds: {
    /**
     * ID статуса для обработки новых заказов
     * @default 44828242
     */
    orderProcessing: number;

    /**
     * ID статуса для выполненных заказов
     * @default 76172434
     */
    completed: number;
  };

  /**
   * ID custom полей в amoCRM
   */
  fieldIds: {
    /**
     * ID поля для №ID заказа
     * @default 1055575
     */
    orderId: number;

    /**
     * ID поля для фото
     * @default 1055419
     */
    photo: number;

    /**
     * ID поля для флориста
     * @default 1036063
     */
    florist: number;
  };
}

/**
 * Интерфейс конфигурации AWS S3
 */
interface AwsConfig {
  /**
   * Access Key ID для AWS S3
   */
  accessKeyId: string;

  /**
   * Secret Access Key для AWS S3
   */
  secretAccessKey: string;

  /**
   * Регион AWS
   */
  region: string;

  /**
   * Название S3 bucket
   */
  bucket: string;

  /**
   * Endpoint для S3 (опционально)
   */
  endpoint?: string;
}

/**
 * Интерфейс конфигурации сервера
 */
interface ServerConfig {
  /**
   * Порт сервера
   * @default 3000
   */
  port: number;

  /**
   * Секретный ключ для JWT
   * @default 'supersecret'
   */
  jwtSecret: string;
}

/**
 * Основной интерфейс конфигурации приложения
 */
interface AppConfig {
  amoCRM: AmoCRMConfig;
  aws: AwsConfig;
  server: ServerConfig;
}

/**
 * Функция валидации конфигурации
 */
function validateConfig(config: AppConfig): void {
  const errors: string[] = [];

  // Проверка amoCRM конфигурации
  if (!config.amoCRM.baseUrl) {
    errors.push('AMO_BASE_URL is required');
  }

  if (!config.amoCRM.accessToken) {
    errors.push('AMO_ACCESS_TOKEN is required');
  }

  if (isNaN(config.amoCRM.statusIds.orderProcessing)) {
    errors.push('AMO_ORDER_STATUS_ID must be a valid number');
  }

  if (isNaN(config.amoCRM.statusIds.completed)) {
    errors.push('AMO_COMPLETED_STATUS_ID must be a valid number');
  }

  // Проверка AWS конфигурации (не обязательно для всех окружений)
  if (config.aws.accessKeyId && !config.aws.secretAccessKey) {
    errors.push('AWS_SECRET_ACCESS_KEY is required when AWS_ACCESS_KEY_ID is set');
  }

  if (config.aws.secretAccessKey && !config.aws.accessKeyId) {
    errors.push('AWS_ACCESS_KEY_ID is required when AWS_SECRET_ACCESS_KEY is set');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
  }
}

/**
 * Основная конфигурация приложения
 */
const config: AppConfig = {
  amoCRM: {
    baseUrl: process.env.AMO_BASE_URL || '',
    accessToken: process.env.AMO_ACCESS_TOKEN || '',
    statusIds: {
      orderProcessing: parseInt(process.env.AMO_ORDER_STATUS_ID || '44828242'),
      completed: parseInt(process.env.AMO_COMPLETED_STATUS_ID || '76172434')
    },
    fieldIds: {
      orderId: parseInt(process.env.AMO_ORDER_FIELD_ID || '1055575'),
      photo: parseInt(process.env.AMO_PHOTO_FIELD_ID || '1055419'),
      florist: parseInt(process.env.AMO_FLORIST_FIELD_ID || '1036063')
    }
  },
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    region: process.env.AWS_REGION || 'ru-1',
    bucket: process.env.AWS_S3_BUCKET || '',
    endpoint: process.env.AWS_S3_ENDPOINT
  },
  server: {
    port: parseInt(process.env.PORT || '3000'),
    jwtSecret: process.env.JWT_SECRET || 'supersecret'
  }
};

// Валидируем конфигурацию при запуске
validateConfig(config);

export default config;
export type { AppConfig, AmoCRMConfig, AwsConfig, ServerConfig };