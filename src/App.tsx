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
import { fetchExchangeRateForDate } from './utils/usdFetcher';
import Dashboard from './components/Dashboard';
import QuickRecord from './components/QuickRecord';
import PaymentTracker from './components/PaymentTracker';
import Transactions from './components/Transactions';
import Charts from './components/Charts';
import Settings from './components/Settings';
import LockScreen from './components/LockScreen';

// Icons for Tab Bar
import { Home, CalendarClock, Receipt, Percent, FileCode2, Wifi, BatteryMedium, Signal, Settings as SettingsIcon, BarChart3, Eye, EyeOff } from 'lucide-react';

// ===================== OFFLINE-FIRST SMART CLOUD MERGE HELPERS =====================
function mergeTransactions(localTxns: Transaction[], cloudTxns: Transaction[]): Transaction[] {
  const merged: Transaction[] = [];
  
  // Helper to determine if two transactions represent the same physical action (deduplication)
  const isDuplicate = (t1: Transaction, t2: Transaction) => {
    if (t1.id === t2.id) return true;
    
    const sameDate = t1.tarih === t2.tarih;
    const sameType = t1.tur === t2.tur;
    const sameCat = t1.kategori === t2.kategori;
    const sameSubCat = (t1.altKategori || '') === (t2.altKategori || '');
    const sameAmount = Math.abs(t1.tutar - t2.tutar) < 0.01;
    
    const desc1 = (t1.aciklama || '').toLowerCase().replace(/ödemesi/g, '').replace(/odemesi/g, '').trim();
    const desc2 = (t2.aciklama || '').toLowerCase().replace(/ödemesi/g, '').replace(/odemesi/g, '').trim();
    const sameDesc = desc1 === desc2 || (desc1 !== '' && desc2 !== '' && (desc1.includes(desc2) || desc2.includes(desc1)));
    
    return sameDate && sameType && sameCat && sameSubCat && sameAmount && sameDesc;
  };

  // 1. Seed with cloud transactions
  cloudTxns.forEach(ct => {
    const exists = merged.some(mt => isDuplicate(mt, ct));
    if (!exists) {
      merged.push(ct);
    }
  });

  // 2. Overlay local transactions to preserve modified, soft-deleted ('Pasif'), or newly created unsynced items
  localTxns.forEach(lt => {
    const matchingIdx = merged.findIndex(mt => isDuplicate(mt, lt));
    if (matchingIdx !== -1) {
      const existing = merged[matchingIdx];
      // Local changes (such as marked Passive or containing receipt documents) take precedence
      if (lt.aktifPasif === 'Pasif' || existing.aktifPasif === 'Pasif') {
        merged[matchingIdx] = { ...existing, ...lt, aktifPasif: 'Pasif' };
      } else {
        merged[matchingIdx] = { ...existing, ...lt };
      }
    } else {
      // Unsynced addition made locally while mobile was offline or saving was in progress
      merged.push(lt);
    }
  });

  return merged.sort((a, b) => b.tarih.localeCompare(a.tarih));
}

function mergePayments(localPmts: RecurringPayment[], cloudPmts: RecurringPayment[]): RecurringPayment[] {
  const merged: RecurringPayment[] = [];

  const isDuplicate = (p1: RecurringPayment, p2: RecurringPayment) => {
    if (p1.id === p2.id) return true;
    return p1.baslik.trim().toLowerCase() === p2.baslik.trim().toLowerCase() &&
           p1.kategori === p2.kategori &&
           Math.abs(p1.tutar - p2.tutar) < 0.01;
  };

  // 1. Load cloud payments
  cloudPmts.forEach(cp => {
    const exists = merged.some(mp => isDuplicate(mp, cp));
    if (!exists) {
      merged.push(cp);
    }
  });

  // 2. Overlay local payments. Status is altered (such as marked Paid or soft-deleted/Passive)
  localPmts.forEach(lp => {
    const matchingIdx = merged.findIndex(mp => isDuplicate(mp, lp));
    if (matchingIdx !== -1) {
      const existing = merged[matchingIdx];
      const isPaid = lp.durum === 'Odendi' || existing.durum === 'Odendi';
      const isPassive = lp.aktifPasif === 'Pasif' || existing.aktifPasif === 'Pasif';
      
      merged[matchingIdx] = {
        ...existing,
        ...lp,
        durum: isPaid ? 'Odendi' : 'Bekliyor',
        aktifPasif: isPassive ? 'Pasif' : 'Aktif'
      };
    } else {
      merged.push(lp);
    }
  });
  
  return merged;
}

export default function App() {
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('pano');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payments, setPayments] = useState<RecurringPayment[]>([]);

  // Hassas veri gizleme (Göz simgesi)
  const [isSensitiveHidden, setIsSensitiveHidden] = useState<boolean>(() => {
    return localStorage.getItem('finance_sensitive_hidden') === 'true';
  });

  // Otomatik kilit mekanizması
  const [autoLockDelay, setAutoLockDelay] = useState<string>(() => {
    return localStorage.getItem('finance_auto_lock_delay') || 'Kapalı';
  });

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

  // Load state on mount with smart merging
  useEffect(() => {
    const localTxns = loadTransactions();
    const localPmts = loadPayments();
    setTransactions(localTxns);
    setPayments(localPmts);

    if (isSyncEnabled() && getAutoSyncOnLoad()) {
      setIsSyncing(true);
      syncGetAllData().then((res) => {
        if (res.success && res.transactions && res.payments) {
          const mergedTxns = mergeTransactions(localTxns, res.transactions);
          const mergedPmts = mergePayments(localPmts, res.payments);

          setTransactions(mergedTxns);
          setPayments(mergedPmts);
          saveTransactions(mergedTxns);
          savePayments(mergedPmts);
          setLastSyncTime(new Date().toLocaleString('tr-TR'));
          console.log("Bulut eşitleme başlangıçta başarıyla tamamlandı.");

          // If there is any unsynced local modification/deletion/payment, automatically push to cloud
          const hasTxDiff = mergedTxns.length !== res.transactions.length || 
                            mergedTxns.some(t => !res.transactions.some(ct => ct.id === t.id && ct.aktifPasif === t.aktifPasif));
          const hasPmtDiff = mergedPmts.length !== res.payments.length ||
                             mergedPmts.some(p => !res.payments.some(cp => cp.id === p.id && cp.durum === p.durum && cp.aktifPasif === p.aktifPasif));

          if (hasTxDiff || hasPmtDiff) {
            triggerBackgroundSync(mergedTxns, mergedPmts, 'all');
          }
        }
      }).catch(err => {
        console.warn('Otomatik başlangıç senkronizasyonu hatası:', err);
      }).finally(() => {
        setIsSyncing(false);
      });
    }
  }, []);

  // Otomatik ekran kilitleme (Inactivity & Tab Switcher auto-locking)
  useEffect(() => {
    const pinExists = localStorage.getItem('finance_app_password');
    if (isLocked || !pinExists || autoLockDelay === 'Kapalı') return;

    let delayMs = 120000; // 2 dk
    if (autoLockDelay === '30sn') delayMs = 30000;
    else if (autoLockDelay === '1dk') delayMs = 60000;
    else if (autoLockDelay === '2dk') delayMs = 120000;
    else if (autoLockDelay === '5dk') delayMs = 300000;

    let timeoutId: any;

    const lockAppSecured = () => {
      setIsLocked(true);
    };

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(lockAppSecured, delayMs);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(name => {
      window.addEventListener(name, resetTimer);
    });

    // Sekme gizlendiğinde fırlayacak anlık kilit koruması (Ultra bakiye güvenliği)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        lockAppSecured();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(name => {
        window.removeEventListener(name, resetTimer);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isLocked, autoLockDelay]);

  const handleSync = async () => {
    if (!isSyncEnabled()) {
      alert("Lütfen önce Ayarlar menüsünden Google Sheets URL ve Bulut Eşitlemeyi etkinleştirin.");
      return;
    }
    setIsSyncing(true);
    try {
      const res = await syncGetAllData();
      if (res.success && res.transactions && res.payments) {
        const localTxns = loadTransactions();
        const localPmts = loadPayments();

        const mergedTxns = mergeTransactions(localTxns, res.transactions);
        const mergedPmts = mergePayments(localPmts, res.payments);

        setTransactions(mergedTxns);
        setPayments(mergedPmts);
        saveTransactions(mergedTxns);
        savePayments(mergedPmts);
        setLastSyncTime(new Date().toLocaleString('tr-TR'));

        // Check if there are local additions/changes merged that need to be synced up
        const hasTxDiff = mergedTxns.length !== res.transactions.length || 
                          mergedTxns.some(t => !res.transactions.some(ct => ct.id === t.id && ct.aktifPasif === t.aktifPasif));
        const hasPmtDiff = mergedPmts.length !== res.payments.length ||
                           mergedPmts.some(p => !res.payments.some(cp => cp.id === p.id && cp.durum === p.durum && cp.aktifPasif === p.aktifPasif));

        if (hasTxDiff || hasPmtDiff) {
          triggerBackgroundSync(mergedTxns, mergedPmts, 'all');
        }

        alert("Eşitleme başarıyla tamamlandı! Buluttaki güncel verileriniz yüklendi ve yerel verilerinizle birleştirildi.");
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
    const id = 'txn_' + Date.now();
    const item: Transaction = {
      ...newT,
      id,
      aktifPasif: 'Aktif',
    };
    const updated = [item, ...transactions];
    setTransactions(updated);
    saveTransactions(updated);
    triggerBackgroundSync(updated, payments, 'transactions');

    // Asynchronously fetch that day's exchange rate ONLY if it is not already specified!
    if (newT.usdRate === undefined || newT.usdRate === null) {
      fetchExchangeRateForDate(newT.tarih).then((rate) => {
        if (rate) {
          setTransactions((prev) => {
            const next = prev.map((t) => t.id === id ? { ...t, usdRate: rate } : t);
            saveTransactions(next);
            triggerBackgroundSync(next, payments, 'transactions');
            return next;
          });
        }
      }).catch((err) => {
        console.warn('Could not auto fetch currency dynamic exchange rating:', err);
      });
    }
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
    const id = 'txn_' + Date.now();
    const item: Transaction = {
      ...newT,
      id,
      aktifPasif: 'Aktif',
    };
    const updatedTxns = [item, ...transactions];
    const updatedPmts = payments.map((p) => p.id === updatedPayment.id ? updatedPayment : p);

    setTransactions(updatedTxns);
    saveTransactions(updatedTxns);
    setPayments(updatedPmts);
    savePayments(updatedPmts);

    triggerBackgroundSync(updatedTxns, updatedPmts, 'all');

    // Asynchronously fetch that day's exchange rate ONLY if it is not already specified!
    if (newT.usdRate === undefined || newT.usdRate === null) {
      fetchExchangeRateForDate(newT.tarih).then((rate) => {
        if (rate) {
          setTransactions((prev) => {
            const next = prev.map((t) => t.id === id ? { ...t, usdRate: rate } : t);
            saveTransactions(next);
            triggerBackgroundSync(next, updatedPmts, 'all');
            return next;
          });
        }
      }).catch((err) => {
        console.warn('Could not auto fetch currency dynamic exchange rating for paid payment:', err);
      });
    }
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
            hideSensitiveData={isSensitiveHidden}
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
            hideSensitiveData={isSensitiveHidden}
          />
        );
      case 'islemler':
        return (
          <Transactions
            transactions={activeTransactions}
            onDeleteTransaction={handleDeleteTransaction}
            onNavigateHome={() => setActiveTab('pano')}
            hideSensitiveData={isSensitiveHidden}
          />
        );
      case 'grafikler':
        return <Charts transactions={activeTransactions} onNavigateHome={() => setActiveTab('pano')} hideSensitiveData={isSensitiveHidden} />;
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
            autoLockDelay={autoLockDelay}
            onChangeAutoLockDelay={(val) => {
              localStorage.setItem('finance_auto_lock_delay', val);
              setAutoLockDelay(val);
            }}
          />
        );
      default:
        return <Dashboard transactions={activeTransactions} payments={activePayments} onNavigate={setActiveTab} hideSensitiveData={isSensitiveHidden} />;
    }
  };

  return (
    <>
      <AnimatePresence>
        {isLocked && (
          <LockScreen onUnlock={() => setIsLocked(false)} />
        )}
      </AnimatePresence>

      <div className="h-screen h-[100dvh] max-h-screen max-h-[100dvh] overflow-hidden md:h-auto md:min-h-screen md:max-h-none md:overflow-visible bg-slate-100 flex items-center justify-center p-0 md:p-6 select-none select-text">
      
      {/* Outer framing for gorgeous Presentation */}
      <div className="w-full max-w-md bg-white md:rounded-[45px] md:shadow-2xl overflow-hidden h-full max-h-full md:min-h-[820px] md:h-[820px] md:border-8 md:border-slate-800 flex flex-col justify-between relative">
        
        {/* iOS-Style Notch and Status Bar on desktop, safe area paddings */}
        <div className="bg-pastel-bg/60 backdrop-blur-md sticky top-0 z-40 border-b border-slate-100 px-6 pt-3 pb-2 flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold font-mono text-slate-700">{currentTime || '18:15'}</span>
            
            {/* Sensitive Data (Privacy) Masking eye button */}
            <motion.button
              whileTap={{ scale: 0.82 }}
              onClick={() => setIsSensitiveHidden(prev => {
                const newVal = !prev;
                localStorage.setItem('finance_sensitive_hidden', String(newVal));
                return newVal;
              })}
              title={isSensitiveHidden ? "Miktarları Göster" : "Miktarları Gizle"}
              className="p-1 hover:bg-slate-200/60 rounded-lg text-slate-500 hover:text-indigo-650 transition-colors ml-1 cursor-pointer"
            >
              {isSensitiveHidden ? (
                <EyeOff className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
              ) : (
                <Eye className="w-3.5 h-3.5 text-slate-500" />
              )}
            </motion.button>
            
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

        {/* Beautiful Sticky Tab Navigation Menu with 22px oval rounded styling (Physical Flex row child to prevent mobile viewport leaks) */}
        <div className="bg-white border-t border-slate-100/80 p-3 shrink-0 z-40">
          <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-1.5 flex justify-between items-center tab-bar-shadow gap-0.5">
            
            {/* Tab 1: Pano (Dashboard) */}
            <motion.button
              whileTap={{ scale: 0.90 }}
              onClick={() => setActiveTab('pano')}
              className={`flex-1 py-1 flex flex-col items-center justify-center transition-all cursor-pointer ${
                activeTab === 'pano'
                  ? 'text-indigo-650 scale-102 font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Home className={`w-4 h-4 ${activeTab === 'pano' ? 'text-indigo-600 scale-110 fill-indigo-50/50' : ''}`} />
              <span className="text-[8.5px] font-bold font-sans mt-0.5">Pano</span>
            </motion.button>

            {/* Tab 2: Kayıt (Quick Form) */}
            <motion.button
              whileTap={{ scale: 0.90 }}
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
            </motion.button>

            {/* Tab 3: Ödemeler (Tracking) */}
            <motion.button
              whileTap={{ scale: 0.90 }}
              onClick={() => setActiveTab('takip')}
              className={`flex-1 py-1 flex flex-col items-center justify-center transition-all cursor-pointer ${
                activeTab === 'takip'
                  ? 'text-indigo-650 scale-102 font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <CalendarClock className={`w-4 h-4 ${activeTab === 'takip' ? 'text-indigo-600 scale-110' : ''}`} />
              <span className="text-[8.5px] font-bold font-sans mt-0.5">Ödemelerim</span>
            </motion.button>

            {/* Tab 4: Rapor (Analytical Reports) */}
            <motion.button
              whileTap={{ scale: 0.90 }}
              onClick={() => setActiveTab('grafikler')}
              className={`flex-1 py-1 flex flex-col items-center justify-center transition-all cursor-pointer ${
                activeTab === 'grafikler'
                  ? 'text-indigo-650 scale-102 font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <BarChart3 className={`w-4 h-4 ${activeTab === 'grafikler' ? 'text-indigo-600 scale-110' : ''}`} />
              <span className="text-[8.5px] font-bold font-sans mt-0.5">Raporlar</span>
            </motion.button>

            {/* Tab 5: İşlemler (History List) */}
            <motion.button
              whileTap={{ scale: 0.90 }}
              onClick={() => setActiveTab('islemler')}
              className={`flex-1 py-1 flex flex-col items-center justify-center transition-all cursor-pointer ${
                activeTab === 'islemler'
                  ? 'text-indigo-650 scale-102 font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Receipt className={`w-4 h-4 ${activeTab === 'islemler' ? 'text-indigo-600 scale-110' : ''}`} />
              <span className="text-[8.5px] font-bold font-sans mt-0.5">İşlemler</span>
            </motion.button>

            {/* Tab 6: Ayarlar & Kategori Yönetimi */}
            <motion.button
              whileTap={{ scale: 0.90 }}
              onClick={() => setActiveTab('ayarlar')}
              className={`flex-1 py-1 flex flex-col items-center justify-center transition-all cursor-pointer ${
                activeTab === 'ayarlar'
                  ? 'text-indigo-650 scale-102 font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <SettingsIcon className={`w-4 h-4 ${activeTab === 'ayarlar' ? 'text-indigo-600 scale-110' : ''}`} />
              <span className="text-[8.5px] font-bold font-sans mt-0.5">Ayarlar</span>
            </motion.button>

          </div>
        </div>

      </div>
    </div>
    </>
  );
}
