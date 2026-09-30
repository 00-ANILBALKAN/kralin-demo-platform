const config = require('../config');
const db = require('../database/db');

const SYSTEM_SUBDOMAINS = ['www', 'admin', 'api', 'demo', 'preview', 'mail', 'cpanel'];

function subdomainMiddleware(req, res, next) {
  const host = (req.headers.host || '').split(':')[0].toLowerCase();
  const baseDomain = config.BASE_DOMAIN.toLowerCase();

  // Eğer host baseDomain ile bitiyorsa ve bir alt alan adı varsa
  if (host !== baseDomain && host.endsWith('.' + baseDomain)) {
    const subdomain = host.slice(0, -(baseDomain.length + 1));

    // Sistem sub domainleri değilse
    if (subdomain && !SYSTEM_SUBDOMAINS.includes(subdomain)) {
      const project = db.getProjectBySlug(subdomain);
      if (project) {
        req.isSubdomain = true;
        req.subdomainSlug = subdomain;

        // İstek kök dizine geldiyse ve ?raw=1 değilse demo arayüzüne yönlendir
        if (req.path === '/' && req.query.raw !== '1') {
          return res.redirect(`/demo/${subdomain}`);
        }

        // Eğer doğrudan /raw rotası değilse ve /demo rotası değilse, gelen varlık isteklerini /raw/:slug/... olarak sun
        if (!req.path.startsWith('/demo/') && !req.path.startsWith('/raw/') && !req.path.startsWith('/api/') && !req.path.startsWith('/admin')) {
          req.url = `/raw/${subdomain}${req.path}`;
        }
      }
    }
  }

  next();
}

module.exports = subdomainMiddleware;
