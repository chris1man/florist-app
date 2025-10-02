#!/bin/bash

echo "=== Улучшенная автоматическая пересборка ==="
echo "Время: $(date)"

cd /root/florist-app/backend

# Очищаем старую сборку
echo "Очищаю старую сборку..."
rm -rf dist

# Пересобираем проект
echo "Пересобираю проект..."
if [ -f "src/flor.ts" ]; then
    mkdir -p dist
    
    # Копируем TypeScript файл как JavaScript
    cp src/flor.ts dist/flor.js
    
    echo "Преобразую TypeScript в JavaScript..."
    
    # 1. Заменяем import на require
    sed -i "s/import \([a-zA-Z0-9_]*\) from '\([^']*\)';/const \1 = require('\2');/g" dist/flor.js
    sed -i "s/import { \([^}]*\) } from '\([^']*\)';/const { \1 } = require('\2');/g" dist/flor.js
    
    # 2. Убираем типовые аннотации в параметрах функций (более точно)
    sed -i 's/(client: WebSocket)/(client)/g' dist/flor.js
    sed -i 's/(ws: ExtWebSocket)/(ws)/g' dist/flor.js
    sed -i 's/(ws: WebSocket)/(ws)/g' dist/flor.js
    sed -i 's/(req: Request, res: Response)/(req, res)/g' dist/flor.js
    sed -i 's/(req: Request, res: Response): Promise<void>/(req, res)/g' dist/flor.js
    sed -i 's/(date: Date)/(date)/g' dist/flor.js
    sed -i 's/(date?: Date)/(date)/g' dist/flor.js
    sed -i 's/existingIds: number\[\]/existingIds/g' dist/flor.js
    sed -i 's/: Request//g' dist/flor.js
    sed -i 's/: Response//g' dist/flor.js
    sed -i 's/: NextFunction//g' dist/flor.js
    sed -i 's/: Date//g' dist/flor.js
    
    # 3. Убираем основные типы
    sed -i 's/: string | undefined//g' dist/flor.js
    sed -i 's/: any\[\]//g' dist/flor.js
    sed -i 's/: any//g' dist/flor.js
    sed -i 's/: string//g' dist/flor.js
    sed -i 's/: number//g' dist/flor.js
    sed -i 's/: boolean//g' dist/flor.js
    sed -i 's/: Promise<[^>]*>//g' dist/flor.js
    sed -i 's/: void//g' dist/flor.js
    
    # 4. Убираем дженерики
    sed -i 's/<User>//g' dist/flor.js
    sed -i 's/<ExtWebSocket>//g' dist/flor.js
    sed -i 's/<WebSocket>//g' dist/flor.js
    sed -i 's/<[^>]*>//g' dist/flor.js
    
    # 5. Убираем интерфейсы и декларации
    sed -i '/^interface /,/^}/d' dist/flor.js
    sed -i '/^declare module /,/^}/d' dist/flor.js
    
    # 6. Убираем TypeScript специфичные конструкции
    sed -i 's/ as any//g' dist/flor.js
    sed -i 's/ as WebSocket//g' dist/flor.js
    sed -i 's/ as ExtWebSocket//g' dist/flor.js
    
    # 7. Убираем non-null assertions (!)
    sed -i 's/S3_BUCKET!/S3_BUCKET/g' dist/flor.js
    
    # 8. Убираем optional chaining (?) более аккуратно
    sed -i 's/req\.user?\.id/req.user \&\& req.user.id/g' dist/flor.js
    sed -i 's/err?\.message/err \&\& err.message/g' dist/flor.js
    sed -i 's/err?\.stack/err \&\& err.stack/g' dist/flor.js
    
    # 9. Убираем optional параметры
    sed -i 's/photoUrl?:/photoUrl:/g' dist/flor.js
    sed -i 's/photoUrl?)/photoUrl)/g' dist/flor.js
    
    # 10. Исправляем оставшиеся проблемы
    sed -i 's/err \&\& err\.message/err \&\& err.message/g' dist/flor.js
    sed -i 's/timestamp\.now()/timestamp: Date.now()/g' dist/flor.js
    
    echo "Пересборка завершена успешно"
else
    echo "ОШИБКА: Файл src/flor.ts не найден!"
    exit 1
fi

echo "=== Пересборка завершена ==="
