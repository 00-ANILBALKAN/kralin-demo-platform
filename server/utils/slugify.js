function slugify(text) {
  if (!text) return '';
  const trMap = {
    'ç': 'c', 'Ç': 'c',
    'ğ': 'g', 'Ğ': 'g',
    'ş': 's', 'Ş': 's',
    'ü': 'u', 'Ü': 'u',
    'ı': 'i', 'İ': 'i',
    'I': 'i',
    'ö': 'o', 'Ö': 'o'
  };

  return text
    .toString()
    .replace(/[çğşüıöÇĞŞÜİÖI]/g, match => trMap[match] || match)
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, '-') // Boşluk ve özel karakterleri tire yap
    .replace(/^-+|-+$/g, '');   // Baş ve sondaki tireleri temizle
}

module.exports = slugify;
