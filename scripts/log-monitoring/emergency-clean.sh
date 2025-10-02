#!/bin/bash

# Скрипт экстренной очистки критически больших логов
# Используется для немедленного решения проблем с большими логами

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
LOGS_DIR="$PROJECT_ROOT/logs"
CRITICAL_SIZE_MB=50
CRITICAL_SIZE_BYTES=$((CRITICAL_SIZE_MB * 1024 * 1024))

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Функция проверки размера файла
check_file_size() {
    local file_path="$1"
    if [[ -f "$file_path" ]]; then
        local size=$(stat -c%s "$file_path" 2>/dev/null || stat -f%z "$file_path" 2>/dev/null)
        echo "$size"
    else
        echo "0"
    fi
}

# Функция экстренной очистки лога
emergency_clean_log() {
    local log_file="$1"
    local filename=$(basename "$log_file")
    local size=$(check_file_size "$log_file")
    local size_mb=$((size / 1024 / 1024))
    
    log "${RED}🚨 ЭКСТРЕННАЯ ОЧИСТКА: $filename (${size_mb}MB)${NC}"
    
    # Создаем резервную копию перед очисткой
    local backup_file="${log_file}.emergency_backup_$(date '+%Y%m%d_%H%M%S')"
    cp "$log_file" "$backup_file"
    log "${YELLOW}📦 Создана резервная копия: $(basename "$backup_file")${NC}"
    
    # Очищаем лог, оставляя только последние 100 строк
    if [[ -f "$log_file" ]]; then
        tail -100 "$log_file" > "${log_file}.tmp" && mv "${log_file}.tmp" "$log_file"
        
        local new_size=$(check_file_size "$log_file")
        local new_size_mb=$((new_size / 1024 / 1024))
        
        log "${GREEN}✅ Лог очищен: ${size_mb}MB → ${new_size_mb}MB${NC}"
        log "${GREEN}✅ Оставлено 100 строк${NC}"
    fi
}

# Функция поиска критически больших логов
find_critical_logs() {
    local critical_files=()
    
    while IFS= read -r -d '' log_file; do
        if [[ -f "$log_file" ]]; then
            local size=$(check_file_size "$log_file")
            if [[ $size -gt $CRITICAL_SIZE_BYTES ]]; then
                critical_files+=("$log_file")
            fi
        fi
    done < <(find "$LOGS_DIR" -name "*.log" -type f -print0)
    
    echo "${critical_files[@]}"
}

# Функция показа статистики
show_statistics() {
    log "${BLUE}=== Статистика логов ===${NC}"
    
    echo "Общий размер логов:"
    du -sh "$LOGS_DIR" 2>/dev/null || echo "Нет доступа к логам"
    
    echo
    echo "Размеры отдельных файлов:"
    du -sh "$LOGS_DIR"/* 2>/dev/null || echo "Нет доступа к логам"
    
    echo
    echo "Количество строк в критических логах:"
    local critical_files=($(find_critical_logs))
    for log_file in "${critical_files[@]}"; do
        if [[ -f "$log_file" ]]; then
            local lines=$(wc -l < "$log_file" 2>/dev/null || echo "0")
            local size=$(check_file_size "$log_file")
            local size_mb=$((size / 1024 / 1024))
            echo "  $(basename "$log_file"): ${lines} строк, ${size_mb}MB"
        fi
    done
}

# Функция интерактивной очистки
interactive_clean() {
    local critical_files=($(find_critical_logs))
    
    if [[ ${#critical_files[@]} -eq 0 ]]; then
        log "${GREEN}✅ Критически больших логов не найдено${NC}"
        return 0
    fi
    
    log "${YELLOW}⚠️  Найдено ${#critical_files[@]} критически больших логов:${NC}"
    
    for i in "${!critical_files[@]}"; do
        local log_file="${critical_files[$i]}"
        local filename=$(basename "$log_file")
        local size=$(check_file_size "$log_file")
        local size_mb=$((size / 1024 / 1024))
        echo "  $((i+1))) $filename (${size_mb}MB)"
    done
    
    echo
    echo "Выберите действие:"
    echo "1) Очистить ВСЕ критически большие логи"
    echo "2) Выбрать логи для очистки по одному"
    echo "3) Отмена"
    echo
    
    read -p "Введите номер (1-3): " choice
    
    case $choice in
        1)
            log "${RED}🚨 Очистка ВСЕХ критически больших логов...${NC}"
            for log_file in "${critical_files[@]}"; do
                emergency_clean_log "$log_file"
            done
            ;;
        2)
            log "${YELLOW}Выбор логов для очистки...${NC}"
            for log_file in "${critical_files[@]}"; do
                local filename=$(basename "$log_file")
                local size=$(check_file_size "$log_file")
                local size_mb=$((size / 1024 / 1024))
                
                read -p "Очистить $filename (${size_mb}MB)? [y/N]: " confirm
                if [[ $confirm =~ ^[Yy]$ ]]; then
                    emergency_clean_log "$log_file"
                else
                    log "${BLUE}⏭️  Пропущен: $filename${NC}"
                fi
            done
            ;;
        3)
            log "${BLUE}Отмена операции${NC}"
            return 0
            ;;
        *)
            log "${RED}❌ Неверный выбор${NC}"
            return 1
            ;;
    esac
}

# Функция автоматической очистки
auto_clean() {
    local critical_files=($(find_critical_logs))
    
    if [[ ${#critical_files[@]} -eq 0 ]]; then
        log "${GREEN}✅ Критически больших логов не найдено${NC}"
        return 0
    fi
    
    log "${YELLOW}⚠️  Автоматическая очистка ${#critical_files[@]} критически больших логов...${NC}"
    
    for log_file in "${critical_files[@]}"; do
        emergency_clean_log "$log_file"
    done
    
    log "${GREEN}✅ Автоматическая очистка завершена${NC}"
}

# Основное меню
main() {
    log "${RED}🚨 === ЭКСТРЕННАЯ ОЧИСТКА ЛОГОВ ===${NC}"
    log "Критический размер: ${CRITICAL_SIZE_MB}MB"
    log "Директория логов: $LOGS_DIR"
    
    echo
    echo "Выберите действие:"
    echo "1) Показать статистику логов"
    echo "2) Автоматическая очистка критически больших логов"
    echo "3) Интерактивная очистка с выбором"
    echo "4) Выход"
    echo
    
    read -p "Введите номер (1-4): " choice
    
    case $choice in
        1)
            show_statistics
            ;;
        2)
            auto_clean
            ;;
        3)
            interactive_clean
            ;;
        4)
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
