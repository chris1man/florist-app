#!/bin/bash

# Скрипт мониторинга и архивирования логов Florist App
# Автоматически загружает большие логи на Яндекс.Диск и очищает их на сервере

# set -e  # Временно отключено для отладки

# Конфигурация
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
LOGS_DIR="$PROJECT_ROOT/logs"
YANDEX_TOKEN="y0__xC1zv3OBxjE_Tkgwba8oxQWlBMY2euxpI1XNtTXZQqk2_ry5A"
MAX_LOG_SIZE_MB=10
MAX_LOG_SIZE_BYTES=$((MAX_LOG_SIZE_MB * 1024 * 1024))

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция логирования
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

# Функция создания архива лога
create_log_archive() {
    local log_file="$1"
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local filename=$(basename "$log_file")
    local archive_name="${filename%.log}_${timestamp}.tar.gz"
    local archive_path="/tmp/$archive_name"
    
    log "${BLUE}Создание архива для $filename...${NC}"
    
    # Создаем архив с gzip сжатием
    tar -czf "$archive_path" -C "$(dirname "$log_file")" "$(basename "$log_file")"
    
    if [[ $? -eq 0 ]]; then
        log "${GREEN}Архив создан: $archive_name${NC}"
        echo "$archive_path"
    else
        log "${RED}Ошибка создания архива для $filename${NC}"
        echo ""
    fi
}

# Функция загрузки на Яндекс.Диск
upload_to_yandex() {
    local file_path="$1"
    local filename=$(basename "$file_path")
    local folder="logsAppsBackup"
    
    log "${BLUE}Загрузка $filename на Яндекс.Диск...${NC}"
    
    # Создаем папку на Яндекс.Диске если её нет
    log "${BLUE}Создание папки /$folder на Яндекс.Диске...${NC}"
    local create_folder_response=$(curl -s -X PUT \
        "https://cloud-api.yandex.net/v1/disk/resources?path=/$folder" \
        -H "Authorization: OAuth $YANDEX_TOKEN" \
        -H "Content-Type: application/json")
    log "${BLUE}Ответ создания папки: $create_folder_response${NC}"
    
    # Получаем ссылку для загрузки
    log "${BLUE}Получение ссылки для загрузки /$folder/$filename...${NC}"
    local upload_response=$(curl -s -X GET \
        "https://cloud-api.yandex.net/v1/disk/resources/upload?path=/$folder/$filename&overwrite=true" \
        -H "Authorization: OAuth $YANDEX_TOKEN")
    
    log "${BLUE}Ответ получения ссылки: $upload_response${NC}"
    local upload_url=$(echo "$upload_response" | grep -o '"href":"[^"]*"' | cut -d'"' -f4)
    log "${BLUE}Извлеченная ссылка: $upload_url${NC}"
    
    if [[ -n "$upload_url" ]]; then
        # Загружаем файл
        curl -X PUT "$upload_url" \
            --upload-file "$file_path" \
            -H "Content-Type: application/octet-stream" \
            --silent --show-error >/dev/null 2>&1
        
        local curl_exit_code=$?
        
        # Для Яндекс.Диск API успешная загрузка может возвращать код 0 даже при HTTP 100 Continue
        if [[ $curl_exit_code -eq 0 ]]; then
            log "${GREEN}Файл $filename успешно загружен на Яндекс.Диск${NC}"
            return 0
        else
            log "${RED}Ошибка загрузки $filename на Яндекс.Диск (код: $curl_exit_code)${NC}"
            return 1
        fi
    else
        log "${RED}Не удалось получить ссылку для загрузки $filename${NC}"
        return 1
    fi
}

# Функция очистки лога
clean_log_file() {
    local log_file="$1"
    local filename=$(basename "$log_file")
    
    log "${YELLOW}Очистка лога $filename...${NC}"
    
    # Оставляем только последние 1000 строк
    if [[ -f "$log_file" ]]; then
        tail -1000 "$log_file" > "${log_file}.tmp" && mv "${log_file}.tmp" "$log_file"
        log "${GREEN}Лог $filename очищен (оставлено 1000 строк)${NC}"
    fi
}

# Функция обработки одного лог файла
process_log_file() {
    local log_file="$1"
    local filename=$(basename "$log_file")
    local size=$(check_file_size "$log_file")
    
    if [[ $size -gt $MAX_LOG_SIZE_BYTES ]]; then
        log "${YELLOW}⚠️  Лог $filename превышает лимит: $((size / 1024 / 1024))MB > ${MAX_LOG_SIZE_MB}MB${NC}"
        
        # Создаем архив
        local archive_path=$(create_log_archive "$log_file")
        
        if [[ -n "$archive_path" ]]; then
            # Загружаем на Яндекс.Диск
            if upload_to_yandex "$archive_path"; then
                # Очищаем лог на сервере
                clean_log_file "$log_file"
                
                # Удаляем временный архив
                rm -f "$archive_path"
                log "${GREEN}✅ $filename обработан успешно${NC}"
            else
                log "${RED}❌ Ошибка загрузки $filename на Яндекс.Диск${NC}"
                # Удаляем временный архив
                rm -f "$archive_path"
            fi
        else
            log "${RED}❌ Не удалось создать архив для $filename${NC}"
        fi
    else
        log "${GREEN}✅ $filename в норме: $((size / 1024 / 1024))MB${NC}"
    fi
    
    return 0
}

# Основная функция
main() {
    log "${BLUE}=== Мониторинг логов Florist App ===${NC}"
    log "Максимальный размер лога: ${MAX_LOG_SIZE_MB}MB"
    log "Директория логов: $LOGS_DIR"
    
    # Проверяем существование директории логов
    if [[ ! -d "$LOGS_DIR" ]]; then
        log "${RED}❌ Директория логов не найдена: $LOGS_DIR${NC}"
        exit 1
    fi
    
    # Счетчики
    local processed_count=0
    local archived_count=0
    local errors_count=0
    
    # Обрабатываем все .log файлы
    log "${BLUE}Поиск .log файлов в $LOGS_DIR...${NC}"
    log_files=($(find "$LOGS_DIR" -name "*.log" -type f))
    log "${BLUE}Найдено ${#log_files[@]} .log файлов${NC}"
    
    # Отладочная информация о найденных файлах
    for i in "${!log_files[@]}"; do
        log "${BLUE}Файл $i: ${log_files[$i]}${NC}"
    done
    
    for log_file in "${log_files[@]}"; do
        log "${BLUE}Проверка файла: $log_file${NC}"
        if [[ -f "$log_file" ]]; then
            log "${BLUE}Обработка: $log_file${NC}"
            log "${BLUE}Размер файла: $(du -h "$log_file" | cut -f1)${NC}"
            if process_log_file "$log_file"; then
                log "${GREEN}✅ $log_file обработан успешно${NC}"
            else
                log "${RED}❌ Ошибка обработки $log_file${NC}"
                ((errors_count++))
            fi
            ((processed_count++))
            log "${BLUE}Обработано файлов: $processed_count из ${#log_files[@]}${NC}"
        else
            log "${RED}❌ Файл не найден: $log_file${NC}"
        fi
    done
    
    # Статистика
    log "${BLUE}=== Статистика обработки ===${NC}"
    log "Обработано файлов: $processed_count"
    log "Архивировано: $archived_count"
    log "Ошибок: $errors_count"
    
    # Показываем текущие размеры
    log "${BLUE}=== Текущие размеры логов ===${NC}"
    du -sh "$LOGS_DIR"/* 2>/dev/null || echo "Нет доступа к логам"
    
    log "${GREEN}=== Мониторинг завершен ===${NC}"
}

# Обработка ошибок
trap 'log "${RED}❌ Ошибка в строке $LINENO${NC}"; exit 1' ERR

# Запуск основной функции
main "$@"
