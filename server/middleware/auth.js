const crypto = require('crypto');
const config = require('../config');

function getClientToken(slug, password) {
  return crypto
    .createHmac('sha256', config.SECRET_KEY)
    .update(`${slug}:${password}`)
    .digest('hex');
}

function getAdminToken() {
  return crypto
    .createHmac('sha256', config.SECRET_KEY)
    .update(`admin:${config.ADMIN_PASSWORD}`)
    .digest('hex');
}

function isClientAuthorized(req, project) {
  if (!project.password) {
    return true; // Şifresiz demo, herkese açık
  }
  const cookieName = `kralin_client_${project.slug}`;
  const clientToken = req.cookies?.[cookieName];
  if (!clientToken) return false;

  const expectedToken = getClientToken(project.slug, project.password);
  return clientToken === expectedToken;
}

function requireAdminAuth(req, res, next) {
  const adminToken = req.cookies?.kralin_admin_auth || req.headers['x-admin-key'];
  const expectedToken = getAdminToken();

  if (adminToken === expectedToken) {
    return next();
  }

  // API isteği ise veya /api ile başlıyorsa her zaman 401 JSON döndür
  if (
    req.baseUrl?.startsWith('/api') ||
    req.originalUrl?.startsWith('/api') ||
    req.path?.startsWith('/api') ||
    req.xhr ||
    req.headers.accept?.includes('application/json')
  ) {
    return res.status(401).json({ error: 'Yetkisiz erişim. Lütfen admin şifrenizi girin.' });
  }

  // Sayfa isteği ise login sayfasına yönlendir
  return res.redirect('/admin/login');
}

module.exports = {
  getClientToken,
  getAdminToken,
  isClientAuthorized,
  requireAdminAuth
};
