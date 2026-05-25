import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RecurringPayment, SheetCategory, Transaction } from '../types';
import { getDaysRemaining, loadCustomCategories } from '../db';
import { Calendar, Edit3, Check, Trash2, Plus, ArrowLeft, RefreshCw, Layers } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import { getCategoryEmoji } from '../utils/emoji';

interface PaymentTrackerProps {
  payments: RecurringPayment[];
  onUpdatePayment: (payment: RecurringPayment) => void;
  onDeletePayment: (id: string) => void;
  onAddPayment: (payment: Omit<RecurringPayment, 'id'> | Omit<RecurringPayment, 'id'>[]) => void;
  onNavigateHome: () => void;
  onAddTransaction: (txn: Omit<Transaction, 'id'>) => void;
}

export default function PaymentTracker({
  payments,
  onUpdatePayment,
  onDeletePayment,
  onAddPayment,
  onNavigateHome,
  onAddTransaction,
}: PaymentTrackerProps) {
  const [editingPayment, setEditingPayment] = useState<RecurringPayment | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Pay confirmation state
  const [payTargetPayment, setPayTargetPayment] = useState<RecurringPayment | null>(null);
  const [isPayConfirmOpen, setIsPayConfirmOpen] = useState(false);

  // New payment form state
  const [newBaslik, setNewBaslik] = useState('');
  const [newTutar, setNewTutar] = useState('');
  const [newTarih, setNewTarih] = useState('');
  const [newKategori, setNewKategori] = useState('');
  const [newAltKategori, setNewAltKategori] = useState('');
  const [isTutarFocused, setIsTutarFocused] = useState(false);
  const [draftPayments, setDraftPayments] = useState<Omit<RecurringPayment, 'id'>[]>([]);

  // Edit payment form state
  const [editBaslik, setEditBaslik] = useState('');
  const [editTutar, setEditTutar] = useState('');
  const [editTarih, setEditTarih] = useState('');
  const [editKategori, setEditKategori] = useState('');

  const [customCats, setCustomCats] = useState<SheetCategory[]>([]);

  // ConfirmModal states
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [targetIdToDelete, setTargetIdToDelete] = useState<string | null>(null);
  const [targetNameToDelete, setTargetNameToDelete] = useState('');
  const [isFormCancelConfirmOpen, setIsFormCancelConfirmOpen] = useState(false);

  useEffect(() => {
    try {
      const loaded = loadCustomCategories();
      // Only keep 'Gider' categories for payment tracker / bills
      const giderOnly = loaded.filter((sc) => sc.islem === 'Gider');
      setCustomCats(giderOnly);
    } catch (e) {
      console.error('Failed to load dynamic categories inside PaymentTracker:', e);
    }
  }, []);

  const subCategoriesMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    customCats.forEach((sc) => {
      if (!map[sc.kategori]) {
        map[sc.kategori] = [];
      }
      if (!map[sc.kategori].includes(sc.altKategori)) {
        map[sc.kategori].push(sc.altKategori);
      }
    });
    return map;
  }, [customCats]);

  const availableCategories = useMemo(() => {
    return Object.keys(subCategoriesMap);
  }, [subCategoriesMap]);

  // Synergize initial form select dropdowns to use dynamic options once loaded
  useEffect(() => {
    if (availableCategories.length > 0) {
      if (!newKategori || !availableCategories.includes(newKategori)) {
        const firstCat = availableCategories[0];
        setNewKategori(firstCat);
        const subs = subCategoriesMap[firstCat] || [];
        setNewAltKategori(subs.length > 0 ? subs[0] : '');
      } else {
        const subs = subCategoriesMap[newKategori] || [];
        if (!newAltKategori || !subs.includes(newAltKategori)) {
          setNewAltKategori(subs.length > 0 ? subs[0] : '');
        }
      }
    }
  }, [availableCategories, subCategoriesMap, newKategori, newAltKategori]);

  const handleKategoriChange = (cat: string) => {
    setNewKategori(cat);
    const subList = subCategoriesMap[cat] || [];
    if (subList.length > 0) {
      setNewAltKategori(subList[0]);
    } else {
      setNewAltKategori('');
    }
  };

  const formatTurkishDisplay = (raw: string) => {
    if (!raw) return '';
    const parsed = parseFloat(raw);
    if (isNaN(parsed)) return '';
    return parsed.toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const getInputValue = () => {
    if (isTutarFocused) {
      return newTutar ? newTutar.replace(/\./g, ',') : '';
    } else {
      return formatTurkishDisplay(newTutar);
    }
  };

  const handleTutarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputVal = e.target.value;
    let clean = inputVal.replace(/[^0-9,.]/g, '');
    clean = clean.replace(/,/g, '.');
    const parts = clean.split('.');
    if (parts.length > 2) {
      clean = parts[0] + '.' + parts.slice(1).join('');
    }
    setNewTutar(clean);
  };

  const handleEditClick = (p: RecurringPayment) => {
    setEditingPayment(p);
    setEditBaslik(p.baslik);
    setEditTutar(p.tutar.toString());
    setEditTarih(p.sonOdemeTarihi);
    setEditKategori(p.kategori);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;

    onUpdatePayment({
      ...editingPayment,
      baslik: editBaslik,
      tutar: Number(editTutar),
      sonOdemeTarihi: editTarih,
      kategori: editKategori,
    });

    setEditingPayment(null);
  };

  const getBadgeStyle = (p: RecurringPayment) => {
    if (p.durum === 'Odendi') {
      return {
        bg: 'bg-emerald-600 text-white border-emerald-700 font-bold text-[10px] px-2 py-0.5',
        label: 'Ödendi ✓',
      };
    }

    const days = getDaysRemaining(p.sonOdemeTarihi);
    if (days < 0) {
      return {
        bg: 'bg-rose-600 text-white border-rose-700 font-bold text-[10px] px-2 py-0.5 animate-pulse',
        label: `Gecikti (${Math.abs(days)} Gün)`,
      };
    } else if (days === 0) {
      return {
        bg: 'bg-amber-500 text-amber-950 border-amber-600 font-bold text-[10px] px-2 py-0.5 shadow-sm',
        label: 'Bugün Son!',
      };
    } else if (days <= 4) {
      return {
        bg: 'bg-orange-500 text-white border-orange-600 font-bold text-[10px] px-2 py-0.5 shadow-xs',
        label: `${days} Gün Kaldı`,
      };
    } else if (days <= 10) {
      return {
        bg: 'bg-cyan-600 text-white border-cyan-700 font-bold text-[10px] px-2 py-0.5 shadow-xs',
        label: `${days} Gün Kaldı`,
      };
    } else {
      return {
        bg: 'bg-indigo-600 text-white border-indigo-705 font-bold text-[10px] px-2 py-0.5 shadow-xs',
        label: `${days} Gün Kaldı`,
      };
    }
  };

  const formatDateTr = (dateStr: string) => {
    if (!dateStr) return '';
    const pts = dateStr.split('-');
    if (pts.length === 3) {
      return `${pts[2]}.${pts[1]}.${pts[0]}`;
    }
    return dateStr;
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Sort: Pending payments sorted by due date ascending (closest first), followed by Paid payments
  const sortedPayments = [...payments].sort((a, b) => {
    if (a.durum !== b.durum) {
      return a.durum === 'Bekliyor' ? -1 : 1;
    }
    return a.sonOdemeTarihi.localeCompare(b.sonOdemeTarihi);
  });

  const handleAddDraftItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTarih) {
      return;
    }
    if (!newTutar) {
      return;
    }
    const val = parseFloat(newTutar);
    if (isNaN(val) || val <= 0) {
      return;
    }

    // Default to Alt Kategori if Description is empty
    const finalBaslik = newBaslik.trim() || `${newAltKategori}`;

    const draftItem: Omit<RecurringPayment, 'id'> = {
      baslik: finalBaslik,
      tutar: val,
      sonOdemeTarihi: newTarih,
      kategori: newKategori,
      durum: 'Bekliyor'
    };

    setDraftPayments([...draftPayments, draftItem]);
    
    // Clear out input for next item, preserve Date & Categories for speedy typing!
    setNewBaslik('');
    setNewTutar('');
    setIsTutarFocused(false);
  };

  const handleDeleteDraftItem = (index: number) => {
    setDraftPayments(draftPayments.filter((_, idx) => idx !== index));
  };

  const handleSaveAll = () => {
    if (draftPayments.length === 0) return;
    onAddPayment(draftPayments);
    setDraftPayments([]);
    setShowAddForm(false);
  };

  const handleCancelForm = () => {
    if (draftPayments.length > 0) {
      setIsFormCancelConfirmOpen(true);
    } else {
      setDraftPayments([]);
      setShowAddForm(false);
    }
  };

  const handleConfirmCancelForm = () => {
    setDraftPayments([]);
    setShowAddForm(false);
    setIsFormCancelConfirmOpen(false);
  };

  // 3 KPIs calculation for Recurring Payments
  const overdueTotal = useMemo(() => {
    return payments
      .filter((p) => p.durum === 'Bekliyor' && getDaysRemaining(p.sonOdemeTarihi) < 0)
      .reduce((sum, p) => sum + p.tutar, 0);
  }, [payments]);

  const pendingTotal = useMemo(() => {
    return payments
      .filter((p) => p.durum === 'Bekliyor' && getDaysRemaining(p.sonOdemeTarihi) >= 0)
      .reduce((sum, p) => sum + p.tutar, 0);
  }, [payments]);

  const grandTotal = useMemo(() => {
    return overdueTotal + pendingTotal;
  }, [overdueTotal, pendingTotal]);

  const handleConfirmPay = () => {
    if (!payTargetPayment) return;
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Create actual expense transaction in database
    onAddTransaction({
      tarih: todayStr,
      tur: 'Gider',
      kategori: payTargetPayment.kategori || 'Faturalar',
      altKategori: 'Genel',
      tutar: payTargetPayment.tutar,
      aciklama: `${payTargetPayment.baslik} Ödemesi`
    });

    // Mark as paid
    onUpdatePayment({
      ...payTargetPayment,
      durum: 'Odendi',
      sonOdemeTarihi: todayStr,
      aktifPasif: 'Pasif'
    });

    setIsPayConfirmOpen(false);
    setPayTargetPayment(null);
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Header and Add Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateHome}
            className="p-2 bg-white rounded-full text-slate-600 hover:bg-slate-50 border border-slate-100/50"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-display font-bold text-slate-800">Ödemelerim</h2>
            <p className="text-xs text-slate-500">Düzenli ve yaklaşan sabit ödemelerinizin takibi</p>
          </div>
        </div>

        <button
          onClick={() => {
            if (showAddForm) {
              handleCancelForm();
            } else {
              setShowAddForm(true);
            }
          }}
          className={`p-2.5 rounded-full transition-all shadow-sm cursor-pointer ${
            showAddForm ? 'bg-rose-500 hover:bg-rose-600 text-white rotate-45' : 'bg-slate-900 hover:bg-black text-white'
          }`}
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* 3 KPIs Dashboard Panel */}
      <div className="grid grid-cols-3 gap-2 md:gap-3 text-sans">
        {/* Overdue Card */}
        <div className="p-3 bg-rose-50 border border-rose-200/60 rounded-2xl flex flex-col justify-between shadow-3xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-extrabold text-rose-850 uppercase tracking-widest">GÜNÜ GEÇMİŞ</span>
            <div className="w-5 h-5 rounded-full bg-rose-100 flex items-center justify-center text-rose-700">
              <span className="text-xs font-bold font-mono">!</span>
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-sm md:text-base font-black font-mono text-rose-950 leading-none">
              {formatCurrency(overdueTotal)}
            </span>
            <p className="text-[8.5px] text-rose-700/80 font-bold mt-0.5">Ödemesi gecikmiş</p>
          </div>
        </div>

        {/* Regular Pending Card */}
        <div className="p-3 bg-amber-50 border border-amber-200/60 rounded-2xl flex flex-col justify-between shadow-3xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-extrabold text-amber-850 uppercase tracking-widest font-sans">BEKLEYENLER</span>
            <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
              <span className="text-xs">⏳</span>
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-sm md:text-base font-black font-mono text-amber-950 leading-none">
              {formatCurrency(pendingTotal)}
            </span>
            <p className="text-[8.5px] text-amber-700/80 font-bold mt-0.5">YAKLAŞANLAR</p>
          </div>
        </div>

        {/* Grand Total Card */}
        <div className="p-2.5 md:p-3 bg-indigo-50 border border-indigo-200/60 rounded-2xl flex flex-col justify-between shadow-3xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-extrabold text-indigo-850 uppercase tracking-widest font-sans">GENEL TOPLAM</span>
            <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700">
              <span className="text-xs">💳</span>
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-sm md:text-base font-black font-mono text-indigo-950 leading-none">
              {formatCurrency(grandTotal)}
            </span>
            <p className="text-[8.5px] text-indigo-700/80 font-bold mt-0.5 font-sans">Toplam borç yükü</p>
          </div>
        </div>
      </div>

      {/* Add Recurring Payment Collapsible Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mobile-card p-4 bg-white border border-slate-200 shadow-md rounded-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                  📥 Toplu Sabit Ödeme Ekle
                </h3>
                <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold">
                  Sırayla ekleyin, sonra kaydedin
                </span>
              </div>

              <form onSubmit={handleAddDraftItem} className="space-y-3">
                {/* 1. Son Ödeme Günü (Tarih) */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest block font-sans">1. SON ÖDEME GÜNÜ *</label>
                  <input
                    type="date"
                    required
                    value={newTarih}
                    onChange={(e) => setNewTarih(e.target.value)}
                    className="w-full p-2.5 text-xs border border-slate-250 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 font-mono text-slate-800"
                  />
                </div>

                {/* 2 & 3: Kategori ve Alt Kategori Yan yana */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest block font-sans">2. KATEGORİ *</label>
                    <select
                      value={newKategori}
                      onChange={(e) => handleKategoriChange(e.target.value)}
                      className="w-full p-2.5 text-xs bg-slate-50 border border-slate-250 rounded-xl outline-none focus:ring-1 focus:ring-indigo-505 text-slate-800 font-bold"
                    >
                      {availableCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {getCategoryEmoji(cat)} {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest block font-sans">3. ALT KATEGORİ *</label>
                    <select
                      value={newAltKategori}
                      onChange={(e) => setNewAltKategori(e.target.value)}
                      className="w-full p-2.5 text-xs bg-slate-50 border border-slate-250 rounded-xl outline-none focus:ring-1 focus:ring-indigo-550 text-slate-800 font-bold"
                    >
                      {(subCategoriesMap[newKategori] || []).map((sub) => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 4. Tutar */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest block font-sans">4. TUTAR *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">₺</span>
                    <input
                      type="text"
                      required
                      placeholder="0,00"
                      value={getInputValue()}
                      onChange={handleTutarChange}
                      onFocus={() => setIsTutarFocused(true)}
                      onBlur={() => setIsTutarFocused(false)}
                      className="w-full pl-7 p-2.5 text-xs border border-slate-250 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 font-mono text-slate-850 font-bold"
                    />
                  </div>
                </div>

                {/* 5. Açıklama / Fatura Adı (Opsiyonel) */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest block font-sans">5. FARKLI BİR AD / AÇIKLAMA (OPSİYONEL)</label>
                  <input
                    type="text"
                    placeholder={`${newAltKategori} (Varsayılan)`}
                    value={newBaslik}
                    onChange={(e) => setNewBaslik(e.target.value)}
                    className="w-full p-2.5 text-xs border border-slate-250 rounded-xl outline-none focus:ring-1 focus:ring-indigo-505 bg-slate-50 text-slate-800"
                  />
                </div>

                {/* Listeye Ekle Butonu */}
                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1 shadow-sm mt-1 pb-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Listeye Ekle</span>
                </button>
              </form>

              {/* Draft additions preview board */}
              {draftPayments.length > 0 && (
                <div className="border-t border-slate-200 pt-3 mt-1 space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[11px] font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1 font-sans">
                      📋 Kaydedilecek Ödemeler ({draftPayments.length})
                    </span>
                    <span className="text-[10px] font-mono font-black text-slate-800">
                      Toplam: {formatCurrency(draftPayments.reduce((acc, x) => acc + x.tutar, 0))}
                    </span>
                  </div>

                  <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                    {draftPayments.map((item, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-2 rounded-xl bg-indigo-50/50 border border-indigo-100 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono text-[13px]">{getCategoryEmoji(item.kategori)}</span>
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-900 truncate text-[11px] leading-tight font-sans">{item.baslik}</h4>
                            <p className="text-[9px] text-slate-500 font-mono leading-none mt-0.5">
                              {formatDateTr(item.sonOdemeTarihi)} • {item.kategori}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono font-extrabold text-slate-950 text-[11px]">
                            {formatCurrency(item.tutar)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteDraftItem(index)}
                            className="p-1 hover:bg-rose-100 hover:text-rose-600 rounded-lg text-slate-450 transition-colors"
                            title="Çıkar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom Actions for Form */}
              <div className="flex gap-2.5 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="flex-1 py-2.5 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 font-bold rounded-xl transition-colors cursor-pointer font-sans"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={handleSaveAll}
                  disabled={draftPayments.length === 0}
                  className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-colors shadow-xs cursor-pointer text-center flex items-center justify-center gap-1 font-sans ${
                    draftPayments.length === 0
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>Bitir ve Kaydet ({draftPayments.length})</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compact & High Visibility Payment Cards List */}
      <div className="space-y-2.5">
        {sortedPayments.map((p) => {
          const badge = getBadgeStyle(p);
          const isOverdue = p.durum === 'Bekliyor' && getDaysRemaining(p.sonOdemeTarihi) < 0;
          
          return (
            <motion.div
              layout
              key={p.id}
              className={`p-3 rounded-2xl border transition-all duration-200 ${
                p.durum === 'Odendi'
                  ? 'bg-slate-50/75 border-slate-300 border-l-4 border-l-slate-400 opacity-80'
                  : isOverdue 
                    ? 'border-rose-300 bg-gradient-to-br from-white to-rose-50/20 border-l-4 border-l-rose-500'
                    : 'border-slate-300 bg-white border-l-4 border-l-indigo-600 shadow-xs'
              }`}
            >
              {/* Top info row: Title & Badge */}
              <div className="flex justify-between items-center gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm p-1 bg-slate-100 border border-slate-200 rounded-md flex items-center justify-center shrink-0 font-mono">
                    {getCategoryEmoji(p.kategori)}
                  </span>
                  <div className="min-w-0">
                    <h4 className="font-display font-black text-slate-900 text-[13px] truncate leading-tight">
                      {p.baslik}
                    </h4>
                    <span className="text-[9px] font-mono text-slate-500 block leading-none mt-0.5">
                      {p.kategori}
                    </span>
                  </div>
                </div>
                
                {/* Days remaining colorful Badge */}
                <span className={`text-[10px] font-mono font-extrabold px-2.5 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${badge.bg}`}>
                  {badge.label}
                </span>
              </div>

              {/* Amount and due-date details + Action Row */}
              <div className="flex justify-between items-center gap-2 mt-2.5 pt-2 border-t border-slate-200">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Tutar Pod */}
                  <div className="flex items-center gap-1 font-mono font-black text-slate-900 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg text-xs leading-none">
                    <span className="text-slate-500 font-bold text-[8.5px] uppercase">TUTAR:</span>
                    <span>{formatCurrency(p.tutar)}</span>
                  </div>

                  {/* Son Gün Pod (Strictly single line, Turkish date format) */}
                  <div className="flex items-center gap-1 font-mono font-black text-slate-900 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg text-xs leading-none whitespace-nowrap shrink-0">
                    <span className="text-slate-500 font-bold text-[8.5px] uppercase">SON GÜN:</span>
                    <span className="text-slate-800">{formatDateTr(p.sonOdemeTarihi)}</span>
                  </div>
                </div>

                {/* Compact Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleEditClick(p)}
                    className="p-1 px-2 text-[10px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-350 rounded-lg flex items-center gap-0.5 transition-all cursor-pointer"
                    title="Düzelt"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Düzelt</span>
                  </button>

                  {p.durum === 'Bekliyor' ? (
                    <button
                      onClick={() => {
                        setPayTargetPayment(p);
                        setIsPayConfirmOpen(true);
                      }}
                      className="p-1 px-2 text-[10px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-lg flex items-center gap-0.5 transition-all cursor-pointer"
                    >
                      <Check className="w-3 h-3 text-emerald-700" />
                      <span className="font-extrabold">Öde</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onUpdatePayment({ ...p, durum: 'Bekliyor' })}
                      className="p-1 px-1.5 text-[10px] font-bold text-slate-600 bg-slate-200 hover:bg-slate-300 border border-slate-300 rounded-lg flex items-center gap-0.5 transition-all cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Geri Al</span>
                    </button>
                  )}
                  
                  <button
                    onClick={() => {
                      setTargetIdToDelete(p.id);
                      setTargetNameToDelete(p.baslik);
                      setIsConfirmOpen(true);
                    }}
                    className="p-1 text-rose-650 hover:bg-rose-100 border border-transparent hover:border-rose-200 rounded-lg transition-colors cursor-pointer"
                    title="Sil"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )
        })}

        {payments.length === 0 && (
          <div className="text-center py-10 text-slate-400">
            <p className="text-sm">Takip edilen aktif fatura bulunmuyor.</p>
          </div>
        )}
      </div>

      {/* Editing Dialog Modal */}
      <AnimatePresence>
        {editingPayment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-[25px] p-6 max-w-sm w-full shadow-2xl space-y-4"
            >
              <h3 className="text-lg font-display font-bold text-slate-800">✍ Faturayı Güncelle</h3>
              
              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Fatura Adı</label>
                  <input
                    type="text"
                    required
                    value={editBaslik}
                    onChange={(e) => setEditBaslik(e.target.value)}
                    className="w-full p-3 text-xs border border-slate-100 rounded-xl outline-none focus:ring-1 focus:ring-pastel-blue-dark"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Kategori</label>
                  <select
                    value={editKategori}
                    onChange={(e) => setEditKategori(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-pastel-blue-dark text-slate-800 font-bold"
                  >
                    {availableCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {getCategoryEmoji(cat)} {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tutar</label>
                    <input
                      type="number"
                      required
                      value={editTutar}
                      onChange={(e) => setEditTutar(e.target.value)}
                      className="w-full p-3 text-xs border border-slate-100 rounded-xl outline-none focus:ring-1 focus:ring-pastel-blue-dark"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Son Ödeme Günü</label>
                    <input
                      type="date"
                      required
                      value={editTarih}
                      onChange={(e) => setEditTarih(e.target.value)}
                      className="w-full p-3 text-xs border border-slate-100 rounded-xl outline-none focus:ring-1 focus:ring-pastel-blue-dark"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingPayment(null)}
                    className="flex-1 py-3 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                  >
                    Kapat
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 text-xs bg-pastel-blue hover:bg-pastel-blue-dark text-slate-800 font-bold rounded-xl transition-colors"
                  >
                    Güncelle
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal for deletion */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Düzenli Ödemeyi Sil"
        message={`"${targetNameToDelete}" isimli düzenli ödeme takibini ve tüm detaylarını kalıcı olarak silmek istediğinizden emin misiniz?`}
        confirmText="Evet, Sil"
        cancelText="Vazgeç"
        isDangerous={true}
        onConfirm={() => {
          if (targetIdToDelete) {
            onDeletePayment(targetIdToDelete);
          }
          setIsConfirmOpen(false);
          setTargetIdToDelete(null);
          setTargetNameToDelete('');
        }}
        onCancel={() => {
          setIsConfirmOpen(false);
          setTargetIdToDelete(null);
          setTargetNameToDelete('');
        }}
      />

      {/* Confirmation Modal for Form draft cancellation */}
      <ConfirmModal
        isOpen={isFormCancelConfirmOpen}
        title="Formu Kapat"
        message="Hazırladığınız ödemeler henüz kaydedilmedi. Kaydetmeden çıkmak istiyor musunuz?"
        confirmText="Çık, Kaydı Sil"
        cancelText="Yazmaya Devam Et"
        isDangerous={true}
        onConfirm={handleConfirmCancelForm}
        onCancel={() => setIsFormCancelConfirmOpen(false)}
      />

      {/* Confirmation Modal for Paying Fatura */}
      <ConfirmModal
        isOpen={isPayConfirmOpen}
        title="Ödeme İşlemi Onayı"
        message={`"${payTargetPayment?.baslik}" fatura/ödeme işlemi gerçekleşecektir. Bu kayıt, ödeme günü (bugün) yeni bir "Gider" işlemi olarak kaydedilecek ve bekleyen listesinden kaldırılacaktır. Onaylıyor musunuz?`}
        confirmText="Evet, Öde"
        cancelText="Vazgeç"
        isDangerous={false}
        onConfirm={handleConfirmPay}
        onCancel={() => {
          setIsPayConfirmOpen(false);
          setPayTargetPayment(null);
        }}
      />
    </div>
  );
}
