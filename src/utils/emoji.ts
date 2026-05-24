export const getCategoryEmoji = (cName: string): string => {
  if (!cName) return '📦';
  
  // 1. Check if the string already starts with an emoji (or surrogate pair / non-ASCII character)
  const codePoint = cName.codePointAt(0);
  if (codePoint && codePoint > 127) {
    // Attempt to extract the emoji at the beginning of the string
    const match = cName.match(/^([\uD800-\uDBFF][\uDC00-\uDFFF]|\p{Emoji_Presentation}|\p{Emoji})/u);
    if (match) {
      const matched = match[0];
      const trLetters = "İıŞşĞğÜüÖöÇç";
      if (!trLetters.includes(matched) && !/^[A-Za-z0-9]/.test(matched)) {
        return matched;
      }
    }
  }

  // 2. Fallback heuristic matching for English/Turkish names
  const lower = cName.toLowerCase();
  
  if (lower.includes('telefon') || lower.includes('gsm') || lower.includes('cep') || lower.includes('mobil')) return '📱';
  if (lower.includes('su faturası') || (lower.includes('su') && !lower.includes('sunum') && !lower.includes('susuz') && !lower.includes('sure') && !lower.includes('sürec'))) return '💧';
  if (lower.includes('internet') || lower.includes('ttnet') || lower.includes('superonline') || lower.includes('telekom') || lower.includes('wifi') || lower.includes('www') || lower.includes('yayın')) return '🌐';
  if (lower.includes('kart') || lower.includes('denizbank') || lower.includes('kredi kartı') || lower.includes('bonus') || lower.includes('adios') || lower.includes('eko kart') || lower.includes('ek kart') || lower.includes('garanti')) return '💳';

  if (lower.includes('fatura') || lower.includes('elektrik') || lower.includes('doğalgaz')) return '⚡';
  if (lower.includes('kira') || lower.includes('aidat') || lower.includes('konut') || lower.includes('apartman')) return '🏠';
  if (lower.includes('kredi') || lower.includes('banka') || lower.includes('taksit') || lower.includes('faiz')) return '🏦';
  if (lower.includes('maaş') || lower.includes('hakediş') || lower.includes('mesai') || lower.includes('ikramiye') || lower.includes('prim')) return '💼';
  if (lower.includes('sosyal') || lower.includes('eğlence') || lower.includes('yemek') || lower.includes('sinema') || lower.includes('spotify') || lower.includes('netflix') || lower.includes('abonelik')) return '🍿';
  if (lower.includes('market') || lower.includes('mutfak') || lower.includes('gıda') || lower.includes('manav') || lower.includes('giyim') || lower.includes('alışveriş')) return '🛒';
  if (lower.includes('ulaşım') || lower.includes('yakıt') || lower.includes('benzin') || lower.includes('otobüs') || lower.includes('taksi') || lower.includes('araba')) return '🚗';
  
  return '📦';
};

// Strips the emoji or leading emoji/space from a name if we need clean text comparison
export const stripEmoji = (text: string): string => {
  if (!text) return '';
  return text.trim().replace(/^([\uD800-\uDBFF][\uDC00-\uDFFF]|\p{Emoji_Presentation}|\p{Emoji})\s*/u, '').trim();
};
