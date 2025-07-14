"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const sqlite3_1 = __importDefault(require("sqlite3"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const fs_1 = __importDefault(require("fs"));
// Загрузка переменных окружения
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Отдача production-фронта
const frontendDist = path_1.default.resolve(__dirname, '../../frontend/dist');
app.use(express_1.default.static(frontendDist));
// --- SQLite setup ---
const dbPath = path_1.default.resolve(__dirname, '../florist.sqlite');
const db = new sqlite3_1.default.Database(dbPath);
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    login TEXT UNIQUE,
    password TEXT,
    name TEXT,
    completed_orders TEXT DEFAULT '[]',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
    // Добавляем тестовых флористов, если их нет
    const florists = [
        { login: 'florist1', password: 'pass1', name: 'Анна' },
        { login: 'florist2', password: 'pass2', name: 'Ирина' },
        { login: 'florist3', password: 'pass3', name: 'Мария' },
        { login: 'sonya', password: 'secret', name: 'Соня' }
    ];
    florists.forEach(f => {
        db.run('INSERT OR IGNORE INTO users (login, password, name, completed_orders) VALUES (?, ?, ?, ?)', [f.login, f.password, f.name, '[]']);
    });
});
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
// --- Пути к файлам ---
const sostavPath = path_1.default.resolve(__dirname, '../sostav.json');
const allWebhooksLog = path_1.default.resolve(__dirname, '../all_webhooks.log');
const processedWebhooksLog = path_1.default.resolve(__dirname, '../processed_webhooks.log');
// --- Вспомогательные функции ---
function logToFile(filePath, data) {
    const logEntry = `[${new Date().toISOString()}]\n${JSON.stringify(data, null, 2)}\n\n`;
    fs_1.default.appendFileSync(filePath, logEntry, 'utf8');
}
function readSostav() {
    if (!fs_1.default.existsSync(sostavPath))
        return [];
    try {
        return JSON.parse(fs_1.default.readFileSync(sostavPath, 'utf8'));
    }
    catch (_a) {
        return [];
    }
}
function writeSostav(sostav) {
    fs_1.default.writeFileSync(sostavPath, JSON.stringify(sostav, null, 2), 'utf8');
}
// API endpoint для проверки
app.get('/api/ping', (req, res) => {
    res.json({ message: 'pong' });
});
// SPA fallback для фронта (Express 5)
app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path_1.default.join(frontendDist, 'index.html'));
});
// --- Авторизация ---
app.post('/api/login', (req, res) => {
    const { login, password } = req.body;
    db.get('SELECT * FROM users WHERE login = ? AND password = ?', [login, password], (err, user) => {
        if (err)
            return res.status(500).json({ error: 'DB error' });
        if (!user)
            return res.status(401).json({ error: 'Неверный логин или пароль' });
        const token = jsonwebtoken_1.default.sign({ id: user.id, login: user.login, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, login: user.login, name: user.name } });
    });
});
// --- Middleware для проверки JWT ---
function auth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        res.status(401).json({ error: 'Нет токена' });
        return;
    }
    const token = authHeader.split(' ')[1];
    try {
        const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = payload;
        next();
    }
    catch (_a) {
        res.status(401).json({ error: 'Неверный токен' });
        return;
    }
}
// --- Получение информации о себе ---
app.get('/api/me', auth, (req, res) => {
    res.json({ user: req.user });
});
// --- Обработка вебхуков amoCRM ---
app.post('/api/amocrm/webhook', express_1.default.json(), (req, res) => {
    const body = req.body;
    logToFile(allWebhooksLog, body);
    let processed = false;
    // status webhook
    if (body.status) {
        const lead = body.status[0];
        if (lead.status_id === '44828242') {
            // Добавить/обновить сделку
            let sostav = readSostav();
            const idx = sostav.findIndex((item) => item.id === lead.id);
            if (idx >= 0) {
                sostav[idx] = lead;
            }
            else {
                sostav.push(lead);
            }
            writeSostav(sostav);
            logToFile(processedWebhooksLog, { action: 'add/update', lead });
            processed = true;
        }
        if (lead.old_status_id === '44828242') {
            // Удалить сделку
            let sostav = readSostav();
            sostav = sostav.filter((item) => item.id !== lead.id);
            writeSostav(sostav);
            logToFile(processedWebhooksLog, { action: 'remove', lead_id: lead.id });
            processed = true;
        }
    }
    // update webhook
    if (body.update) {
        const lead = body.update[0];
        if (lead.status_id === '44828242') {
            // Обновить сделку
            let sostav = readSostav();
            const idx = sostav.findIndex((item) => item.id === lead.id);
            if (idx >= 0) {
                sostav[idx] = lead;
                writeSostav(sostav);
                logToFile(processedWebhooksLog, { action: 'update', lead });
                processed = true;
            }
        }
    }
    res.status(200).send('ok');
});
// --- Получить список заказов для фронта ---
app.get('/api/orders', auth, (req, res) => {
    const sostav = readSostav();
    // Формируем только нужные поля для фронта
    const orders = sostav.map((order) => {
        var _a, _b;
        // Поиск статуса и кто взял
        let status = 'Свободен';
        let taken_by = null;
        if (order.taken_by) {
            status = order.status === 'выполнен' ? 'Выполнен' : `Взял ${order.taken_by.name}`;
            taken_by = order.taken_by;
        }
        // Дата и время (ищем в custom_fields)
        let date = '';
        let time = '';
        let address = '';
        if (order.custom_fields) {
            for (const f of order.custom_fields) {
                if (f.name === 'Дата')
                    date = f.values[0];
                if (f.name === 'Время')
                    time = ((_a = f.values[0]) === null || _a === void 0 ? void 0 : _a.value) || '';
                if (f.name === 'Адрес доставки')
                    address = ((_b = f.values[0]) === null || _b === void 0 ? void 0 : _b.value) || '';
            }
        }
        return {
            id: order.id,
            name: order.name,
            date,
            time,
            address,
            status,
            taken_by
        };
    });
    res.json({ orders });
});
// --- Взять заказ ---
app.post('/api/orders/:id/take', auth, (req, res) => {
    const sostav = readSostav();
    const orderId = req.params.id;
    const user = req.user;
    const idx = sostav.findIndex((o) => o.id == orderId);
    if (idx === -1) {
        res.status(404).json({ error: 'Заказ не найден' });
        return;
    }
    if (sostav[idx].taken_by && sostav[idx].status !== 'выполнен') {
        res.status(400).json({ error: 'Заказ уже взят другим флористом' });
        return;
    }
    sostav[idx].taken_by = { id: user.id, name: user.name };
    sostav[idx].status = 'взял';
    writeSostav(sostav);
    logToFile(processedWebhooksLog, { action: 'take', order_id: orderId, user });
    res.json({ success: true });
});
app.listen(PORT, () => {
    console.log(`Florist backend started on port ${PORT}`);
});
