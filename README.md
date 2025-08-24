# Florist App

Приложение для управления заказами флористов с интеграцией amoCRM.

## 🚀 Быстрый запуск

### Запуск через PM2 (рекомендуется)
```bash
cd /root/florist-app/backend
pm2 start ecosystem.config.js
```зь2 

### Управление PM2
```bash
pm2 status              # Статус процессов
pm2 restart florist-backend  # Перезапуск
pm2 stop florist-backend     # Остановка
pm2 logs florist-backend     # Просмотр логов
pm2 monit               # Мониторинг ресурсов
```

## 🌐 Доступ

- **Веб-интерфейс**: http://localhost:3000
- **API**: http://localhost:3000/api/
- **WebSocket**: ws://localhost:3001

## 👤 Тестовые учетные данные

| Логин    | Пароль | Роль     | Имя   |
|----------|--------|----------|-------|
| florist1 | pass1  | florist  | Анна  |
| florist2 | pass2  | florist  | Ирина |
| florist3 | pass3  | florist  | Мария |
| sonya    | secret | florist  | Соня  |
| admin    | admin  | admin    | Админ |

## 🛠 Разработка

### Backend
- **Исходный код**: `backend/src/flor.ts`
- **Собранный код**: `backend/dist/flor.js` (автоматически)
- **Пересборка**: выполняется автоматически при рестарте PM2

### Frontend
- **Исходный код**: `frontend/src/`
- **Собранный код**: `frontend/dist/` (отдается через backend)
- **Сборка**: `cd frontend && npm run build`

### Ручная пересборка backend
```bash
cd /root/florist-app/backend
./rebuild.sh
```

## 📁 Структура проекта

```
florist-app/
├── backend/
│   ├── src/flor.ts              # TypeScript исходник
│   ├── dist/flor.js             # JavaScript сборка
│   ├── ecosystem.config.js      # Конфигурация PM2
│   ├── rebuild.sh               # Скрипт пересборки TS→JS
│   ├── package.json             # Зависимости backend
│   ├── florist.sqlite           # База данных
│   └── logs/                    # Логи PM2
├── frontend/
│   ├── src/                     # Vue.js исходники
│   ├── dist/                    # Собранный frontend
│   ├── package.json             # Зависимости frontend
│   └── vite.config.ts           # Конфигурация Vite
└── README.md                    # Эта документация
```

## 🔧 Особенности

### Автоматическая пересборка
- При каждом рестарте PM2 выполняется автоматическая пересборка TypeScript
- Скрипт `rebuild.sh` корректно преобразует TS в JS, убирая типы и интерфейсы
- Поддерживается hot-reload при изменении кода

### Мониторинг и стабильность
- PM2 автоматически перезапускает процесс при сбоях
- Ограничение памяти: 500MB (автоматический рестарт при превышении)
- Логирование всех событий в отдельные файлы
- WebSocket соединение для real-time обновлений

### Интеграция amoCRM
- Получение webhook'ов от amoCRM
- Автоматическое обновление статусов заказов
- Синхронизация с базой данных SQLite

## 📊 Мониторинг и логирование

### 📝 Структура логов

```
logs/
├── pm2/                    # Логи PM2 процесса
│   ├── out.log            # Стандартный вывод приложения
│   ├── err.log            # Ошибки приложения  
│   └── combined.log       # Объединенные логи
├── webhooks/              # Логи интеграции amoCRM
│   ├── all_webhooks.log   # Все входящие webhook'и
│   └── processed_webhooks.log  # Обработанные webhook'и
└── app/                   # Логи приложения
    └── upload_errors.log  # Ошибки загрузки файлов
```

### 🎯 Назначение логов

| Лог файл | Назначение | Важность |
|----------|------------|----------|
| `pm2/out.log` | Стандартный вывод приложения, старт/стоп | 🟢 Высокая |
| `pm2/err.log` | Критические ошибки и исключения | 🔴 Критическая |
| `pm2/combined.log` | Объединенные логи для общего анализа | 🟡 Средняя |
| `webhooks/all_webhooks.log` | Все webhook'и от amoCRM (для отладки) | 🟡 Средняя |
| `webhooks/processed_webhooks.log` | Успешно обработанные webhook'и | 🟢 Высокая |
| `app/upload_errors.log` | Ошибки загрузки фото в S3 | 🟠 Высокая |

### 🔧 Управление логами

**Автоматическая ротация:**
- Максимальный размер лога: 10MB
- Сохраняется последних 5 файлов
- Автоматическая очистка при рестарте PM2

**Ручная очистка:**
```bash
# Полная очистка логов
./scripts/clean-logs.sh

# Просмотр размеров логов
du -sh logs/*

# Очистка конкретного типа логов
> logs/webhooks/all_webhooks.log
```

### 📈 Команды мониторинга

```bash
# Статус сервера
curl http://localhost:3000/api/ping

# Мониторинг ресурсов PM2
pm2 monit

# Последние логи приложения
pm2 logs florist-backend --lines 50

# Просмотр логов в реальном времени
tail -f logs/pm2/combined.log

# Поиск ошибок за последний час
find logs/ -name "*.log" -newermt "1 hour ago" -exec grep -l "ERROR\|Error\|error" {} \;

# Статистика webhook'ов за сегодня
grep "$(date +%Y-%m-%d)" logs/webhooks/processed_webhooks.log | wc -l
```

## 🔒 Безопасность

- Аутентификация через JWT токены
- CORS настроен для всех доменов (в продакшене ограничить)
- Валидация всех входящих запросов
- Логирование всех операций

---
**Разработано для управления заказами флористов**
