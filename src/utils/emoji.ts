export const getCategoryEmoji = (cName: string, subName?: string, desc?: string): string => {
  if (!cName) return '📦';
  
  // Combine all strings into a single query string to check for keyword matches!
  const query = `${cName} ${subName || ''} ${desc || ''}`.toLowerCase();
  
  // 1. Check if the main category starts with an emoji already
  const codePoint = cName.codePointAt(0);
  if (codePoint && codePoint > 127) {
    const match = cName.match(/^([\uD800-\uDBFF][\uDC00-\uDFFF]|\p{Emoji_Presentation}|\p{Emoji})/u);
    if (match) {
      const matched = match[0];
      const trLetters = "İıŞşĞğÜüÖöÇç";
      if (!trLetters.includes(matched) && !/^[A-Za-z0-9]/.test(matched)) {
        return matched;
      }
    }
  }

  // 2. Specific matching hierarchy based on combined query terms:
  
  // Phone / GSM / Communication
  if (query.includes('telefon') || query.includes('gsm') || query.includes('cep') || query.includes('mobil') || query.includes('vodafone') || query.includes('turkcell') || query.includes('telekom') || query.includes('türktelekom')) {
    return '📱';
  }
  
  // Water faturasi
  if (query.includes('su faturası') || query.includes('iski') || (query.includes('su') && !query.includes('sunum') && !query.includes('susuz') && !query.includes('sure') && !query.includes('sürec') && !query.includes('sunucu') && !query.includes('super'))) {
    return '💧';
  }

  // Gas / Natural Gas (Doğalgaz) / Igdas
  if (query.includes('dogalgaz') || query.includes('doğalgaz') || query.includes('igdas') || query.includes('iğdaş') || query.includes('gaz') || query.includes('kombi') || query.includes('yakıt')) {
    return '🔥';
  }

  // Internet / Telecom / Wifi
  if (query.includes('internet') || query.includes('ttnet') || query.includes('superonline') || query.includes('telekom') || query.includes('wifi') || query.includes('www') || query.includes('yayin') || query.includes('yayın')) {
    return '🌐';
  }

  // Credit Card / Bank
  if (query.includes('kart') || query.includes('denizbank') || query.includes('kredi kartı') || query.includes('bonus') || query.includes('adios') || query.includes('eko kart') || query.includes('ek kart') || query.includes('garanti')) {
    return '💳';
  }

  // Rent / Dues (Aidat) / Housing
  if (query.includes('kira') || query.includes('aidat') || query.includes('konut') || query.includes('apartman') || query.includes('site')) {
    return '🏠';
  }

  // Credit / Instalment (Taksit) / Interest
  if (query.includes('kredi') || query.includes('banka') || query.includes('taksit') || query.includes('faiz') || query.includes('borç') || query.includes('borc')) {
    return '🏦';
  }

  // Salary / Earnings / Bonus
  if (query.includes('maaş') || query.includes('maas') || query.includes('hakediş') || query.includes('mesai') || query.includes('ikramiye') || query.includes('prim')) {
    return '💼';
  }

  // Entertainment / Subscriptions (Spotify, Netflix)
  if (query.includes('sosyal') || query.includes('eğlence') || query.includes('yemek') || query.includes('sinema') || query.includes('spotify') || query.includes('netflix') || query.includes('abonelik') || query.includes('youtube')) {
    return '🍿';
  }

  // Market / Kitchen / Food / Shopping
  if (query.includes('market') || query.includes('mutfak') || query.includes('gıda') || query.includes('gida') || query.includes('manav') || query.includes('giyim') || query.includes('alışveriş') || query.includes('alisveris')) {
    return '🛒';
  }

  // Transportation / Fuel / Car / Taxi
  if (query.includes('ulaşım') || query.includes('ulasim') || query.includes('yakit') || query.includes('benzin') || query.includes('otobüs') || query.includes('otobus') || query.includes('taksi') || query.includes('araba') || query.includes('otopark')) {
    return '🚗';
  }

  // Electric Invoice (fall back specifically or catch keyword)
  if (query.includes('elektrik') || query.includes('enerjisa') || query.includes('ck elektrik') || query.includes('fatura')) {
    return '⚡';
  }

  return '📦';
};

// Strips the emoji or leading emoji/space from a name if we need clean text comparison
export const stripEmoji = (text: string): string => {
  if (!text) return '';
  return text.trim().replace(/^([\uD800-\uDBFF][\uDC00-\uDFFF]|\p{Emoji_Presentation}|\p{Emoji})\s*/u, '').trim();
};
