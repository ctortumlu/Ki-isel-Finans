import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction, INITIAL_SHEET_CATEGORIES, SheetCategory } from '../types';
import { getReferenceDate, loadCustomCategories } from '../db';
import { Calendar, FileText, ArrowLeft, Layers } from 'lucide-react';
import { getCategoryEmoji, stripEmoji } from '../utils/emoji';
import { fetchExchangeRateForDate } from '../utils/usdFetcher';

interface QuickRecordProps {
  onSave: (transaction: Omit<Transaction, 'id'>) => void;
  onNavigateHome: () => void;
}

export default function QuickRecord({ onSave, onNavigateHome }: QuickRecordProps) {
  const todayStr = getReferenceDate().toISOString().split('T')[0];

  const [tur, setTur] = useState<'Gelir' | 'Gider'>('Gider');
  const [tarih, setTarih] = useState(todayStr);
  const [kategori, setKategori] = useState('');
  const [altKategori, setAltKategori] = useState('');
  const [tutar, setTutar] = useState('');
  const [aciklama, setAciklama] = useState('');
  const [isTutarFocused, setIsTutarFocused] = useState(false);
  
  // Exchange rate configuration states inside Form
  const [usdRateValue, setUsdRateValue] = useState<string>('');
  const [usdRateStatus, setUsdRateStatus] = useState<'fetching' | 'success' | 'failed' | 'manual'>('fetching');

  // Trigger auto rate fetch whenever date decreases/increases
  useEffect(() => {
    let active = true;
    setUsdRateStatus('fetching');

    fetchExchangeRateForDate(tarih).then((rate) => {
      if (!active) return;
      if (rate) {
        setUsdRateValue(rate.toFixed(4));
        setUsdRateStatus('success');
      } else {
        setUsdRateValue('34.25');
        setUsdRateStatus('failed');
      }
    }).catch(() => {
      if (!active) return;
      setUsdRateValue('34.25');
      setUsdRateStatus('failed');
    });

    return () => {
      active = false;
    };
  }, [tarih]);
  
  // Custom states for dynamic category mapping
  const [sheetCategories, setSheetCategories] = useState<SheetCategory[]>(INITIAL_SHEET_CATEGORIES);

  const [showSuccessModal, setShowSuccessModal] = useState(false);

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
      return tutar ? tutar.replace(/\./g, ',') : '';
    } else {
      return formatTurkishDisplay(tutar);
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
    setTutar(clean);
  };

  // Dynamic category mapping from local storage
  useEffect(() => {
    const loadDynamicCategories = () => {
      try {
        const localCats = loadCustomCategories();
        setSheetCategories(localCats);
      } catch (e) {
        console.error('Failed to load custom categories:', e);
      }
    };
    loadDynamicCategories();
  }, [tur]);

  // Determine parent categories based on Gider/Gelir
  const availableParentCategories: string[] = Array.from(
    new Set<string>(
      sheetCategories
        .filter((sc) => sc.islem === tur)
        .map((sc) => sc.kategori)
    )
  );

  // Get matching sub-categories
  const availableSubCategories = sheetCategories
    .filter((sc) => sc.islem === tur && sc.kategori === kategori)
    .map((sc) => sc.altKategori);

  const isValid = tutar !== '' && Number(tutar) > 0 && kategori !== '' && altKategori !== '';

  const handleParentCategorySelect = (catName: string) => {
    setKategori(catName);
    const subs = sheetCategories
      .filter((sc) => sc.islem === tur && sc.kategori === catName)
      .map((sc) => sc.altKategori);
    
    if (subs.length > 0) {
      setAltKategori(subs[0]);
    } else {
      setAltKategori('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    const desc = aciklama.trim() || altKategori;

    // Call native save back to local state & index lists
    onSave({
      tarih,
      tur,
      kategori,
      altKategori,
      tutar: Number(tutar),
      aciklama: desc,
      faturaFile: undefined,
      usdRate: usdRateValue ? parseFloat(usdRateValue) : undefined
    });

    setShowSuccessModal(true);
  };

  const resetForm = () => {
    setTutar('');
    setAciklama('');
    setKategori('');
    setAltKategori('');
    setTur('Gider');
    setTarih(todayStr);
    setUsdRateValue('');
    setUsdRateStatus('fetching');
    setShowSuccessModal(false);
  };

  return (
    <div className="space-y-6 pb-6 relative animate-fade-in" id="hizli-kayit-alani">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onNavigateHome}
          id="btn-hizli-kayit-geri"
          className="p-2 bg-white rounded-full text-slate-600 hover:bg-slate-50 border border-slate-100/50"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-display font-bold text-slate-800 flex items-center gap-1.5">
            Yeni Kayıt Ekle
          </h2>
          <p className="text-xs text-slate-500">
            Verileriniz güvenli, gizli ve anında telefonunuzda saklanır
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" id="form-hizli-kayit">
        
        {/* Type Selection: Gelir / Gider (Large touch friendly layout) */}
        <div className="space-y-2">
          <label className="text-[11.5px] font-bold uppercase tracking-wider text-slate-700 block px-1">
            İşlem Türü
          </label>
          <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-200/60 border border-slate-300 rounded-2xl">
            <button
              type="button"
              id="btn-tur-gider"
              onClick={() => {
                setTur('Gider');
                setKategori('');
                setAltKategori('');
              }}
              className={`py-3.5 rounded-xl font-display font-bold text-center transition-all cursor-pointer ${
                tur === 'Gider'
                  ? 'bg-rose-600 text-white shadow-sm scale-[1.02]'
                  : 'text-slate-700 hover:text-slate-900 font-bold bg-white/40'
              }`}
            >
              💸 GİDER
            </button>
            <button
              type="button"
              id="btn-tur-gelir"
              onClick={() => {
                setTur('Gelir');
                setKategori('');
                setAltKategori('');
              }}
              className={`py-3.5 rounded-xl font-display font-bold text-center transition-all cursor-pointer ${
                tur === 'Gelir'
                  ? 'bg-emerald-600 text-white shadow-sm scale-[1.02]'
                  : 'text-slate-700 hover:text-slate-900 font-bold bg-white/40'
              }`}
            >
              💰 GELİR
            </button>
          </div>
        </div>

        {/* Tarih (Solda) ve Tutar (Sağda) Yan Yana */}
        <div className="grid grid-cols-2 gap-3">
          {/* Input: Tarih (SOLDA) */}
          <div className="space-y-1.5">
            <label className="text-[11.5px] font-bold uppercase tracking-wider text-slate-700 block px-1">
              İşlem Tarihi
            </label>
            <div className="relative">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4.5 h-4.5 pointer-events-none" />
              <input
                type="date"
                required
                id="input-hizli-kayit-tarih"
                value={tarih}
                onChange={(e) => setTarih(e.target.value)}
                className="w-full h-[52px] pl-10 pr-2 text-xs text-slate-900 bg-white border border-slate-300 rounded-2xl shadow-xs focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold"
              />
            </div>
          </div>

          {/* Input: Tutar (SAĞDA, Text tabanlı ve okları kaldırılmış, Dinamik font boyutu) */}
          <div className="space-y-1.5">
            <label className="text-[11.5px] font-bold uppercase tracking-wider text-slate-700 block px-1">
              Tutar
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">₺</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                required
                id="input-hizli-kayit-tutar"
                value={getInputValue()}
                onChange={handleTutarChange}
                onFocus={() => setIsTutarFocused(true)}
                onBlur={() => setIsTutarFocused(false)}
                className={`w-full h-[52px] text-right pr-4 pl-8 font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-2xl shadow-xs focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 ${
                  getInputValue().length < 10
                    ? 'text-base'
                    : getInputValue().length < 13
                      ? 'text-sm'
                      : getInputValue().length < 16
                        ? 'text-xs'
                        : 'text-[10px]'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Dolar Kuru (USD/TRY) Sadece İstenildiğinde Manuel Değiştirilebilen Bölüm */}
        <div className="space-y-1.5 bg-white p-4 rounded-2xl border border-slate-300 shadow-xs">
          <div className="flex justify-between items-center px-1">
            <label className="text-[11.5px] font-bold uppercase tracking-wider text-slate-700 block">
              Dolar Kuru (USD/TRY)
            </label>
            <span className={`text-[9.5px] font-bold font-mono px-2 py-0.5 rounded-full ${
              usdRateStatus === 'fetching' ? 'bg-amber-50 text-amber-600 animate-pulse' :
              usdRateStatus === 'success' ? 'bg-emerald-50 text-emerald-600' :
              usdRateStatus === 'manual' ? 'bg-indigo-50 text-indigo-600 font-bold' :
              'bg-slate-100 text-slate-500'
            }`}>
              {usdRateStatus === 'fetching' ? '⏳ Sorgulanıyor...' :
               usdRateStatus === 'success' ? '✓ Otomatik Kur' :
               usdRateStatus === 'manual' ? '✍️ Elle Değiştirildi' :
               '⏱️ Sabit Kur'}
            </span>
          </div>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">$</span>
            <input
              type="number"
              step="0.0001"
              id="input-hizli-kayit-dolar-kuru"
              value={usdRateValue}
              onChange={(e) => {
                setUsdRateValue(e.target.value);
                setUsdRateStatus('manual');
              }}
              className="w-full h-[52px] pl-8 pr-16 text-xs font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-2xl shadow-xs focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
              placeholder="34.25"
            />
            {usdRateValue && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10.5px] font-mono text-slate-400 font-bold">
                TRY
              </span>
            )}
          </div>
        </div>

        {/* Dynamic Category & Subcategory Selectors (High Contrast) */}
        <div className="space-y-4 bg-white p-4 rounded-2xl border border-slate-300 shadow-xs">
          {/* Ana Kategori */}
          <div className="space-y-1.5">
            <label className="text-[11.5px] font-bold uppercase tracking-wider text-slate-700 block px-1">
              Kategori
            </label>
            <div className="relative">
              <select
                id="select-hizli-kayit-kategori"
                value={kategori}
                onChange={(e) => handleParentCategorySelect(e.target.value)}
                className="w-full p-3.5 pr-10 text-xs text-slate-900 bg-slate-100 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold appearance-none cursor-pointer"
              >
                <option value="">📂 Kategori Seçin...</option>
                {availableParentCategories.map((catName) => (
                  <option key={catName} value={catName}>
                    {getCategoryEmoji(catName)} {stripEmoji(catName)}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-600">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Alt Kategori */}
          {kategori && (
            <div className="space-y-1.5 animate-slide-up">
              <label className="text-[11.5px] font-bold uppercase tracking-wider text-slate-700 block px-1 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-indigo-600" /> Alt Kategori / Detay
              </label>
              <div className="relative">
                <select
                  id="select-hizli-kayit-altkategori"
                  value={altKategori}
                  onChange={(e) => setAltKategori(e.target.value)}
                  className="w-full p-3.5 pr-10 text-xs text-slate-900 bg-slate-100 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold appearance-none cursor-pointer"
                >
                  <option value="">🏷️ Alt Kategori Seçin...</option>
                  {availableSubCategories.map((subName) => (
                    <option key={subName} value={subName}>
                      {getCategoryEmoji(subName)} {stripEmoji(subName)}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-600">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                  </svg>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input: Açıklama */}
        <div className="space-y-1.5">
          <label className="text-[11.5px] font-bold uppercase tracking-wider text-slate-700 block px-1">
            Açıklama
          </label>
          <div className="relative">
            <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 pointer-events-none" />
            <input
              type="text"
              placeholder={altKategori ? `${altKategori} kaydı` : "Açıklama giriniz..."}
              id="input-hizli-kayit-aciklama"
              value={aciklama}
              onChange={(e) => setAciklama(e.target.value)}
              className="w-full pl-12 pr-4 py-4 text-slate-900 bg-white border border-slate-300 rounded-2xl shadow-xs focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold placeholder:text-slate-400 placeholder:font-normal"
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!isValid}
          id="btn-hizli-kayit-ekle"
          className={`w-full py-4 text-center text-white font-display font-bold text-lg rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 ${
            isValid
              ? 'bg-slate-900 hover:bg-black text-white shadow-md transform hover:translate-y-[-1px] hover:shadow-lg cursor-pointer'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
          }`}
        >
          {tur === 'Gelir' ? '💰 Gelir Ekle' : '💸 Gider Ekle'}
        </button>
      </form>

      {/* Success Modal Overlay */}
      <AnimatePresence>
        {showSuccessModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
            id="success-modal-overlay"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-[32px] p-6 max-w-sm w-full text-center shadow-xl relative overflow-hidden border border-slate-50"
              id="hizli-kayit-basarili-modal"
            >
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3.5 text-xl font-bold">
                ✓
              </div>
              
              <h3 className="text-base font-display font-bold text-slate-800">İşlem Onaylandı</h3>
              <p className="text-xs text-slate-500 mt-1 pb-1.5 leading-relaxed">
                Kayıt başarılı! Verileriniz telefon belleğinde güncellendi.
              </p>

              {/* Show Receipt detail */}
              <div className="bg-slate-50/80 rounded-2xl p-4 my-3 text-left font-mono text-[10.5px] text-slate-600 border border-slate-100 space-y-2">
                <div className="flex justify-between py-0.5 border-b border-slate-100">
                  <span className="text-slate-400">Tarih:</span>
                  <span className="text-slate-800 font-bold">{tarih}</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-slate-100">
                  <span className="text-slate-400">Tür:</span>
                  <span className={`font-bold uppercase ${tur === 'Gelir' ? 'text-emerald-600' : 'text-rose-500'}`}>{tur}</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-slate-100">
                  <span className="text-slate-400">Kategori:</span>
                  <span className="text-slate-800 font-bold flex items-center gap-1">
                    <span>{getCategoryEmoji(kategori)}</span>
                    <span className="truncate max-w-[80px]">{stripEmoji(kategori)}</span>
                    <span className="text-slate-350 mx-0.5">›</span>
                    <span>{getCategoryEmoji(altKategori)}</span>
                    <span className="truncate max-w-[80px]">{stripEmoji(altKategori)}</span>
                  </span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-slate-100">
                  <span className="text-slate-400">Tutar:</span>
                  <span className="text-slate-800 font-bold">{Number(tutar).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                </div>
                {usdRateValue && parseFloat(usdRateValue) > 0 && (
                  <>
                    <div className="flex justify-between py-0.5 border-b border-slate-100 bg-emerald-50/20 px-1 rounded-xs">
                      <span className="text-emerald-600 font-semibold">USD Değeri:</span>
                      <span className="text-emerald-700 font-bold">
                        ${(Number(tutar) / parseFloat(usdRateValue)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                      </span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-slate-100 text-[10px]">
                      <span className="text-slate-400">Kaydedilen Kur:</span>
                      <span className="text-slate-500 font-bold">{parseFloat(usdRateValue).toFixed(4)} TL</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-400">Açıklama:</span>
                  <span className="text-slate-800 truncate max-w-[140px] font-sans font-medium">{aciklama || altKategori}</span>
                </div>
              </div>

              <div className="flex gap-2.5 mt-4">
                <button
                  onClick={resetForm}
                  id="btn-basari-yeni-islem"
                  className="flex-1 py-3 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all cursor-pointer"
                >
                  Yeni Kayıt
                </button>
                <button
                  onClick={() => {
                    resetForm();
                    onNavigateHome();
                  }}
                  id="btn-basari-panele-don"
                  className="flex-1 py-3 text-xs bg-slate-900 hover:bg-black text-white font-bold rounded-xl transition-all cursor-pointer"
                >
                  Kapat
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
