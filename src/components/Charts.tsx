import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction } from '../types';
import { 
  ArrowLeft, ArrowUpRight, ArrowDownLeft, PieChart, 
  BarChart3, Calendar, Filter, Search, RotateCcw, 
  TrendingUp, TrendingDown, BookOpen, Layers
} from 'lucide-react';
import { getCategoryEmoji } from '../utils/emoji';

interface ChartsProps {
  transactions: Transaction[];
  onNavigateHome: () => void;
}

type DateRangeType = 'bu_ay' | 'bu_yil' | 'tum_zamanlar' | 'ozel';

export default function Charts({ transactions, onNavigateHome }: ChartsProps) {
  // Filter States
  const [dateRangeType, setDateRangeType] = useState<DateRangeType>('bu_ay');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [filterType, setFilterType] = useState<'Tümü' | 'Gelir' | 'Gider'>('Tümü');
  const [filterCategory, setFilterCategory] = useState<string>('Tümü');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Auto Reset Filter Category if type changes
  const handleTypeChange = (type: 'Tümü' | 'Gelir' | 'Gider') => {
    setFilterType(type);
    setFilterCategory('Tümü');
  };

  // Currencies formatting helper
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Filter transactions by date range
  const dateFilteredTransactions = useMemo(() => {
    const today = new Date();
    let startLimit = new Date(1970, 0, 1);
    let endLimit = new Date(2100, 11, 31);

    if (dateRangeType === 'bu_ay') {
      startLimit = new Date(today.getFullYear(), today.getMonth(), 1);
      endLimit = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
    } else if (dateRangeType === 'bu_yil') {
      startLimit = new Date(today.getFullYear(), 0, 1);
      endLimit = new Date(today.getFullYear(), 11, 31, 23, 59, 59);
    } else if (dateRangeType === 'ozel') {
      if (startDate) {
        startLimit = new Date(startDate);
        startLimit.setHours(0, 0, 0, 0);
      }
      if (endDate) {
        endLimit = new Date(endDate);
        endLimit.setHours(23, 59, 59, 999);
      }
    }

    return transactions.filter((t) => {
      const tDate = new Date(t.tarih);
      return tDate >= startLimit && tDate <= endLimit;
    });
  }, [transactions, dateRangeType, startDate, endDate]);

  // Dynamically compile active categories in the filtered range
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    dateFilteredTransactions.forEach((t) => {
      if (filterType === 'Tümü' || t.tur === filterType) {
        if (t.kategori) cats.add(t.kategori);
      }
    });
    return Array.from(cats);
  }, [dateFilteredTransactions, filterType]);

  // Apply visual category & search query filters on date filtered transactions
  const fullyFilteredTransactions = useMemo(() => {
    return dateFilteredTransactions.filter((t) => {
      // 1. Transaction Type Filter
      if (filterType !== 'Tümü' && t.tur !== filterType) return false;
      
      // 2. Category Filter
      if (filterCategory !== 'Tümü' && t.kategori !== filterCategory) return false;

      // 3. Search Query Check
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const descMatch = (t.aciklama || '').toLowerCase().includes(query);
        const catMatch = t.kategori.toLowerCase().includes(query);
        const subMatch = (t.altKategori || '').toLowerCase().includes(query);
        const valMatch = String(t.tutar).includes(query);
        if (!descMatch && !catMatch && !subMatch && !valMatch) return false;
      }

      return true;
    });
  }, [dateFilteredTransactions, filterType, filterCategory, searchQuery]);

  // KPIs of fully filtered ranges
  const totalIncome = useMemo(() => {
    return fullyFilteredTransactions
      .filter((t) => t.tur === 'Gelir')
      .reduce((sum, t) => sum + t.tutar, 0);
  }, [fullyFilteredTransactions]);

  const totalExpense = useMemo(() => {
    return fullyFilteredTransactions
      .filter((t) => t.tur === 'Gider')
      .reduce((sum, t) => sum + t.tutar, 0);
  }, [fullyFilteredTransactions]);

  const netBalance = totalIncome - totalExpense;
  const expenseRatio = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0;

  // Pie segment helpers
  const expensesByCategory = useMemo(() => {
    return fullyFilteredTransactions
      .filter((t) => t.tur === 'Gider')
      .reduce((acc, t) => {
        acc[t.kategori] = (acc[t.kategori] || 0) + t.tutar;
        return acc;
      }, {} as Record<string, number>);
  }, [fullyFilteredTransactions]);

  const categoryShares = useMemo(() => {
    const values = Object.values(expensesByCategory) as number[];
    const total = values.reduce((sum, v) => sum + v, 0);
    return Object.entries(expensesByCategory)
      .map(([kategori, tutar]) => {
        const amt = tutar as number;
        return {
          kategori,
          tutar: amt,
          percentage: total > 0 ? (amt / total) * 100 : 0,
        };
      })
      .sort((a, b) => b.tutar - a.tutar);
  }, [expensesByCategory]);

  const getCatColor = (index: number) => {
    const colors = [
      '#6366f1', // indigo
      '#f97316', // orange
      '#3b82f6', // blue
      '#10b981', // emerald
      '#ec4899', // pink
      '#a855f7', // purple
      '#14b8a6', // teal
      '#eab308', // yellow
      '#ef4444', // red
      '#64748b'  // slate fallback
    ];
    return colors[index % colors.length];
  };

  const getCoordinatesForPercent = (percent: number) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  let cumulativePercent = 0;
  const pieSegments = categoryShares.map((item) => {
    const startPercent = cumulativePercent;
    cumulativePercent += item.percentage;
    return {
      ...item,
      startPercent,
      endPercent: cumulativePercent,
    };
  });

  // Dynamic Time Trend Grouping (Group by Day if 'bu_ay', otherwise group by Month)
  const timeTrendData = useMemo(() => {
    const groups: Record<string, { income: number; expense: number }> = {};
    
    fullyFilteredTransactions.forEach((t) => {
      let key = '';
      if (dateRangeType === 'bu_ay' || dateRangeType === 'ozel') {
        // Group by Day (format: "DD.MM")
        try {
          const parts = t.tarih.split('-');
          key = parts.length >= 3 ? `${parts[2]}.${parts[1]}` : t.tarih;
        } catch {
          key = t.tarih;
        }
      } else {
        // Year or All Time: Group by Month (format: "MM.YYYY")
        try {
          const parts = t.tarih.split('-');
          key = parts.length >= 2 ? `${parts[1]}.${parts[0]}` : t.tarih;
        } catch {
          key = t.tarih;
        }
      }

      if (!groups[key]) {
        groups[key] = { income: 0, expense: 0 };
      }
      if (t.tur === 'Gelir') {
        groups[key].income += t.tutar;
      } else {
        groups[key].expense += t.tutar;
      }
    });

    const sortedLabels = Object.keys(groups).sort((a, b) => {
      // Sort DD.MM or MM.YYYY properly
      const getVal = (str: string) => {
        const parts = str.split('.').map(Number);
        if (parts.length === 2) {
          return parts[1] * 100 + parts[0]; // month*100 + day
        }
        return 0;
      };
      return getVal(a) - getVal(b);
    });

    return sortedLabels.map((label) => ({
      label,
      income: groups[label].income,
      expense: groups[label].expense,
    }));
  }, [fullyFilteredTransactions, dateRangeType]);

  const maxTrendValue = useMemo(() => {
    const values = timeTrendData.flatMap((d) => [d.income, d.expense]);
    return values.length > 0 ? Math.max(...values, 1000) : 1000;
  }, [timeTrendData]);

  // Reset all analytical filters
  const handleResetFilters = () => {
    setDateRangeType('bu_ay');
    const d = new Date();
    setStartDate(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]);
    setEndDate(new Date().toISOString().split('T')[0]);
    setFilterType('Tümü');
    setFilterCategory('Tümü');
    setSearchQuery('');
  };

  return (
    <div className="space-y-6 pb-6 text-sans">
      {/* Cool Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onNavigateHome}
            className="p-2 bg-white rounded-full text-slate-600 hover:bg-slate-50 border border-slate-100/50"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-display font-black text-slate-800 tracking-tight">Raporlar & Filtreler</h2>
            <p className="text-[10.5px] text-slate-500 font-semibold uppercase tracking-wider">Ayrıntılı Finansal Analiz</p>
          </div>
        </div>
        <button
          onClick={handleResetFilters}
          className="p-1 px-2.5 bg-slate-100 font-bold hover:bg-slate-200 text-slate-600 rounded-lg text-[9.5px] flex items-center gap-1 transition-colors"
          title="Tüm filtreleri sıfırla"
        >
          <RotateCcw className="w-3 h-3" /> Sıfırla
        </button>
      </div>

      {/* 1. Date range selection tabs */}
      <div className="bg-slate-50 border border-slate-200/50 p-1.5 rounded-2xl grid grid-cols-4 gap-1">
        {[
          { id: 'bu_ay', label: 'Bu Ay' },
          { id: 'bu_yil', label: 'Yıllık' },
          { id: 'tum_zamanlar', label: 'Tümü' },
          { id: 'ozel', label: 'Özel 🗓️' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setDateRangeType(tab.id as DateRangeType)}
            className={`py-1.5 rounded-xl text-[10.5px] font-extrabold transition-all cursor-pointer ${
              dateRangeType === tab.id
                ? 'bg-indigo-600 text-white shadow-3xs'
                : 'text-slate-500 hover:text-slate-700 bg-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sub menu for Custom dates inputs */}
      <AnimatePresence>
        {dateRangeType === 'ozel' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-2 p-3 bg-indigo-50/50 border border-indigo-100/40 rounded-2xl">
              <div>
                <label className="text-[9px] font-black text-indigo-900 uppercase">Başlangıç Tarihi</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full mt-1 px-2.5 py-1.5 bg-white border border-slate-200 text-xs text-slate-700 font-mono font-bold rounded-lg outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-[9px] font-black text-indigo-900 uppercase">Bitiş Tarihi</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full mt-1 px-2.5 py-1.5 bg-white border border-slate-200 text-xs text-slate-700 font-mono font-bold rounded-lg outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Top level transaction filters */}
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-1.5">
          {/* Tipi Selector */}
          <div className="col-span-1">
            <label className="text-[8.5px] font-extrabold text-slate-500 uppercase tracking-widest pl-1">İŞLEM TÜRÜ</label>
            <select
              value={filterType}
              onChange={(e) => handleTypeChange(e.target.value as 'Tümü' | 'Gelir' | 'Gider')}
              className="w-full mt-1 p-2 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="Tümü">🔄 Tümü</option>
              <option value="Gelir">💰 Sadece Gelir</option>
              <option value="Gider">💸 Sadece Gider</option>
            </select>
          </div>

          {/* Kategori Selector */}
          <div className="col-span-2">
            <label className="text-[8.5px] font-extrabold text-slate-500 uppercase tracking-widest pl-1">KATEGORİ</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full mt-1 p-2 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="Tümü">📦 Tüm Kategoriler ({availableCategories.length})</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {getCategoryEmoji(cat)} {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="Açıklama, miktar veya detaylarda arayın..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-400"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2 text-xs font-bold text-indigo-600 hover:text-indigo-800"
            >
              Temizle
            </button>
          )}
        </div>
      </div>

      {/* 3. Range KPIs Results Panel */}
      <div className="bg-slate-900 border border-slate-950 text-white rounded-[24px] p-5 relative overflow-hidden shadow-xs flex flex-col items-center text-center">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="grid grid-cols-2 gap-4 relative z-10 border-b border-white/10 pb-4 w-full">
          <div className="flex flex-col items-center justify-center">
            <span className="text-[8.5px] text-emerald-300 font-extrabold uppercase tracking-widest flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Gelir
            </span>
            <h3 className="text-base font-black font-mono text-emerald-400 mt-1">{formatCurrency(totalIncome)}</h3>
          </div>
          <div className="flex flex-col items-center justify-center">
            <span className="text-[8.5px] text-rose-300 font-extrabold uppercase tracking-widest flex items-center gap-1">
              <TrendingDown className="w-3 h-3" /> Gider
            </span>
            <h3 className="text-base font-black font-mono text-rose-400 mt-1">{formatCurrency(totalExpense)}</h3>
          </div>
        </div>

        <div className="pt-4 flex flex-col items-center justify-center gap-2 relative z-10 w-full">
          <div className="flex flex-col items-center justify-center">
            <span className="text-[8.5px] text-slate-300/80 font-extrabold uppercase tracking-widest block">Durum</span>
            <h1 className={`text-xl font-bold font-mono mt-0.5 ${netBalance >= 0 ? 'text-white' : 'text-rose-300'}`}>
              {netBalance >= 0 ? '+' : ''} {formatCurrency(netBalance)}
            </h1>
          </div>
          {totalIncome > 0 && (
            <div className="flex flex-col items-center justify-center mt-1">
              <span className="text-[8.5px] text-slate-400 font-bold block uppercase">Bütçe Verimliliği</span>
              <span className={`text-xs font-black font-mono block mt-0.5 ${expenseRatio > 85 ? 'text-rose-400' : 'text-emerald-400'}`}>
                %{expenseRatio.toFixed(0)} Oran
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Donut Chart and Shares */}
      <div className="mobile-card p-5 bg-white border border-slate-50 space-y-5">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-extrabold uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
            <PieChart className="w-4 h-4 text-indigo-600" /> Kategori Pay Dağılımı
          </h3>
          <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full font-bold">
            {categoryShares.length} Kategori
          </span>
        </div>

        {categoryShares.length > 0 ? (
          <div className="space-y-5">
            {/* SVG Pie-Donut */}
            <div className="flex justify-center items-center h-40 relative">
              <svg viewBox="-1.2 -1.2 2.4 2.4" className="w-36 h-36 transform -rotate-90">
                {pieSegments.map((seg, i) => {
                  const [startX, startY] = getCoordinatesForPercent(seg.startPercent / 100);
                  const [endX, endY] = getCoordinatesForPercent(seg.endPercent / 100);
                  const largeArcFlag = seg.percentage > 50 ? 1 : 0;
                  const pathData = [
                    `M ${startX} ${startY}`,
                    `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
                    `L 0 0`,
                  ].join(' ');

                  return (
                    <motion.path
                      key={seg.kategori}
                      d={pathData}
                      fill={getCatColor(i)}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                    />
                  );
                })}
                {/* Hole in center */}
                <circle cx="0" cy="0" r="0.65" fill="#ffffff" />
              </svg>

              <div className="absolute inset-0 flex flex-col justify-center items-center pointer-events-none">
                <span className="text-[8px] text-slate-400 uppercase font-black">TOPLAM</span>
                <span className="text-xs font-black font-mono text-slate-700 mt-0.5">
                  {formatCurrency(totalExpense)}
                </span>
              </div>
            </div>

            {/* List with styled colored icons */}
            <div className="space-y-2 pt-2 border-t border-slate-100 max-h-56 overflow-y-auto pr-1">
              {categoryShares.map((item, index) => {
                const color = getCatColor(index);
                return (
                  <div key={item.kategori} className="flex items-center justify-between text-xs py-1 hover:bg-slate-50 px-1 rounded-lg transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-[13px]">{getCategoryEmoji(item.kategori)}</span>
                      <span className="font-bold text-slate-700 text-[11.5px] truncate max-w-28">{item.kategori}</span>
                    </div>
                    <div className="flex items-center gap-2.5 font-mono">
                      <span className="font-extrabold text-slate-800 text-[11px]">{formatCurrency(item.tutar)}</span>
                      <span className="text-[9.5px] text-slate-400 font-extrabold bg-slate-105 px-1.5 py-0.5 rounded-md">
                        %{item.percentage.toFixed(0)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-10 bg-slate-50/50 rounded-2xl text-slate-400">
            <span className="text-xl">📊</span>
            <p className="text-xs font-bold mt-2">Bu filtreler için harcama grafiği yok.</p>
          </div>
        )}
      </div>

      {/* SVG Daily/Monthly Trend Bar Chart */}
      <div className="mobile-card p-5 bg-white border border-slate-50 space-y-4">
        <h3 className="text-xs font-extrabold uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
          <BarChart3 className="w-4 h-4 text-indigo-600" /> Zaman Serisi ve Harcama Trendi
        </h3>

        {timeTrendData.length > 0 ? (
          <div className="space-y-2">
            {/* SVG Bars container */}
            <div className="h-40 flex items-end justify-between gap-1 pt-6 px-1 border-b border-slate-100 relative">
              
              {/* background threshold lines */}
              <div className="absolute inset-x-0 bottom-1/2 border-t border-dashed border-slate-100 pointer-events-none" />
              <div className="absolute inset-x-0 bottom-3/4 border-t border-dashed border-slate-100 pointer-events-none" />

              {timeTrendData.map((d) => {
                const incHeight = (d.income / maxTrendValue) * 100;
                const expHeight = (d.expense / maxTrendValue) * 100;

                return (
                  <div key={d.label} className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative">
                    
                    {/* Tooltip on Hover */}
                    <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 bg-slate-800 text-white text-[8px] font-bold p-1 px-1.5 rounded-md pointer-events-none transition-all z-20 whitespace-nowrap shadow-xs">
                      {d.label} - Gelir: {formatCurrency(d.income)} | Gider: {formatCurrency(d.expense)}
                    </div>

                    <div className="flex items-end gap-0.5 w-full h-full max-w-12">
                      {/* Income Bar (Green) */}
                      {d.income > 0 && (
                        <div 
                          style={{ height: `${Math.max(incHeight, 4)}%` }}
                          className="flex-1 bg-emerald-400 rounded-t-xs hover:bg-emerald-500 transition-colors"
                        />
                      )}
                      {/* Expense Bar (Rose) */}
                      {d.expense > 0 && (
                        <div 
                          style={{ height: `${Math.max(expHeight, 4)}%` }}
                          className="flex-1 bg-rose-400 rounded-t-xs hover:bg-rose-500 transition-colors"
                        />
                      )}
                    </div>

                    <span className="text-[7.5px] mt-1 font-bold font-mono text-slate-400 shrink-0">
                      {d.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Legends indicators */}
            <div className="flex justify-center gap-4 text-[9px] font-bold text-slate-500 uppercase tracking-widest pt-1.5">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-1.5 bg-emerald-400 rounded-full" />
                <span>Gelir Akışı</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-1.5 bg-rose-400 rounded-full" />
                <span>Gider Akışı</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-slate-405 text-xs">
            Yeterli zaman trendi verisi yok.
          </div>
        )}
      </div>

      {/* 4. Filtered Operations List */}
      <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-indigo-500" /> Filtrelenen İşlemler ({fullyFilteredTransactions.length})
          </h3>
          <span className="text-[9px] font-extrabold text-slate-400">Dönem Listesi</span>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {fullyFilteredTransactions.length > 0 ? (
            fullyFilteredTransactions.map((item) => {
              const isGelir = item.tur === 'Gelir';
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-white rounded-2xl shadow-3xs border border-slate-150 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`text-lg p-1.5 rounded-xl shrink-0 flex items-center justify-center border ${
                      isGelir 
                        ? 'bg-emerald-50 border-emerald-100' 
                        : 'bg-rose-50 border-rose-100'
                    }`}>
                      {getCategoryEmoji(item.kategori)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-805 truncate">{item.aciklama || item.kategori}</p>
                      <p className="text-[9px] text-slate-400 font-bold font-mono mt-0.5">
                        {item.tarih} • <span className="text-slate-600 font-extrabold">{item.kategori}</span>
                        {item.altKategori && <span className="text-slate-500 font-medium"> / {item.altKategori}</span>}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-black font-mono shrink-0 ml-2 ${isGelir ? 'text-emerald-700' : 'text-slate-900'}`}>
                    {isGelir ? '+' : '-'} {formatCurrency(item.tutar)}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="text-center py-10 bg-slate-50 border border-slate-100 border-dashed rounded-2xl">
              <span className="text-[17px]">🔍</span>
              <p className="text-[11px] font-bold text-slate-400 mt-1">Arama kriterlerine uygun işlem bulunamadı.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
