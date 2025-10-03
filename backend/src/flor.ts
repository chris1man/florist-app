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
import axios from 'axios';
import { WebhookQueue, webhookQueue } from './webhookQueue';

// Загрузка переменных окружения
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Отдача production-фронта
const frontendDist = path.resolve(__dirname, '../public');
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
    amocrm_id TEXT,
    completed_orders TEXT DEFAULT '[]',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // Новая таблица для хранения всех присвоенных ID заказов
  db.run(`CREATE TABLE IF NOT EXISTS order_ids (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL UNIQUE,
    amocrm_lead_id TEXT NOT NULL,
    deal_name TEXT,
    delivery_address TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
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
const adminPhotoPath = path.resolve(__dirname, '../admin-photo.json');
const allWebhooksLog = path.resolve(__dirname, '../../logs/webhooks/all_webhooks.log');
const processedWebhooksLog = path.resolve(__dirname, '../../logs/webhooks/processed_webhooks.log');
const uploadErrorsLog = path.resolve(__dirname, '../../logs/app/upload_errors.log');

// --- Перестраховочные файлы для ID ---
const orderIdsBackupPath = path.resolve(__dirname, '../order_ids_backup.json');
const orderIdsLockPath = path.resolve(__dirname, '../order_ids.lock');
const idAssignmentLogPath = path.resolve(__dirname, '../../logs/app/id_assignments.log');

// --- Создание необходимых директорий для логов ---
function ensureLogDirectories() {
  const dirs = [
    path.dirname(idAssignmentLogPath),
    path.dirname(orderIdsBackupPath)
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

// Создаем директории при запуске
ensureLogDirectories();

// --- Вспомогательные функции ---
function logToFile(filePath: string, data: any) {
  let serialized: string | undefined;
  try {
    serialized = JSON.stringify(data, null, 2);
  } catch {
    serialized = String(data);
  }
  if (serialized === undefined) serialized = 'undefined';
  const logEntry = `[${new Date().toISOString()}]\n${serialized}\n\n`;
  fs.appendFileSync(filePath, logEntry, 'utf8');
}


// === ПЕРЕСТРАХОВОЧНЫЕ МЕХАНИЗМЫ ===

// Файловая блокировка для предотвращения конфликтов
function acquireIdLock(timeout = 5000): boolean {
  const lockFile = path.join(__dirname, '..', 'id_assignment.lock');
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      // Пытаемся создать lock файл
      fs.writeFileSync(lockFile, process.pid.toString(), { flag: 'wx' });
      return true;
    } catch (error) {
      // Файл уже существует, ждем немного
      const sleepTime = Math.random() * 100 + 50; // 50-150ms
      const endTime = Date.now() + sleepTime;
      while (Date.now() < endTime) {
        // Активное ожидание
      }
    }
  }
  
  console.error('Не удалось получить блокировку для присваивания ID');
  return false;
}

// Освобождение блокировки
function releaseIdLock(): void {
  const lockFile = path.join(__dirname, '..', 'id_assignment.lock');
  try {
    fs.unlinkSync(lockFile);
  } catch (error) {
    // Игнорируем ошибки при удалении lock файла
  }
}

// Резервное копирование в отдельный файл
function backupOrderId(orderId: string, amocrmLeadId: string, dealName: string): void {
  const backupFile = path.join(__dirname, '..', 'order_ids_backup.json');
  
  try {
    let backupData = [];
    
    // Читаем существующие данные
    if (fs.existsSync(backupFile)) {
      const content = fs.readFileSync(backupFile, 'utf-8');
      if (content.trim()) {
        backupData = JSON.parse(content);
      }
    }
    
    // Добавляем новую запись
    backupData.push({
      order_id: orderId,
      amocrm_lead_id: amocrmLeadId,
      deal_name: dealName,
      backup_timestamp: new Date().toISOString(),
      tomsk_timestamp: getTomskDate().toISOString(),
      process_pid: process.pid
    });
    
    // Сохраняем
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    
    console.log(`✅ Резервная копия order_id ${orderId} сохранена`);
  } catch (error) {
    console.error('❌ Ошибка при создании резервной копии:', error);
  }
}

// Проверка уникальности ID в базе и резервной копии
function verifyIdUniqueness(orderId: string, dayLetter: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      // Проверяем в базе данных
      db.get(
        'SELECT COUNT(*) as count FROM order_ids WHERE order_id = ?',
        [orderId],
        (err, row: any) => {
          if (err) {
            console.error('❌ Ошибка при проверке уникальности в БД:', err);
            resolve(false);
            return;
          }
          
          if (row.count > 0) {
            console.error(`❌ ID ${orderId} уже существует в базе данных!`);
            resolve(false);
            return;
          }
          
          // Проверяем в резервной копии
          const backupFile = path.join(__dirname, '..', 'order_ids_backup.json');
          if (fs.existsSync(backupFile)) {
            try {
              const content = fs.readFileSync(backupFile, 'utf-8');
              if (content.trim()) {
                const backupData = JSON.parse(content);
                const duplicateInBackup = backupData.find((item: any) => item.order_id === orderId);
                
                if (duplicateInBackup) {
                  console.error(`❌ ID ${orderId} уже существует в резервной копии!`);
                  resolve(false);
                  return;
                }
              }
            } catch (backupError) {
              console.error('❌ Ошибка при чтении резервной копии:', backupError);
            }
          }
          
          console.log(`✅ ID ${orderId} уникален`);
          resolve(true);
        }
      );
    } catch (error) {
      console.error('❌ Ошибка при проверке уникальности ID:', error);
      resolve(false);
    }
  });
}

// Подробное логирование операций присваивания ID
function logIdAssignment(orderId: string, amocrmLeadId: string, dealName: string, existingIds: number[], dayLetter: string): void {
  const logDir = path.join(__dirname, '..', 'logs');
  
  // Создаем папку для логов если её нет
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  const logFile = path.join(logDir, `id_assignments_${getTomskDate().toISOString().split('T')[0]}.log`);
  
  const logEntry = {
    timestamp: getTomskDate().toISOString(),
    operation: 'ID_ASSIGNMENT',
    success: true,
    data: {
      order_id: orderId,
      amocrm_lead_id: amocrmLeadId,
      deal_name: dealName,
      day_letter: dayLetter,
      existing_ids_today: existingIds,
      next_available_number: parseInt(orderId.substring(1)),
      total_orders_today: existingIds.length + 1
    },
    process_pid: process.pid,
    security_checks: {
      file_lock_acquired: true,
      uniqueness_verified: true,
      backup_created: true,
      database_saved: true
    }
  };
  
  try {
    const logLine = JSON.stringify(logEntry) + '\n';
    fs.appendFileSync(logFile, logLine);
    console.log(`📝 Детальный лог записан: ${orderId}`);
  } catch (error) {
    console.error('❌ Ошибка при записи в лог:', error);
  }
}

function saveOrderId(orderId: string, amocrmLeadId: string, dealName: string, deliveryAddress: string): Promise<boolean> {
  return new Promise(async (resolve) => {
    // 1. Получаем блокировку
    if (!acquireIdLock()) {
      logToFile(processedWebhooksLog, { 
        action: 'save_order_id_lock_failed', 
        order_id: orderId, 
        amocrm_lead_id: amocrmLeadId
      });
      resolve(false);
      return;
    }
    
    try {
      // 2. Проверяем уникальность
      const dayLetter = orderId.charAt(0);
      const isUnique = await verifyIdUniqueness(orderId, dayLetter);
      
      if (!isUnique) {
        releaseIdLock();
        logToFile(processedWebhooksLog, { 
          action: 'save_order_id_not_unique', 
          order_id: orderId, 
          amocrm_lead_id: amocrmLeadId
        });
        resolve(false);
        return;
      }
      
      // 3. Сохраняем в бэкап
      backupOrderId(orderId, amocrmLeadId, dealName);
      
      // 4. Сохраняем в базу данных
      const now = new Date();
      const tomskTimeString = now.toLocaleString('en-CA', { 
        timeZone: 'Asia/Tomsk',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      const [datePart, timePart] = tomskTimeString.split(', ');
      const timestamp = `${datePart}T${timePart}`;
      
      db.run(
        'INSERT OR IGNORE INTO order_ids (order_id, amocrm_lead_id, deal_name, delivery_address, created_at) VALUES (?, ?, ?, ?, ?)',
        [orderId, amocrmLeadId, dealName, deliveryAddress, timestamp],
        function(err) {
          releaseIdLock();
          
          if (err) {
            logToFile(processedWebhooksLog, { 
              action: 'save_order_id_db_error', 
              order_id: orderId, 
              amocrm_lead_id: amocrmLeadId,
              error: err.message 
            });
            resolve(false);
          } else if (this.changes === 0) {
            // Запись уже существует (конфликт)
            logToFile(processedWebhooksLog, { 
              action: 'save_order_id_conflict', 
              order_id: orderId, 
              amocrm_lead_id: amocrmLeadId
            });
            resolve(false);
          } else {
            // 5. Детальное логирование успешного присвоения
            getTodayOrderIds(dayLetter).then(existingIds => {
              logIdAssignment(orderId, amocrmLeadId, dealName, existingIds, dayLetter);
            });
            
            logToFile(processedWebhooksLog, { 
              action: 'save_order_id_success', 
              order_id: orderId, 
              amocrm_lead_id: amocrmLeadId,
              deal_name: dealName,
              tomsk_time: timestamp,
              backup_created: true,
              uniqueness_verified: true
            });
            resolve(true);
          }
        }
      );
      
    } catch (error) {
      releaseIdLock();
      logToFile(processedWebhooksLog, { 
        action: 'save_order_id_exception', 
        order_id: orderId, 
        amocrm_lead_id: amocrmLeadId,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      resolve(false);
    }
  });
}

function checkOrderIdExists(amocrmLeadId: string): Promise<string | null> {
  return new Promise((resolve) => {
    db.get(
      'SELECT order_id FROM order_ids WHERE amocrm_lead_id = ?',
      [amocrmLeadId],
      (err, row: any) => {
        if (err) {
          logToFile(processedWebhooksLog, { 
            action: 'check_order_id_error', 
            amocrm_lead_id: amocrmLeadId,
            error: err.message 
          });
          resolve(null);
        } else {
          resolve(row ? row.order_id : null);
        }
      }
    );
  });
}

function getTodayOrderIds(dayLetter: string): Promise<number[]> {
  return new Promise((resolve) => {
    db.all(
      'SELECT order_id FROM order_ids WHERE order_id LIKE ? ORDER BY order_id',
      [`${dayLetter}%`],
      (err, rows: any[]) => {
        if (err) {
          logToFile(processedWebhooksLog, { 
            action: 'get_today_order_ids_error', 
            day_letter: dayLetter,
            error: err.message 
          });
          resolve([]);
        } else {
          const ids = rows
            .map(row => {
              const numberPart = row.order_id.substring(1);
              return parseInt(numberPart, 10) || 0;
            })
            .filter(num => num > 0)
            .sort((a, b) => a - b);
          resolve(ids);
        }
      }
    );
  });
}

function formatDateField(val: any) {
  // Если это timestamp (10 цифр) — преобразуем в DD.MM с учетом Томского пояса (+7), иначе возвращаем как есть
  if (typeof val === 'string' && /^\d{10}$/.test(val)) {
    const utcDate = new Date(parseInt(val) * 1000);
    const tomskDateString = utcDate.toLocaleDateString('ru-RU', {
      timeZone: 'Asia/Tomsk',
      day: '2-digit',
      month: '2-digit'
    });
    return tomskDateString;
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

// --- Генерация уникальных ID заказов ---
function getTomskDate(): Date {
  // Создаем объект Date с правильным Томским временем
  const now = new Date();
  // Получаем Томское время в виде строки
  const tomskTimeString = now.toLocaleString('en-CA', { 
    timeZone: 'Asia/Tomsk',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  // Создаем Date объект из строки в формате YYYY-MM-DD HH:MM:SS
  const [datePart, timePart] = tomskTimeString.split(', ');
  const tomskTime = new Date(`${datePart}T${timePart}`);
  return tomskTime;
}

function getDayLetter(date?: Date): string {
  // Если дата не передана, используем текущее время Томска
  const targetDate = date || getTomskDate();
  const dayOfWeek = targetDate.getDay();
  // 0=воскресенье, 1=понедельник, 2=вторник, 3=среда, 4=четверг, 5=пятница, 6=суббота
  const letters = ['G', 'A', 'B', 'C', 'D', 'E', 'F']; // G=воскресенье, A=понедельник, B=вторник, и т.д.
  return letters[dayOfWeek];
}

async function generateOrderId(date?: Date): Promise<string> {
  // Используем Томское время для определения дня
  const tomskDate = date || getTomskDate();
  const dayLetter = getDayLetter(tomskDate);
  
  // Получаем все ID за сегодняшний день из SQLite
  const todayIds = await getTodayOrderIds(dayLetter);
  
  // Находим следующий доступный номер
  let nextNumber = 1;
  for (const num of todayIds) {
    if (num === nextNumber) {
      nextNumber++;
    } else {
      break;
    }
  }
  
  // Форматируем номер с ведущими нулями
  const formattedNumber = nextNumber.toString().padStart(3, '0');
  
  // Логируем для отладки
  logToFile(processedWebhooksLog, {
    action: 'generate_order_id',
    tomsk_date: tomskDate.toISOString(),
    day_of_week: tomskDate.getDay(),
    day_letter: dayLetter,
    generated_id: `${dayLetter}${formattedNumber}`,
    existing_ids_today: todayIds
  });
  
  return `${dayLetter}${formattedNumber}`;
}

function hasOrderId(order: any): boolean {
  if (!order.custom_fields) return false;
  const idField = order.custom_fields.find((f: any) => f.name === '№ID');
  return !!(idField?.values?.[0]?.value);
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

function readAdminPhoto() {
  if (!fs.existsSync(adminPhotoPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(adminPhotoPath, 'utf8'));
  } catch {
    return [];
  }
}

function writeAdminPhoto(photoRequests: any[]) {
  fs.writeFileSync(adminPhotoPath, JSON.stringify(photoRequests, null, 2), 'utf8');
}

function addToAdminPhoto(order: any) {
  const photoRequests = readAdminPhoto();
  // Проверяем, что заказ еще не добавлен
  const exists = photoRequests.find((item: any) => item.id === order.id);
  if (!exists) {
    photoRequests.push(order);
    writeAdminPhoto(photoRequests);
    logToFile(processedWebhooksLog, { 
      action: 'add_to_admin_photo', 
      order_id: order.id 
    });
  }
}

function removeFromAdminPhoto(orderId: any) {
  let photoRequests = readAdminPhoto();
  const initialLength = photoRequests.length;
  photoRequests = photoRequests.filter((item: any) => String(item.id) !== String(orderId));
  
  if (photoRequests.length !== initialLength) {
    writeAdminPhoto(photoRequests);
    logToFile(processedWebhooksLog, { 
      action: 'remove_from_admin_photo', 
      order_id: orderId 
    });
  }
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

// --- Эндпоинт для мониторинга очереди вебхуков ---
app.get('/api/webhook-queue/stats', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    queue: webhookQueue.getStats()
  });
});

// --- Авторизация ---
app.post('/api/login', (req: Request, res: Response) => {
  const { login, password } = req.body;
  console.log('Login attempt:', { login, password, timestamp: new Date().toISOString() });
  logToFile(processedWebhooksLog, { action: 'login_attempt', login, password, timestamp: new Date().toISOString() });
  
  db.get<User>('SELECT * FROM users WHERE login = ? AND password = ?', [login, password], (err, user) => {
    if (err) {
      console.error('DB error:', err);
      logToFile(processedWebhooksLog, { action: 'login_db_error', error: err.message });
      return res.status(500).json({ error: 'DB error' });
    }
    if (!user) {
      console.log('User not found:', { login, password });
      logToFile(processedWebhooksLog, { action: 'login_failed', login, password });
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }
    console.log('Login successful:', { id: user.id, login: user.login, name: user.name, role: user.role });
    logToFile(processedWebhooksLog, { action: 'login_success', user: { id: user.id, login: user.login, name: user.name, role: user.role } });
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

// --- Функция обработки вебхуков (для очереди) ---
async function processWebhookData(body: any): Promise<void> {
  const contentType = 'application/json';
  logToFile(allWebhooksLog, { method: 'POST', contentType, body });
  let processed = false;

  // amoCRM может присылать { status/update } или { leads: { status/update } }
  const leadsContainer: any = body && typeof body === 'object' && body.leads && typeof body.leads === 'object'
    ? body.leads
    : body;

  // status webhook
  if (leadsContainer && Array.isArray(leadsContainer.status) && leadsContainer.status.length > 0) {
    const lead = normalizeOrderDates(leadsContainer.status[0]);
    if (lead.status_id === '44828242') {
      let sostav = readSostav();
      const idx = sostav.findIndex((item: any) => item.id === lead.id);

      // Проверяем, есть ли уже ID у заказа в базе
      const existingOrderId = await checkOrderIdExists(lead.id);

      if (!existingOrderId && !hasOrderId(lead)) {
        // Генерируем новый ID с учетом Томского времени
        const newOrderId = await generateOrderId();

        // Извлекаем данные для базы
        let deliveryAddress = '';
        if (lead.custom_fields) {
          const addressField = lead.custom_fields.find((f: any) => f.name === 'Адрес доставки');
          deliveryAddress = addressField?.values?.[0]?.value || '';
        }

        // Сохраняем в базу
        const saved = await saveOrderId(newOrderId, lead.id, lead.name || '', deliveryAddress);

        if (saved) {
          // Добавляем ID в custom_fields
          if (!lead.custom_fields) lead.custom_fields = [];
          const idFieldIdx = lead.custom_fields.findIndex((f: any) => f.name === '№ID');

          if (idFieldIdx >= 0) {
            // Обновляем существующее поле
            lead.custom_fields[idFieldIdx].values = [{ value: newOrderId }];
          } else {
            // Добавляем новое поле
            lead.custom_fields.push({
              id: '1055575',
              name: '№ID',
              values: [{ value: newOrderId }]
            });
          }

          // Отправляем ID в amoCRM
          try {
            const updateResult = await updateAmoLeadOrderId(lead.id, newOrderId);
            if (updateResult.success) {
              logToFile(processedWebhooksLog, {
                action: 'assign_order_id',
                lead_id: lead.id,
                order_id: newOrderId
              });
            } else {
              logToFile(processedWebhooksLog, {
                action: 'assign_order_id_failed',
                lead_id: lead.id,
                order_id: newOrderId,
                error: updateResult.error
              });
            }
          } catch (error) {
            logToFile(processedWebhooksLog, {
              action: 'assign_order_id_error',
              lead_id: lead.id,
              order_id: newOrderId,
              error: error
            });
          }
        }
      } else if (existingOrderId) {
        // Если ID уже есть в базе, обновляем lead
        if (!lead.custom_fields) lead.custom_fields = [];
        const idFieldIdx = lead.custom_fields.findIndex((f: any) => f.name === '№ID');

        if (idFieldIdx >= 0) {
          lead.custom_fields[idFieldIdx].values = [{ value: existingOrderId }];
        } else {
          lead.custom_fields.push({
            id: '1055575',
            name: '№ID',
            values: [{ value: existingOrderId }]
          });
        }

        logToFile(processedWebhooksLog, {
          action: 'reuse_existing_order_id',
          lead_id: lead.id,
          order_id: existingOrderId
        });
      }

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
      let sostav = readSostav();
      const orderToRemove = sostav.find((item: any) => item.id === lead.id);

      // Удаляем заказ из основного списка
      sostav = sostav.filter((item: any) => item.id !== lead.id);
      writeSostav(sostav);

      // НЕ удаляем заказ из admin-photo.json если он там есть со статусом send_to_admin
      // Заказы удаляются из admin-photo.json только когда админ загружает фото

      logToFile(processedWebhooksLog, { action: 'remove', lead_id: lead.id });
      processed = true;
    }
  }

  // update webhook
  if (leadsContainer && Array.isArray(leadsContainer.update) && leadsContainer.update.length > 0) {
    const lead = normalizeOrderDates(leadsContainer.update[0]);
    if (lead.status_id === '44828242') {
      let sostav = readSostav();
      const idx = sostav.findIndex((item: any) => item.id === lead.id);
      if (idx >= 0) {
        // Проверяем, есть ли уже ID у заказа в базе
        const existingOrderId = await checkOrderIdExists(lead.id);

        if (!existingOrderId && !hasOrderId(lead)) {
          // Генерируем новый ID с учетом Томского времени
          const newOrderId = await generateOrderId();

          // Извлекаем данные для базы
          let deliveryAddress = '';
          if (lead.custom_fields) {
            const addressField = lead.custom_fields.find((f: any) => f.name === 'Адрес доставки');
            deliveryAddress = addressField?.values?.[0]?.value || '';
          }

          // Сохраняем в базу
          const saved = await saveOrderId(newOrderId, lead.id, lead.name || '', deliveryAddress);

          if (saved) {
            // Добавляем ID в custom_fields
            if (!lead.custom_fields) lead.custom_fields = [];
            const idFieldIdx = lead.custom_fields.findIndex((f: any) => f.name === '№ID');

            if (idFieldIdx >= 0) {
              // Обновляем существующее поле
              lead.custom_fields[idFieldIdx].values = [{ value: newOrderId }];
            } else {
              // Добавляем новое поле
              lead.custom_fields.push({
                id: '1055575',
                name: '№ID',
                values: [{ value: newOrderId }]
              });
            }

            // Отправляем ID в amoCRM
            try {
              const updateResult = await updateAmoLeadOrderId(lead.id, newOrderId);
              if (updateResult.success) {
                logToFile(processedWebhooksLog, {
                  action: 'assign_order_id_update',
                  lead_id: lead.id,
                  order_id: newOrderId
                });
              } else {
                logToFile(processedWebhooksLog, {
                  action: 'assign_order_id_update_failed',
                  lead_id: lead.id,
                  order_id: newOrderId,
                  error: updateResult.error
                });
              }
            } catch (error) {
              logToFile(processedWebhooksLog, {
                action: 'assign_order_id_update_error',
                lead_id: lead.id,
                order_id: newOrderId,
                error: error
              });
            }
          }
        } else if (existingOrderId) {
          // Если ID уже есть в базе, обновляем lead
          if (!lead.custom_fields) lead.custom_fields = [];
          const idFieldIdx = lead.custom_fields.findIndex((f: any) => f.name === '№ID');

          if (idFieldIdx >= 0) {
            lead.custom_fields[idFieldIdx].values = [{ value: existingOrderId }];
          } else {
            lead.custom_fields.push({
              id: '1055575',
              name: '№ID',
              values: [{ value: existingOrderId }]
            });
          }

          logToFile(processedWebhooksLog, {
            action: 'reuse_existing_order_id_update',
            lead_id: lead.id,
            order_id: existingOrderId
          });
        }

        sostav[idx] = lead;
        writeSostav(sostav);
        logToFile(processedWebhooksLog, { action: 'update', lead });
        processed = true;
      }
    }
  }

  if (processed) {
    broadcastOrdersUpdate();
  } else {
    logToFile(processedWebhooksLog, { action: 'noop', reason: 'unrecognized_payload' });
  }
}

// --- Обработка вебхуков amoCRM ---
app.post('/api/amocrm/webhook', async (req, res) => {
  try {
    // Добавляем вебхук в очередь асинхронно
    const webhookId = await webhookQueue.add(req.body);

    // Немедленный ответ amoCRM (не ждем обработки)
    res.status(200).json({
      status: 'queued',
      webhook_id: webhookId,
      queue_size: webhookQueue.getStats().queueSize,
      message: 'Вебхук добавлен в очередь обработки'
    });

  } catch (error: any) {
    logToFile(processedWebhooksLog, {
      action: 'webhook_queue_add_error',
      error: error.message,
      body: req.body
    });

    res.status(500).json({
      error: 'Не удалось добавить вебхук в очередь',
      details: error.message
    });
  }
});

// --- Получить список заказов для фронта ---
app.get('/api/orders', auth, (req, res) => {
  const sostav = readSostav();
  const filterType = req.query.filter; // 'photo_requests' для заявок на фото
  
  let filteredSostav = sostav;
  
  // Фильтрация для админа
  if (req.user.role === 'admin' && filterType === 'photo_requests') {
    // Для заявок на фото читаем из admin-photo.json
    filteredSostav = readAdminPhoto();
  } else if (req.user.role === 'admin' && filterType === 'regular') {
    filteredSostav = sostav.filter((order: any) => order.photo_status !== 'send_to_admin');
  } else if (req.user.role === 'florist') {
    // Для флористов скрываем заказы отправленные админу
    filteredSostav = sostav.filter((order: any) => order.photo_status !== 'send_to_admin');
  }
  
  // Формируем только нужные поля для фронта
  const orders = filteredSostav.map((order: any) => {
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
    let orderId = '';
    if (order.custom_fields) {
      for (const f of order.custom_fields) {
        if (f.name === 'Дата') date = f.values[0];
        if (f.name === 'Время') time = f.values[0]?.value || '';
        if (f.name === 'Адрес доставки') address = f.values[0]?.value || '';
        if (f.name === '№ID') orderId = f.values[0]?.value || '';
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
      photo_status: order.photo_status,
      orderId: orderId  // Добавляем №ID
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

// --- Завершить заказ ---
app.post('/api/orders/:id/complete', auth, (req: Request, res: Response) => {
  const sostav = readSostav();
  const orderId = req.params.id;
  const idx = sostav.findIndex((o: any) => String(o.id) === String(orderId));
  if (idx === -1) {
    res.status(404).json({ error: 'Заказ не найден' });
    return;
  }
  sostav[idx].status = 'выполнен';
  writeSostav(sostav);
  logToFile(processedWebhooksLog, { action: 'complete', order_id: orderId, user: req.user });
  broadcastOrdersUpdate();
  res.json({ success: true, order: sostav[idx] });
});

// --- Получить id активного заказа для текущего пользователя ---
app.get('/api/my-active-order', auth, (req, res) => {
  const sostav = readSostav();
  const userId = req.user && req.user.id;
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
function isS3Configured(): boolean {
  return Boolean(
    S3_BUCKET &&
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    (process.env.AWS_REGION || process.env.AWS_S3_ENDPOINT)
  );
}

// Multer для загрузки файлов
const upload = multer({ storage: multer.memoryStorage() });

// Эндпоинт для загрузки фото
app.post('/api/orders/:id/photo', auth, upload.single('photo'), async (req: Request, res: Response): Promise<void> => {
  const orderId = req.params.id;
  let sostav = readSostav();
  let idx = sostav.findIndex((o: any) => String(o.id) === String(orderId));
  let isFromAdminPhoto = false;
  
  // Если заказ не найден в sostav.json, ищем в admin-photo.json
  if (idx === -1) {
    sostav = readAdminPhoto();
    idx = sostav.findIndex((o: any) => String(o.id) === String(orderId));
    isFromAdminPhoto = true;
  }
  
  if (idx === -1) {
    res.status(404).json({ error: 'Заказ не найден' });
    return;
  }
  if (!req.file) {
    res.status(400).json({ error: 'Файл не загружен' });
    return;
  }
  if (!isS3Configured()) {
    res.status(500).json({ error: 'Хранилище S3 не настроено. Проверьте переменные окружения AWS_* и AWS_S3_BUCKET.' });
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
      const wasPhotoRequest = sostav[idx].photo_status === 'send_to_admin';
      sostav[idx].photo_status = 'uploaded_admin';
      
      // Если это была заявка на фото из admin-photo.json, обновляем только admin-photo.json
      if (isFromAdminPhoto && wasPhotoRequest) {
        writeAdminPhoto(sostav);
        // После загрузки фото удаляем заказ из admin-photo.json
        removeFromAdminPhoto(orderId);
      } else {
        // Если заказ из обычного списка, обновляем sostav.json
        writeSostav(sostav);
      }
      try {
        const result = await updateAmoLeadPhoto(orderId, uploadResult.Location, false); // Всегда false!
        
        if (result.success) {
          const action = wasPhotoRequest ? 'admin_photo_for_request' : 'admin_photo_direct';
          console.log(`Заказ ${orderId}: фото обновлено админом без смены статуса`);
          logToFile(processedWebhooksLog, { 
            action, 
            order_id: orderId, 
            user: req.user,
            photoUrl: uploadResult.Location,
            wasPhotoRequest,
            statusChangeSkipped: true,
            removedFromAdminPhoto: wasPhotoRequest
          });
        } else {
          console.error(`Ошибка обновления фото заказа ${orderId} в amoCRM (админ):`, result.error);
        }
      } catch (err) {
        console.error(`Ошибка при обновлении фото заказа ${orderId} в amoCRM (админ):`, err);
      }
    } else {
      sostav[idx].photo_status = 'uploaded_florist';
      writeSostav(sostav);
    }
    broadcastOrdersUpdate();
    
    // Если заказ завершен и фото загружено флористом - автоматически переводим в amoCRM
    if (sostav[idx].status === 'выполнен' && req.user.role === 'florist') {
      try {
        const statusId = 76172434; // ID статуса "Выполнен" в amoCRM
        const result = await updateAmoLead(orderId, statusId, uploadResult.Location);
        if (result.success) {
          console.log(`Заказ ${orderId} автоматически переведен в amoCRM с фото`);
          logToFile(processedWebhooksLog, { 
            action: 'auto_finalize_with_photo', 
            order_id: orderId, 
            user: req.user,
            photoUrl: uploadResult.Location 
          });
        } else {
          console.error(`Ошибка автоматического перевода заказа ${orderId} в amoCRM:`, result.error);
          logToFile(processedWebhooksLog, { 
            action: 'auto_finalize_error', 
            order_id: orderId, 
            user: req.user,
            error: result.error 
          });
        }
      } catch (err) {
        console.error(`Ошибка при автоматическом переводе заказа ${orderId} в amoCRM:`, err);
        logToFile(processedWebhooksLog, { 
          action: 'auto_finalize_exception', 
          order_id: orderId, 
          user: req.user,
          error: String(err) 
        });
      }
    }
    
    broadcastOrdersUpdate();
    res.json({ success: true, photoUrl: uploadResult.Location, order: sostav[idx] });
  } catch (err) {
    try {
      logToFile(uploadErrorsLog, { context: 's3.upload', orderId, fileName, bucket: S3_BUCKET, error: (err as any)?.message || String(err), stack: (err as any)?.stack });
    } catch {}
    res.status(500).json({ error: 'Ошибка загрузки в S3', details: (err as any)?.message || String(err) });
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
  let sostav = readSostav();
  let idx = sostav.findIndex((o: any) => String(o.id) === String(orderId));
  let isFromAdminPhoto = false;
  
  // Если заказ не найден в sostav.json, ищем в admin-photo.json
  if (idx === -1) {
    sostav = readAdminPhoto();
    idx = sostav.findIndex((o: any) => String(o.id) === String(orderId));
    isFromAdminPhoto = true;
  }
  
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
  
  // Сохраняем изменения в соответствующий файл
  if (isFromAdminPhoto) {
    writeAdminPhoto(sostav);
  } else {
    writeSostav(sostav);
  }
  broadcastOrdersUpdate();
  res.json({ success: true, order });
});

// --- Обновление сделки в amoCRM ---
async function updateAmoLead(leadId: string, statusId: number, photoUrl?: string) {
  const url = `${process.env.AMO_BASE_URL}/api/v4/leads/${leadId}`;
  const headers = {
    'Authorization': `Bearer ${process.env.AMO_ACCESS_TOKEN}`,
    'Content-Type': 'application/json'
  };
  
  const payload: any = {
    status_id: statusId,
  };

  if (photoUrl) {
    payload.custom_fields_values = [
      {
        field_id: 1055419, // ID поля для фото
        values: [{ value: photoUrl }]
      }
    ];
  }

  try {
    await axios.patch(url, payload, { headers });
    logToFile(processedWebhooksLog, { action: 'update_amo_lead', leadId, statusId, photoUrl });
    return { success: true };
  } catch (error: any) {
    logToFile(uploadErrorsLog, {
      context: 'update_amo_lead',
      leadId,
      error: error.response?.data || error.message
    });
    return { success: false, error: error.response?.data || error.message };
  }
}

// --- Обновление только фото в amoCRM (без смены статуса) ---
async function updateAmoLeadPhoto(leadId: string, photoUrl: string, changeStatus: boolean = false) {
  const url = `${process.env.AMO_BASE_URL}/api/v4/leads/${leadId}`;
  const headers = {
    'Authorization': `Bearer ${process.env.AMO_ACCESS_TOKEN}`,
    'Content-Type': 'application/json'
  };
  
  const payload: any = {
    custom_fields_values: [
      {
        field_id: 1055419, // ID поля для фото
        values: [{ value: photoUrl }]
      }
    ]
  };

  // Только если нужно изменить статус
  if (changeStatus) {
    payload.status_id = 76172434; // ID статуса "Выполнен"
  }

  try {
    await axios.patch(url, payload, { headers });
    logToFile(processedWebhooksLog, { action: 'update_amo_lead_photo', leadId, photoUrl, changeStatus });
    return { success: true };
  } catch (error: any) {
    logToFile(uploadErrorsLog, {
      context: 'update_amo_lead_photo',
      leadId,
      error: error.response?.data || error.message
    });
    return { success: false, error: error.response?.data || error.message };
  }
}

// --- Обновление поля №ID в amoCRM ---
async function updateAmoLeadOrderId(leadId: string, orderId: string) {
  const url = `${process.env.AMO_BASE_URL}/api/v4/leads/${leadId}`;
  const headers = {
    'Authorization': `Bearer ${process.env.AMO_ACCESS_TOKEN}`,
    'Content-Type': 'application/json'
  };
  
  const payload = {
    custom_fields_values: [
      {
        field_id: 1055575, // ID поля для №ID
        values: [{ value: orderId }]
      }
    ]
  };

  try {
    await axios.patch(url, payload, { headers });
    logToFile(processedWebhooksLog, { action: 'update_amo_lead_order_id', leadId, orderId });
    return { success: true };
  } catch (error: any) {
    logToFile(uploadErrorsLog, {
      context: 'update_amo_lead_order_id',
      leadId,
      error: error.response?.data || error.message
    });
    return { success: false, error: error.response?.data || error.message };
  }
}

// --- Отправить заказ на проверку фото админу ---
app.post('/api/orders/:id/send-to-admin', auth, async (req: Request, res: Response): Promise<void> => {
  const orderId = req.params.id;
  const sostav = readSostav();
  const idx = sostav.findIndex((o: any) => String(o.id) === String(orderId));
  
  if (idx === -1) {
    res.status(404).json({ error: 'Заказ не найден' });
    return;
  }
  
  // Проверяем, что заказ выполнен
  if (sostav[idx].status !== 'выполнен') {
    res.status(400).json({ error: 'Заказ должен быть сначала выполнен' });
    return;
  }
  
  // Устанавливаем статус "отправить фото админу"
  sostav[idx].photo_status = 'send_to_admin';
  
  // СНАЧАЛА сохраняем заказ в admin-photo.json ДО перевода в amoCRM
  addToAdminPhoto(sostav[idx]);
  
  // ЗАТЕМ сохраняем изменения в sostav.json
  writeSostav(sostav);
  
  // ПОТОМ переводим в amoCRM (после этого webhook может удалить из sostav.json)
  try {
    const statusId = 76172434; // ID статуса "Выполнен" в amoCRM
    const result = await updateAmoLead(orderId, statusId);
    if (result.success) {
      console.log(`Заказ ${orderId} переведен в amoCRM при отправке админу`);
      logToFile(processedWebhooksLog, { 
        action: 'send_to_admin_with_stage_change', 
        order_id: orderId, 
        user: req.user 
      });
    } else {
      console.error(`Ошибка перевода заказа ${orderId} в amoCRM при отправке админу:`, result.error);
    }
  } catch (err) {
    console.error(`Ошибка при переводе заказа ${orderId} в amoCRM при отправке админу:`, err);
  }
  logToFile(processedWebhooksLog, { 
    action: 'send_to_admin', 
    order_id: orderId, 
    user: req.user 
  });
  
  broadcastOrdersUpdate();
  res.json({ success: true, message: 'Заказ отправлен админу и переведён в amoCRM' });
});

// --- Финализация заказа (перевод в amoCRM) ---
app.post('/api/orders/:id/finalize', auth, async (req: Request, res: Response): Promise<void> => {
  const orderId = req.params.id;
  const { action, photoUrl } = req.body; // action: 'to_admin' | 'self_complete'

  const statusId = 76172434; // ID статуса "Выполнен"

  if (action === 'to_admin') {
    const result = await updateAmoLead(orderId, statusId);
    if (result.success) {
      res.json({ success: true, message: 'Сделка перемещена в amoCRM' });
    } else {
      res.status(500).json({ error: 'Не удалось обновить сделку в amoCRM', details: result.error });
    }
  } else if (action === 'self_complete') {
    if (!photoUrl) {
      res.status(400).json({ error: 'Не передан URL фото' });
      return;
    }
    const result = await updateAmoLead(orderId, statusId, photoUrl);
    if (result.success) {
      res.json({ success: true, message: 'Сделка перемещена и фото добавлено в amoCRM' });
    } else {
      res.status(500).json({ error: 'Не удалось обновить сделку в amoCRM', details: result.error });
    }
  } else {
    res.status(400).json({ error: 'Неверное действие' });
  }
});


// --- Инициализация глобальной функции обработки вебхуков ---
(global as any).webhookProcessor = processWebhookData;

// --- Запуск сервера ---
server.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
  console.log(`📨 Webhook queue initialized. Queue size: ${webhookQueue.getStats().queueSize}`);
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