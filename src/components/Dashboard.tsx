import React from 'react';
import { motion } from 'motion/react';
import { Transaction, RecurringPayment } from '../types';
import { getDaysRemaining } from '../db';
import { TrendingUp, TrendingDown, Wallet, Calendar, ArrowRight, ArrowUpRight, Bell } from 'lucide-react';
import { getCategoryEmoji } from '../utils/emoji';

interface DashboardProps {
  transactions: Transaction[];
  payments: RecurringPayment[];
  onNavigate: (tabId: string) => void;
  userName?: string;
}

export default function Dashboard({ transactions, payments, onNavigate, userName = "Cavit" }: DashboardProps) {
  // Compute aggregates
  const totalIncome = transactions
    .filter((t) => t.tur === 'Gelir')
    .reduce((sum, t) => sum + t.tutar, 0);

  const totalExpense = transactions
    .filter((t) => t.tur === 'Gider')
    .reduce((sum, t) => sum + t.tutar, 0);

  const netBalance = totalIncome - totalExpense;

  // Pending / overdue / due today payments counts
  const pendingPayments = payments.filter((p) => p.durum === 'Bekliyor');
  const overdueCount = pendingPayments.filter((p) => getDaysRemaining(p.sonOdemeTarihi) < 0).length;
  const dueTodayCount = pendingPayments.filter((p) => getDaysRemaining(p.sonOdemeTarihi) === 0).length;
  const criticalCount = pendingPayments.filter((p) => {
    const days = getDaysRemaining(p.sonOdemeTarihi);
    return days > 0 && days <= 3;
  }).length;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Modern greeting based on time (relative to 2026-05-22 UTC)
  const greeting = "İyi Günler";

  return (
    <div className="space-y-6">
      {/* Upper header */}
      <div className="flex justify-between items-center px-1">
        <div>
          <p className="text-xs font-mono text-slate-500 uppercase tracking-wider">Hoş Geldiniz 👋</p>
          <h2 className="text-2xl font-display font-bold text-slate-800 tracking-tight">Merhaba, {userName}</h2>
        </div>
        
        {/* Alerts Badge */}
        <button 
          onClick={() => onNavigate('takip')}
          className="relative p-2.5 bg-white rounded-full text-slate-600 shadow-xs hover:bg-slate-50 transition-colors border border-slate-100/50"
        >
          <Bell className="w-5 h-5" />
          {(overdueCount + dueTodayCount + criticalCount) > 0 && (
            <span className="absolute top-0 right-0 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
              {overdueCount + dueTodayCount + criticalCount}
            </span>
          )}
        </button>
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
            <span className="text-[9.5px] font-extrabold text-indigo-200/60 uppercase tracking-widest block">NET BAKİYE</span>
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

      {/* Quick Alerts Section for overdue or due today items */}
      {(overdueCount > 0 || dueTodayCount > 0) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 bg-amber-50/80 border border-amber-200 rounded-[20px] text-xs shadow-xs space-y-2.5 text-sans"
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

            {dueTodayCount > 0 && (
              <div className="flex items-start gap-2.5 bg-indigo-50 border border-indigo-100 p-2.5 rounded-xl text-indigo-950">
                <span className="text-sm">⚡</span>
                <div>
                  <p className="font-bold text-[11px] leading-tight">
                    Son ödeme günü <span className="underline font-black text-indigo-900">bugün</span> olan <span className="font-black text-indigo-900">{dueTodayCount} ödemeniz</span> var!
                  </p>
                  <span className="text-[9.5px] text-indigo-700/80 font-semibold block mt-0.5">Tarihi gecikmeden bugün ödeme kaydı ekleyin.</span>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Recent Activities Snapshot */}
      <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-[11.5px] font-bold uppercase tracking-wider text-slate-700">Son İşlemler</h3>
          <button 
            onClick={() => onNavigate('islemler')}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1"
          >
            Tümünü Gör <ArrowUpRight className="w-3" />
          </button>
        </div>

        <div className="space-y-2">
          {transactions.slice(0, 3).map((item) => {
            const isGelir = item.tur === 'Gelir';
            return (
              <div
                key={item.id}
                className="flex items-center justify-between p-3.5 bg-white rounded-2xl shadow-xs border border-slate-300 hover:border-indigo-200 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className={`text-xl p-2 rounded-xl flex items-center justify-center border ${
                    isGelir 
                      ? 'bg-emerald-50 border-emerald-200/50' 
                      : 'bg-rose-50 border-rose-200/50'
                  }`}>
                    {getCategoryEmoji(item.kategori)}
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-800">{item.aciklama || item.kategori}</p>
                    <p className="text-[10px] text-slate-500 font-bold font-mono mt-0.5">{item.tarih} • {item.kategori}</p>
                  </div>
                </div>
                <span className={`text-xs font-extrabold font-mono ${isGelir ? 'text-emerald-700' : 'text-slate-900'}`}>
                  {isGelir ? '+' : '-'} {formatCurrency(item.tutar)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
