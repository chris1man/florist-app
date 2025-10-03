#!/bin/bash

# Улучшенный скрипт автоматической пересборки backend
# Автоматически компилирует TypeScript в JavaScript с помощью tsc,
# очищает dist, компилирует все .ts файлы в src/ и перезапускает PM2 процесс 'florist-backend'.
# Это заменяет ручной хак с sed на официальную компиляцию TypeScript,
# которая правильно обрабатывает импорты (require вместо import), типы и зависимости (например, webhookQueue).
# Требования: tsconfig.json в backend/, npx (из npm), PM2 установлен глобально.
# Использование: ./rebuild.sh — применяет изменения в коде backend моментально.

echo "=== Автоматическая пересборка backend с tsc и PM2 ==="
echo "Время: $(date)"
echo "Применяет изменения в коде: компиляция TS → JS + перезапуск сервера"

cd /root/florist-app/backend || { echo "ОШИБКА: Не удалось перейти в backend"; exit 1; }

# Шаг 1: Очищаем старую сборку (dist/)
echo "Очищаю старую сборку (dist/)..."
rm -rf dist
if [ $? -ne 0 ]; then
    echo "ОШИБКА: Не удалось очистить dist/"
    exit 1
fi

# Шаг 2: Проверяем наличие tsconfig.json (настройки компиляции TS)
if [ ! -f "tsconfig.json" ]; then
    echo "ОШИБКА: tsconfig.json не найден! Создайте его для компиляции TypeScript."
    exit 1
fi
echo "tsconfig.json найден — используем для компиляции."

# Шаг 3: Компилируем TypeScript в JavaScript с помощью npx tsc
# Это создаст dist/flor.js и dist/webhookQueue.js (и другие) с правильными require,
# удалит типы (: string, interface) и обработает импорты.
echo "Компилирую TypeScript (src/*.ts) в JavaScript (dist/)..."
npx tsc
if [ $? -ne 0 ]; then
    echo "ОШИБКА: Компиляция tsc провалилась! Проверьте ошибки в tsconfig.json или коде."
    exit 1
fi

# Проверяем, создался ли основной файл
if [ ! -f "dist/flor.js" ]; then
    echo "ОШИБКА: dist/flor.js не создан после tsc! Проверьте tsconfig.json (outDir: 'dist')."
    exit 1
fi
echo "Компиляция завершена успешно: dist/flor.js и зависимости (webhookQueue.js) готовы."

# Шаг 4: Перезапускаем PM2 процесс 'florist-backend'
# Это применит изменения: PM2 запустит node dist/flor.js с обновленным кодом.
echo "Перезапускаю PM2 процесс 'florist-backend'..."
pm2 restart florist-backend
if [ $? -ne 0 ]; then
    echo "ОШИБКА: Не удалось перезапустить PM2! Проверьте, запущен ли процесс (pm2 list)."
    exit 1
fi

# Шаг 5: Проверяем статус PM2
echo "Проверяю статус PM2..."
pm2 list | grep florist-backend
if [ $? -eq 0 ]; then
    echo "✅ PM2 перезапущен успешно — сервер обновлен с изменениями."
else
    echo "ПРЕДУПРЕЖДЕНИЕ: PM2 статус не найден. Запустите вручную: pm2 start dist/flor.js --name florist-backend"
fi

echo "=== Пересборка и перезапуск завершены ==="
echo "Сервер готов к работе с новыми изменениями. Проверьте логи: pm2 logs florist-backend"
