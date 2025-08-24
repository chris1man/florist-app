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
│   ├── florist.sqlite           # База данных (включая таблицу order_ids)
│   ├── sostav.json              # Активные заказы в работе
│   ├── admin-photo.json         # Заказы ожидающие фото от админа
│   ├── order_ids_backup.json    # Резервная копия уникальных ID
│   └── logs/                    # Логи PM2 и системы ID
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
- **Автоматическое присваивание уникальных ID заказам**
- **Workflow отправки заказов админу для добавления фото**

### 📸 Система управления фото заказов

**Два сценария завершения заказа**:
1. **Флорист загружает фото сам** - заказ сразу завершается и уходит в amoCRM
2. **Отправка админу** - заказ передается админу для добавления профессионального фото

**Workflow "Отправить админу"**:
1. Флорист выполняет заказ и выбирает "Отправить админу"
2. Заказ сохраняется в `admin-photo.json` для промежуточного хранения
3. Заказ сразу переводится в статус "Выполнен" в amoCRM
4. Админ видит заказ в разделе "Заявки на фото"
5. Админ загружает профессиональное фото
6. Заказ автоматически удаляется из "Заявок на фото"

**Файлы системы фото**:
- `backend/sostav.json` - активные заказы в работе
- `backend/admin-photo.json` - заказы ожидающие фото от админа
- Заказы в `admin-photo.json` видны только админу в специальном разделе

### 🆔 Система уникальных ID заказов

**Формат ID**: `[БукваДня][000-999]`
- **Буквы дней**: A=Понедельник, B=Вторник, C=Среда, D=Четверг, E=Пятница, F=Суббота, G=Воскресенье
- **Нумерация**: 3-значная последовательная нумерация (001-999) для каждого дня
- **Временная зона**: Томск (GMT+7) для определения дня недели
- **Примеры**: `A001`, `A002`, `G015` (первый и второй заказы понедельника, 15-й заказ воскресенья)

**Автоматическое присваивание**:
- ID присваивается при переходе заказа в статус "Составление букета" (status_id: 44828242)
- Заказы без ID получают новый уникальный номер автоматически
- ID отправляется в amoCRM в поле "№ID" (field_id: 1055575)
- Постоянное хранение в SQLite базе данных

### 🛡️ Перестраховочные механизмы

**Многоуровневая защита от дублирования ID**:
1. **Файловая блокировка** - предотвращает race conditions при одновременных запросах
2. **Двойная проверка уникальности** - в основной БД и резервном файле
3. **Резервное копирование** - дублирование всех ID в `order_ids_backup.json`
4. **Детальное логирование** - полная трассировка операций с контрольными данными

**Файлы системы ID**:
- `backend/florist.sqlite` - основная БД с таблицей `order_ids`
- `backend/order_ids_backup.json` - резервная копия всех присвоенных ID
- `backend/logs/id_assignments_YYYY-MM-DD.log` - детальные логи операций
- `backend/id_assignment.lock` - временный файл блокировки

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
├── app/                   # Логи приложения
│   └── upload_errors.log  # Ошибки загрузки файлов
└── id_assignments/        # Логи системы уникальных ID
    └── id_assignments_YYYY-MM-DD.log  # Детальные логи присваивания ID
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
| `id_assignments_*.log` | Детальные логи присваивания уникальных ID | 🟢 Высокая |

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

# Проверка присвоенных ID за сегодня
sqlite3 backend/florist.sqlite "SELECT COUNT(*) FROM order_ids WHERE DATE(created_at) = DATE('now', 'localtime');"

# Последние присвоенные ID
sqlite3 backend/florist.sqlite "SELECT order_id, amocrm_lead_id, deal_name, created_at FROM order_ids ORDER BY created_at DESC LIMIT 10;"

# Проверка резервных копий ID
ls -la backend/order_ids_backup.json backend/logs/id_assignments_*.log 2>/dev/null

# Статистика ID по дням недели
sqlite3 backend/florist.sqlite "SELECT SUBSTR(order_id, 1, 1) as day_letter, COUNT(*) as count FROM order_ids GROUP BY SUBSTR(order_id, 1, 1) ORDER BY day_letter;"

# Проверка заявок на фото админа
ls -la backend/admin-photo.json
cat backend/admin-photo.json | jq length  # Количество заявок

# Последние операции с admin-photo.json
grep -E "add_to_admin_photo|remove_from_admin_photo" logs/webhooks/processed_webhooks.log | tail -5
```

## 🔒 Безопасность

- Аутентификация через JWT токены
- CORS настроен для всех доменов (в продакшене ограничить)
- Валидация всех входящих запросов
- Логирование всех операций

---
**Разработано для управления заказами флористов**
