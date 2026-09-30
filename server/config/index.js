const path = require('path');
require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 4000,
  BASE_DOMAIN: process.env.BASE_DOMAIN || 'localhost',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'kralin2026',
  SECRET_KEY: process.env.SECRET_KEY || 'kralin-software-secret-jwt-key-preview-2026',
  STORAGE_DIR: path.resolve(__dirname, '../../storage/demos'),
  DB_PATH: path.resolve(__dirname, '../../storage/database.sqlite'),
  COMPANY_NAME: 'Kralin Software',
  COMPANY_PHONE: process.env.COMPANY_PHONE || '+905446014765',
  COMPANY_EMAIL: process.env.COMPANY_EMAIL || 'iletisim@kralinsoftware.com',
  COMPANY_WEBSITE: process.env.COMPANY_WEBSITE || 'https://kralinsoftware.com'
};
