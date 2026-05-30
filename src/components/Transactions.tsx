import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction, SheetCategory } from '../types';
import { loadCustomCategories } from '../db';
import { ArrowLeft, Search, Trash2, ArrowDownLeft, ArrowUpRight, Calendar } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import { getCategoryEmoji } from '../utils/emoji';
import { getCategoryPalette } from '../utils/categoryColors';

interface TransactionsProps {
  transactions: Transaction[];
  onDeleteTransaction: (id: string) => void;
  onNavigateHome: () => void;
  hideSensitiveData?: boolean;
}

export default function Transactions({
  transactions,
  onDeleteTransaction,
  onNavigateHome,
  hideSensitiveData = false,
}: TransactionsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'Tümü' | 'Gelir' | 'Gider'>('Tümü');
  const [selectedCategory, setSelectedCategory] = useState('Tümü');
  const [customCats, setCustomCats] = useState<SheetCategory[]>([]);
  const [sortOrder, setSortOrder] = useState<'yeni' | 'eski' | 'yuksek' | 'dusuk'>('yeni');
  
  // Date range state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Confirmation Modal state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [targetIdToDelete, setTargetIdToDelete] = useState<string | null>(null);
  const [targetNameToDelete, setTargetNameToDelete] = useState('');

  useEffect(() => {
    try {
      setCustomCats(loadCustomCategories());
    } catch (e) {
      console.error('Failed to load dynamic categories inside Transactions view:', e);
    }
  }, []);

  const formatCurrency = (val: number) => {
    if (hideSensitiveData) return '•••• ₺';
    if (val === undefined || val === null || isNaN(val)) return '0,00 ₺';
    return val.toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + ' ₺';
  };


  // Compile matching category list dynamically from system configured categories
  const categories = useMemo(() => {
    const filteredCats = filterType === 'Tümü'
      ? customCats
      : customCats.filter(c => c.islem === filterType);
    const uniqueFromSettings = Array.from(new Set(filteredCats.map(c => c.kategori)));
    return ['Tümü', ...uniqueFromSettings];
  }, [customCats, filterType]);

  // Adjust selectedCategory tab if it is no longer within newly compiled options
  useEffect(() => {
    if (selectedCategory !== 'Tümü' && !categories.includes(selectedCategory)) {
      setSelectedCategory('Tümü');
    }
  }, [categories, selectedCategory]);

  const filteredTransactions = useMemo(() => {
    const list = transactions.filter((t) => {
      const matchesSearch =
        t.aciklama.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.kategori.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.altKategori && t.altKategori.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesType = filterType === 'Tümü' || t.tur === filterType;
      const matchesCategory = selectedCategory === 'Tümü' || t.kategori === selectedCategory;

      // Date range validation
      const matchesStart = !startDate || t.tarih >= startDate;
      const matchesEnd = !endDate || t.tarih <= endDate;

      return matchesSearch && matchesType && matchesCategory && matchesStart && matchesEnd;
    });

    return [...list].sort((a, b) => {
      if (sortOrder === 'yeni') {
        const dateCompare = b.tarih.localeCompare(a.tarih);
        return dateCompare !== 0 ? dateCompare : b.id.localeCompare(a.id);
      }
      if (sortOrder === 'eski') {
        const dateCompare = a.tarih.localeCompare(b.tarih);
        return dateCompare !== 0 ? dateCompare : a.id.localeCompare(b.id);
      }
      if (sortOrder === 'yuksek') {
        return b.tutar - a.tutar;
      }
      if (sortOrder === 'dusuk') {
        return a.tutar - b.tutar;
      }
      return 0;
    });
  }, [transactions, searchTerm, filterType, selectedCategory, startDate, endDate, sortOrder]);

  const promptDeleteTransaction = (id: string, detail: string) => {
    setTargetIdToDelete(id);
    setTargetNameToDelete(detail);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (targetIdToDelete) {
      onDeleteTransaction(targetIdToDelete);
    }
    setIsConfirmOpen(false);
    setTargetIdToDelete(null);
    setTargetNameToDelete('');
  };

  return (
    <div className="space-y-6 pb-6 select-text">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateHome}
            className="p-2 bg-white rounded-full text-slate-600 hover:bg-slate-50 border border-slate-100/50"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-display font-bold text-slate-800">Tüm İşlemler</h2>
            <p className="text-xs text-slate-500">Hesabınızın güncel gelir ve gider geçmişi</p>
          </div>
        </div>
      </div>

      {/* Modern Filter Board container */}
      <div className="bg-white border border-slate-200/80 p-4 rounded-[24px] shadow-sm space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Açıklama veya kategori ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 text-xs bg-slate-50 border border-slate-250 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 font-bold placeholder:font-normal"
          />
        </div>

        {/* Type Filter Tabs (Gider, Gelir, Tümü) */}
        <div className="grid grid-cols-3 gap-2">
          {(['Tümü', 'Gelir', 'Gider'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`py-2.5 px-3 text-xs rounded-xl border transition-all cursor-pointer font-sans ${
                filterType === type
                  ? type === 'Gelir'
                    ? 'bg-emerald-600 border-emerald-600 text-white font-black shadow-xs'
                    : type === 'Gider'
                      ? 'bg-rose-500 border-rose-500 text-white font-black shadow-xs'
                      : 'bg-slate-900 border-slate-900 text-white font-black shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-800 font-bold'
              }`}
            >
              {type === 'Tümü' ? 'Tümü' : type === 'Gelir' ? '💰 Gelir' : '💸 Gider'}
            </button>
          ))}
        </div>

        {/* 2 Column filter panel for dropdown & date-range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-1">
          {/* Category Selector Dropdown */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest block font-sans">KATEGORİ SÜZGECİ</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-250 rounded-xl outline-none focus:ring-1 focus:ring-indigo-550 text-slate-850 font-extrabold font-sans cursor-pointer"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'Tümü' ? '📦 Tüm Kategoriler' : `${getCategoryEmoji(cat)} ${cat}`}
                </option>
              ))}
            </select>
          </div>

          {/* Date Selector Range */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest block font-sans">TARİH ARALIĞI (İLK - SON)</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-11 px-3 text-xs bg-slate-50 border border-slate-250 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 font-bold"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-11 px-3 text-xs bg-slate-50 border border-slate-250 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 font-bold"
              />
            </div>
            {(startDate || endDate) && (
              <div className="flex justify-end pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="text-[10px] font-bold text-rose-500 hover:text-rose-600 hover:underline font-sans cursor-pointer"
                >
                  Tarihleri Temizle
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
            Süzülen İşlemler ({filteredTransactions.length})
          </h4>
          <div className="flex items-center gap-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase font-sans">Sıralama:</span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="text-[10.5px] font-bold text-indigo-650 bg-indigo-50 border border-indigo-100 rounded-md py-1 px-1.5 outline-none font-sans cursor-pointer"
            >
              <option value="yeni">En Yeni İlk</option>
              <option value="eski">En Eski İlk</option>
              <option value="yuksek">Tutar: Azalan</option>
              <option value="dusuk">Tutar: Artan</option>
            </select>
          </div>
        </div>

        <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-0.5 scrollbar-thin">
          <AnimatePresence initial={false}>
            {filteredTransactions.map((t) => {
              const emoji = getCategoryEmoji(t.kategori, t.altKategori, t.aciklama);
              const isGelir = t.tur === 'Gelir';
              const trDateFormatted = t.tarih.split('-').reverse().join('.');

              const palette = getCategoryPalette(t.kategori);

              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  key={t.id}
                  className={`flex items-center justify-between p-3 rounded-2xl hover:border-indigo-400 hover:shadow-xxs border transition-all duration-200 group ${palette.bg} ${palette.border}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Rounded Image Frame container */}
                    <div className="relative w-11 h-11 bg-white border border-slate-200 rounded-2xl shadow-3xs flex items-center justify-center shrink-0">
                      <span className="text-xl select-none font-mono">{emoji}</span>
                      
                      {/* Corner signal type indicator */}
                      <span className={`absolute -bottom-0.5 -right-0.5 w-[14px] h-[14px] rounded-full border-2 border-white flex items-center justify-center text-[7.5px] font-black text-white ${
                        isGelir ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}>
                        {isGelir ? '✓' : '•'}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <h5 className="text-[12.5px] font-sans font-black text-slate-800 leading-snug truncate">
                        {t.aciklama?.trim() && t.aciklama !== "undefined"
                          ? t.aciklama
                          : (t.altKategori && t.altKategori !== 'Genel' ? t.altKategori : t.kategori)}
                      </h5>
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5 leading-none">
                        <span className="text-[9.5px] text-slate-500 font-mono">{trDateFormatted}</span>
                        <span className="w-1 h-1 bg-slate-200 rounded-full" />
                        <span className={`text-[9.5px] font-black px-1.5 py-0.5 border rounded-md font-sans leading-none block ${palette.badge}`}>
                          {t.kategori}{t.altKategori ? ` › ${t.altKategori}` : ''}
                        </span>
                        {t.faturaFile && (
                          <>
                            <span className="w-1 h-1 bg-slate-200 rounded-full" />
                            <span className="text-[8.5px] bg-[#ebf5fb] text-[#2995ce] border border-[#cbe1ef] px-1.5 py-0.5 rounded-sm font-semibold tracking-wider font-sans animate-pulse">
                              📎 BELGE
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Price block & Action button */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="text-right flex flex-col items-end leading-tight">
                      <span className={`text-[12.5px] font-mono font-black ${isGelir ? 'text-emerald-700' : 'text-slate-900'}`}>
                        {isGelir ? '+' : '-'} {formatCurrency(t.tutar)}
                      </span>
                      {t.usdRate && (
                        <span className="text-[9.5px] text-slate-400 font-mono tracking-tight leading-none mt-0.5" title={hideSensitiveData ? undefined : `Kur: ${t.usdRate} TL`}>
                          {isGelir ? '+' : '-'} {hideSensitiveData ? '••••' : `$${parseFloat((t.tutar / t.usdRate).toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2 })}`} USD
                        </span>
                      )}
                    </div>
                    
                    <motion.button
                      whileTap={{ scale: 0.88 }}
                      onClick={() => promptDeleteTransaction(t.id, t.aciklama)}
                      className="p-2 text-rose-500 bg-white hover:bg-rose-500 hover:text-white border border-rose-150 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0"
                      title="İşlemi Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {filteredTransactions.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-400">
              <p className="text-xs font-semibold">Cihazınızda kayıtlı bu kriterlere uygun işlem bulunamadı.</p>
            </div>
          )}
        </div>
      </div>

      {/* Premium Confirm modal */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        title="İşlem Silme Onayı"
        message={`"${targetNameToDelete}" isimli işlem kaydını kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`}
        confirmText="Evet, Sil"
        cancelText="Vazgeç"
        isDangerous={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
}
