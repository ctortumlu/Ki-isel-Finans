import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  loadTransactions,
  saveTransactions,
  loadPayments,
  savePayments,
  getReferenceDate,
} from './db';
import { Transaction, RecurringPayment } from './types';
import {
  isSyncEnabled,
  getAutoSyncOnLoad,
  syncGetAllData,
  syncSaveAllData,
  setLastSyncTime,
} from './sheetsSync';

// Components import
import Dashboard from './components/Dashboard';
import QuickRecord from './components/QuickRecord';
import PaymentTracker from './components/PaymentTracker';
import Transactions from './components/Transactions';
import Charts from './components/Charts';
import Settings from './components/Settings';

// Icons for Tab Bar
import { Home, CalendarClock, Receipt, Percent, FileCode2, Wifi, BatteryMedium, Signal, Settings as SettingsIcon, BarChart3 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('pano');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payments, setPayments] = useState<RecurringPayment[]>([]);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'idle'>('synced');
  const [currentTime, setCurrentTime] = useState('');
  const syncTimeoutRef = React.useRef<any>(null);

  // Live running clock for the iPhone mockup status bar
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setCurrentTime(d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const clockTimer = setInterval(updateTime, 10000);
    return () => clearInterval(clockTimer);
  }, []);

  // Load state on mount
  useEffect(() => {
    const localTxns = loadTransactions();
    const localPmts = loadPayments();
    setTransactions(localTxns);
    setPayments(localPmts);

    if (isSyncEnabled() && getAutoSyncOnLoad()) {
      setIsSyncing(true);
      syncGetAllData().then((res) => {
        if (res.success && res.transactions && res.payments) {
          setTransactions(res.transactions);
          setPayments(res.payments);
          saveTransactions(res.transactions);
          savePayments(res.payments);
          setLastSyncTime(new Date().toLocaleString('tr-TR'));
          console.log("Bulut eşitleme başlangıçta başarıyla tamamlandı.");
        }
      }).catch(err => {
        console.warn('Otomatik başlangıç senkronizasyonu hatası:', err);
      }).finally(() => {
        setIsSyncing(false);
      });
    }
  }, []);

  const handleSync = async () => {
    if (!isSyncEnabled()) {
      alert("Lütfen önce Ayarlar menüsünden Google Sheets URL ve Bulut Eşitlemeyi etkinleştirin.");
      return;
    }
    setIsSyncing(true);
    try {
      const res = await syncGetAllData();
      if (res.success && res.transactions && res.payments) {
        setTransactions(res.transactions);
        setPayments(res.payments);
        saveTransactions(res.transactions);
        savePayments(res.payments);
        setLastSyncTime(new Date().toLocaleString('tr-TR'));
        alert("Eşitleme başarıyla tamamlandı! Buluttaki güncel verileriniz yüklendi.");
      } else {
        alert("Eşitleme başarısız: " + (res.error || "Bilinmeyen hata"));
      }
    } catch (e: any) {
      alert("Bağlantı hatası: " + e.toString());
    } finally {
      setIsSyncing(false);
    }
  };

  // Soft background sync pusher with instant 305ms response timing
  const triggerBackgroundSync = (
    updatedTxns: Transaction[],
    updatedPmts: RecurringPayment[],
    target?: 'transactions' | 'payments' | 'all'
  ) => {
    if (isSyncEnabled()) {
      setSyncStatus('syncing');
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      syncTimeoutRef.current = setTimeout(() => {
        syncSaveAllData(updatedTxns, updatedPmts, target).then((res) => {
          if (res.success) {
            setSyncStatus('synced');
            console.log("Arka plan bulut senkronizasyonu tamamlandı.");
          } else {
            setSyncStatus('error');
            console.warn("Arka plan bulut senkronizasyonu başarısız:", res.error);
          }
        }).catch(err => {
          setSyncStatus('error');
          console.warn("Arka plan sync hatası:", err);
        });
      }, 300); // 300ms delay ensures transactions upload securely before mobile system suspends Safari!
    } else {
      setSyncStatus('idle');
    }
  };

  const activeTransactions = React.useMemo(() => {
    return transactions.filter(t => t.aktifPasif !== 'Pasif');
  }, [transactions]);

  const activePayments = React.useMemo(() => {
    return payments.filter(p => p.aktifPasif !== 'Pasif');
  }, [payments]);

  // Save state on change
  const handleAddTransaction = (newT: Omit<Transaction, 'id'>) => {
    const item: Transaction = {
      ...newT,
      id: 'txn_' + Date.now(),
      aktifPasif: 'Aktif',
    };
    const updated = [item, ...transactions];
    setTransactions(updated);
    saveTransactions(updated);
    triggerBackgroundSync(updated, payments, 'transactions');
  };

  const handleDeleteTransaction = (id: string) => {
    const updated = transactions.map((t) => t.id === id ? { ...t, aktifPasif: 'Pasif' as const } : t);
    setTransactions(updated);
    saveTransactions(updated);
    triggerBackgroundSync(updated, payments, 'transactions');
  };

  const handleUpdatePayment = (updatedPayment: RecurringPayment) => {
    const updated = payments.map((p) => (p.id === updatedPayment.id ? updatedPayment : p));
    setPayments(updated);
    savePayments(updated);
    triggerBackgroundSync(transactions, updated, 'payments');
  };

  const handlePayPayment = (newT: Omit<Transaction, 'id'>, updatedPayment: RecurringPayment) => {
    const item: Transaction = {
      ...newT,
      id: 'txn_' + Date.now(),
      aktifPasif: 'Aktif',
    };
    const updatedTxns = [item, ...transactions];
    const updatedPmts = payments.map((p) => p.id === updatedPayment.id ? updatedPayment : p);

    setTransactions(updatedTxns);
    saveTransactions(updatedTxns);
    setPayments(updatedPmts);
    savePayments(updatedPmts);

    triggerBackgroundSync(updatedTxns, updatedPmts, 'all');
  };

  const handleDeletePayment = (id: string) => {
    const updated = payments.map((p) => p.id === id ? { ...p, aktifPasif: 'Pasif' as const } : p);
    setPayments(updated);
    savePayments(updated);
    triggerBackgroundSync(transactions, updated, 'payments');
  };

  const handleAddPayment = (newPOrArr: Omit<RecurringPayment, 'id'> | Omit<RecurringPayment, 'id'>[]) => {
    const newItems = Array.isArray(newPOrArr) ? newPOrArr : [newPOrArr];
    const itemsWithIds: RecurringPayment[] = newItems.map((p, index) => ({
      ...p,
      id: 'pmt_' + (Date.now() + index),
      aktifPasif: 'Aktif',
    }));
    const updated = [...payments, ...itemsWithIds];
    setPayments(updated);
    savePayments(updated);
    triggerBackgroundSync(transactions, updated, 'payments');
  };

  const handleResetDefaults = () => {
    if (window.confirm("Tüm değişiklikleri silmek ve varsayılan test verilerine dönmek istiyor musunuz?")) {
      localStorage.removeItem('finance_transactions');
      localStorage.removeItem('finance_payments');
      setTransactions(loadTransactions());
      setPayments(loadPayments());
      setActiveTab('pano');
    }
  };

  // Render correct view inside our phone sandbox
  const renderContent = () => {
    switch (activeTab) {
      case 'pano':
        return (
          <Dashboard
            transactions={activeTransactions}
            payments={activePayments}
            onNavigate={(tab) => setActiveTab(tab)}
            onSync={handleSync}
            isSyncing={isSyncing}
          />
        );
      case 'kayit':
        return (
          <QuickRecord
            onSave={handleAddTransaction}
            onNavigateHome={() => setActiveTab('pano')}
          />
        );
      case 'takip':
        return (
          <PaymentTracker
            payments={activePayments}
            onUpdatePayment={handleUpdatePayment}
            onDeletePayment={handleDeletePayment}
            onAddPayment={handleAddPayment}
            onNavigateHome={() => setActiveTab('pano')}
            onAddTransaction={handleAddTransaction}
            onPayPayment={handlePayPayment}
          />
        );
      case 'islemler':
        return (
          <Transactions
            transactions={activeTransactions}
            onDeleteTransaction={handleDeleteTransaction}
            onNavigateHome={() => setActiveTab('pano')}
          />
        );
      case 'grafikler':
        return <Charts transactions={activeTransactions} onNavigateHome={() => setActiveTab('pano')} />;
      case 'ayarlar':
        return (
          <Settings
            transactions={transactions}
            setTransactions={(updatedTxns) => {
              setTransactions(updatedTxns);
              saveTransactions(updatedTxns);
            }}
            payments={payments}
            setPayments={(updatedPmts) => {
              setPayments(updatedPmts);
              savePayments(updatedPmts);
            }}
            onNavigateHome={() => setActiveTab('pano')}
          />
        );
      default:
        return <Dashboard transactions={activeTransactions} payments={activePayments} onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="h-screen h-[100dvh] max-h-screen max-h-[100dvh] overflow-hidden md:h-auto md:min-h-screen md:max-h-none md:overflow-visible bg-slate-100 flex items-center justify-center p-0 md:p-6 select-none select-text">
      
      {/* Outer framing for gorgeous Presentation */}
      <div className="w-full max-w-md bg-white md:rounded-[45px] md:shadow-2xl overflow-hidden h-full max-h-full md:min-h-[820px] md:h-[820px] md:border-8 md:border-slate-800 flex flex-col justify-between relative">
        
        {/* iOS-Style Notch and Status Bar on desktop, safe area paddings */}
        <div className="bg-pastel-bg/60 backdrop-blur-md sticky top-0 z-40 border-b border-slate-100 px-6 pt-3 pb-2 flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold font-mono text-slate-700">{currentTime || '18:15'}</span>
            
            {/* Real-time Cloud Synchronization Safe state badge */}
            {isSyncEnabled() && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 bg-white/90 border border-slate-150 rounded-full shadow-xxs">
                {syncStatus === 'syncing' ? (
                  <>
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                    </span>
                    <span className="text-[8px] font-bold text-amber-600 tracking-tight">Kaydediliyor...</span>
                  </>
                ) : syncStatus === 'error' ? (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                    <span className="text-[8px] font-bold text-rose-600 tracking-tight">Bulut Hata</span>
                  </>
                ) : syncStatus === 'idle' ? (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300"></span>
                    <span className="text-[8px] font-bold text-slate-500 tracking-tight font-sans">Eşitlenmedi</span>
                  </>
                ) : (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                    <span className="text-[8px] font-bold text-emerald-600 tracking-tight">Eşitlendi</span>
                  </>
                )}
              </div>
            )}
          </div>
          
          {/* Audio/Status Notch area inside desktop casing */}
          <div className="hidden md:block w-28 h-5 bg-slate-900 absolute left-1/2 -translate-x-1/2 top-0 rounded-b-2xl z-50 overflow-hidden" />

          {/* Device status icons */}
          <div className="flex items-center gap-1.5 text-slate-700">
            <Signal className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold font-sans uppercase tracking-wider mr-1">5G</span>
            <Wifi className="w-3.5 h-3.5" />
            <div className="flex items-center gap-0.5 ml-1">
              <span className="text-[9px] font-bold font-mono">82%</span>
              <BatteryMedium className="w-4 h-4 text-slate-700" />
            </div>
          </div>
        </div>

        {/* Scrollable Main Content Frame */}
        <div className="flex-1 overflow-y-auto px-5 py-5 pb-6 bg-gradient-to-b from-pastel-bg via-white to-white scrollbar-none">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="pb-2"
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Floating Quick Reset is removed and accessible from Ayarlar tab to prevent overlaps         {/* Beautiful Sticky Tab Navigation Menu with 22px oval rounded styling (Physical Flex row child to prevent mobile viewport leaks) */}
        <div className="bg-white border-t border-slate-100/80 p-3 shrink-0 z-40">
          <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-1.5 flex justify-between items-center tab-bar-shadow gap-0.5">
            
            {/* Tab 1: Pano (Dashboard) */}
            <button
              onClick={() => setActiveTab('pano')}
              className={`flex-1 py-1 flex flex-col items-center justify-center transition-all cursor-pointer ${
                activeTab === 'pano'
                  ? 'text-indigo-650 scale-102 font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Home className={`w-4 h-4 ${activeTab === 'pano' ? 'text-indigo-600 scale-110 fill-indigo-50/50' : ''}`} />
              <span className="text-[8.5px] font-bold font-sans mt-0.5">Pano</span>
            </button>

            {/* Tab 2: Kayıt (Quick Form) */}
            <button
              onClick={() => setActiveTab('kayit')}
              className={`flex-1 py-1 flex flex-col items-center justify-center transition-all cursor-pointer ${
                activeTab === 'kayit'
                  ? 'text-indigo-650 scale-102 font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <span className={`text-md leading-none flex items-center justify-center p-0.5 rounded-full ${
                activeTab === 'kayit' ? 'bg-indigo-50 scale-110 border border-indigo-100/50' : ''
              }`}>🎯</span>
              <span className="text-[8.5px] font-bold font-sans mt-0.5 text-center">Hızlı Kayıt</span>
            </button>

            {/* Tab 3: Ödemeler (Tracking) */}
            <button
              onClick={() => setActiveTab('takip')}
              className={`flex-1 py-1 flex flex-col items-center justify-center transition-all cursor-pointer ${
                activeTab === 'takip'
                  ? 'text-indigo-650 scale-102 font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <CalendarClock className={`w-4 h-4 ${activeTab === 'takip' ? 'text-indigo-600 scale-110' : ''}`} />
              <span className="text-[8.5px] font-bold font-sans mt-0.5">Ödemelerim</span>
            </button>

            {/* Tab 4: Rapor (Analytical Reports) */}
            <button
              onClick={() => setActiveTab('grafikler')}
              className={`flex-1 py-1 flex flex-col items-center justify-center transition-all cursor-pointer ${
                activeTab === 'grafikler'
                  ? 'text-indigo-650 scale-102 font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <BarChart3 className={`w-4 h-4 ${activeTab === 'grafikler' ? 'text-indigo-600 scale-110' : ''}`} />
              <span className="text-[8.5px] font-bold font-sans mt-0.5">Raporlar</span>
            </button>

            {/* Tab 5: İşlemler (History List) */}
            <button
              onClick={() => setActiveTab('islemler')}
              className={`flex-1 py-1 flex flex-col items-center justify-center transition-all cursor-pointer ${
                activeTab === 'islemler'
                  ? 'text-indigo-650 scale-102 font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Receipt className={`w-4 h-4 ${activeTab === 'islemler' ? 'text-indigo-600 scale-110' : ''}`} />
              <span className="text-[8.5px] font-bold font-sans mt-0.5">İşlemler</span>
            </button>

            {/* Tab 6: Ayarlar & Kategori Yönetimi */}
            <button
              onClick={() => setActiveTab('ayarlar')}
              className={`flex-1 py-1 flex flex-col items-center justify-center transition-all cursor-pointer ${
                activeTab === 'ayarlar'
                  ? 'text-indigo-650 scale-102 font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <SettingsIcon className={`w-4 h-4 ${activeTab === 'ayarlar' ? 'text-indigo-600 scale-110' : ''}`} />
              <span className="text-[8.5px] font-bold font-sans mt-0.5">Ayarlar</span>
            </button>

          </div>
        </div>

      </div>
    </div>
  );
}
