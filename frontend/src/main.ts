// App version updated: ${Date.now()} - Force cache busting
import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { createRouter, createWebHistory } from 'vue-router'
import OrdersView from './pages/OrdersView.vue'
import OrderDetailsView from './pages/OrderDetailsView.vue'
import LoginView from './pages/LoginView.vue'
import Toast, { POSITION } from 'vue-toastification'
import 'vue-toastification/dist/index.css'

const routes = [
  { path: '/', redirect: '/orders' },
  { path: '/login', component: LoginView },
  { path: '/orders', component: OrdersView },
  { path: '/orders/:id', component: OrderDetailsView, props: true },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

const app = createApp(App);

// Подключаем роутер
app.use(router);

// Подключаем Toast уведомления
app.use(Toast, {
  position: POSITION.TOP_CENTER,
  timeout: 4000,
  closeOnClick: true,
  hideProgressBar: false,
  closeButton: true,
  draggable: true,
  draggablePercent: 0.6,
  showCloseButtonOnHover: false,
  pauseOnFocusLoss: true,
  pauseOnHover: true,
  transition: 'Vue-Toastification__fade',
  maxToasts: 5,
  newestOnTop: true
});

// Монтируем приложение
app.mount('#app');
