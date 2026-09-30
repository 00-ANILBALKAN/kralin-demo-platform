const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config');
const db = require('../database/db');
const zipService = require('../services/zipService');
const slugify = require('../utils/slugify');
const { getAdminToken, requireAdminAuth } = require('../middleware/auth');

// Geçici upload dizini
const tempUploadDir = path.resolve(__dirname, '../../storage/temp_uploads');
if (!fs.existsSync(tempUploadDir)) {
  fs.mkdirSync(tempUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, tempUploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'upload-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 150 * 1024 * 1024 }, // 150 MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.zip') {
      return cb(new Error('Yalnızca .zip uzantılı dosyalar yüklenebilir.'));
    }
    cb(null, true);
  }
});

// --- Auth Endpoints ---

router.post('/login', (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Şifre gereklidir.' });
  }

  if (password === config.ADMIN_PASSWORD) {
    const token = getAdminToken();
    res.cookie('kralin_admin_auth', token, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 gün
      sameSite: 'lax'
    });
    return res.json({ success: true, message: 'Giriş başarılı.' });
  }

  return res.status(401).json({ error: 'Geçersiz admin şifresi!' });
});

router.post('/logout', (req, res) => {
  res.clearCookie('kralin_admin_auth');
  return res.json({ success: true, message: 'Çıkış yapıldı.' });
});

router.get('/auth-status', (req, res) => {
  const adminToken = req.cookies?.kralin_admin_auth;
  const expected = getAdminToken();
  return res.json({ authenticated: adminToken === expected });
});

// --- Korumalı Admin Endpoints ---

router.use(requireAdminAuth);

// İstatistikler
router.get('/stats', (req, res) => {
  const projects = db.getAllProjects();
  const total = projects.length;
  const active = projects.filter(p => p.is_active === 1).length;
  const totalViews = projects.reduce((acc, p) => acc + (p.views_count || 0), 0);

  return res.json({
    total,
    active,
    totalViews,
    baseDomain: config.BASE_DOMAIN,
    port: config.PORT
  });
});

// Projeleri listele
router.get('/projects', (req, res) => {
  const projects = db.getAllProjects();
  return res.json(projects);
});

// Yeni Proje Yükle
router.post('/projects', upload.single('zipFile'), (req, res) => {
  try {
    const { name, password, description } = req.body;
    let customSlug = req.body.slug ? slugify(req.body.slug) : slugify(name);

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Firma / Proje adı zorunludur.' });
    }

    if (!customSlug) {
      customSlug = 'proje-' + Date.now();
    }

    // Benzersiz slug oluştur (varsa numara ekle)
    let finalSlug = customSlug;
    let counter = 1;
    while (db.getProjectBySlug(finalSlug)) {
      finalSlug = `${customSlug}-${counter++}`;
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Lütfen bir web sitesi .zip dosyası yükleyin.' });
    }

    // Hedef dizini hazırla
    const targetDir = path.join(config.STORAGE_DIR, finalSlug);

    // ZIP'i aç
    const extractResult = zipService.extractZip(req.file.path, targetDir);

    // Geçici yükleme dosyasını sil
    try {
      fs.unlinkSync(req.file.path);
    } catch (e) {}

    // Veritabanına kaydet
    const newProject = db.createProject({
      name: name.trim(),
      slug: finalSlug,
      password: password && password.trim() ? password.trim() : null,
      description: description ? description.trim() : '',
      storage_path: targetDir
    });

    return res.status(201).json({
      success: true,
      message: 'Demo projesi başarıyla yayına alındı!',
      project: newProject,
      hasIndexHtml: extractResult.hasIndexHtml
    });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    return res.status(500).json({ error: 'Proje yüklenirken hata oluştu: ' + err.message });
  }
});

// Proje Güncelle (Ad, Şifre, Durum veya Yeni ZIP)
router.put('/projects/:id', upload.single('zipFile'), (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = db.getProjectById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Proje bulunamadı.' });
    }

    const { name, password, description, is_active } = req.body;
    let storage_path = existing.storage_path;

    // Eğer yeni bir zip yüklendiyse eskisini ez
    if (req.file) {
      const targetDir = path.join(config.STORAGE_DIR, existing.slug);
      zipService.extractZip(req.file.path, targetDir);
      storage_path = targetDir;
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {}
    }

    const updated = db.updateProject(id, {
      name,
      password: password !== undefined ? password : existing.password,
      description,
      is_active: is_active !== undefined ? parseInt(is_active, 10) : existing.is_active,
      storage_path
    });

    return res.json({
      success: true,
      message: 'Proje başarıyla güncellendi.',
      project: updated
    });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    return res.status(500).json({ error: 'Güncelleme hatası: ' + err.message });
  }
});

// Proje Sil
router.delete('/projects/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = db.getProjectById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Proje bulunamadı.' });
    }

    // Dosyaları diskten sil
    if (existing.storage_path && fs.existsSync(existing.storage_path)) {
      fs.rmSync(existing.storage_path, { recursive: true, force: true });
    }

    db.deleteProject(id);
    return res.json({ success: true, message: 'Proje ve dosyaları silindi.' });
  } catch (err) {
    return res.status(500).json({ error: 'Silme hatası: ' + err.message });
  }
});

module.exports = router;
