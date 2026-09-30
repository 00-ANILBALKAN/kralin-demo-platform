const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const zipService = {
  /**
   * Zip dosyasını hedef klasöre güvenli şekilde çıkarır ve index.html'in yerini tespit eder.
   */
  extractZip(zipFilePath, targetDir) {
    if (fs.existsSync(targetDir)) {
      // Önceki dosyaları temizle
      fs.rmSync(targetDir, { recursive: true, force: true });
    }
    fs.mkdirSync(targetDir, { recursive: true });

    const zip = new AdmZip(zipFilePath);
    const zipEntries = zip.getEntries();

    // Güvenlik: Zip Slip açığına karşı kontrol
    for (const entry of zipEntries) {
      const normalizedPath = path.normalize(entry.entryName);
      if (normalizedPath.startsWith('..') || path.isAbsolute(normalizedPath)) {
        throw new Error('Geçersiz ve güvensiz dosya yolu tespit edildi: ' + entry.entryName);
      }
    }

    // Dosyaları aç
    zip.extractAllTo(targetDir, true);

    // Kök dizinde index.html var mı kontrol et
    let effectiveDir = targetDir;
    if (!fs.existsSync(path.join(targetDir, 'index.html'))) {
      // Eğer kök dizinde yoksa, ilk alt klasörlere bak (örn: dist/index.html veya build/index.html veya proje/index.html)
      const subEntries = fs.readdirSync(targetDir, { withFileTypes: true });
      const firstDir = subEntries.find(e => e.isDirectory() && !e.name.startsWith('.') && !e.name.startsWith('__MACOSX'));
      
      if (firstDir) {
        const nestedIndex = path.join(targetDir, firstDir.name, 'index.html');
        if (fs.existsSync(nestedIndex)) {
          // Alt klasördeki tüm dosyaları ana dizine taşı
          const nestedPath = path.join(targetDir, firstDir.name);
          const filesToMove = fs.readdirSync(nestedPath);
          for (const f of filesToMove) {
            const src = path.join(nestedPath, f);
            const dest = path.join(targetDir, f);
            fs.renameSync(src, dest);
          }
          try {
            fs.rmSync(nestedPath, { recursive: true, force: true });
          } catch (e) {
            // sessizce geç
          }
        }
      }
    }

    // Son kontrol: index.html mevcut mu?
    const hasIndex = fs.existsSync(path.join(targetDir, 'index.html'));
    return {
      success: true,
      hasIndexHtml: hasIndex,
      targetDir
    };
  }
};

module.exports = zipService;
