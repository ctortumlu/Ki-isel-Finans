export type TransactionType = 'Gelir' | 'Gider';

export interface Transaction {
  id: string;
  tarih: string; // YYYY-MM-DD
  tur: TransactionType;
  kategori: string;
  altKategori?: string;
  tutar: number;
  aciklama: string;
  aktifPasif?: 'Aktif' | 'Pasif';
  usdRate?: number;
  faturaFile?: {
    name: string;
    size: string;
    type: string;
    dataUrl?: string;
  };
}

export interface RecurringPayment {
  id: string;
  baslik: string;
  tutar: number;
  sonOdemeTarihi: string; // YYYY-MM-DD
  kategori: string;
  durum: 'Bekliyor' | 'Odendi';
  aktifPasif?: 'Aktif' | 'Pasif';
}

export interface Category {
  id: string;
  ad: string;
  icon: string;
  renk: string;
}

export interface SheetCategory {
  islem: TransactionType;
  kategori: string;
  altKategori: string;
}

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'fatura', ad: 'Fatura', icon: '⚡', renk: 'bg-blue-100 text-blue-600' },
  { id: 'aidat', ad: 'Aidat', icon: '🏠', renk: 'bg-indigo-100 text-indigo-600' },
  { id: 'kredikarti', ad: 'Kredi Kartı', icon: '💳', renk: 'bg-orange-100 text-orange-600' },
  { id: 'kredi', ad: 'Kredi', icon: '🏦', renk: 'bg-teal-100 text-teal-600' },
  { id: 'maas', ad: 'Maaş', icon: '💼', renk: 'bg-emerald-100 text-emerald-600' },
  { id: 'diger', ad: 'Diğer', icon: '📦', renk: 'bg-gray-100 text-gray-600' },
];

export const INITIAL_SHEET_CATEGORIES: SheetCategory[] = [
  { islem: 'Gider', kategori: 'Fatura', altKategori: 'Su Faturası' },
  { islem: 'Gider', kategori: 'Fatura', altKategori: 'Elektrik' },
  { islem: 'Gider', kategori: 'Aidat', altKategori: 'Apartman Aidat' },
  { islem: 'Gider', kategori: 'Kredi Kartı', altKategori: 'Y.K.B. Eko Kart' },
  { islem: 'Gider', kategori: 'Kredi Kartı', altKategori: 'Y.K.B. Adios Kart' },
  { islem: 'Gider', kategori: 'Kredi Kartı', altKategori: 'Y.K.B. Ek Kart' },
  { islem: 'Gider', kategori: 'Kredi Kartı', altKategori: 'Garanti Bankası Kart' },
  { islem: 'Gider', kategori: 'Fatura', altKategori: 'İnternet' },
  { islem: 'Gider', kategori: 'Fatura', altKategori: 'Telefon 4600' },
  { islem: 'Gider', kategori: 'Fatura', altKategori: 'Telefon 4201' },
  { islem: 'Gider', kategori: 'Fatura', altKategori: 'Telefon 4201 Yeni' },
  { islem: 'Gider', kategori: 'Fatura', altKategori: 'Telefon 7634' },
  { islem: 'Gider', kategori: 'Kredi Kartı', altKategori: 'Denizbank Bonus' },
  { islem: 'Gider', kategori: 'Kredi', altKategori: 'Akbank 1.Kredi' },
  { islem: 'Gider', kategori: 'Kredi', altKategori: 'Akbank 2.Kredi' },
  { islem: 'Gider', kategori: 'Kredi', altKategori: 'Akbank 3.Kredi' },
  { islem: 'Gider', kategori: 'Kredi', altKategori: 'Akbank 4.Kredi' },
  { islem: 'Gider', kategori: 'Kredi', altKategori: 'Y.K.B.1.Kredi' },
  { islem: 'Gider', kategori: 'Kredi', altKategori: 'Y.K.B.2.Kredi' },
  { islem: 'Gider', kategori: 'Kredi', altKategori: 'Y.K.B.3.Kredi' },
  { islem: 'Gelir', kategori: 'Maaş', altKategori: 'Maaş' },
  { islem: 'Gelir', kategori: 'Maaş', altKategori: 'Maaş Farkı' },
  { islem: 'Gelir', kategori: 'Maaş', altKategori: 'İkramiye' },
  { islem: 'Gelir', kategori: 'Diğer', altKategori: 'Diğer' },
];
