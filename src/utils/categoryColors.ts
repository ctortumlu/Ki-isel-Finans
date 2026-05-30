/**
 * Category Base Soft Colors helper
 * Maps standard and custom categories to beautiful, soft light background tones
 */
export interface CategoryPalette {
  bg: string;
  border: string;
  text: string;
  badge: string;
}

export function getCategoryPalette(category: string): CategoryPalette {
  const norm = (category || '').toLowerCase().trim();

  // 1. Static maps for common categories
  if (norm.includes('gıda') || norm.includes('market') || norm.includes('yemek') || norm.includes('restoran')) {
    return {
      bg: 'bg-emerald-50/50 hover:bg-emerald-50 border-emerald-100',
      border: 'border-emerald-150',
      text: 'text-emerald-800',
      badge: 'bg-emerald-100 text-emerald-850 border-emerald-200/55'
    };
  }

  if (norm.includes('fatura') || norm.includes('kira') || norm.includes('aidat') || norm.includes('elektrik') || norm.includes('su') || norm.includes('doğalgaz') || norm.includes('internet')) {
    return {
      bg: 'bg-indigo-50/50 hover:bg-indigo-50 border-indigo-100',
      border: 'border-indigo-150',
      text: 'text-indigo-800',
      badge: 'bg-indigo-100 text-indigo-850 border-indigo-200/55'
    };
  }

  if (norm.includes('ulaşım') || norm.includes('akaryakıt') || norm.includes('benzin') || norm.includes('otobüs') || norm.includes('taxi') || norm.includes('taksi') || norm.includes('seyahat')) {
    return {
      bg: 'bg-sky-50/50 hover:bg-sky-50 border-sky-100',
      border: 'border-sky-150',
      text: 'text-sky-800',
      badge: 'bg-sky-100 text-sky-850 border-sky-200/55'
    };
  }

  if (norm.includes('eğlence') || norm.includes('sosyal') || norm.includes('aktivite') || norm.includes('sinema') || norm.includes('tiyatro') || norm.includes('kafe') || norm.includes('kahve')) {
    return {
      bg: 'bg-amber-50/55 hover:bg-amber-50 border-amber-100',
      border: 'border-amber-150',
      text: 'text-amber-850',
      badge: 'bg-amber-100 text-amber-900 border-amber-200/55'
    };
  }

  if (norm.includes('maaş') || norm.includes('gelir') || norm.includes('kazanç') || norm.includes('yatırım') || norm.includes('faiz')) {
    return {
      bg: 'bg-teal-50/50 hover:bg-teal-50 border-teal-100',
      border: 'border-teal-150',
      text: 'text-teal-800',
      badge: 'bg-teal-100 text-teal-850 border-teal-200/55'
    };
  }

  if (norm.includes('sağlık') || norm.includes('eczane') || norm.includes('hastane') || norm.includes('ilaç') || norm.includes('doktor')) {
    return {
      bg: 'bg-rose-50/50 hover:bg-rose-50 border-rose-100',
      border: 'border-rose-150',
      text: 'text-rose-800',
      badge: 'bg-rose-100 text-rose-850 border-rose-200/55'
    };
  }

  if (norm.includes('giyim') || norm.includes('alışveriş') || norm.includes('aksesuar') || norm.includes('ayakkabı')) {
    return {
      bg: 'bg-pink-50/50 hover:bg-pink-50 border-pink-100',
      border: 'border-pink-150',
      text: 'text-pink-850',
      badge: 'bg-pink-100 text-pink-900 border-pink-200/55'
    };
  }

  if (norm.includes('eğitim') || norm.includes('kurs') || norm.includes('okul') || norm.includes('kitap')) {
    return {
      bg: 'bg-violet-50/50 hover:bg-violet-50 border-violet-100',
      border: 'border-violet-150',
      text: 'text-violet-850',
      badge: 'bg-violet-100 text-violet-900 border-violet-200/55'
    };
  }

  // 2. Fallbacks: String hash-based custom categorization to dynamically assign colors
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % 5;

  const dynamicPalettes: CategoryPalette[] = [
    {
      bg: 'bg-indigo-50/40 hover:bg-indigo-50/60 border-indigo-100',
      border: 'border-indigo-150',
      text: 'text-indigo-800',
      badge: 'bg-indigo-50 text-indigo-800 border-indigo-200/50'
    },
    {
      bg: 'bg-emerald-50/40 hover:bg-emerald-50/60 border-emerald-100',
      border: 'border-emerald-150',
      text: 'text-emerald-800',
      badge: 'bg-emerald-50 text-emerald-800 border-emerald-200/50'
    },
    {
      bg: 'bg-sky-50/40 hover:bg-sky-50/60 border-sky-100',
      border: 'border-sky-150',
      text: 'text-sky-800',
      badge: 'bg-sky-50 text-sky-800 border-sky-200/50'
    },
    {
      bg: 'bg-purple-50/40 hover:bg-purple-50/60 border-purple-100',
      border: 'border-purple-150',
      text: 'text-purple-800',
      badge: 'bg-purple-50 text-purple-850 border-purple-200/50'
    },
    {
      bg: 'bg-amber-50/45 hover:bg-amber-50/65 border-amber-100',
      border: 'border-amber-150',
      text: 'text-amber-850',
      badge: 'bg-amber-55 text-amber-850 border-amber-200/50'
    }
  ];

  return dynamicPalettes[colorIndex];
}
