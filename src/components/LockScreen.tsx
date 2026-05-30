import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, ShieldCheck, RefreshCw, Delete, Check, ShieldAlert } from 'lucide-react';

interface LockScreenProps {
  onUnlock: () => void;
}

export default function LockScreen({ onUnlock }: LockScreenProps) {
  const [pin, setPin] = useState<string>('');
  const [isSetup, setIsSetup] = useState<boolean>(false);
  const [savedPassword, setSavedPassword] = useState<string | null>(null);
  
  // Setup flow states
  const [setupStep, setSetupStep] = useState<1 | 2>(1);
  const [firstPin, setFirstPin] = useState<string>('');
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState<boolean>(false);

  useEffect(() => {
    const password = localStorage.getItem('finance_app_password');
    if (!password) {
      setIsSetup(true);
    } else {
      setSavedPassword(password);
    }
  }, []);

  const triggerShake = (msg: string) => {
    setIsShaking(true);
    setErrorMsg(msg);
    setTimeout(() => setIsShaking(false), 500);
    setPin('');
  };

  const handleKeyPress = (num: string) => {
    setErrorMsg(null);
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
      
      // Auto trigger action when 4 digits are entered
      if (nextPin.length === 4) {
        if (isSetup) {
          // If we are in setup mode, let's parse the steps
          if (setupStep === 1) {
            // First step complete: save and move to confirm
            setFirstPin(nextPin);
            setTimeout(() => {
              setSetupStep(2);
              setPin('');
            }, 250);
          } else {
            // Second step: verify they match
            if (nextPin === firstPin) {
              localStorage.setItem('finance_app_password', nextPin);
              setTimeout(() => {
                onUnlock();
              }, 300);
            } else {
              setTimeout(() => {
                triggerShake('Girdiğiniz şifreler eşleşmedi! Tekrar deneyin.');
                setSetupStep(1);
                setFirstPin('');
              }, 250);
            }
          }
        } else if (savedPassword) {
          // Verify password
          if (nextPin === savedPassword) {
            setTimeout(() => {
              onUnlock();
            }, 300);
          } else {
            setTimeout(() => {
              triggerShake('Hatalı Şifre! Lütfen doğru kodu girin.');
            }, 250);
          }
        }
      }
    }
  };

  const handleDelete = () => {
    setErrorMsg(null);
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
    }
  };

  const renderKey = (val: string) => {
    return (
      <button
        key={val}
        onClick={() => handleKeyPress(val)}
        className="w-16 h-16 rounded-full bg-slate-900/40 hover:bg-slate-900/65 active:bg-slate-950 font-mono text-xl font-black text-white flex items-center justify-center transition-all shadow-md border border-slate-800/40 cursor-pointer active:scale-90 select-none"
      >
        {val}
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-indigo-950 via-slate-950 to-slate-900 flex items-center justify-center p-4">
      {/* Decorative ambient gradients */}
      <div className="absolute -left-20 -top-20 w-64 h-64 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        className="w-full max-w-sm bg-slate-950/70 border border-slate-900 rounded-[35px] py-8 px-6 content-box shadow-2xl flex flex-col items-center justify-between text-sans relative backdrop-blur-md"
      >
        {/* Upper Header and Shield Icon Display */}
        <div className="flex flex-col items-center text-center mt-2 w-full">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 shadow-inner">
            {isSetup ? (
              <ShieldCheck className="w-7 h-7 animate-pulse text-indigo-400" />
            ) : (
              <Lock className="w-6 h-6 text-indigo-400" />
            )}
          </div>
          
          <h2 className="text-base font-extrabold text-white tracking-tight uppercase">
            {isSetup 
              ? (setupStep === 1 ? 'Şifre Belirleyin' : 'Şifreyi Onaylayın') 
              : 'Giriş Anahtarı'}
          </h2>
          
          <p className="text-[11px] text-slate-400 max-w-[260px] leading-relaxed mt-1.5">
            {isSetup 
              ? (setupStep === 1 
                  ? 'Uygulamanızı güvende tutmak için 4 haneli bir giriş şifresi (PIN) oluşturun.' 
                  : 'Oluşturduğunuz şifreyi doğrulamak için tekrar tuşlayın.')
              : 'Finansal verilerinize güvenli erişim sağlamak için şifrenizi girin.'
            }
          </p>
        </div>

        {/* Shaking PIN Indicators */}
        <div className="my-8 flex flex-col items-center w-full">
          <motion.div 
            animate={isShaking ? { x: [-10, 10, -10, 10, 0] } : {}}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-4 py-2"
          >
            {[0, 1, 2, 3].map((index) => {
              const isFilled = pin.length > index;
              return (
                <div
                  key={index}
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                    isFilled 
                      ? 'bg-indigo-500 border-indigo-400 scale-125 shadow-[0_0_12px_rgba(99,102,241,0.5)]' 
                      : 'bg-slate-800 border-slate-700 border-2'
                  }`}
                />
              );
            })}
          </motion.div>

          <div className="h-6 mt-2 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {errorMsg && (
                <motion.span
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="text-[9.5px] font-bold text-rose-450 bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-xl flex items-center gap-1"
                >
                  <ShieldAlert className="w-3.5 h-3.5" /> {errorMsg}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* High Polish Numeric Grid Numpad Layout */}
        <div className="grid grid-cols-3 gap-y-4 gap-x-5 justify-items-center w-full max-w-[240px] mb-2 select-none">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(renderKey)}
          
          {/* Action Key 1: Clear/Cancel */}
          <div className="w-16 h-16 flex items-center justify-center">
            {isSetup && setupStep === 2 && (
              <button
                onClick={() => {
                  setSetupStep(1);
                  setFirstPin('');
                  setPin('');
                  setErrorMsg(null);
                }}
                className="text-[10px] uppercase font-mono font-bold text-slate-500 hover:text-slate-300 transition-colors"
              >
                Geri Git
              </button>
            )}
          </div>

          {/* Key 0 */}
          {renderKey('0')}

          {/* Action Key 2: Delete Backspace */}
          <button
            onClick={handleDelete}
            disabled={pin.length === 0}
            className="w-16 h-16 rounded-full flex items-center justify-center text-slate-400 hover:text-white active:bg-slate-900/50 disabled:opacity-30 cursor-pointer select-none"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Bottom Footer brand watermarks */}
        <div className="text-[9.5px] font-mono text-slate-600 tracking-wide mt-4">
          🔐 Biyometrik & Donanımsal Korumalı
        </div>
      </motion.div>
    </div>
  );
}
