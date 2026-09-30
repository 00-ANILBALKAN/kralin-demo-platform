const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { getClientToken } = require('../middleware/auth');

router.post('/verify/:slug', (req, res) => {
  const { slug } = req.params;
  const { password } = req.body;

  const project = db.getProjectBySlug(slug);
  if (!project) {
    return res.status(404).json({ error: 'Proje bulunamadı.' });
  }

  if (project.is_active === 0) {
    return res.status(403).json({ error: 'Bu demo projesi şu anda yayında değildir.' });
  }

  // Eğer şifresiz bir projeyse doğrudan onay ver
  if (!project.password) {
    return res.json({ success: true, redirect: `/demo/${slug}` });
  }

  if (!password || password.trim() !== project.password.trim()) {
    return res.status(401).json({
      error: 'Girdiğiniz şifre hatalı. Lütfen Kralin Software tarafından iletilen şifreyi kontrol ediniz.'
    });
  }

  // Token oluştur ve cookie kaydet (7 gün geçerli)
  const token = getClientToken(slug, project.password);
  res.cookie(`kralin_client_${slug}`, token, {
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: 'lax'
  });

  return res.json({
    success: true,
    message: 'Şifre doğrulandı.',
    redirect: `/demo/${slug}`
  });
});

module.exports = router;
