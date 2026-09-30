const path = require('path');
const fs = require('fs');
const db = require('../server/database/db');
const zipService = require('../server/services/zipService');

function seed() {
  const existing = db.getProjectBySlug('acme-mimarlik');
  if (existing) {
    console.log('Seed demo projesi zaten mevcut: /demo/acme-mimarlik');
    return;
  }

  const sampleZip = path.resolve(__dirname, '../sample-project.zip');
  if (!fs.existsSync(sampleZip)) {
    console.log('sample-project.zip bulunamadı, seed atlandı.');
    return;
  }

  const targetDir = path.resolve(__dirname, '../storage/demos/acme-mimarlik');
  zipService.extractZip(sampleZip, targetDir);

  const project = db.createProject({
    name: 'Acme Mimarlık & İnşaat',
    slug: 'acme-mimarlik',
    password: '123456',
    description: 'Kralin Software tarafından hazırlanan lüks mimarlık ofisi konsept tasarımı.',
    storage_path: targetDir
  });

  console.log('✨ Örnek Demo Başarıyla Oluşturuldu!');
  console.log(`📌 Firma: ${project.name}`);
  console.log(`🔗 Slug: /demo/${project.slug}`);
  console.log(`🔑 Müşteri Şifresi: ${project.password}`);
}

seed();
