const assert = require('assert');
const path = require('path');
const fs = require('fs');

console.log('--- TEST 1: Database Testi ---');
const db = require('../server/database/db');

// Proje oluştur
const testSlug = 'test-firma-' + Date.now();
const testProject = db.createProject({
  name: 'Test Mimarlık A.Ş.',
  slug: testSlug,
  password: 'gizlisifre123',
  description: 'Test projesi açıklaması',
  storage_path: path.resolve(__dirname, '../storage/demos/' + testSlug)
});

assert(testProject.id > 0, 'Proje ID oluşturulamadı');
assert.strictEqual(testProject.name, 'Test Mimarlık A.Ş.');
assert.strictEqual(testProject.slug, testSlug);
assert.strictEqual(testProject.password, 'gizlisifre123');
console.log('✔ Proje başarıyla veritabanına kaydedildi:', testProject.id);

// Projeyi slug ile çek
const fetched = db.getProjectBySlug(testSlug);
assert(fetched, 'Proje slug ile bulunamadı');
assert.strictEqual(fetched.id, testProject.id);
console.log('✔ Proje slug ile başarıyla çekildi');

// Ziyaret artırma
db.incrementViews(testSlug);
const updatedViews = db.getProjectBySlug(testSlug);
assert.strictEqual(updatedViews.views_count, 1, 'Ziyaret sayısı artmadı');
console.log('✔ Ziyaret sayacı artırma çalışıyor (views = 1)');

// Güncelleme
db.updateProject(testProject.id, { name: 'Test Mimarlık Yenilendi', password: 'yeni-sifre' });
const updated = db.getProjectById(testProject.id);
assert.strictEqual(updated.name, 'Test Mimarlık Yenilendi');
assert.strictEqual(updated.password, 'yeni-sifre');
console.log('✔ Proje güncelleme çalışıyor');

console.log('\n--- TEST 2: ZIP Servis Testi ---');
const zipService = require('../server/services/zipService');
const sampleZipPath = path.resolve(__dirname, '../sample-project.zip');
assert(fs.existsSync(sampleZipPath), 'sample-project.zip bulunamadı');

const testTargetDir = path.resolve(__dirname, '../storage/demos/test-extracted-' + Date.now());
const extractResult = zipService.extractZip(sampleZipPath, testTargetDir);
assert(extractResult.success, 'ZIP çıkarma başarısız');
assert(extractResult.hasIndexHtml, 'index.html bulunamadı');
assert(fs.existsSync(path.join(testTargetDir, 'index.html')), 'Hedefte index.html yok');
console.log('✔ ZIP dosyası güvenle açıldı ve index.html doğrulandı');

// Temizle
fs.rmSync(testTargetDir, { recursive: true, force: true });

console.log('\n--- TEST 3: Auth & Şifreleme Testi ---');
const { getClientToken, getAdminToken, isClientAuthorized } = require('../server/middleware/auth');
const clientToken = getClientToken(testSlug, 'yeni-sifre');
assert(clientToken && clientToken.length > 20, 'Client token üretilemedi');

const mockReqAuthorized = { cookies: { [`kralin_client_${testSlug}`]: clientToken } };
assert.strictEqual(isClientAuthorized(mockReqAuthorized, updated), true, 'Doğru şifre ile yetki verilemedi');

const mockReqWrong = { cookies: { [`kralin_client_${testSlug}`]: 'yanlis_token' } };
assert.strictEqual(isClientAuthorized(mockReqWrong, updated), false, 'Yanlış şifre ile yetki engellenemedi');

console.log('✔ Müşteri şifre doğrulama ve token kontrolleri başarılı');

console.log('\n--- TEST 4: Slugify Türkçe Karakter Testi ---');
const slugify = require('../server/utils/slugify');
assert.strictEqual(slugify('Özçelik İnşaat & Mühendislik Şti.'), 'ozcelik-insaat-muhendislik-sti');
assert.strictEqual(slugify('Çiçekçilik ve Peyzaj 2026!'), 'cicekcilik-ve-peyzaj-2026');
console.log('✔ Türkçe karakter dönüştürücü kusursuz çalışıyor');

// Test kaydını sil
db.deleteProject(testProject.id);
assert(!db.getProjectById(testProject.id), 'Proje silinemedi');
console.log('✔ Proje silme testi başarılı');

console.log('\n========================================');
console.log('🎉 TÜM BİRİM TESTLERİ EKSİKSİZ GEÇTİ!');
console.log('========================================');
