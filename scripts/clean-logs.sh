#!/bin/bash

echo "=== Очистка логов Florist App ==="
echo "Время: $(date)"

cd /root/florist-app

# Создаем резервные копии больших логов
echo "Создание резервных копий..."
find logs/ -name "*.log" -size +10M -exec cp {} {}.backup \;

# Очищаем большие логи (оставляем последние 1000 строк)
echo "Ротация больших логов..."
find logs/ -name "*.log" -size +10M -exec sh -c 'tail -1000 "$1" > "$1.tmp" && mv "$1.tmp" "$1"' _ {} \;

# Удаляем старые резервные копии (старше 7 дней)
echo "Удаление старых резервных копий..."
find logs/ -name "*.backup" -mtime +7 -delete

# Удаляем пустые логи
echo "Удаление пустых логов..."
find logs/ -name "*.log" -size 0 -delete

# Статистика
echo "=== Статистика логов ==="
echo "Общий размер логов:"
du -sh logs/ 2>/dev/null || echo "0"

echo "Количество файлов по категориям:"
echo "- PM2: $(find logs/pm2/ -name "*.log" 2>/dev/null | wc -l)"
echo "- Webhooks: $(find logs/webhooks/ -name "*.log" 2>/dev/null | wc -l)"
echo "- App: $(find logs/app/ -name "*.log" 2>/dev/null | wc -l)"

echo "=== Очистка завершена ==="

