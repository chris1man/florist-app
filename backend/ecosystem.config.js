module.exports = {
  apps: [{
    name: 'florist-backend',
    script: 'dist/flor.js',
    cwd: '/root/florist-app/backend',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    pre_restart_hook: {
      script: 'rebuild.sh',
      description: 'Пересборка приложения перед рестартом'
    },
    error_file: '../logs/pm2/err.log',
    out_file: '../logs/pm2/out.log',
    log_file: '../logs/pm2/combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    restart_delay: 5000,
    max_restarts: 10,
    min_uptime: '10s',
    log_type: 'json',
    merge_logs: true,
    // Ротация логов
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    max_size: '10M',
    retain: 5
  }]
};
