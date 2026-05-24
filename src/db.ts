import { Transaction, RecurringPayment, SheetCategory, INITIAL_SHEET_CATEGORIES } from './types';

// Use 2026-05-22 as the reference anchor date, but fallback to actual current system date if it is later.
export const getReferenceDate = (): Date => {
  const current = new Date();
  const anchor = new Date('2026-05-22T12:00:00Z');
  return current > anchor ? current : anchor;
};

export const getDaysRemaining = (dueDateStr: string): number => {
  const refDate = getReferenceDate();
  refDate.setHours(0, 0, 0, 0);
  
  const dueDate = new Date(dueDateStr);
  dueDate.setHours(0, 0, 0, 0);
  
  const diffTime = dueDate.getTime() - refDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

const DEFAULT_TRANSACTIONS: Transaction[] = [
  {
    id: 't1',
    tarih: '2026-05-22',
    tur: 'Gelir',
    kategori: 'Maaş Geliri',
    tutar: 48500,
    aciklama: 'Aylık Net Maaş Ödemesi'
  },
  {
    id: 't2',
    tarih: '2026-05-21',
    tur: 'Gider',
    kategori: 'Mutfak & Market',
    tutar: 1420,
    aciklama: 'Haftalık Mutfak/Market Alışverişi'
  },
  {
    id: 't3',
    tarih: '2026-05-19',
    tur: 'Gider',
    kategori: 'Ulaşım',
    tutar: 750,
    aciklama: 'Araba Yakıt Dolumu'
  },
  {
    id: 't4',
    tarih: '2026-05-18',
    tur: 'Gelir',
    kategori: 'Yatırım / Ek Gelir',
    tutar: 6200,
    aciklama: 'Freelance Danışmanlık Projesi'
  },
  {
    id: 't5',
    tarih: '2026-05-15',
    tur: 'Gider',
    kategori: 'Sosyal & Eğlence',
    tutar: 580,
    aciklama: 'Arkadaşlarla Akşam Yemeği'
  },
  {
    id: 't6',
    tarih: '2026-05-12',
    tur: 'Gider',
    kategori: 'Kira & Konut',
    tutar: 12500,
    aciklama: 'Mayıs Ayı Kira Ödemesi'
  }
];

const DEFAULT_PAYMENTS: RecurringPayment[] = [
  {
    id: 'p1',
    baslik: 'İnternet Faturası (Türk Telekom)',
    tutar: 420,
    sonOdemeTarihi: '2026-05-19', // Passed by 3 days relative to 2026-05-22
    kategori: 'Faturalar',
    durum: 'Bekliyor'
  },
  {
    id: 'p2',
    baslik: 'Elektrik & Doğalgaz (Aydem)',
    tutar: 1850,
    sonOdemeTarihi: '2026-05-23', // Tomorrow
    kategori: 'Faturalar',
    durum: 'Bekliyor'
  },
  {
    id: 'p3',
    baslik: 'Ev Kirası Konut Ödemesi',
    tutar: 14500,
    sonOdemeTarihi: '2026-06-01', // 10 days left
    kategori: 'Kira & Konut',
    durum: 'Bekliyor'
  },
  {
    id: 'p4',
    baslik: 'Su Faturası (İzsu)',
    tutar: 320,
    sonOdemeTarihi: '2026-05-20', // Paid
    kategori: 'Faturalar',
    durum: 'Odendi'
  },
  {
    id: 'p5',
    baslik: 'Netflix & Spotify Abonelikleri',
    tutar: 280,
    sonOdemeTarihi: '2026-05-25', // 3 days left
    kategori: 'Sosyal & Eğlence',
    durum: 'Bekliyor'
  }
];

export const loadTransactions = (): Transaction[] => {
  const data = localStorage.getItem('finance_transactions');
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error(e);
    }
  }
  return DEFAULT_TRANSACTIONS;
};

export const saveTransactions = (transactions: Transaction[]) => {
  localStorage.setItem('finance_transactions', JSON.stringify(transactions));
};

export const loadPayments = (): RecurringPayment[] => {
  const data = localStorage.getItem('finance_payments');
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error(e);
    }
  }
  return DEFAULT_PAYMENTS;
};

export const savePayments = (payments: RecurringPayment[]) => {
  localStorage.setItem('finance_payments', JSON.stringify(payments));
};

export const loadCustomCategories = (): SheetCategory[] => {
  const data = localStorage.getItem('finance_custom_categories');
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error(e);
    }
  }
  return INITIAL_SHEET_CATEGORIES;
};

export const saveCustomCategories = (categories: SheetCategory[]) => {
  localStorage.setItem('finance_custom_categories', JSON.stringify(categories));
};
