#!/bin/bash

# Скрипт настройки автоматического мониторинга логов через cron

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONITOR_SCRIPT="$SCRIPT_DIR/monitor-logs.sh"
CRON_USER="root"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Проверяем существование скрипта мониторинга
if [[ ! -f "$MONITOR_SCRIPT" ]]; then
    log "${RED}❌ Скрипт мониторинга не найден: $MONITOR_SCRIPT${NC}"
    exit 1
fi

# Делаем скрипт исполняемым
chmod +x "$MONITOR_SCRIPT"
log "${GREEN}✅ Скрипт мониторинга сделан исполняемым${NC}"

# Функция добавления cron задачи
add_cron_job() {
    local schedule="$1"
    local description="$2"
    
    log "${BLUE}Добавление cron задачи: $description${NC}"
    
    # Создаем временный файл с текущими cron задачами
    local temp_cron=$(mktemp)
    crontab -l 2>/dev/null > "$temp_cron" || echo "" > "$temp_cron"
    
    # Проверяем, есть ли уже такая задача
    if grep -q "$MONITOR_SCRIPT" "$temp_cron"; then
        log "${YELLOW}⚠️  Cron задача уже существует${NC}"
        rm -f "$temp_cron"
        return 0
    fi
    
    # Добавляем новую задачу
    echo "# $description" >> "$temp_cron"
    echo "$schedule $MONITOR_SCRIPT >> $SCRIPT_DIR/monitor-logs.log 2>&1" >> "$temp_cron"
    
    # Применяем изменения
    crontab "$temp_cron"
    rm -f "$temp_cron"
    
    log "${GREEN}✅ Cron задача добавлена: $schedule${NC}"
}

# Функция показа текущих cron задач
show_cron_jobs() {
    log "${BLUE}=== Текущие cron задачи ===${NC}"
    crontab -l 2>/dev/null || echo "Нет cron задач"
}

# Функция удаления cron задач мониторинга
remove_cron_jobs() {
    log "${YELLOW}Удаление cron задач мониторинга логов...${NC}"
    
    # Создаем временный файл
    local temp_cron=$(mktemp)
    crontab -l 2>/dev/null > "$temp_cron" || echo "" > "$temp_cron"
    
    # Удаляем строки с нашим скриптом
    local lines_before=$(wc -l < "$temp_cron")
    grep -v "$MONITOR_SCRIPT" "$temp_cron" > "${temp_cron}.clean"
    mv "${temp_cron}.clean" "$temp_cron"
    
    # Удаляем пустые строки и комментарии
    sed -i '/^$/d' "$temp_cron"
    sed -i '/^#.*monitor-logs/d' "$temp_cron"
    
    local lines_after=$(wc -l < "$temp_cron")
    
    # Применяем изменения
    crontab "$temp_cron"
    rm -f "$temp_cron"
    
    local removed=$((lines_before - lines_after))
    log "${GREEN}✅ Удалено $removed cron задач мониторинга${NC}"
}

# Функция тестирования скрипта
test_monitor_script() {
    log "${BLUE}Тестирование скрипта мониторинга...${NC}"
    
    if "$MONITOR_SCRIPT" --help 2>/dev/null || "$MONITOR_SCRIPT" 2>/dev/null; then
        log "${GREEN}✅ Скрипт мониторинга работает корректно${NC}"
        return 0
    else
        log "${RED}❌ Ошибка при тестировании скрипта мониторинга${NC}"
        return 1
    fi
}

# Основное меню
main() {
    log "${BLUE}=== Настройка автоматического мониторинга логов ===${NC}"
    log "Скрипт мониторинга: $MONITOR_SCRIPT"
    
    echo
    echo "Выберите действие:"
    echo "1) Добавить ежедневную очистку в 3:00"
    echo "2) Добавить очистку каждые 6 часов"
    echo "3) Добавить очистку каждый час"
    echo "4) Показать текущие cron задачи"
    echo "5) Удалить все cron задачи мониторинга"
    echo "6) Тестировать скрипт мониторинга"
    echo "7) Выход"
    echo
    
    read -p "Введите номер (1-7): " choice
    
    case $choice in
        1)
            add_cron_job "0 3 * * *" "Ежедневная очистка логов в 3:00"
            ;;
        2)
            add_cron_job "0 */6 * * *" "Очистка логов каждые 6 часов"
            ;;
        3)
            add_cron_job "0 * * * *" "Очистка логов каждый час"
            ;;
        4)
            show_cron_jobs
            ;;
        5)
            remove_cron_jobs
            ;;
        6)
            test_monitor_script
            ;;
        7)
            log "${GREEN}Выход${NC}"
            exit 0
            ;;
        *)
            log "${RED}❌ Неверный выбор${NC}"
            exit 1
            ;;
    esac
    
    echo
    log "${GREEN}✅ Операция завершена${NC}"
}

# Проверяем права доступа
if [[ $EUID -ne 0 ]]; then
    log "${RED}❌ Этот скрипт должен быть запущен от root${NC}"
    exit 1
fi

# Запуск основного меню
main "$@"

