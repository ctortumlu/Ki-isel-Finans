import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, HelpCircle, AlertCircle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Evet, Eminim',
  cancelText = 'Vazgeç',
  isDangerous = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            id="confirm-modal-backdrop"
          />

          {/* Modal Content Card */}
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-sm bg-white border border-slate-200 shadow-2xl rounded-3xl p-6 overflow-hidden select-text"
            id="confirm-modal-box"
          >
            {/* Upper Indicator Badge */}
            <div className="flex items-center gap-3.5 mb-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                isDangerous ? 'bg-rose-50 border border-rose-100 text-rose-500' : 'bg-indigo-50 border border-indigo-100 text-indigo-600'
              }`}>
                {isDangerous ? <AlertTriangle className="w-6 h-6 animate-pulse" /> : <HelpCircle className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 font-sans tracking-tight leading-tight">
                  {title}
                </h3>
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest leading-none block mt-1">
                  Sistem Onayı Belirleyici
                </span>
              </div>
            </div>

            {/* Description Text */}
            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 border border-slate-100 p-3.5 rounded-2xl mb-5 font-medium select-text">
              {message}
            </p>

            {/* Responsive Actions */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={onCancel}
                className="py-3 px-4 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200/55 rounded-2xl transition-all cursor-pointer font-sans text-center"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={() => {
                  onConfirm();
                }}
                className={`py-3 px-4 text-xs font-black text-white rounded-2xl transition-all shadow-sm cursor-pointer font-sans text-center ${
                  isDangerous 
                    ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-200/20' 
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200/50'
                }`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
