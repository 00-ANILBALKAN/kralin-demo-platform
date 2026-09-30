const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const db = require('../database/db');
const config = require('../config');
const { isClientAuthorized } = require('../middleware/auth');

// Şifre kilitleme (Çıkış yapma)
router.get('/demo/:slug/lock', (req, res) => {
  const { slug } = req.params;
  res.clearCookie(`kralin_client_${slug}`);
  return res.redirect(`/demo/${slug}`);
});

// Demo Ana Görünümü (Agency Bar veya Şifre Ekranı)
router.get('/demo/:slug', (req, res) => {
  const { slug } = req.params;
  const project = db.getProjectBySlug(slug);

  if (!project) {
    return res.status(404).sendFile(path.resolve(__dirname, '../../public/404.html'));
  }

  if (project.is_active === 0) {
    return res.status(403).sendFile(path.resolve(__dirname, '../../public/inactive.html'));
  }

  // Şifre kontrolü
  const authorized = isClientAuthorized(req, project);
  if (!authorized) {
    // Şifre giriş sayfasını sun
    return res.sendFile(path.resolve(__dirname, '../../public/client/password.html'));
  }

  // Ziyaret sayısını artır
  db.incrementViews(slug);

  // Doğrulanmış ise Agency Frame arayüzünü sun
  return res.sendFile(path.resolve(__dirname, '../../public/viewer/frame.html'));
});

// Demo Proje Detayları API (Frontend frame ve şifre ekranı için)
router.get('/api/demo-meta/:slug', (req, res) => {
  const { slug } = req.params;
  const project = db.getProjectBySlug(slug);

  if (!project) {
    return res.status(404).json({ error: 'Proje bulunamadı.' });
  }

  const isProtected = !!project.password;
  const authorized = isClientAuthorized(req, project);

  return res.json({
    id: project.id,
    name: project.name,
    slug: project.slug,
    description: project.description,
    isProtected,
    isAuthorized: authorized,
    isActive: project.is_active === 1,
    createdAt: project.created_at,
    rawUrl: `/raw/${project.slug}/index.html`,
    company: {
      name: config.COMPANY_NAME,
      website: config.COMPANY_WEBSITE,
      phone: config.COMPANY_PHONE,
      email: config.COMPANY_EMAIL
    }
  });
});

// Ham Statik Dosya Sunucusu (/raw/:slug/...)
router.use('/raw/:slug', (req, res) => {
  const { slug } = req.params;
  const project = db.getProjectBySlug(slug);

  if (!project) {
    return res.status(404).send('Proje bulunamadı.');
  }

  if (project.is_active === 0) {
    return res.status(403).send('Bu demo pasife alınmıştır.');
  }

  // Şifre kontrolü
  if (!isClientAuthorized(req, project)) {
    return res.redirect(`/demo/${slug}`);
  }

  // İstenen dosya yolunu belirle
  const rawSubPath = req.path.replace(/^\/+/, '');
  const reqSubPath = (!rawSubPath || rawSubPath === '') ? 'index.html' : rawSubPath;
  const safePath = path.normalize(reqSubPath).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(project.storage_path, safePath);

  // Güvenlik: Hedef dosya storage dizini dışına çıkamaz
  if (!filePath.startsWith(path.resolve(project.storage_path))) {
    return res.status(403).send('Geçersiz dosya yolu.');
  }

  // Eğer dizin isteniyorsa index.html'e yönlendir
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('İstenen dosya bulunamadı: ' + safePath);
  }

  // Arama motorlarının demoları dizinlemesini engelle
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, nosnippet, noarchive');
  // Iframe içinde gösterilebilmesi için
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  return res.sendFile(filePath);
});

module.exports = router;
