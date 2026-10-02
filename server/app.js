const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const config = require('./config');
const subdomainMiddleware = require('./middleware/subdomain');

const adminRoutes = require('./routes/admin');
const clientRoutes = require('./routes/client');
const previewRoutes = require('./routes/preview');

const app = express();

// Express response.sendFile varsayılan ayarı (dotfiles: 'allow')
const originalSendFile = express.response.sendFile;
express.response.sendFile = function(filePath, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  options = Object.assign({ dotfiles: 'allow' }, options);
  return originalSendFile.call(this, filePath, options, callback);
};

// Temel Middleware'ler
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Subdomain yönlendirici
app.use(subdomainMiddleware);

// Statik frontend dosyaları (Admin, viewer, client sayfaları için)
app.use(express.static(path.resolve(__dirname, '../public'), { dotfiles: 'allow' }));

// API Rotaları
app.use('/api/admin', adminRoutes);
app.use('/api/client', clientRoutes);

// Demo ve Dosya Sunumu Rotaları
app.use(previewRoutes);

// Admin Web Sayfaları
app.get('/admin', (req, res) => {
  const adminToken = req.cookies?.kralin_admin_auth;
  const { getAdminToken } = require('./middleware/auth');
  if (adminToken !== getAdminToken()) {
    return res.redirect('/admin/login');
  }
  res.sendFile(path.resolve(__dirname, '../public/admin/index.html'));
});

app.get('/admin/login', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../public/admin/login.html'));
});

// Ana Sayfa (demo.kralinsoftware.com veya localhost:3000)
app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../public/index.html'));
});

// 404 Sayfası
app.use((req, res) => {
  res.status(404).sendFile(path.resolve(__dirname, '../public/404.html'));
});

// Hata Yakalayıcı
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({ error: 'Sunucu hatası: ' + err.message });
});

// Health check endpoint (for uptime monitors & keep-alive ping)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), time: new Date().toISOString() });
});

// Sunucuyu başlat (Eğer doğrudan çalıştırıldıysa)
if (require.main === module) {
  // Yalnızca AUTO_SEED=true ise otomatik seed çalıştır
  if (process.env.AUTO_SEED === 'true') {
    try {
      const db = require('./database/db');
      if (db.getAllProjects().length === 0) {
        require('../scripts/seed.js');
      }
    } catch (e) {
      console.error('Seed kontrolü:', e.message);
    }
  }

  app.listen(config.PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 Kralin Software Demo Platformu Çalışıyor!`);
    console.log(`📡 Port: http://localhost:${config.PORT}`);
    console.log(`💼 Admin Paneli: http://localhost:${config.PORT}/admin`);
    console.log(`🔑 Varsayılan Admin Şifresi: ${config.ADMIN_PASSWORD}`);
    console.log(`🌐 Base Domain: ${config.BASE_DOMAIN}`);
    console.log(`====================================================`);
  });
}

module.exports = app;
