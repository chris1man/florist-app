import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import sqlite3 from 'sqlite3';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import multer from 'multer';
import AWS from 'aws-sdk';

// Загрузка переменных окружения
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Отдача production-фронта
const frontendDist = path.resolve(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));

// --- SQLite setup ---
const dbPath = path.resolve(__dirname, '../florist.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    login TEXT UNIQUE,
    password TEXT,
    name TEXT,
    role TEXT DEFAULT 'florist',
    completed_orders TEXT DEFAULT '[]',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // Добавляем тестовых флористов, если их нет
  const florists = [
    { login: 'florist1', password: 'pass1', name: 'Анна', role: 'florist' },
    { login: 'florist2', password: 'pass2', name: 'Ирина', role: 'florist' },
    { login: 'florist3', password: 'pass3', name: 'Мария', role: 'florist' },
    { login: 'sonya', password: 'secret', name: 'Соня', role: 'florist' },
    { login: 'admin', password: 'admin', name: 'Админ', role: 'admin' }
  ];
  florists.forEach(f => {
    db.run(
      'INSERT OR IGNORE INTO users (login, password, name, role, completed_orders) VALUES (?, ?, ?, ?, ?)',
      [f.login, f.password, f.name, f.role, '[]']
    );
  });
});

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

// --- Типы ---
interface User {
  id: number;
  login: string;
  password: string;
  name: string;
  role: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: any;
    file?: Express.Multer.File;
  }
}

// --- Пути к файлам ---
const sostavPath = path.resolve(__dirname, '../sostav.json');
const allWebhooksLog = path.resolve(__dirname, '../all_webhooks.log');
const processedWebhooksLog = path.resolve(__dirname, '../processed_webhooks.log');

// --- Вспомогательные функции ---
function logToFile(filePath: string, data: any) {
  const logEntry = `[${new Date().toISOString()}]\n${JSON.stringify(data, null, 2)}\n\n`;
  fs.appendFileSync(filePath, logEntry, 'utf8');
}

function formatDateField(val: any) {
  // Если это timestamp (10 цифр) — преобразуем, иначе возвращаем как есть
  if (typeof val === 'string' && /^\d{10}$/.test(val)) {
    const d = new Date(parseInt(val) * 1000);
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth()+1).toString().padStart(2, '0')}`;
  }
  return val;
}

function normalizeOrderDates(order: any) {
  if (!order.custom_fields) return order;
  order.custom_fields = order.custom_fields.map((f: any) => {
    if (f.name && f.name.toLowerCase().includes('дата')) {
      if (Array.isArray(f.values)) {
        f.values = f.values.map((v: any) => {
          if (typeof v === 'object' && v !== null && 'value' in v) {
            return { ...v, value: formatDateField(v.value) };
          } else {
            return formatDateField(v);
          }
        });
      } else if (typeof f.values === 'object' && f.values !== null && 'value' in f.values) {
        f.values.value = formatDateField(f.values.value);
      } else {
        f.values = formatDateField(f.values);
      }
    }
    return f;
  });
  return order;
}

function readSostav(): any[] {
  if (!fs.existsSync(sostavPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(sostavPath, 'utf8'));
  } catch {
    return [];
  }
}

function writeSostav(sostav: any[]) {
  fs.writeFileSync(sostavPath, JSON.stringify(sostav, null, 2), 'utf8');
}

// --- HTTP + WebSocket сервер ---
const server = http.createServer(app);
const wss = new WebSocketServer({ port: 3001 });
console.log('WebSocket server started on port 3001');

function broadcastOrdersUpdate() {
  wss.clients.forEach((client: WebSocket) => {
    if (client.readyState === 1) {
      client.send(JSON.stringify({ type: 'orders_updated' }));
    }
  });
}

// --- Расширяем тип WebSocket для isAlive ---
interface ExtWebSocket extends WebSocket {
  isAlive?: boolean;
}

// --- WebSocket ping/pong для стабильности ---
wss.on('connection', (ws: ExtWebSocket) => {
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });
});
setInterval(() => {
  wss.clients.forEach((ws: WebSocket) => {
    const extWs = ws as ExtWebSocket;
    if (extWs.isAlive === false) return extWs.terminate();
    extWs.isAlive = false;
    extWs.ping();
  });
}, 30000);

// API endpoint для проверки
app.get('/api/ping', (req, res) => {
  res.json({ message: 'pong' });
});

// --- Авторизация ---
app.post('/api/login', (req: Request, res: Response) => {
  const { login, password } = req.body;
  db.get<User>('SELECT * FROM users WHERE login = ? AND password = ?', [login, password], (err, user) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    if (!user) return res.status(401).json({ error: 'Неверный логин или пароль' });
    const token = jwt.sign({ id: user.id, login: user.login, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, login: user.login, name: user.name, role: user.role } });
  });
});

// --- Middleware для проверки JWT ---
function auth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: 'Нет токена' });
    return;
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Неверный токен' });
    return;
  }
}

// --- Получение информации о себе ---
app.get('/api/me', auth, (req, res) => {
  res.json({ user: req.user });
});

// --- Обработка вебхуков amoCRM ---
app.post('/api/amocrm/webhook', express.json(), (req, res) => {
  const body = req.body;
  logToFile(allWebhooksLog, body);
  let processed = false;

  // status webhook
  if (body.status) {
    const lead = normalizeOrderDates(body.status[0]);
    if (lead.status_id === '44828242') {
      // Добавить/обновить сделку
      let sostav = readSostav();
      const idx = sostav.findIndex((item: any) => item.id === lead.id);
      if (idx >= 0) {
        sostav[idx] = lead;
      } else {
        sostav.push(lead);
      }
      writeSostav(sostav);
      logToFile(processedWebhooksLog, { action: 'add/update', lead });
      processed = true;
    }
    if (lead.old_status_id === '44828242') {
      // Удалить сделку
      let sostav = readSostav();
      sostav = sostav.filter((item: any) => item.id !== lead.id);
      writeSostav(sostav);
      logToFile(processedWebhooksLog, { action: 'remove', lead_id: lead.id });
      processed = true;
    }
  }

  // update webhook
  if (body.update) {
    const lead = normalizeOrderDates(body.update[0]);
    if (lead.status_id === '44828242') {
      // Обновить сделку
      let sostav = readSostav();
      const idx = sostav.findIndex((item: any) => item.id === lead.id);
      if (idx >= 0) {
        sostav[idx] = lead;
        writeSostav(sostav);
        logToFile(processedWebhooksLog, { action: 'update', lead });
        processed = true;
      }
    }
  }

  if (processed) {
    broadcastOrdersUpdate();
  }
  res.status(200).send('ok');
});

// --- Получить список заказов для фронта ---
app.get('/api/orders', auth, (req, res) => {
  const sostav = readSostav();
  // Формируем только нужные поля для фронта
  const orders = sostav.map((order: any) => {
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
        if (f.name === 'Дата') date = f.values[0];
        if (f.name === 'Время') time = f.values[0]?.value || '';
        if (f.name === 'Адрес доставки') address = f.values[0]?.value || '';
      }
    }
    // --- Новые поля ---
    if (!order.photos) order.photos = [];
    if (!order.photo_status) order.photo_status = '';
    return {
      id: order.id,
      name: order.name,
      date,
      time,
      address,
      status,
      taken_by,
      photos: order.photos,
      photo_status: order.photo_status
    };
  });
  res.json({ orders });
});

// --- Взять заказ ---
app.post('/api/orders/:id/take', auth, (req, res) => {
  const sostav = readSostav();
  const orderId = req.params.id;
  const user = req.user;
  const idx = sostav.findIndex((o: any) => o.id == orderId);
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
  broadcastOrdersUpdate();
  res.json({ success: true });
});

// --- Получить заказ по id ---
app.get('/api/orders/:id', auth, (req: Request, res: Response) => {
  const id = req.params.id;
  const sostav = readSostav();
  const order = sostav.find((item: any) => String(item.id) === String(id));
  if (!order) {
    res.status(404).json({ error: 'Заказ не найден' });
    return;
  }
  res.json({ order });
});

// --- Освободить заказ ---
app.post('/api/orders/:id/release', auth, (req, res) => {
  const sostav = readSostav();
  const orderId = req.params.id;
  const idx = sostav.findIndex((o: any) => String(o.id) === String(orderId));
  if (idx === -1) {
    res.status(404).json({ error: 'Заказ не найден' });
    return;
  }
  sostav[idx].taken_by = null;
  sostav[idx].status = undefined;
  writeSostav(sostav);
  logToFile(processedWebhooksLog, { action: 'release', order_id: orderId });
  broadcastOrdersUpdate();
  res.json({ success: true });
});

// --- Получить id активного заказа для текущего пользователя ---
app.get('/api/my-active-order', auth, (req, res) => {
  const sostav = readSostav();
  const userId = req.user?.id;
  const activeOrder = sostav.find((order: any) => order.taken_by && order.taken_by.id === userId && order.status !== 'выполнен');
  res.json({ orderId: activeOrder ? activeOrder.id : null });
});

// Настройка AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
  endpoint: process.env.AWS_S3_ENDPOINT,
  s3ForcePathStyle: true
});
const S3_BUCKET = process.env.AWS_S3_BUCKET;

// Multer для загрузки файлов
const upload = multer({ storage: multer.memoryStorage() });

// Эндпоинт для загрузки фото
app.post('/api/orders/:id/photo', auth, upload.single('photo'), async (req: Request, res: Response): Promise<void> => {
  const orderId = req.params.id;
  const sostav = readSostav();
  const idx = sostav.findIndex((o: any) => String(o.id) === String(orderId));
  if (idx === -1) {
    res.status(404).json({ error: 'Заказ не найден' });
    return;
  }
  if (!req.file) {
    res.status(400).json({ error: 'Файл не загружен' });
    return;
  }
  const fileName = `${orderId}/${Date.now()}-${req.file.originalname}`;
  try {
    const uploadResult = await s3.upload({
      Bucket: S3_BUCKET!,
      Key: fileName,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      ACL: 'public-read'
    }).promise();
    if (!sostav[idx].photos) sostav[idx].photos = [];
    sostav[idx].photos.push({
      url: uploadResult.Location,
      uploadedBy: req.user.name,
      userId: req.user.id,
      date: new Date().toISOString()
    });
    if (req.user.role === 'admin') {
      sostav[idx].photo_status = 'uploaded_admin';
    } else {
      sostav[idx].photo_status = 'uploaded_florist';
    }
    writeSostav(sostav);
    broadcastOrdersUpdate();
    res.json({ success: true, photoUrl: uploadResult.Location, order: sostav[idx] });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки в S3', details: err });
  }
});

// Эндпоинт для удаления фото
app.delete('/api/orders/:id/photo', auth, async (req: Request, res: Response): Promise<void> => {
  const orderId = req.params.id;
  const { url } = req.body;
  if (!url) {
    res.status(400).json({ error: 'Не передан url фото' });
    return;
  }
  const sostav = readSostav();
  const idx = sostav.findIndex((o: any) => String(o.id) === String(orderId));
  if (idx === -1) {
    res.status(404).json({ error: 'Заказ не найден' });
    return;
  }
  const order = sostav[idx];
  if (!order.photos) order.photos = [];
  const photoIdx = order.photos.findIndex((p: any) => p.url === url);
  if (photoIdx === -1) {
    res.status(404).json({ error: 'Фото не найдено' });
    return;
  }
  // Удаляем фото из массива
  const [removedPhoto] = order.photos.splice(photoIdx, 1);
  // Удаляем файл из S3
  try {
    // Извлекаем путь внутри бакета
    const urlObj = new URL(url);
    const key = urlObj.pathname.replace(/^\//, '');
    await s3.deleteObject({ Bucket: S3_BUCKET!, Key: key }).promise();
  } catch (err) {
    // Не критично, если не удалось удалить из S3
    console.error('Ошибка удаления из S3:', err);
  }
  // Если не осталось фото — сбрасываем статус
  if (!order.photos.length) {
    order.photo_status = '';
  }
  writeSostav(sostav);
  broadcastOrdersUpdate();
  res.json({ success: true, order });
});

// --- Запуск сервера ---
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

// SPA fallback для фронта (Express 5) — теперь в самом конце!
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// Логируем обычные HTTP GET на /ws
app.get('/ws', (req, res) => {
  console.log('HTTP GET /ws');
  res.status(400).send('Not a WebSocket');
});

// В самом конце файла:
fs.watchFile(sostavPath, { interval: 1000 }, (curr, prev) => {
  if (curr.mtime !== prev.mtime) {
    broadcastOrdersUpdate();
  }
}); 