import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Transaction, RecurringPayment } from '../types';
import { getDaysRemaining } from '../db';
import { TrendingUp, TrendingDown, Wallet, Calendar, ArrowRight, ArrowUpRight, Bell, RefreshCw } from 'lucide-react';
import { getCategoryEmoji } from '../utils/emoji';

interface DashboardProps {
  transactions: Transaction[];
  payments: RecurringPayment[];
  onNavigate: (tabId: string) => void;
  userName?: string;
  onSync?: () => Promise<void>;
  isSyncing?: boolean;
  hideSensitiveData?: boolean;
}

export default function Dashboard({ 
  transactions, 
  payments, 
  onNavigate, 
  userName = "Cavit",
  onSync,
  isSyncing = false,
  hideSensitiveData = false
}: DashboardProps) {
  const [timeframe, setTimeframe] = useState<'Aylık' | 'Yıllık' | 'Tümü'>('Aylık');

  // Filter transactions based on selected timeframe for KPI calculation
  const filteredTxns = useMemo(() => {
    const today = new Date();
    let startLimit = new Date(1970, 0, 1);
    let endLimit = new Date(2100, 11, 31);

    if (timeframe === 'Aylık') {
      startLimit = new Date(today.getFullYear(), today.getMonth(), 1);
      endLimit = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
    } else if (timeframe === 'Yıllık') {
      startLimit = new Date(today.getFullYear(), 0, 1);
      endLimit = new Date(today.getFullYear(), 11, 31, 23, 59, 59);
    }

    return transactions.filter((t) => {
      const tDate = new Date(t.tarih);
      return tDate >= startLimit && tDate <= endLimit;
    });
  }, [transactions, timeframe]);

  // Compute aggregates based on the selected timeframe
  const totalIncome = filteredTxns
    .filter((t) => t.tur === 'Gelir')
    .reduce((sum, t) => sum + t.tutar, 0);

  const totalExpense = filteredTxns
    .filter((t) => t.tur === 'Gider')
    .reduce((sum, t) => sum + t.tutar, 0);

  const netBalance = totalIncome - totalExpense;

  // Pending / overdue / due today payments counts
  const pendingPayments = payments.filter((p) => p.durum === 'Bekliyor');
  const overdueCount = pendingPayments.filter((p) => getDaysRemaining(p.sonOdemeTarihi) < 0).length;
  const dueTodayCount = pendingPayments.filter((p) => getDaysRemaining(p.sonOdemeTarihi) === 0).length;
  const d1to5Count = pendingPayments.filter((p) => {
    const days = getDaysRemaining(p.sonOdemeTarihi);
    return days >= 1 && days <= 5;
  }).length;
  const d6to10Count = pendingPayments.filter((p) => {
    const days = getDaysRemaining(p.sonOdemeTarihi);
    return days >= 6 && days <= 10;
  }).length;
  const d11PlusCount = pendingPayments.filter((p) => {
    const days = getDaysRemaining(p.sonOdemeTarihi);
    return days >= 11;
  }).length;

  const formatCurrency = (val: number) => {
    if (hideSensitiveData) return '•••• ₺';
    if (val === undefined || val === null || isNaN(val)) return '0,00 ₺';
    return val.toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + ' ₺';
  };

  // Modern greeting based on time (relative to 2026-05-22 UTC)
  const greeting = "İyi Günler";

  return (
    <div className="space-y-6">
      {/* Upper header */}
      <div className="flex justify-between items-center px-1">
        <div>
          <p className="text-xs font-mono text-slate-500 uppercase tracking-wider">Hoş Geldiniz 👋</p>
        </div>
        
        {/* Action Buttons: Sync & Alert */}
        <div className="flex items-center gap-2">
          {/* Cloud Sync Button */}
          {onSync && (
            <button
              onClick={onSync}
              disabled={isSyncing}
              title="Bulut Verilerini Güncelle"
              className={`p-2.5 bg-white rounded-full text-slate-600 shadow-xs border border-slate-100/50 hover:bg-slate-50 transition-all ${
                isSyncing ? 'opacity-80 scale-95' : 'active:scale-95'
              }`}
            >
              <RefreshCw className={`w-4.5 h-4.5 ${isSyncing ? 'animate-spin text-indigo-600' : 'text-slate-600'}`} />
            </button>
          )}

          {/* Alerts Badge */}
          <button 
            onClick={() => onNavigate('takip')}
            className="relative p-2.5 bg-white rounded-full text-slate-600 shadow-xs hover:bg-slate-50 transition-colors border border-slate-100/50 active:scale-95"
          >
            <Bell className="w-5 h-5" />
            {pendingPayments.length > 0 && (
              <span className="absolute top-0 right-0 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                {pendingPayments.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Timeframe Selector Button Row */}
      <div className="bg-slate-100/70 border border-slate-200/50 p-1 rounded-2xl grid grid-cols-3 gap-1">
        {[
          { id: 'Aylık', label: 'Aylık' },
          { id: 'Yıllık', label: 'Yıllık' },
          { id: 'Tümü', label: 'Tümü' }
        ].map((btn) => (
          <button
            key={btn.id}
            type="button"
            onClick={() => setTimeframe(btn.id as any)}
            className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer text-center ${
              timeframe === btn.id
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/40 bg-transparent'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Net Balance Master Card */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mobile-card p-6 bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 border border-indigo-950 text-white rounded-[26px] shadow-lg relative overflow-hidden"
      >
        {/* Ambient glowing circles */}
        <div className="absolute -left-16 -top-16 w-36 h-36 rounded-full bg-emerald-500/20 blur-2xl pointer-events-none" />
        <div className="absolute -right-16 -bottom-16 w-40 h-40 rounded-full bg-indigo-500/30 blur-2xl pointer-events-none" />

        <div className="flex flex-col items-center relative z-10 w-full text-sans">
          
          {/* Top Section: side-by-side columns for Gelir and Gider */}
          <div className="grid grid-cols-2 gap-4 border-b border-white/10 pb-4 w-full text-center">
            <div className="flex flex-col items-center justify-center">
              <span className="text-[9.5px] text-emerald-300 font-extrabold uppercase tracking-widest flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> Gelir
              </span>
              <h3 className="text-base font-black font-mono text-emerald-400 mt-1">{formatCurrency(totalIncome)}</h3>
            </div>

            <div className="flex flex-col items-center justify-center">
              <span className="text-[9.5px] text-rose-300 font-extrabold uppercase tracking-widest flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5" /> Gider
              </span>
              <h3 className="text-base font-black font-mono text-rose-400 mt-1">{formatCurrency(totalExpense)}</h3>
            </div>
          </div>

          {/* Bottom Section: Centered Net Bakiye */}
          <div className="pt-4 flex flex-col items-center justify-center w-full text-center">
            <span className="text-[9.5px] font-extrabold text-indigo-200/60 uppercase tracking-widest block font-sans">NET BAKİYE</span>
            <h1 className={`font-display font-black tracking-tight mt-1 font-mono ${
              netBalance >= 0 
                ? 'text-white' 
                : 'text-rose-300'
            } ${
              formatCurrency(netBalance).length < 12
                ? 'text-2xl'
                : formatCurrency(netBalance).length < 15
                  ? 'text-xl'
                  : 'text-lg'
            }`}>
              {netBalance >= 0 ? '+' : ''} {formatCurrency(netBalance)}
            </h1>
          </div>

        </div>
      </motion.div>

      {/* Quick Alerts Section for categorized pending items */}
      {pendingPayments.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 bg-amber-50/80 border border-amber-200 rounded-[20.5px] text-xs shadow-xs space-y-2.5 text-sans"
        >
          <div className="flex items-center justify-between border-b border-amber-200/55 pb-2">
            <span className="text-[10px] font-extrabold text-amber-850 uppercase tracking-widest flex items-center gap-1.5">
              🔔 Ödeme Hatırlatmaları
            </span>
            <button 
              onClick={() => onNavigate('takip')}
              className="text-[10.5px] font-black text-amber-900 flex items-center gap-0.5 hover:underline"
            >
              Ödemeleri Yönet <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2">
            {/* Günü Geçmiş */}
            {overdueCount > 0 && (
              <div className="flex items-start gap-2.5 bg-rose-50 border border-rose-100 p-2.5 rounded-xl text-rose-950">
                <span className="text-sm">⚠️</span>
                <div>
                  <p className="font-bold text-[11px] leading-tight">
                    Ödeme günü geçmiş <span className="underline font-black text-rose-900">{overdueCount} faturanız/ödemeniz</span> bulunuyor!
                  </p>
                  <span className="text-[9.5px] text-rose-700/80 font-semibold block mt-0.5">Ceza veya faiz binişini önlemek için hemen ödeyin.</span>
                </div>
              </div>
            )}

            {/* Son Ödeme Günü Bugün */}
            {dueTodayCount > 0 && (
              <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 p-2.5 rounded-xl text-amber-950">
                <span className="text-sm">⚡</span>
                <div>
                  <p className="font-bold text-[11px] leading-tight">
                    Son ödeme günü <span className="underline font-black text-amber-900">bugün</span> olan <span className="font-black text-amber-900">{dueTodayCount} ödemeniz</span> var!
                  </p>
                  <span className="text-[9.5px] text-amber-700/80 font-semibold block mt-0.5">Tarihi gecikmeden bugün ödeme kaydı ekleyin.</span>
                </div>
              </div>
            )}

            {/* 1-5 Gün Kalanlar */}
            {d1to5Count > 0 && (
              <div className="flex items-start gap-2.5 bg-orange-50 border border-orange-100 p-2.5 rounded-xl text-orange-950">
                <span className="text-sm">⌛</span>
                <div>
                  <p className="font-bold text-[11px] leading-tight">
                    Son ödeme günü <span className="underline font-black text-orange-900">1-5 gün kalan {d1to5Count} faturanız/ödemeniz</span> bulunuyor!
                  </p>
                  <span className="text-[9.5px] text-orange-700/80 font-semibold block mt-0.5">Ödemelerinizi planlayarak gecikmelerin önüne geçin.</span>
                </div>
              </div>
            )}

            {/* 6-10 Gün Kalanlar */}
            {d6to10Count > 0 && (
              <div className="flex items-start gap-2.5 bg-indigo-50 border border-indigo-100 p-2.5 rounded-xl text-indigo-950">
                <span className="text-sm">🗓️</span>
                <div>
                  <p className="font-bold text-[11px] leading-tight">
                    Son ödeme günü <span className="underline font-black text-indigo-900">6-10 gün kalan {d6to10Count} faturanız/ödemeniz</span> bulunuyor!
                  </p>
                  <span className="text-[9.5px] text-indigo-700/80 font-semibold block mt-0.5">Önümüzdeki hafta yapılması gereken ödemelerinizi takip edin.</span>
                </div>
              </div>
            )}

            {/* 11+ Gün Kalanlar */}
            {d11PlusCount > 0 && (
              <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl text-emerald-950">
                <span className="text-sm">🌱</span>
                <div>
                  <p className="font-bold text-[11px] leading-tight">
                    Son ödeme günü <span className="underline font-black text-emerald-900">11 gün veya daha fazla kalan {d11PlusCount} ödemeniz</span> var.
                  </p>
                  <span className="text-[9.5px] text-emerald-700/80 font-semibold block mt-0.5">Daha uzun vadeli ödemeleriniz, her şey kontrol altında.</span>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

    </div>
  );
}
