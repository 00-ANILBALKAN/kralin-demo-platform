# Kralin Software - Müşteri Demo ve Proje Önizleme Platformu (Preview Hub)

Kralin Software'in müşterilerine tasarladığı web sitelerini Netlify veya Vercel gibi 3. parti servislere bağımlı olmadan, kendi alan adı altında (`firma.kralinsoftware.com` veya `demo.kralinsoftware.com/demo/firma`), şifreli ve responsive önizleme çubuğuyla sunmasını sağlayan özel platformdur.

---

## 🚀 Öne Çıkan Özellikler

1. **Netlify Tarzı ZIP Dağıtımı:** Web sitesinin HTML/CSS/JS dosyalarını içeren `.zip` arşivini sürükleyip bırakarak saniyeler içinde yayına alabilirsiniz.
2. **Firmaya Özel Şifreleme:** Her müşteri için ayrı bir erişim şifresi belirleyebilir (veya rastgele 6 haneli PIN üretebilir), şifresiz genel demolar oluşturabilirsiniz.
3. **Kralin Agency Bar:** Müşteri sitenin üstünde Masaüstü, Laptop, Tablet ve Mobil ekran simülatörünü görür.
4. **WhatsApp Paylaşım Şablonu:** Tek tıkla müşteriye gönderilecek profesyonel mesaj metnini kopyalayabilir veya doğrudan WhatsApp'tan iletebilirsiniz.
5. **Arama Motoru Koruması (SEO):** Tüm demolar `noindex, nofollow` başlığıyla korunur; henüz tamamlanmamış müşteri siteleri Google'a düşmez.
6. **Sürüm Güncelleme:** Müşteri revize istediğinde aynı link ve şifreyi koruyarak yeni bir ZIP yükleyip siteyi güncelleyebilirsiniz.

---

## 🛠️ Yerel Ortamda Çalıştırma

```bash
# 1. Proje dizinine geçin
cd kralin-demo-platform

# 2. Bağımlılıkları yükleyin (zaten yüklüyse bu adımı geçebilirsiniz)
npm install

# 3. Sunucuyu başlatın
npm start
```

Tarayıcınızda açın:
- **Portala Giriş:** `http://localhost:4000`
- **Yönetici Paneli:** `http://localhost:4000/admin` (Varsayılan şifre: `kralin2026`)

---

## 🌐 Canlı Sunucuya (VPS) Kurulum Kılavuzu

### 1. Adım: DNS Ayarları (Cloudflare veya Domain Paneli)
Domaininizin DNS yönetim sayfasına gidin ve aşağıdaki iki kaydı sunucunuzun IP adresine yönlendirin:
- `A` kaydı: `demo.kralinsoftware.com` -> `SUNUCU_IP_ADRESI`
- `A` kaydı (Wildcard): `*.demo.kralinsoftware.com` -> `SUNUCU_IP_ADRESI`

### 2. Adım: Sunucuda Wildcard SSL Alın (Let's Encrypt)
Sunucu terminalinizde aşağıdaki komutu çalıştırarak ücretsiz wildcard SSL alın:
```bash
sudo certbot certonly --manual --preferred-challenges=dns -d "demo.kralinsoftware.com" -d "*.demo.kralinsoftware.com"
```

### 3. Adım: Nginx Yapılandırması
Proje içerisindeki `nginx.conf.example` dosyasını `/etc/nginx/sites-available/kralin-demo` altına kopyalayın ve Nginx'i yeniden başlatın:
```bash
sudo ln -s /etc/nginx/sites-available/kralin-demo /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4. Adım: Uygulamayı PM2 ile 7/24 Çalıştırma
```bash
# PM2 kurun (yoksa)
sudo npm install -g pm2

# kralin-demo-platform dizininde
pm2 start server/app.js --name "kralin-demos"
pm2 save
pm2 startup
```

*(Alternatif olarak Docker kullanmak isterseniz `docker-compose up -d` komutu yeterlidir.)*

---

## 📁 Dizin Yapısı

- `server/app.js`: Express ana sunucusu ve yönlendirici.
- `server/database/db.js`: SQLite veritabanı (projeler, şifreler, sayaçlar).
- `server/routes/admin.js`: ZIP yükleme, çıkarma ve yönetim API'leri.
- `server/routes/preview.js`: Güvenli dosya sunumu ve Frame arayüzü.
- `public/admin/index.html`: Kralin Software Yönetici Paneli.
- `public/client/password.html`: Müşteri şifre giriş ekranı.
- `public/viewer/frame.html`: Masaüstü/Tablet/Mobil simülatörlü önizleme barı.
- `storage/demos/`: Açılan müşteri web sitesi dosyaları.
- `sample-project.zip`: Test için hazır örnek mimarlık şirketi web sitesi.
