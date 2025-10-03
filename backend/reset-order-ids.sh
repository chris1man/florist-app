#!/bin/bash

# Функция для вывода справки
show_help() {
    echo "Использование: $0 [ОПЦИИ]"
    echo ""
    echo "ОПЦИИ:"
    echo "  -y, --yes     Автоматическое подтверждение (без запроса)"
    echo "  -d, --dry-run Пробный запуск (только показать что будет сделано)"
    echo "  -h, --help    Показать эту справку"
    echo ""
    echo "ПРИМЕРЫ:"
    echo "  $0            # Интерактивный режим с подтверждением"
    echo "  $0 --yes      # Автоматический сброс без вопросов"
    echo "  $0 --dry-run  # Показать что будет сделано"
}

# Обработка аргументов командной строки
AUTO_YES=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -y|--yes)
            AUTO_YES=true
            shift
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo "❌ Неизвестная опция: $1"
            show_help
            exit 1
            ;;
    esac
done

echo "🔄 Сброс порядковых номеров заказов"
echo ""

if [ "$DRY_RUN" = true ]; then
    echo "🔍 ПРОБНЫЙ ЗАПУСК - данные не будут изменены"
    echo ""
fi

# Проверка существования базы данных
if [ ! -f "../backend/florist.sqlite" ]; then
    echo "❌ База данных не найдена: ../backend/florist.sqlite"
    exit 1
fi

# Подтверждение действия (если не auto-yes)
if [ "$AUTO_YES" != true ] && [ "$DRY_RUN" != true ]; then
    read -p "⚠️  ВНИМАНИЕ! Это действие удалит ВСЕ присвоенные ID заказов. Продолжить? (yes/no): " confirm

    if [ "$confirm" != "yes" ]; then
        echo "❌ Операция отменена"
        exit 0
    fi
fi

echo ""
echo "📋 План действий:"
echo "   1. Создать резервные копии"
echo "   2. Очистить таблицу order_ids"
echo "   3. Очистить order_ids_backup.json"
echo "   4. Очистить логи присвоения ID"
echo "   5. Проверить результаты"
echo ""

if [ "$DRY_RUN" = true ]; then
    echo "✅ ПРОБНЫЙ ЗАПУСК ЗАВЕРШЕН"
    echo "   Данные не были изменены"
    exit 0
fi

# Создаем timestamp для резервных копий
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="../order_ids_reset_backup_$TIMESTAMP"

echo "📁 Создаю резервные копии в: $BACKUP_DIR"

# Создаем директорию для резервных копий
mkdir -p "$BACKUP_DIR"

# Резервное копирование базы данных
echo "💾 Резервное копирование базы данных..."
cp ../backend/florist.sqlite "$BACKUP_DIR/florist_backup_$TIMESTAMP.sqlite"

# Резервное копирование JSON файлов
echo "💾 Резервное копирование JSON файлов..."
cp ../backend/order_ids_backup.json "$BACKUP_DIR/order_ids_backup_$TIMESTAMP.json" 2>/dev/null || true

# Резервное копирование логов
echo "💾 Резервное копирование логов..."
cp -r ../logs/id_assignments "$BACKUP_DIR/id_assignments_logs_$TIMESTAMP" 2>/dev/null || true

echo ""
echo "🗑️  Выполняю сброс данных..."

# Очищаем таблицу order_ids в базе данных
echo "🗑️  Очищаю таблицу order_ids..."
sqlite3 ../backend/florist.sqlite "DELETE FROM order_ids;"

if [ $? -eq 0 ]; then
    echo "✅ Таблица order_ids очищена"
else
    echo "❌ Ошибка при очистке таблицы order_ids"
    exit 1
fi

# Очищаем резервную копию ID
echo "🗑️  Очищаю order_ids_backup.json..."
echo "[]" > ../backend/order_ids_backup.json

# Очищаем логи присвоения ID
echo "🗑️  Очищаю логи присвоения ID..."
find ../logs -name "id_assignments_*.log" -delete

echo ""
echo "📊 Результаты сброса:"

# Проверяем количество записей после сброса
COUNT=$(sqlite3 ../backend/florist.sqlite "SELECT COUNT(*) FROM order_ids;")
echo "📊 Количество записей в таблице order_ids: $COUNT"

# Проверяем размер резервного файла
BACKUP_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
echo "📊 Размер резервных копий: $BACKUP_SIZE"

echo ""
echo "✅ СБРОС УСПЕШНО ЗАВЕРШЕН!"
echo "📁 Резервные копии сохранены в: $BACKUP_DIR"
echo ""
echo "🔄 Следующий заказ получит ID: A001"
echo "📅 Все счетчики сброшены на 001 для каждого дня недели"
echo ""
echo "📋 Что было очищено:"
echo "   ✓ Таблица order_ids в базе данных"
echo "   ✓ Файл order_ids_backup.json"
echo "   ✓ Логи присвоения ID"
echo ""
echo "💡 Следующие шаги:"
echo "   1. Перезапустите сервер: pm2 restart florist-backend"
echo "   2. Проверьте работу: curl http://localhost:3000/api/ping"
echo "   3. Удалите старые резервные копии если не нужны"