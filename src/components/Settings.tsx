import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Check, Copy, FileSpreadsheet, Settings as SettingsIcon, Link, CheckCircle, 
  AlertTriangle, Plus, Trash2, Database, Sparkles, Layers, FileDown, 
  Trash, Import, Eye, CheckSquare, FileText, ChevronRight 
} from 'lucide-react';
import { loadCustomCategories, saveCustomCategories, savePayments } from '../db';
import { getCategoryEmoji, stripEmoji } from '../utils/emoji';
import { SheetCategory, Transaction, RecurringPayment } from '../types';
import {
  getAppsScriptUrl,
  setAppsScriptUrl,
  getUseCloudSync,
  setUseCloudSync,
  getAutoSyncOnLoad,
  setAutoSyncOnLoad,
  getLastSyncTime,
  setLastSyncTime,
  syncGetAllData,
  syncSaveAllData,
  syncTestConnection,
} from '../sheetsSync';
import jsPDF from 'jspdf';
import ConfirmModal from './ConfirmModal';

interface SettingsProps {
  transactions: Transaction[];
  setTransactions: (t: Transaction[]) => void;
  payments: RecurringPayment[];
  setPayments: (p: RecurringPayment[]) => void;
  onNavigateHome: () => void;
}

export default function Settings({ 
  transactions, 
  setTransactions, 
  payments,
  setPayments,
  onNavigateHome 
}: SettingsProps) {
  
  // Reusable custom ConfirmModal states
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmModalTitle, setConfirmModalTitle] = useState('');
  const [confirmModalMessage, setConfirmModalMessage] = useState('');
  const [confirmModalAction, setConfirmModalAction] = useState<(() => void) | null>(null);
  const [confirmModalIsDangerous, setConfirmModalIsDangerous] = useState(false);

  const askConfirm = (title: string, message: string, action: () => void, isDangerous = false) => {
    setConfirmModalTitle(title);
    setConfirmModalMessage(message);
    setConfirmModalAction(() => action);
    setConfirmModalIsDangerous(isDangerous);
    setConfirmModalOpen(true);
  };

  // Category management state
  const [customCategories, setCustomCategories] = useState<SheetCategory[]>([]);
  const [catTypeTab, setCatTypeTab] = useState<'Gelir' | 'Gider'>('Gider');
  const [newParentName, setNewParentName] = useState('');
  const [newSubNameMap, setNewSubNameMap] = useState<Record<string, string>>({}); // { parentCategoryName: subCategoryValue }
  
  // Custom Emoji selections
  const [selectedParentEmoji, setSelectedParentEmoji] = useState('💸');
  const [selectedSubEmojiMap, setSelectedSubEmojiMap] = useState<Record<string, string>>({}); // { parentCategoryName: subCategoryEmoji }

  useEffect(() => {
    setSelectedParentEmoji(catTypeTab === 'Gider' ? '💸' : '💰');
  }, [catTypeTab]);

  // Excel Paste state
  const [pasteText, setPasteText] = useState('');
  const [isImportPreviewOpen, setIsImportPreviewOpen] = useState(false);
  const [parsedRows, setParsedRows] = useState<Transaction[]>([]);
  const [importNotification, setImportNotification] = useState<{ type: 'success' | 'refused', msg: string } | null>(null);

  // PDF Export selections
  const [pdfTypeFilter, setPdfTypeFilter] = useState<'Tümü' | 'Gelir' | 'Gider'>('Tümü');
  const [pdfStartDate, setPdfStartDate] = useState('');
  const [pdfEndDate, setPdfEndDate] = useState('');
  const [pdfTheme, setPdfTheme] = useState<'indigo' | 'emerald' | 'charcoal' | 'rose'>('indigo');
  const [includeAnalytics, setIncludeAnalytics] = useState<boolean>(true);

  // CSV Restore selections
  const [csvRestoreRows, setCsvRestoreRows] = useState<Transaction[]>([]);
  const [isCSVRestorePreviewOpen, setIsCSVRestorePreviewOpen] = useState(false);

  // Google Sheets Cloud Sync states
  const [appsScriptUrl, setAppsScriptUrlState] = useState('');
  const [useCloudSync, setUseCloudSyncState] = useState(false);
  const [autoSyncOnLoad, setAutoSyncOnLoadState] = useState(true);
  const [lastSyncTime, setLastSyncTimeState] = useState('Henüz Eşitlenmedi');
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showScriptInstructions, setShowScriptInstructions] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  useEffect(() => {
    // Load local custom categories
    setCustomCategories(loadCustomCategories());

    // Load local Google Sheets configurations
    setAppsScriptUrlState(getAppsScriptUrl());
    setUseCloudSyncState(getUseCloudSync());
    setAutoSyncOnLoadState(getAutoSyncOnLoad());
    setLastSyncTimeState(getLastSyncTime());
  }, []);

  // Handle Category Additions/Deletions
  const handleAddParentCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const parentInput = newParentName.trim();
    if (!parentInput) return;

    // Prepend chosen emoji if any
    const parent = selectedParentEmoji ? `${selectedParentEmoji} ${parentInput}` : parentInput;

    const exists = customCategories.some(
      (c) => c.islem === catTypeTab && c.kategori.toLowerCase() === parent.toLowerCase()
    );
    if (exists) {
      alert('Bu ana kategori zaten mevcut.');
      return;
    }

    const updated = [
      ...customCategories,
      { islem: catTypeTab, kategori: parent, altKategori: 'Genel' }
    ];
    setCustomCategories(updated);
    saveCustomCategories(updated);
    setNewParentName('');
  };

  const handleAddSubCategory = (parentName: string) => {
    const subNameInput = newSubNameMap[parentName]?.trim();
    if (!subNameInput) return;

    // Prepend chosen emoji for subcategory
    const subEmoji = selectedSubEmojiMap[parentName] || '🏷️';
    const subName = `${subEmoji} ${subNameInput}`;

    const exists = customCategories.some(
      (c) => 
        c.islem === catTypeTab && 
        c.kategori === parentName && 
        c.altKategori.toLowerCase() === subName.toLowerCase()
    );
    if (exists) {
      alert('Bu alt kategori zaten mevcut.');
      return;
    }

    const updated = [
      ...customCategories,
      { islem: catTypeTab, kategori: parentName, altKategori: subName }
    ];
    setCustomCategories(updated);
    saveCustomCategories(updated);
    
    setNewSubNameMap(prev => ({
      ...prev,
      [parentName]: ''
    }));
    setSelectedSubEmojiMap(prev => ({
      ...prev,
      [parentName]: '🏷️'
    }));
  };

  const handleDeleteSubCategorySub = (parentName: string, subName: string) => {
    const siblingCats = customCategories.filter(
      (c) => c.islem === catTypeTab && c.kategori === parentName
    );
    let updated;

    if (siblingCats.length <= 1) {
      updated = customCategories.filter(
        c => !(c.islem === catTypeTab && c.kategori === parentName)
      );
    } else {
      updated = customCategories.filter(
        c => !(c.islem === catTypeTab && c.kategori === parentName && c.altKategori === subName)
      );
    }
    
    setCustomCategories(updated);
    saveCustomCategories(updated);
  };

  const handleDeleteSubCategory = (parentName: string, subName: string) => {
    askConfirm(
      "Alt Kategoriyi Sil",
      `"${subName}" alt kategorisini kalıcı olarak silmek istediğinizden emin misiniz?`,
      () => handleDeleteSubCategorySub(parentName, subName),
      true
    );
  };

  const handleDeleteParentCategorySub = (parentName: string) => {
    const updated = customCategories.filter(
       c => !(c.islem === catTypeTab && c.kategori === parentName)
    );
    setCustomCategories(updated);
    saveCustomCategories(updated);
  };

  const handleDeleteParentCategory = (parentName: string) => {
    askConfirm(
      "Kategoriyi Sil",
      `"${parentName}" kategorisini ve altındaki tüm detay seçeneklerini kalıcı olarak silmek istediğinizden emin misiniz?`,
      () => handleDeleteParentCategorySub(parentName),
      true
    );
  };

  // Group Categories for the selected tab
  const groupedCategories: Record<string, string[]> = {};
  customCategories
    .filter((c) => c.islem === catTypeTab)
    .forEach((c) => {
      if (!groupedCategories[c.kategori]) {
        groupedCategories[c.kategori] = [];
      }
      if (c.altKategori && !groupedCategories[c.kategori].includes(c.altKategori)) {
        groupedCategories[c.kategori].push(c.altKategori);
      }
    });

  // RAW EXCEL / TEXT PASTE IMPORTER ENGINE
  const handleParsePaste = () => {
    if (!pasteText.trim()) {
      alert('Lütfen analiz edilecek satırları kutuya yapıştırın.');
      return;
    }

    const lines = pasteText.split('\n');
    const parsed: Transaction[] = [];
    
    for (let rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // Smart separator detection: tab, semicolon, or comma
      let parts = line.split('\t');
      if (parts.length < 2) {
        parts = line.split(';');
      }
      if (parts.length < 2) {
        parts = line.split(',');
      }

      // Clean whitespaces
      parts = parts.map(p => p.trim());

      // Try parsing values: Tarih, Tür, Kategori, Alt Kategori, Tutar, Açıklama
      const rawDate = parts[0] || '';
      const rawTur = parts[1] || 'Gider';
      const rawKat = parts[2] || 'Diğer';
      const rawAlt = parts[3] || 'Genel';
      const rawTutar = parts[4] || '';
      const rawAciklama = parts[5] || '';

      // Date parsing helper
      let parsedDate = '2026-05-22'; // anchor default fallback
      const dotPattern = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/;
      const slashPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
      const ISOpattern = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;

      if (dotPattern.test(rawDate)) {
        const matches = rawDate.match(dotPattern);
        if (matches) {
          const d = matches[1].padStart(2, '0');
          const m = matches[2].padStart(2, '0');
          const y = matches[3];
          parsedDate = `${y}-${m}-${d}`;
        }
      } else if (slashPattern.test(rawDate)) {
        const matches = rawDate.match(slashPattern);
        if (matches) {
          const d = matches[1].padStart(2, '0');
          const m = matches[2].padStart(2, '0');
          const y = matches[3];
          parsedDate = `${y}-${m}-${d}`;
        }
      } else if (ISOpattern.test(rawDate)) {
        parsedDate = rawDate;
      }

      // Type parsing helper
      let normalizedType: 'Gelir' | 'Gider' = 'Gider';
      if (rawTur.toLowerCase().includes('gelir') || rawTur.toLowerCase().trim() === 'income' || rawTur.toLowerCase().trim() === 'i') {
        normalizedType = 'Gelir';
      }

      // Money parsing helper: Handle currencies, dots, and Turkish comma decimal points
      let cleanedTutar = rawTutar.replace(/[^0-9,\.-]/g, '');
      if (cleanedTutar.includes('.') && cleanedTutar.includes(',')) {
        cleanedTutar = cleanedTutar.replace(/\./g, '').replace(/,/g, '.');
      } else if (cleanedTutar.includes(',')) {
        cleanedTutar = cleanedTutar.replace(/,/g, '.');
      }

      let numericTutar = parseFloat(cleanedTutar);
      if (isNaN(numericTutar)) {
        numericTutar = 0;
      }

      parsed.push({
        id: 'txn_imp_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
        tarih: parsedDate,
        tur: normalizedType,
        kategori: rawKat || 'Diğer',
        altKategori: rawAlt || 'Genel',
        tutar: Math.abs(numericTutar),
        aciklama: rawAciklama || `${rawKat} İşlemi`
      });
    }

    if (parsed.length === 0) {
      alert('Hiç geçerli satır ayrıştırılamadı. Formatı kontrol edin.');
      return;
    }

    setParsedRows(parsed);
    setIsImportPreviewOpen(true);
  };

  const handleApplyImport = () => {
    if (parsedRows.length === 0) return;

    // Concat with existing transactions
    const updated = [...parsedRows, ...transactions];
    // Sort by date descending
    updated.sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime());

    setTransactions(updated);
    setPasteText('');
    setParsedRows([]);
    setIsImportPreviewOpen(false);

    setImportNotification({
      type: 'success',
      msg: `✓ ${parsedRows.length} adet işlem başarıyla Excel'den telefonunuza aktarıldı!`
    });
    setTimeout(() => setImportNotification(null), 5000);
  };

  // CSV Backup Downloader
  const handleDownloadCSVBackup = () => {
    if (transactions.length === 0) {
      alert('İndirilecek kayıt bulunmamaktadır.');
      return;
    }

    let csvContent = '\uFEFF'; // BOM for Excel Turkish chars support
    csvContent += 'Tarih;Tür;Kategori;Alt Kategori;Tutar;Açıklama\r\n';

    transactions.forEach(t => {
      const row = [
        t.tarih,
        t.tur,
        t.kategori,
        t.altKategori || '',
        t.tutar.toString(),
        t.aciklama.replace(/;/g, ',') // replace semicolons to keep validity
      ].join(';');
      csvContent += row + '\r\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Finans_Kayıt_Yedek_${new Date().toISOString().substring(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Complete Database Wiper (Danger block)
  const handleClearDatabase = () => {
    askConfirm(
      "⚠️ KRİTİK VERİ SIFIRLAMA",
      "Cihazınızda kayıtlı olan TÜM gelir/gider listelerini, belgeleri ve aktarımları KALICI olarak silmek üzeresiniz. Bu işlem kesinlikle geri alınamaz! Sıfırlamayı onaylıyor musunuz?",
      () => {
        setTransactions([]);
        localStorage.removeItem('finance_transactions');
        setImportNotification({
          type: 'refused',
          msg: '✓ Tüm yerel veritabanı boşaltıldı ve sıfırlandı!'
        });
        setTimeout(() => setImportNotification(null), 4000);
      },
      true
    );
  };

  // ===================== GOOGLE SHEETS CLOUD SYNC HANDLERS =====================
  const APPS_SCRIPT_CODE = `// ---------------------------------------------------------------- //
// CAVIT'S FINANCE APP - GOOGLE SHEETS CLOUD SYNC ENGINE (COL-FLEX SECURE)
// ---------------------------------------------------------------- //

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  var action = e && e.parameter ? e.parameter.action : "";
  var payload = {};
  
  // 1. SILENT CONCURRENCY LOCK (Protects Google Tables / prevents race-condition layout shifts)
  var lock = LockService.getScriptLock();
  var gotLock = false;
  try {
    gotLock = lock.tryLock(30000); // Wait up to 30 seconds
  } catch(lockErr) {
    // ignore lock initialization errors
  }
  
  try {
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
      if (!action) action = payload.action;
    }
  } catch(err) {
    // ignore parsing errors
  }
  
  var responseData = { success: false };
  
  try {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    
    // Tabloları tara: Eğer "Islemler" veya "Tablo1" yoksa, var olan ilk sayfayı da destekleyebilmek için arama yapıyoruz.
    var txSheet = doc.getSheetByName("Islemler") || doc.getSheetByName("Tablo1") || doc.getSheets()[0];
    if (!txSheet) {
      txSheet = doc.insertSheet("Islemler");
    }
    
    var paySheet = doc.getSheetByName("Odemeler") || doc.getSheetByName("Planlananlar");
    if (!paySheet) {
      // Eğer mevcut değilse ve sheet sayısı 1 ise (yani sadece işlemler varsa), ödemeler için yeni sayfa aç
      if (doc.getSheets().length === 1) {
        paySheet = doc.insertSheet("Odemeler");
      } else {
        paySheet = doc.getSheets()[1] || doc.insertSheet("Odemeler");
      }
    }
    
    // Tablo başlıkları (Eğer boşsa)
    if (txSheet.getLastRow() === 0) {
      txSheet.appendRow(["id", "Tarih", "Tür", "Katagori", "Alt katagori", "Tutar", "Açıklama"]);
    }
    if (paySheet.getLastRow() === 0) {
      paySheet.appendRow(["id", "başlık", "tutar", "sonOdemeTarihi", "kategori", "durum"]);
    }

    // Yardimci kolon bulucu fonksiyon (Gelişmiş eşleştirme, Türkçe karakter ve boşluk toleranslı)
    function findColumnIndex(headers, synonyms) {
      for (var col = 0; col < headers.length; col++) {
        var val = String(headers[col]).toLowerCase().replace(/\\s/g, '').trim()
          .replace(/ı/g, 'i')
          .replace(/ğ/g, 'g')
          .replace(/ü/g, 'u')
          .replace(/ş/g, 's')
          .replace(/ö/g, 'o')
          .replace(/ç/g, 'c')
          .replace(/[^a-z0-9]/g, '');
        
        for (var s = 0; s < synonyms.length; s++) {
          var syn = synonyms[s].toLowerCase().replace(/\\s/g, '').trim()
            .replace(/ı/g, 'i')
            .replace(/ğ/g, 'g')
            .replace(/ü/g, 'u')
            .replace(/ş/g, 's')
            .replace(/ö/g, 'o')
            .replace(/ç/g, 'c')
            .replace(/[^a-z0-9]/g, '');
          if (val === syn) {
            return col;
          }
        }
      }
      return -1;
    }

    // Güvenli Tarih Dönüştürücü (DD.MM.YYYY Türkçe veya Date objelerini YYYY-MM-DD yapar)
    function parseDateToISO(val) {
      if (!val) {
        return new Date().toISOString().split('T')[0];
      }
      if (val instanceof Date) {
        var y = val.getFullYear();
        var m = String(val.getMonth() + 1);
        var d = String(val.getDate());
        if (m.length < 2) m = "0" + m;
        if (d.length < 2) d = "0" + d;
        return y + "-" + m + "-" + d;
      }
      var str = String(val).trim();
      if (/^\\d{4}-\\d{2}-\\d{2}/.test(str)) {
        return str.substring(0, 10);
      }
      // DD.MM.YYYY veya DD/MM/YYYY uyum kontrolü
      var match = str.match(/^(\\d{1,2})[\\/\\-\\.](\\d{1,2})[\\/\\-\\.](\\d{4})/);
      if (match) {
        var d = match[1];
        var m = match[2];
        var y = match[3];
        if (d.length < 2) d = "0" + d;
        if (m.length < 2) m = "0" + m;
        return y + "-" + m + "-" + d;
      }
      var par = Date.parse(str);
      if (!isNaN(par)) {
        var dObj = new Date(par);
        var y = dObj.getFullYear();
        var m = String(dObj.getMonth() + 1);
        var d = String(dObj.getDate());
        if (m.length < 2) m = "0" + m;
        if (d.length < 2) d = "0" + d;
        return y + "-" + m + "-" + d;
      }
      return str;
    }

    // Güvenli Tutar Dönüştürücü (Türkçe virgüllü "500,00" değerlerini JS Float "500.0" yapar)
    function parseNumberSafe(val) {
      if (typeof val === "number") return val;
      if (!val) return 0;
      var str = String(val).replace(/\\s/g, ''); // tüm boşlukları sil
      // binlik nokta, ondalık virgül mü kontrol et (1.250,50 gibi)
      if (str.indexOf('.') !== -1 && str.indexOf(',') !== -1) {
        str = str.replace(/\\./g, '').replace(/,/g, '.');
      } else if (str.indexOf(',') !== -1) {
        str = str.replace(/,/g, '.');
      }
      var num = parseFloat(str);
      return isNaN(num) ? 0 : num;
    }

    // 1. VERİLERİ BULUTTAN ÇEK (GET ALL DATA)
    if (action === "getAllData") {
      var txRows = txSheet.getDataRange().getValues();
      
      // Tablo başlığı hangi satırda bulunuyor, otomatik tespit et! (Vercel/Sheets tablolarındaki otomatik eklenen 1. sütun satırlarını atlamak için)
      var headerRowIdx = -1;
      for (var rowIdx = 0; rowIdx < Math.min(txRows.length, 10); rowIdx++) {
        var rowValues = txRows[rowIdx] || [];
        var rowStr = rowValues.join(" ").toLowerCase();
        
        var matchCount = 0;
        if (rowStr.indexOf("tarih") !== -1 || rowStr.indexOf("date") !== -1 || rowStr.indexOf("gun") !== -1) matchCount++;
        if (rowStr.indexOf("tutar") !== -1 || rowStr.indexOf("amount") !== -1 || rowStr.indexOf("fiyat") !== -1) matchCount++;
        if (rowStr.indexOf("tur") !== -1 || rowStr.indexOf("tür") !== -1 || rowStr.indexOf("type") !== -1) matchCount++;
        if (rowStr.indexOf("kategori") !== -1 || rowStr.indexOf("category") !== -1 || rowStr.indexOf("katagori") !== -1) matchCount++;
        if (rowStr.indexOf("id") !== -1) matchCount++;
        
        if (matchCount >= 2) {
          headerRowIdx = rowIdx;
          break;
        }
      }

      // OTOMATİK İYİLEŞTİRME (SELF-HEALING) - İŞLEMLER TABLOSU:
      // Google Sheets Tabloları (Google Tables) aktifken ilk satırın silinmesi yapısal bozulma tetikleyebilir.
      // Eşleşen başlık satırını olduğu gibi okuyoruz, asla fiziksel satır silme işlemi yapmıyoruz!
      if (headerRowIdx === -1) {
        headerRowIdx = 0;
      }

      var txHeaders = txRows[headerRowIdx] || [];
      
      // Kolon indislerini bulalım
      var idColIdx = findColumnIndex(txHeaders, ["id", "islemid", "transid"]);
      var tarihColIdx = findColumnIndex(txHeaders, ["tarih", "gun", "date", "tarihi"]);
      var turColIdx = findColumnIndex(txHeaders, ["tur", "tür", "type"]);
      var kategoriColIdx = findColumnIndex(txHeaders, ["kategori", "katagori", "category"]);
      var altKategoriColIdx = findColumnIndex(txHeaders, ["altkategori", "altkatagori", "alt_kategori", "subcategory"]);
      var tutarColIdx = findColumnIndex(txHeaders, ["tutar", "amount", "fiyat"]);
      var aciklamaColIdx = findColumnIndex(txHeaders, ["aciklama", "açıklama", "acıklama", "description", "not"]);
      var activePassiveColIdx = findColumnIndex(txHeaders, ["aktifpasif", "aktif-pasif", "durumaktifpasif"]);

      var transactions = [];
      for (var i = headerRowIdx + 1; i < txRows.length; i++) {
        var r = txRows[i];
        
        // Eğer her şey boşsa pas geç
        var hasAtLeastSomething = r.join("").trim().length > 0;
        if (!hasAtLeastSomething) continue;

        // Eşleşen sütunların verilerini alalım
        var rawId = idColIdx !== -1 ? r[idColIdx] : "";
        var rawTarih = tarihColIdx !== -1 ? r[tarihColIdx] : "";
        var rawTur = turColIdx !== -1 ? r[turColIdx] : "Gider";
        var rawKategori = kategoriColIdx !== -1 ? r[kategoriColIdx] : "Diğer";
        var rawAltKategori = altKategoriColIdx !== -1 ? r[altKategoriColIdx] : "Genel";
        var rawTutar = tutarColIdx !== -1 ? r[tutarColIdx] : 0;
        var rawAciklama = aciklamaColIdx !== -1 ? r[aciklamaColIdx] : "";
        var rawActivePassive = activePassiveColIdx !== -1 ? r[activePassiveColIdx] : "Aktif";

        // ID yoksa satır sırasına göre stabil bir ID üret (React çökmesin diye hayati)
        var rowId = rawId ? String(rawId).trim() : ("txn_tablo_" + i + "_" + Math.floor(parseNumberSafe(rawTutar)));

        transactions.push({
          id: rowId,
          tarih: parseDateToISO(rawTarih),
          tur: String(rawTur),
          kategori: String(rawKategori),
          altKategori: String(rawAltKategori),
          tutar: parseNumberSafe(rawTutar),
          aciklama: String(rawAciklama),
          aktifPasif: String(rawActivePassive).trim() === "Pasif" ? "Pasif" : "Aktif"
        });
      }
      
      var payments = [];
      if (paySheet) {
        var payRows = paySheet.getDataRange().getValues();
        
        // Ödemeler tablosunda başlık satırını otomatik tespit et
        var payHeaderRowIdx = -1;
        for (var rowIdx = 0; rowIdx < Math.min(payRows.length, 10); rowIdx++) {
          var rowValues = payRows[rowIdx] || [];
          var rowStr = rowValues.join(" ").toLowerCase();
          
          var matchCount = 0;
          if (rowStr.indexOf("baslik") !== -1 || rowStr.indexOf("başlık") !== -1 || rowStr.indexOf("title") !== -1 || rowStr.indexOf("altkat") !== -1 || rowStr.indexOf("atlkat") !== -1 || rowStr.indexOf("alt_kat") !== -1) matchCount++;
          if (rowStr.indexOf("tutar") !== -1 || rowStr.indexOf("amount") !== -1) matchCount++;
          if (rowStr.indexOf("sonodemetarihi") !== -1 || rowStr.indexOf("tarih") !== -1 || rowStr.indexOf("date") !== -1) matchCount++;
          if (rowStr.indexOf("durum") !== -1 || rowStr.indexOf("status") !== -1) matchCount++;
          if (rowStr.indexOf("id") !== -1) matchCount++;
          
          if (matchCount >= 2) {
            payHeaderRowIdx = rowIdx;
            break;
          }
        }

        // OTOMATİK İYİLEŞTİRME (SELF-HEALING) - ÖDEMELER TABLOSU:
        // Respect the detected header row as-is. Prevents Google Tables corruption.
        if (payHeaderRowIdx === -1) {
          payHeaderRowIdx = 0;
        }

        var payHeaders = payRows[payHeaderRowIdx] || [];
        
        var pIdColIdx = findColumnIndex(payHeaders, ["id", "odemeid"]);
        var pBaslikColIdx = findColumnIndex(payHeaders, ["baslik", "başlık", "title", "aciklama", "isim", "altkategori", "altkatagori", "alt_kategori", "altkatagor", "atlkatagor", "atlkatagori", "atlkategor", "altkatagoriler", "sub_category", "subcategory"]);
        var pTutarColIdx = findColumnIndex(payHeaders, ["tutar", "amount"]);
        var pTarihColIdx = findColumnIndex(payHeaders, ["sonodemetarihi", "tarih", "date"]);
        var pKateColIdx = findColumnIndex(payHeaders, ["kategori", "category", "katagori", "katagor"]);
        var pDurumColIdx = findColumnIndex(payHeaders, ["durum", "status"]);
        var pActivePassiveColIdx = findColumnIndex(payHeaders, ["aktifpasif", "aktif-pasif", "durumaktifpasif"]);

        for (var i = payHeaderRowIdx + 1; i < payRows.length; i++) {
          var r = payRows[i];
          var hasAtLeastSomething = r.join("").trim().length > 0;
          if (!hasAtLeastSomething) continue;

          var rawPId = pIdColIdx !== -1 ? r[pIdColIdx] : "";
          var rawPBaslik = pBaslikColIdx !== -1 ? r[pBaslikColIdx] : "Ödeme";
          var rawPTutar = pTutarColIdx !== -1 ? r[pTutarColIdx] : 0;
          var rawPTarih = pTarihColIdx !== -1 ? r[pTarihColIdx] : "";
          var rawPKate = pKateColIdx !== -1 ? r[pKateColIdx] : "Faturalar";
          var rawPDurum = pDurumColIdx !== -1 ? r[pDurumColIdx] : "Bekliyor";
          var rawPActivePassive = pActivePassiveColIdx !== -1 ? r[pActivePassiveColIdx] : "Aktif";

          var paymentId = rawPId ? String(rawPId).trim() : ("pay_gen_" + i);

          payments.push({
            id: paymentId,
            baslik: String(rawPBaslik),
            tutar: parseNumberSafe(rawPTutar),
            sonOdemeTarihi: parseDateToISO(rawPTarih),
            kategori: String(rawPKate),
            durum: String(rawPDurum),
            aktifPasif: String(rawPActivePassive).trim() === "Pasif" ? "Pasif" : "Aktif"
          });
        }
      }
      
      responseData = {
        success: true,
        transactions: transactions,
        payments: payments
      };
    } 
    // 2. VERİLERİ BULUTA YAPLANDIR (SAVE ALL DATA)
    else if (action === "saveAllData") {
      var transactions = payload.transactions || [];
      var payments = payload.payments || [];
      var target = payload.target || "all";
      
      // --- İŞLEMLERİ YAZILACAK ---
      if (target === "all" || target === "transactions") {
        var txRows = txSheet.getDataRange().getValues();
        var txHeaderRowIdx = -1;
        for (var rowIdx = 0; rowIdx < Math.min(txRows.length, 10); rowIdx++) {
          var rowValues = txRows[rowIdx] || [];
          var rowStr = rowValues.join(" ").toLowerCase();
          
          var matchCount = 0;
          if (rowStr.indexOf("tarih") !== -1 || rowStr.indexOf("date") !== -1 || rowStr.indexOf("gun") !== -1) matchCount++;
          if (rowStr.indexOf("tutar") !== -1 || rowStr.indexOf("amount") !== -1 || rowStr.indexOf("fiyat") !== -1) matchCount++;
          if (rowStr.indexOf("tur") !== -1 || rowStr.indexOf("tür") !== -1 || rowStr.indexOf("type") !== -1) matchCount++;
          if (rowStr.indexOf("kategori") !== -1 || rowStr.indexOf("category") !== -1 || rowStr.indexOf("katagori") !== -1) matchCount++;
          if (rowStr.indexOf("id") !== -1) matchCount++;
          
          if (matchCount >= 2) {
            txHeaderRowIdx = rowIdx;
            break;
          }
        }

        // OTOMATİK İYİLEŞTİRME (SELF-HEALING) - İŞLEMLER TABLOSU KAYDETME:
        // Google Sheets Tabloları (Google Tables) aktifken ilk satırın silinmesi yapısal bozulma tetikleyebilir.
        // Eşleşen başlık satırını olduğu gibi okuyoruz, asla fiziksel satır silme işlemi yapmıyoruz!
        if (txHeaderRowIdx === -1) {
          if (txSheet.getLastRow() > 0) {
            txHeaderRowIdx = 0;
          }
        }

        var txHeaders;
        var startRow;
        var txOutput2D = [];

        if (txHeaderRowIdx !== -1) {
          txHeaders = txRows[txHeaderRowIdx];
          startRow = txHeaderRowIdx + 2; // İlk veri satırının 1 tabanlı indeksi

          var idCol = findColumnIndex(txHeaders, ["id", "islemid", "transid"]);
          var tarihCol = findColumnIndex(txHeaders, ["tarih", "date", "gun"]);
          var turCol = findColumnIndex(txHeaders, ["tur", "tür", "type"]);
          var katCol = findColumnIndex(txHeaders, ["kategori", "katagori", "category"]);
          var altKatCol = findColumnIndex(txHeaders, ["altkategori", "altkatagori", "subcategory"]);
          var tutarCol = findColumnIndex(txHeaders, ["tutar", "amount", "fiyat"]);
          var aciklamaCol = findColumnIndex(txHeaders, ["aciklama", "açıklama", "acıklama", "description", "not"]);
          var activePassiveCol = findColumnIndex(txHeaders, ["aktifpasif", "aktif-pasif", "durumaktifpasif"]);

          transactions.forEach(function(tx) {
            var newRow = new Array(txHeaders.length);
            for (var c = 0; c < txHeaders.length; c++) newRow[c] = "";
            
            if (idCol !== -1) newRow[idCol] = tx.id;
            if (tarihCol !== -1) newRow[tarihCol] = tx.tarih;
            if (turCol !== -1) newRow[turCol] = tx.tur;
            if (katCol !== -1) newRow[katCol] = tx.kategori;
            if (altKatCol !== -1) newRow[altKatCol] = tx.altKategori || 'Genel';
            if (tutarCol !== -1) newRow[tutarCol] = tx.tutar;
            if (aciklamaCol !== -1) newRow[aciklamaCol] = tx.aciklama || '';
            if (activePassiveCol !== -1) newRow[activePassiveCol] = tx.aktifPasif || 'Aktif';
            
            txOutput2D.push(newRow);
          });

          // 1. Verileri doğrudan mevcut hücrelerin üzerine yaz (asla komple silip sıfırdan oluşturma yok!)
          if (txOutput2D.length > 0) {
            txSheet.getRange(startRow, 1, txOutput2D.length, txHeaders.length).setValues(txOutput2D);
            if (tutarCol !== -1) {
              // Tutar sütununu SAYI formatına zorlayarak tarihe dönüşmesini kesinlikle engelliyoruz!
              txSheet.getRange(startRow, tutarCol + 1, txOutput2D.length, 1).setNumberFormat('0.00');
            }
          }

          // 2. Eğer eski tabloda daha fazla satır varsa, sadece kalan hücrelerin içeriğini temizle (fiziksel row silme yok!)
          var lastTxRow = txSheet.getLastRow();
          var newEndRow = startRow + txOutput2D.length - 1;
          if (lastTxRow > newEndRow) {
            txSheet.getRange(newEndRow + 1, 1, lastTxRow - newEndRow, txHeaders.length).clearContent();
          }
        } else {
          // Yedek durum: Başlık bulunamadıysa sıfırdan oluştur
          txHeaders = ["id", "Tarih", "Tür", "Katagori", "Alt katagori", "Tutar", "Açıklama", "Aktif-Pasif"];
          txSheet.clearContents();
          txSheet.getRange(1, 1, 1, txHeaders.length).setValues([txHeaders]);
          
          transactions.forEach(function(tx) {
            txOutput2D.push([
              tx.id,
              tx.tarih,
              tx.tur,
              tx.kategori,
              tx.altKategori || 'Genel',
              tx.tutar,
              tx.aciklama || '',
              tx.aktifPasif || 'Aktif'
            ]);
          });
          if (txOutput2D.length > 0) {
            txSheet.getRange(2, 1, txOutput2D.length, txHeaders.length).setValues(txOutput2D);
            // Tutar sütununu (index 5, sütun 6) sayı formatına zorla
            txSheet.getRange(2, 6, txOutput2D.length, 1).setNumberFormat('0.00');
          }
        }
      }

      // --- ÖDEMELERİ YAZILACAK ---
      if (paySheet && (target === "all" || target === "payments")) {
        var payRows = paySheet.getDataRange().getValues();
        var payHeaderRowIdx = -1;
        for (var rowIdx = 0; rowIdx < Math.min(payRows.length, 10); rowIdx++) {
          var rowValues = payRows[rowIdx] || [];
          var rowStr = rowValues.join(" ").toLowerCase();
          
          var matchCount = 0;
          if (rowStr.indexOf("baslik") !== -1 || rowStr.indexOf("başlık") !== -1 || rowStr.indexOf("title") !== -1 || rowStr.indexOf("altkat") !== -1 || rowStr.indexOf("atlkat") !== -1 || rowStr.indexOf("alt_kat") !== -1) matchCount++;
          if (rowStr.indexOf("tutar") !== -1 || rowStr.indexOf("amount") !== -1) matchCount++;
          if (rowStr.indexOf("sonodemetarihi") !== -1 || rowStr.indexOf("tarih") !== -1 || rowStr.indexOf("date") !== -1) matchCount++;
          if (rowStr.indexOf("durum") !== -1 || rowStr.indexOf("status") !== -1) matchCount++;
          if (rowStr.indexOf("id") !== -1) matchCount++;
          
          if (matchCount >= 2) {
            payHeaderRowIdx = rowIdx;
            break;
          }
        }

        // OTOMATİK İYİLEŞTİRME (SELF-HEALING) - ÖDEMELER TABLOSU KAYDETME:
        // Respect the detected header row as-is. Prevents Google Tables corruption.
        if (payHeaderRowIdx === -1) {
          if (paySheet.getLastRow() > 0) {
            payHeaderRowIdx = 0;
          }
        }

        var payHeaders;
        var pStartRow;
        var payOutput2D = [];

        if (payHeaderRowIdx !== -1) {
          payHeaders = payRows[payHeaderRowIdx];
          pStartRow = payHeaderRowIdx + 2;

          var pIdCol = findColumnIndex(payHeaders, ["id", "odemeid"]);
          var pBaslikCol = findColumnIndex(payHeaders, ["baslik", "başlık", "title", "aciklama", "isim", "altkategori", "altkatagori", "alt_kategori", "altkatagor", "atlkatagor", "atlkatagori", "atlkategor", "altkatagoriler", "sub_category", "subcategory"]);
          var pTutarCol = findColumnIndex(payHeaders, ["tutar", "amount"]);
          var pTarihCol = findColumnIndex(payHeaders, ["sonodemetarihi", "tarih", "date"]);
          var pKateCol = findColumnIndex(payHeaders, ["kategori", "category", "katagori", "katagor"]);
          var pDurumCol = findColumnIndex(payHeaders, ["durum", "status"]);
          var pActivePassiveCol = findColumnIndex(payHeaders, ["aktifpasif", "aktif-pasif", "durumaktifpasif"]);

          payments.forEach(function(p) {
            var newRow = new Array(payHeaders.length);
            for (var c = 0; c < payHeaders.length; c++) newRow[c] = "";

            if (pIdCol !== -1) newRow[pIdCol] = p.id;
            if (pBaslikCol !== -1) newRow[pBaslikCol] = p.baslik;
            if (pTutarCol !== -1) newRow[pTutarCol] = p.tutar;
            if (pTarihCol !== -1) newRow[pTarihCol] = p.sonOdemeTarihi;
            if (pKateCol !== -1) newRow[pKateCol] = p.kategori;
            if (pDurumCol !== -1) newRow[pDurumCol] = p.durum || 'Bekliyor';
            if (pActivePassiveCol !== -1) newRow[pActivePassiveCol] = p.aktifPasif || 'Aktif';

            payOutput2D.push(newRow);
          });

          // 1. Ödemeleri doğrudan mevcut hücrelerin üzerine yaz
          if (payOutput2D.length > 0) {
            paySheet.getRange(pStartRow, 1, payOutput2D.length, payHeaders.length).setValues(payOutput2D);
            if (pTutarCol !== -1) {
              // Tutar sütununu SAYI formatına zorlayarak tarihe dönüşmesini kesinlikle engelliyoruz!
              paySheet.getRange(pStartRow, pTutarCol + 1, payOutput2D.length, 1).setNumberFormat('0.00');
            }
          }

          // 2. Eğer eski tabloda kalan fazla satırlar varsa, sadece içerikleri temizle (asla fiziksel row silme yok!)
          var lastPayRow = paySheet.getLastRow();
          var newPayEndRow = pStartRow + payOutput2D.length - 1;
          if (lastPayRow > newPayEndRow) {
            paySheet.getRange(newPayEndRow + 1, 1, lastPayRow - newPayEndRow, payHeaders.length).clearContent();
          }
        } else {
          payHeaders = ["id", "Başlık", "Tutar", "Son Ödeme Tarihi", "Kategori", "Durum", "Aktif-Pasif"];
          paySheet.clearContents();
          paySheet.getRange(1, 1, 1, payHeaders.length).setValues([payHeaders]);

          payments.forEach(function(p) {
            payOutput2D.push([
              p.id,
              p.baslik,
              p.tutar,
              p.sonOdemeTarihi,
              p.kategori,
              p.durum || 'Bekliyor',
              p.aktifPasif || 'Aktif'
            ]);
          });
          if (payOutput2D.length > 0) {
            paySheet.getRange(2, 1, payOutput2D.length, payHeaders.length).setValues(payOutput2D);
            // Tutar sütununu sayı formatına zorla (Tutar 3. sıradadır: index 2)
            paySheet.getRange(2, 3, payOutput2D.length, 1).setNumberFormat('0.00');
          }
        }
      }
      
      responseData = { success: true, message: "Senkronizasyon Başarılı! Tüm veriler Google Sheets'e işlendi." };
    }
    else {
      responseData = { success: false, error: "Bilinmeyen API eylemi: " + action };
    }
    
  } catch(err) {
    responseData = { success: false, error: err.toString() };
  } finally {
    if (gotLock) {
      try {
        lock.releaseLock();
      } catch(releaseErr) {
        // ignore lock release errors
      }
    }
  }
  
  // CORS engellerinden kaçınmak için JSON çıktısı döndür
  return ContentService.createTextOutput(JSON.stringify(responseData))
    .setMimeType(ContentService.MimeType.JSON);
}`;

  const handleSaveSyncConfig = (url: string, enabled: boolean, autoSync: boolean) => {
    setAppsScriptUrl(url);
    setUseCloudSync(enabled);
    setAutoSyncOnLoad(autoSync);
    setAppsScriptUrlState(url);
    setUseCloudSyncState(enabled);
    setAutoSyncOnLoadState(autoSync);
    setSyncStatusMsg({ type: 'success', text: 'Yapılandırma başarıyla kaydedildi!' });
    setTimeout(() => setSyncStatusMsg(null), 3500);
  };

  const handleTestConnection = async () => {
    if (!appsScriptUrl) {
      setSyncStatusMsg({ type: 'error', text: 'E-Tablo API (Apps Script) URL adresi girmediniz!' });
      return;
    }
    setSyncLoading(true);
    setSyncStatusMsg(null);
    try {
      setAppsScriptUrl(appsScriptUrl);
      const res = await syncTestConnection();
      if (res.success) {
        setSyncStatusMsg({ type: 'success', text: 'Bağlantı Başarılı! E-Tablo entegrasyonu aktif hale getirildi.' });
        setUseCloudSync(true);
        setUseCloudSyncState(true);
      } else {
        setSyncStatusMsg({ type: 'error', text: `Bağlantı Başarısız: ${res.error}` });
      }
    } catch (e: any) {
      setSyncStatusMsg({ type: 'error', text: `Bağlantı Başarısız: ${e.message || e}` });
    } finally {
      setSyncLoading(false);
    }
  };

  const handlePullFromCloud = async () => {
    if (!appsScriptUrl) {
      setSyncStatusMsg({ type: 'error', text: 'Strateji Hatası: E-Tablo API URL adresi eksik!' });
      return;
    }
    setSyncLoading(true);
    setSyncStatusMsg(null);
    try {
      setAppsScriptUrl(appsScriptUrl);
      const res = await syncGetAllData();
      if (res.success && res.transactions && res.payments) {
        setTransactions(res.transactions);
        setPayments(res.payments);
        localStorage.setItem('finance_transactions', JSON.stringify(res.transactions));
        localStorage.setItem('finance_payments', JSON.stringify(res.payments));
        const nowStr = new Date().toLocaleString('tr-TR');
        setLastSyncTime(nowStr);
        setLastSyncTimeState(nowStr);
        setSyncStatusMsg({ type: 'success', text: `Buluttaki ${res.transactions.length} işlem ve ${res.payments.length} ödeme cihazınıza başarıyla aktarıldı!` });
      } else {
        setSyncStatusMsg({ type: 'error', text: `Hata: ${res.error}` });
      }
    } catch (e: any) {
      setSyncStatusMsg({ type: 'error', text: `Bağlantı Hatası: ${e.message || e}` });
    } finally {
      setSyncLoading(false);
    }
  };

  const handlePushToCloud = async () => {
    if (!appsScriptUrl) {
      setSyncStatusMsg({ type: 'error', text: 'Strateji Hatası: E-Tablo API URL adresi eksik!' });
      return;
    }
    setSyncLoading(true);
    setSyncStatusMsg(null);
    try {
      setAppsScriptUrl(appsScriptUrl);
      const res = await syncSaveAllData(transactions, payments);
      if (res.success) {
        const nowStr = new Date().toLocaleString('tr-TR');
        setLastSyncTime(nowStr);
        setLastSyncTimeState(nowStr);
        setSyncStatusMsg({ type: 'success', text: 'Mevcut verileriniz Google E-Tablonuza güvenle yüklendi!' });
      } else {
        setSyncStatusMsg({ type: 'error', text: `Yükleme hatası: ${res.error}` });
      }
    } catch (e: any) {
      setSyncStatusMsg({ type: 'error', text: `İletişim hatası: ${e.message || e}` });
    } finally {
      setSyncLoading(false);
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  // CSV RESTORE FROM BACKUP ENGINE
  const handleRestoreCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          alert('Dosya okunurken bir hata oluştu veya dosya boş.');
          return;
        }

        const lines = text.split(/\r?\n/);
        const restored: Transaction[] = [];

        // Check first line for header
        let startIndex = 0;
        if (lines.length > 0) {
          const firstLine = lines[0].toLowerCase();
          if (firstLine.includes('tarih') || firstLine.includes('tutar') || firstLine.includes('kategori')) {
            startIndex = 1;
          }
        }

        for (let i = startIndex; i < lines.length; i++) {
          let line = lines[i].trim();
          if (!line) continue;

          // Remove potential leading/trailing quotes or BOM markings
          if (line.charCodeAt(0) === 0xFEFF) {
            line = line.substring(1);
          }

          // Handle smart split by separator (semicolon or comma)
          let parts: string[] = [];
          if (line.includes(';')) {
            parts = line.split(';');
          } else {
            parts = line.split(',');
          }

          parts = parts.map(p => {
            let s = p.trim();
            if (s.startsWith('"') && s.endsWith('"')) {
              s = s.substring(1, s.length - 1);
            }
            return s;
          });

          // Standard Columns: Tarih (0); Tür (1); Kategori (2); Alt Kategori (3); Tutar (4); Açıklama (5)
          const rawDate = parts[0] || '';
          const rawTur = parts[1] || 'Gider';
          const rawKat = parts[2] || 'Diğer';
          const rawAlt = parts[3] || 'Genel';
          const rawTutar = parts[4] || '0';
          const rawAciklama = parts[5] || '';

          if (!rawDate) continue;

          let parsedDate = '2026-05-22'; // fallback
          const dotPattern = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/;
          const slashPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
          const ISOpattern = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;

          if (dotPattern.test(rawDate)) {
            const matches = rawDate.match(dotPattern);
            if (matches) {
              parsedDate = `${matches[3]}-${matches[2].padStart(2, '0')}-${matches[1].padStart(2, '0')}`;
            }
          } else if (slashPattern.test(rawDate)) {
            const matches = rawDate.match(slashPattern);
            if (matches) {
              parsedDate = `${matches[3]}-${matches[2].padStart(2, '0')}-${matches[1].padStart(2, '0')}`;
            }
          } else if (ISOpattern.test(rawDate)) {
            parsedDate = rawDate;
          }

          const normalizedType: 'Gelir' | 'Gider' = 
            (rawTur.toLowerCase().trim() === 'gelir' || rawTur.toLowerCase().trim() === 'income') 
              ? 'Gelir' 
              : 'Gider';

          let cleanedTutar = rawTutar.replace(/[^0-9,\.-]/g, '');
          if (cleanedTutar.includes('.') && cleanedTutar.includes(',')) {
            cleanedTutar = cleanedTutar.replace(/\./g, '').replace(/,/g, '.');
          } else if (cleanedTutar.includes(',')) {
            cleanedTutar = cleanedTutar.replace(/,/g, '.');
          }

          let numericTutar = parseFloat(cleanedTutar);
          if (isNaN(numericTutar)) {
            numericTutar = 0;
          }

          restored.push({
            id: 'txn_rest_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
            tarih: parsedDate,
            tur: normalizedType,
            kategori: rawKat || 'Diğer',
            altKategori: rawAlt || 'Genel',
            tutar: Math.abs(numericTutar),
            aciklama: rawAciklama || `${rawKat} Geri Yüklenen İşlemi`
          });
        }

        if (restored.length === 0) {
          alert('Yedek dosyası ayrıştırılamadı. Uygun formatta olduğundan emin olun.');
          return;
        }

        setCsvRestoreRows(restored);
        setIsCSVRestorePreviewOpen(true);
      } catch (err) {
        console.error('Backup CSV parsing failure:', err);
        alert('Yedek dosyası okunurken hata oluştu.');
      }
    };

    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  const handleApplyRestoreOverwrite = () => {
    if (csvRestoreRows.length === 0) return;
    const updated = [...csvRestoreRows];
    updated.sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime());
    setTransactions(updated);
    setCsvRestoreRows([]);
    setIsCSVRestorePreviewOpen(false);
    setImportNotification({
      type: 'success',
      msg: `✓ Sıfırlama başarılı! Telefon veritabanınız silindi ve yedekteki ${updated.length} adet işlem başarıyla yüklendi!`
    });
    setTimeout(() => setImportNotification(null), 5000);
  };

  const handleApplyRestoreMerge = () => {
    if (csvRestoreRows.length === 0) return;
    const updated = [...csvRestoreRows, ...transactions];
    updated.sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime());
    setTransactions(updated);
    setCsvRestoreRows([]);
    setIsCSVRestorePreviewOpen(false);
    setImportNotification({
      type: 'success',
      msg: `✓ Birleştirme başarılı! Mevcut verileriniz korundu ve yedek dosyasından ${csvRestoreRows.length} adet yeni işlem eklendi.`
    });
    setTimeout(() => setImportNotification(null), 5000);
  };

  // Safe ASCII converter to secure Turkish char encoding on default PDF fonts
  const trToAscii = (text: string): string => {
    if (!text) return '';
    return text
      .replace(/ğ/g, 'g')
      .replace(/Ğ/g, 'G')
      .replace(/ü/g, 'u')
      .replace(/Ü/g, 'U')
      .replace(/ş/g, 's')
      .replace(/Ş/g, 'S')
      .replace(/ı/g, 'i')
      .replace(/İ/g, 'I')
      .replace(/ö/g, 'o')
      .replace(/Ö/g, 'O')
      .replace(/ç/g, 'c')
      .replace(/Ç/g, 'C');
  };

  // HIGH-QUALITY PDF GENERATOR STATEMENT
  const handleGeneratePDF = () => {
    if (transactions.length === 0) {
      alert('Raporlanacak işlem kaydı bulunmamaktadır.');
      return;
    }

    // Filter transactions according to selected filter
    let filtered = [...transactions];
    if (pdfTypeFilter !== 'Tümü') {
      filtered = filtered.filter(t => t.tur === pdfTypeFilter);
    }
    if (pdfStartDate) {
      filtered = filtered.filter(t => t.tarih >= pdfStartDate);
    }
    if (pdfEndDate) {
      filtered = filtered.filter(t => t.tarih <= pdfEndDate);
    }

    if (filtered.length === 0) {
      alert('Seçilen filtre kriterlerine uygun veri bulunamadı.');
      return;
    }

    // Initialize portrait A4 document
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Theme and styles setup
    let primaryColor = [79, 70, 229]; // default indigo
    let secondaryColor = [245, 246, 255]; 
    let darkText = [30, 41, 59];
    let highlightColor = [16, 124, 65];

    if (pdfTheme === 'indigo') {
      primaryColor = [79, 70, 229]; // Indigo modern #4f46e5
      secondaryColor = [248, 250, 252];
    } else if (pdfTheme === 'emerald') {
      primaryColor = [5, 150, 105]; // Emerald green #059669
      secondaryColor = [240, 253, 244];
    } else if (pdfTheme === 'charcoal') {
      primaryColor = [15, 23, 42]; // Slate charcoal #0f172a
      secondaryColor = [248, 250, 252];
    } else if (pdfTheme === 'rose') {
      primaryColor = [225, 29, 72]; // Rose red #e11d48
      secondaryColor = [255, 241, 242];
    }

    const borderGray = 230;

    // Calculations for summary metrics
    const incomeTotal = filtered.filter(t => t.tur === 'Gelir').reduce((a, b) => a + b.tutar, 0);
    const expenseTotal = filtered.filter(t => t.tur === 'Gider').reduce((a, b) => a + b.tutar, 0);
    const balance = incomeTotal - expenseTotal;
    const efficiencyRate = incomeTotal > 0 ? (expenseTotal / incomeTotal) * 100 : 100;

    // Header Design Block: Gradient simulation using multiple slim rects
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 42, 'F');

    // Add a stylish contrasting thin ribbon at the bottom of the header
    doc.setFillColor(Math.max(0, primaryColor[0] - 20), Math.max(0, primaryColor[1] - 20), Math.max(0, primaryColor[2] - 20));
    doc.rect(0, 40, 210, 2, 'F');

    // Title text inside PDF header band
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(trToAscii('PREMIUM FINANSAL RAPOR & EKSTRE'), 15, 17);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    const dateRangeStr = (pdfStartDate || pdfEndDate)
      ? `${pdfStartDate ? pdfStartDate.split('-').reverse().join('.') : 'Bilinmeyen'} - ${pdfEndDate ? pdfEndDate.split('-').reverse().join('.') : 'Bilinmeyen'}`
      : 'Tum Donemler';
    
    doc.text(
      trToAscii(`Rapor Araligi: ${dateRangeStr}  |  Islem Turu Filtresi: ${pdfTypeFilter}`), 
      15, 24
    );
    doc.text(
      trToAscii(`Uretim Zamani: ${new Date().toLocaleDateString('tr-TR')}  |  Cihaz: Mobil Yerel Veritabani`), 
      15, 30
    );

    // Three elegant floating summary boxes side by side
    // Box 1: TOPLAM GELİR (Green themed)
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(12, 48, 59, 22, 2, 2, 'F');
    doc.setDrawColor(220, 252, 231);
    doc.setLineWidth(0.35);
    doc.roundedRect(12, 48, 59, 22, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(21, 128, 61); // forest green
    doc.text(trToAscii('TOPLAM GELIR'), 17, 54);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`${incomeTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL`, 17, 63);

    // Box 2: TOPLAM GİDER (Rose themed)
    doc.setFillColor(255, 241, 242);
    doc.roundedRect(75, 48, 59, 22, 2, 2, 'F');
    doc.setDrawColor(254, 226, 226);
    doc.roundedRect(75, 48, 59, 22, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(225, 29, 72); // rose dark
    doc.text(trToAscii('TOPLAM GIDER'), 80, 54);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`${expenseTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL`, 80, 63);

    // Box 3: NET DENGE / DURUM (Dynamic content-colored)
    const isPositive = balance >= 0;
    doc.setFillColor(isPositive ? 239 : 254, isPositive ? 246 : 242, isPositive ? 255 : 242);
    doc.roundedRect(138, 48, 59, 22, 2, 2, 'F');
    doc.setDrawColor(isPositive ? 219 : 252, isPositive ? 234 : 165, isPositive ? 254 : 165);
    doc.roundedRect(138, 48, 59, 22, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(isPositive ? 29 : 153, isPositive ? 78 : 27, isPositive ? 216 : 27);
    doc.text(trToAscii(isPositive ? 'NET TASARRUF (DENGE)' : 'BUTCEDE ACIK (NET DURUM)'), 143, 54);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`${isPositive ? '+' : ''}${balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL`, 143, 63);

    let nextY = 76;

    if (includeAnalytics) {
      // Draw Advanced Section Block
      doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.roundedRect(12, 75, 185, 41, 2, 2, 'F');
      doc.setDrawColor(borderGray, borderGray, borderGray);
      doc.roundedRect(12, 75, 185, 41, 2, 2, 'S');

      // Left Column: Budget Efficiency Gauge
      doc.setTextColor(darkText[0], darkText[1], darkText[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(trToAscii('BUTCE VERIMLILIGI VE HARCAMA YAPISI'), 17, 82);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      
      const statusText = efficiencyRate <= 50 
        ? 'Mukemmel! Gelirin yarisindan fazlasi tasarrufa ayrildi.'
        : efficiencyRate <= 85 
        ? 'Dengeli. Harcamalariniz kontrol altinda ve saglikli.'
        : 'Harcamalariniz yuksek. Butce kontrolunu gozden gecirin.';
      
      doc.text(trToAscii(statusText), 17, 88);

      // Draw horizontal track bar
      doc.setFillColor(226, 232, 240);
      doc.roundedRect(17, 94, 78, 4.5, 1, 1, 'F');

      // Color code the gauge
      if (efficiencyRate <= 50) {
        doc.setFillColor(34, 197, 94); // solid emerald
      } else if (efficiencyRate <= 85) {
        doc.setFillColor(245, 158, 11); // amber
      } else {
        doc.setFillColor(239, 68, 68); // rose
      }
      doc.roundedRect(17, 94, Math.max(2, (78 * Math.min(efficiencyRate, 100)) / 100), 4.5, 1, 1, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text(trToAscii(`Gider Verimlilik Orani: %${efficiencyRate.toFixed(1)}`), 17, 105);

      // Separator inside Analytics
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(105, 78, 105, 112);

      // Right Column: Top Category Expense Distribution
      doc.setTextColor(darkText[0], darkText[1], darkText[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(trToAscii('EN COK HARCANAN KATEGORILER'), 112, 82);

      // Calculations for top categories
      const categoriesMap: Record<string, number> = {};
      const expenseTXs = filtered.filter(t => t.tur === 'Gider');
      const totalExpVal = expenseTXs.reduce((sum, t) => sum + t.tutar, 0);

      expenseTXs.forEach(t => {
        const cat = stripEmoji(t.kategori || 'Diger');
        categoriesMap[cat] = (categoriesMap[cat] || 0) + t.tutar;
      });

      const sortedCategories = Object.entries(categoriesMap)
        .map(([name, val]) => ({
          name,
          val,
          pct: totalExpVal > 0 ? (val / totalExpVal) * 100 : 0
        }))
        .sort((a, b) => b.val - a.val)
        .slice(0, 3); // top 3 only

      if (sortedCategories.length === 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(trToAscii('Gider kaydi bulunmamaktadir.'), 112, 92);
      } else {
        sortedCategories.forEach((catInfo, idx) => {
          const rowY = 88 + idx * 8.5;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(51, 65, 85);
          // Left: Category Name
          doc.text(trToAscii(catInfo.name), 112, rowY);
          
          // Right: Amount and percent
          doc.setFont('helvetica', 'normal');
          const percentStr = `%${catInfo.pct.toFixed(0)}`;
          const amountStr = `${catInfo.val.toLocaleString('tr-TR')} TL`;
          doc.text(trToAscii(`${amountStr} (${percentStr})`), 192 - doc.getTextWidth(`${amountStr} (${percentStr})`), rowY);

          // Slim accent progress bar
          doc.setFillColor(220, 225, 230);
          doc.rect(112, rowY + 1.2, 78, 1.2, 'F');
          
          doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
          doc.rect(112, rowY + 1.2, (78 * catInfo.pct) / 100, 1.2, 'F');
        });
      }

      nextY = 122;
    } else {
      nextY = 76;
    }

    // List title
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.text(trToAscii(`Islem Gecmisi Kayit Tablosu (${filtered.length} Islem)`), 15, nextY + 3);

    // Line under title
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(0.65);
    doc.line(15, nextY + 6, 195, nextY + 6);

    // Columns Headings
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(trToAscii('Tarih'), 17, nextY + 11);
    doc.text(trToAscii('Tur'), 42, nextY + 11);
    doc.text(trToAscii('Ana Kategori'), 62, nextY + 11);
    doc.text(trToAscii('Alt Detay'), 100, nextY + 11);
    doc.text(trToAscii('Aciklama'), 135, nextY + 11);
    doc.text(trToAscii('Tutar'), 178, nextY + 11);

    // Line separating body heading
    doc.setDrawColor(borderGray, borderGray, borderGray);
    doc.setLineWidth(0.4);
    doc.line(15, nextY + 14, 195, nextY + 14);

    // Draw rows intelligently with dynamic page break support
    let currentY = nextY + 19;
    const rowHeight = 7.5;
    let pageCount = 1;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);

    filtered.forEach((txn, index) => {
      // Check for page ceiling limits
      if (currentY > 275) {
        // Draw page footer on current page
        doc.setFontSize(7.5);
        doc.setTextColor(150, 150, 150);
        doc.text(trToAscii(`Sayfa ${pageCount} | Detayli Mobil Ekstresi`), 95, 287);
        
        // Add new page
        doc.addPage();
        pageCount++;
        currentY = 25; // Reset altitude

        // Re-draw grid guide headings on nested page
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(0, 0, 210, 14, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(trToAscii('FINANSAL EKSTRE DETAY TABLOSU - DEVAMI'), 15, 9);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(8.5);
        doc.text(trToAscii('Tarih'), 17, 20);
        doc.text(trToAscii('Tur'), 42, 20);
        doc.text(trToAscii('Ana Kategori'), 62, 20);
        doc.text(trToAscii('Alt Detay'), 100, 20);
        doc.text(trToAscii('Aciklama'), 135, 20);
        doc.text(trToAscii('Tutar'), 178, 20);

        doc.setDrawColor(borderGray, borderGray, borderGray);
        doc.setLineWidth(0.4);
        doc.line(15, 23, 195, 23);
        currentY = 28;
      }

      // Zebra striping backgrounds for pristine visibility
      if (index % 2 === 0) {
        doc.setFillColor(252, 253, 254);
        doc.rect(15, currentY - 4.5, 180, rowHeight, 'F');
      }

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(darkText[0], darkText[1], darkText[2]);

      // Print Date
      doc.text(txn.tarih || '', 17, currentY);

      // Print Type with custom color styling (Red vs Green indicators)
      if (txn.tur === 'Gelir') {
        doc.setTextColor(16, 124, 65);
        doc.setFont('helvetica', 'bold');
        doc.text(trToAscii('GELIR'), 42, currentY);
      } else {
        doc.setTextColor(200, 50, 50);
        doc.setFont('helvetica', 'normal');
        doc.text(trToAscii('GIDER'), 42, currentY);
      }
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(darkText[0], darkText[1], darkText[2]);

      // Categories and Details safely converted & stripped of emojis
      doc.text(trToAscii(stripEmoji(txn.kategori || '')), 62, currentY);
      doc.text(trToAscii(stripEmoji(txn.altKategori || 'Genel')), 100, currentY);

      // Truncate overly long descriptions safely to avoid layout bleeding
      let descStr = stripEmoji(txn.aciklama || '');
      if (descStr.length > 25) {
        descStr = descStr.substring(0, 23) + '...';
      }
      doc.text(trToAscii(descStr), 135, currentY);

      // Format clean money aligning
      const amountStr = `${txn.tutar.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL`;
      doc.setFont('helvetica', 'bold');
      doc.text(amountStr, 178, currentY);
      doc.setFont('helvetica', 'normal');

      // Slim row partitioning line
      doc.setDrawColor(245, 245, 245);
      doc.setLineWidth(0.2);
      doc.line(15, currentY + 3, 195, currentY + 3);

      currentY += rowHeight;
    });

    // Final signature page stamp
    doc.setFontSize(7.5);
    doc.setTextColor(160, 160, 160);
    doc.text(trToAscii(`Sayfa ${pageCount} | Toplam ${filtered.length} islem listelendi.`), 95, 287);

    // Immediate save trigger
    const startFilename = pdfStartDate ? pdfStartDate.replace(/-/g, '') : 'Baslangic';
    const endFilename = pdfEndDate ? pdfEndDate.replace(/-/g, '') : 'Bitis';
    doc.save(`Finans_Mobil_Ekstre_${startFilename}_${endFilename}.pdf`);
  };

  return (
    <div className="space-y-6 pb-6 animate-fade-in" id="settings-wrapper-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateHome}
            className="p-2 bg-white rounded-full text-slate-600 hover:bg-slate-50 border border-slate-100/50 shadow-2xs cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-display font-bold text-slate-800 flex items-center gap-1.5">
              Sistem & Veri Ayarları
              <span className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.5 rounded-full font-mono">Yerel</span>
            </h2>
            <p className="text-xs text-slate-500">Kategoriler, Excel verinizi alma araçları ve PDF belgeleri</p>
          </div>
        </div>
      </div>

      {importNotification && (
        <div className={`p-4 rounded-2xl text-xs font-semibold leading-relaxed flex gap-2.5 items-start border animate-slide-up ${
          importNotification.type === 'success' 
            ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
            : 'bg-rose-50 text-rose-700 border-rose-100'
        }`} id="settings-notification-banner">
          <CheckCircle className="w-4.5 h-4.5 text-slate-500 shrink-0 mt-0.5" />
          <div>
            {importNotification.msg}
          </div>
        </div>
      )}

      {/* 1. PDF STATEMENT REPORT CARD */}
      <div className="p-5 bg-gradient-to-br from-[#ebf5fb] to-white border border-[#cbe1ef] shadow-xs rounded-[25px] space-y-4" id="pdf-report-generator-card">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-white text-indigo-600 rounded-xl border border-indigo-100 shadow-2xs shrink-0">
            <FileText className="w-5 h-5 text-pastel-blue-dark" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">PDF Hesap Ekstresi Oluştur</h3>
            <p className="text-[10.5px] text-slate-500 leading-normal mt-0.5">Mobil kaydedilen gelir/gider veritabanınızı anında resmi ve PDF tablosu olarak cihazınıza indirin.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1.5">
          {/* Format Selection Dropdown */}
          <div>
            <label className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider block mb-1">İşlem Türü</label>
            <select
              value={pdfTypeFilter}
              onChange={(e: any) => setPdfTypeFilter(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 font-bold cursor-pointer"
            >
              <option value="Tümü">Tüm İşlemler</option>
              <option value="Gelir">Sadece Gelirler</option>
              <option value="Gider">Sadece Giderler</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Başlangıç Tarihi</label>
            <input
              type="date"
              value={pdfStartDate}
              onChange={(e) => setPdfStartDate(e.target.value)}
              className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 font-bold"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Bitiş Tarihi</label>
            <input
              type="date"
              value={pdfEndDate}
              onChange={(e) => setPdfEndDate(e.target.value)}
              className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 font-bold"
            />
          </div>
        </div>
 
        {/* Advanced PDF options (Themes & Analytics) */}
        <div className="border-t border-indigo-100/40 pt-3.5 space-y-3.5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Color template selector */}
            <div>
              <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Şablon Tasarım Teması</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'indigo', label: 'Lacivert', color: 'bg-indigo-600' },
                  { id: 'emerald', label: 'Yeşil', color: 'bg-emerald-600' },
                  { id: 'charcoal', label: 'Kömür', color: 'bg-slate-800' },
                  { id: 'rose', label: 'Kırmızı', color: 'bg-rose-600' }
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setPdfTheme(t.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[11px] font-bold cursor-pointer transition-all ${
                      pdfTheme === t.id 
                        ? 'bg-slate-800 text-white border-slate-900 shadow-2xs font-extrabold scale-102' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${t.color}`} />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Analytical components toggle */}
            <div>
              <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Analitik Bileşenler</span>
              <label className="flex items-center gap-2.5 px-3 py-2 bg-white border border-slate-200 rounded-xl cursor-pointer select-none hover:bg-slate-50 transition-all h-[40px] max-w-full">
                <input
                  type="checkbox"
                  checked={includeAnalytics}
                  onChange={(e) => setIncludeAnalytics(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-305 rounded"
                />
                <span className="text-[10.5px] font-bold text-slate-700 leading-tight">Analitik Dağılımları ve Grafik Ekle</span>
              </label>
            </div>
          </div>
        </div>

        {(pdfStartDate || pdfEndDate) && (
          <div className="flex justify-end pr-1">
            <button
              type="button"
              onClick={() => {
                setPdfStartDate('');
                setPdfEndDate('');
              }}
              className="text-[10px] font-bold text-rose-500 hover:text-rose-600 hover:underline cursor-pointer"
            >
              Rapor Tarihlerini Temizle
            </button>
          </div>
        )}

        <button
          onClick={handleGeneratePDF}
          className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-100 transition-all active:scale-[0.98]"
          id="pdf-download-trigger"
        >
          <FileDown className="w-4.5 h-4.5" /> PDF Ekstresini Cihazıma İndir
        </button>
      </div>

      {/* 2. EXCEL ROW IMPORT (EXTERNAL SPREADSHEET PASTE) */}
      <div className="p-5 bg-white border border-slate-100/80 shadow-xs rounded-[25px] space-y-4" id="excel-importer-box-card">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
            <Import className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Excel / Tablodan Veri İthal Et</h3>
            <p className="text-[10.5px] text-slate-450 mt-0.5">Excel'de tuttuğunuz satırları kopyalayıp buraya yapıştırın. Sistem verileri akıllıca ayrıştırıp telefonunuza yükler.</p>
          </div>
        </div>

        {/* Paste helper guide */}
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-[10px] text-slate-500 font-mono leading-normal space-y-1">
          <span className="font-bold text-slate-700 block text-[10.5px] font-sans pb-0.5">📋 Hücre Sütun Sıralaması (Excel Sırası):</span>
          <div>Tarih (GG.AA.YYYY) | Tür (Gider/Gelir) | Kategori | Alt Kategori | Tutar | Açıklama</div>
          <span className="text-[9px] text-[#2995ce] block pt-1">(Sütunları kopyalarken aralarında Tab veya Virgül olmasına izin verilir)</span>
        </div>

        <div className="space-y-3">
          <textarea
            placeholder={`Örnek kopyalanmış satır yapısı:\n22.05.2026\tGider\tFatura\tElektrik faturası\t450,25\tMayıs Dağıtımı\n21.05.2026\tGelir\tMaaş\tMaaş\t45000\tAylık hakediş`}
            rows={4}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            className="w-full p-3.5 bg-slate-50/55 border border-slate-200 rounded-2xl text-[10.5px] font-mono outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all scrollbar-none"
          />

          <button
            onClick={handleParsePaste}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <Eye className="w-4 h-4" /> Satırları Çözümle ve Önizle
          </button>
        </div>

        {/* Import Preview Modal Overlay (Nested inside view to avoid iframe popup blockages) */}
        <AnimatePresence>
          {isImportPreviewOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-3 p-4 bg-slate-50 border border-emerald-100 rounded-2xl space-y-3 shadow-xs animate-slide-up"
            >
              <div className="flex justify-between items-center pb-1">
                <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                  🔍 Çözümlenen Kayıtlar ({parsedRows.length} İşlem)
                </span>
                <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full">Kontrol Edildi</span>
              </div>

              {/* Parsed mini Grid Table scrollable */}
              <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-200/50 bg-white shadow-2xs divide-y divide-slate-100 scrollbar-none">
                {parsedRows.map((row, idx) => (
                  <div key={idx} className="p-2.5 flex justify-between items-center text-[10px] hover:bg-slate-50">
                    <div className="space-y-0.5">
                      <span className="font-mono text-slate-450">{row.tarih}</span>
                      <div className="flex items-center gap-1">
                        <span className={`text-[8.5px] font-extrabold px-1 py-0.5 rounded-md uppercase ${
                          row.tur === 'Gelir' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>{row.tur}</span>
                        <span className="font-bold text-slate-700">{row.kategori} &rsaquo; {row.altKategori}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold block text-slate-850 font-mono">{row.tutar.toLocaleString('tr-TR')} TL</span>
                      <span className="text-[9px] text-slate-400 italic block font-sans truncate max-w-[120px]">{row.aciklama}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setIsImportPreviewOpen(false)}
                  className="flex-1 py-2 text-center text-xs font-bold bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-xl transition-all cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  onClick={handleApplyImport}
                  className="flex-1 py-2 text-center text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <CheckSquare className="w-4.5 h-4.5" /> Telefon Belleğine Aktar
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 3. INTERACTIVE CATEGORY EDITOR WITH CUSTOM PARENT-DETAIL GRAPHICS */}
      <div className="p-5 bg-white border border-slate-100 shadow-xs rounded-[25px] space-y-4" id="local-category-manager-card">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-450 flex items-center gap-1.5">
            <Layers className="w-4.5 h-4.5 text-pastel-blue-dark" /> Kategori & Detay Seçenekleri Yönetimi
          </h3>
          <p className="text-[10px] text-slate-450 mt-0.5">Hızlı kayıt formlarında listelenen ana kategorileri ve alt başlıkların miktarını belirleyin.</p>
        </div>

        {/* Tab Switcher: Gelir vs Gider categories */}
        <div className="grid grid-cols-2 p-1 bg-slate-50/70 border border-slate-100/50 rounded-xl" id="category-tab-container">
          <button
            onClick={() => setCatTypeTab('Gider')}
            className={`py-2 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              catTypeTab === 'Gider'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            💸 Gider Seçenekleri
          </button>
          <button
            onClick={() => setCatTypeTab('Gelir')}
            className={`py-2 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              catTypeTab === 'Gelir'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            💰 Gelir Seçenekleri
          </button>
        </div>

        {/* Add Parent Category Form with custom emoji/symbol selector */}
        <div className="flex flex-col gap-2 p-3 bg-slate-50 border border-slate-100/80 rounded-2xl">
          {/* Emojis selection bar */}
          <div className="flex flex-wrap gap-1 items-center pb-1">
            <span className="text-[9px] font-bold text-slate-500 mr-1 uppercase tracking-wider">Kategori Simgesi:</span>
            {(catTypeTab === 'Gider' 
              ? ['💸', '⚡', '🏠', '💳', '📱', '💧', '🌐', '🏦', '🍿', '🛒', '🚗', '🍕', '👕', '🩺', '🎓', '🎁', '📦', '🍔', '🥦', '🏋️', '🧼', '✈️', '💼']
              : ['💰', '💼', '📈', '🏠', '🎁', '🏦', '🪙', '🏆', '⭐', '💵']
            ).map(em => (
              <button
                key={em}
                type="button"
                onClick={() => setSelectedParentEmoji(em)}
                className={`w-7 h-7 text-sm rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                  selectedParentEmoji === em ? 'bg-indigo-600 text-white scale-110 shadow-xs font-bold' : 'bg-white hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {em}
              </button>
            ))}
            {/* Custom input option */}
            <input
              type="text"
              placeholder="✍️ Simge..."
              value={selectedParentEmoji}
              onChange={(e) => setSelectedParentEmoji(e.target.value)}
              className="w-14 px-1 py-1 text-center bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
              title="Elle başka herhangi bir emoji yazın"
            />
          </div>

          <form onSubmit={handleAddParentCategory} className="flex flex-col sm:flex-row gap-2">
            <div className="flex flex-1 gap-2 min-w-0">
              <div className="w-9 h-9 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-lg shrink-0 shadow-3xs font-mono">
                {selectedParentEmoji}
              </div>
              <input
                type="text"
                placeholder={catTypeTab === 'Gider' ? 'Örn: Giyim, Alışveriş, Eğitim...' : 'Örn: Maaş, Kira Geliri, Yatırım...'}
                value={newParentName}
                onChange={(e) => setNewParentName(e.target.value)}
                className="flex-1 min-w-0 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 font-bold"
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all shrink-0"
            >
              <Plus className="w-4 h-4" /> Kategori Ekle
            </button>
          </form>
        </div>

        {/* Custom Categories List */}
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1 select-text scrollbar-none">
          {Object.keys(groupedCategories).length === 0 ? (
            <div className="py-8 text-center border border-dashed border-slate-150 rounded-2xl text-slate-400 text-xs">
              Mevcut kategori bulunmamaktadır. Eklemek için yukarıdaki formu kullanın.
            </div>
          ) : (
            Object.keys(groupedCategories).map((parentName) => {
              const subs = groupedCategories[parentName];
              return (
                <div
                  key={parentName}
                  className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl space-y-3 relative group text-sans"
                >
                  {/* Category Header */}
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                      <span className="text-sm">{getCategoryEmoji(parentName)}</span>
                      <span>{stripEmoji(parentName)}</span>
                      <span className="text-[9px] px-1.5 py-0.5 bg-slate-200 text-slate-500 rounded-full font-bold">
                        {subs.length} detay
                      </span>
                    </span>
                    <button
                      onClick={() => handleDeleteParentCategory(parentName)}
                      className="p-1 text-slate-450 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                      title="Kategoriyi ve Tüm Alt Başlıklarını Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Subcategories Flow List */}
                  <div className="flex flex-wrap gap-1.5">
                    {subs.map((subName) => (
                      <span
                        key={subName}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                          catTypeTab === 'Gider'
                            ? 'bg-rose-50 text-rose-800 border-rose-100/60'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-100/60'
                        }`}
                      >
                        <span className="text-xs mr-0.5">{getCategoryEmoji(subName)}</span>
                        <span>{stripEmoji(subName)}</span>
                        <button
                          onClick={() => handleDeleteSubCategory(parentName, subName)}
                          className="hover:bg-slate-200 p-0.5 rounded-full text-slate-400 hover:text-slate-800 shrink-0 cursor-pointer"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Subcategory Add Inline Input with Symbol selector */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex flex-wrap gap-1 items-center">
                      <span className="text-[9px] font-bold text-slate-400 mr-1">Detay Simgesi:</span>
                      {['🏷️', '💳', '📱', '💧', '🌐', '🔌', '🍔', '🥤', '📶', '🚌', '✈️', '🔑', '📚', '💊', '🧼', '🧹', '🧸', '⚽', '🎸', '💵', '📦', '🎟️', '🛒', '🍕'].map(em => {
                        const currentSubEmoji = selectedSubEmojiMap[parentName] || '🏷️';
                        return (
                          <button
                            key={em}
                            type="button"
                            onClick={() => {
                              setSelectedSubEmojiMap(prev => ({
                                ...prev,
                                [parentName]: em
                              }));
                            }}
                            className={`w-5.5 h-5.5 text-[11px] rounded-md flex items-center justify-center transition-all cursor-pointer ${
                              currentSubEmoji === em ? 'bg-indigo-600 text-white scale-110 font-bold' : 'bg-white hover:bg-slate-100 border border-slate-150'
                            }`}
                          >
                            {em}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex gap-1.5">
                      <div className="w-7 h-7 bg-white border border-slate-200 rounded-md flex items-center justify-center text-xs shrink-0 font-mono shadow-3xs">
                        {selectedSubEmojiMap[parentName] || '🏷️'}
                      </div>
                      <input
                        type="text"
                        placeholder="Detay (alt kategori) başlığı ekle..."
                        value={newSubNameMap[parentName] || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewSubNameMap(prev => ({
                            ...prev,
                            [parentName]: val
                          }));
                        }}
                        className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[10.5px] outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddSubCategory(parentName)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 3.5. GOOGLE E-TABLO CLOUD SYNC SECTION */}
      <div className="p-5 bg-white border border-indigo-100 shadow-xs rounded-[25px] space-y-4" id="google-sheets-sync-card">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
          <FileSpreadsheet className="w-5 h-5 text-indigo-600 animate-pulse" /> Google E-Tablo Eşitleme (Yol B)
        </h3>

        <p className="text-[10px] text-slate-500 font-sans leading-relaxed">
          Uygulama verilerinizi (Gelir, Gider ve Planlanan Ödemeler) ücretsiz bir Google Sheet'ye bağlayarak, <strong>hem bilgisayarınızda hem de iPhone cihazınızda aynı anda</strong> her zaman güncel tutabilirsiniz!
        </p>

        {/* Status Indicator Bar */}
        <div className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-100 font-sans">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${useCloudSync ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
            <span className="text-[10.5px] font-bold text-slate-700 ml-1">
              {useCloudSync ? 'Bulut Bağlantısı Aktif' : 'Bulut Bağlantısı Çevrimdışı'}
            </span>
          </div>
          <span className="text-[9px] font-semibold text-slate-400 font-mono">
            Eşitleme: {lastSyncTime}
          </span>
        </div>

        {/* Action Toggle controls */}
        <div className="space-y-2.5 pt-1">
          <div>
            <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Google Apps Script Web App URL</span>
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="https://script.google.com/macros/s/.../exec"
                value={appsScriptUrl}
                onChange={(e) => setAppsScriptUrlState(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10.5px] outline-none focus:ring-1 focus:ring-indigo-500 font-mono font-medium"
              />
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={syncLoading}
                className="px-3.5 bg-indigo-600 hover:bg-slate-800 text-white font-bold text-[10px] rounded-xl cursor-pointer transition-all shrink-0 active:scale-97 disabled:opacity-50"
              >
                {syncLoading ? '...' : 'Bağla & Test'}
              </button>
            </div>
          </div>

          {/* Sync Configuration Toggles */}
          <div className="grid grid-cols-1 gap-2 border-t border-slate-100 pt-3">
            <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl cursor-pointer select-none transition-all">
              <input
                type="checkbox"
                checked={useCloudSync}
                onChange={(e) => {
                  const check = e.target.checked;
                  if (check && !appsScriptUrl) {
                    alert('Lütfen önce bir Google Apps Script URL\'si bağlayın.');
                    return;
                  }
                  handleSaveSyncConfig(appsScriptUrl, check, autoSyncOnLoad);
                }}
                className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-200 rounded"
              />
              <span className="text-[10px] font-bold text-slate-700">Google E-Tablo Senkronizasyonunu Etkinleştir</span>
            </label>

            <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl cursor-pointer select-none transition-all">
              <input
                type="checkbox"
                checked={autoSyncOnLoad}
                onChange={(e) => {
                  const check = e.target.checked;
                  handleSaveSyncConfig(appsScriptUrl, useCloudSync, check);
                }}
                className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-200 rounded"
              />
              <span className="text-[10px] font-bold text-slate-700">Başlangıçta Bulut Verilerini Otomatik Al</span>
            </label>
          </div>

          {/* Bi-directional Action Buttons */}
          <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={handlePullFromCloud}
              disabled={syncLoading || !appsScriptUrl}
              className="py-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-150 text-indigo-700 font-bold text-[10px] rounded-xl cursor-pointer transition-all text-center flex items-center justify-center gap-1 active:scale-97 disabled:opacity-50"
            >
              📥 Buluttan Verileri Çek
            </button>
            <button
              type="button"
              onClick={handlePushToCloud}
              disabled={syncLoading || !appsScriptUrl}
              className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-750 text-white font-bold text-[10px] rounded-xl cursor-pointer transition-all text-center flex items-center justify-center gap-1 active:scale-97 shadow-xs disabled:opacity-50"
            >
              📤 Yerel Verileri Buluta Yükle
            </button>
          </div>

          {/* Sync Notifications Alert bar if any */}
          {syncStatusMsg && (
            <div className={`p-3 rounded-xl border text-[10px] font-semibold text-center mt-1 font-sans ${
              syncStatusMsg.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800'
            }`}>
              {syncStatusMsg.text}
            </div>
          )}

          {/* Steps & Guide Toggle */}
          <div className="pt-2 border-t border-slate-150">
            <button
              type="button"
              onClick={() => setShowScriptInstructions(!showScriptInstructions)}
              className="w-full flex justify-between items-center text-[10px] font-bold text-indigo-600 select-none py-1.5 focus:outline-none cursor-pointer"
            >
              <span>{showScriptInstructions ? '▲ Kurulum Adımlarını Gizle' : '▼ E-Tablo Kurulum Kılavuzu & Kod Üretici'}</span>
              <ChevronRight className={`w-3.5 h-3.5 transform transition-transform ${showScriptInstructions ? 'rotate-90' : ''}`} />
            </button>

            {showScriptInstructions && (
              <div className="mt-3.5 p-3.5 bg-slate-55 border border-slate-150 rounded-2xl text-[9.5px] text-slate-650 font-sans space-y-3 leading-relaxed">
                <span className="font-extrabold text-slate-800 text-[10px] border-b border-slate-200 pb-1 block">5 Dakikalık Kolay Google E-Tablo Kurulumu:</span>
                <ol className="list-decimal list-inside space-y-2 font-medium">
                  <li>
                    <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-indigo-600 font-bold hover:underline">sheets.new</a> adresine giderek boş yeni bir Google E-Tablo oluşturun.
                  </li>
                  <li>
                    Menüden <strong>Extensions (Eklentiler) &rsaquo; Apps Script</strong> seçeneğine tıklayın.
                  </li>
                  <li>
                    Açılan sayfadaki kodların tamamını silin ve aşağıdaki butondan kopyalayacağınız kodu yapıştırın:
                    
                    <button
                      type="button"
                      onClick={handleCopyToClipboard}
                      className={`w-full tracking-wide py-2.5 px-3 mt-1.5 rounded-xl border transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 font-bold ${
                        copiedScript 
                          ? 'bg-emerald-600 border-emerald-700 text-white' 
                          : 'bg-white hover:bg-slate-50 text-indigo-700 border-slate-200'
                      }`}
                    >
                      {copiedScript ? '✓ Kopyalandı!' : '📋 Apps Script Kodunu Kopyala'}
                    </button>
                  </li>
                  <li>
                    Sağ üstteki <strong>Deploy (Dağıt) &rsaquo; New deployment (Yeni dağıtım)</strong> butonuna basın.
                  </li>
                  <li>
                    Sol çark simgesinden türü <strong>Web app (Web uygulaması)</strong> olarak belirleyin.
                  </li>
                  <li>
                    Ayarları şu şekilde yapın:
                    <ul className="list-disc list-inside pl-3 mt-1 text-slate-500 space-y-0.5">
                      <li>Execute as (Yürüten): <strong>Me (Ben)</strong></li>
                      <li>Who has access (Erişimi olanlar): <strong>Anyone (Herkes)</strong></li>
                    </ul>
                  </li>
                  <li>
                    <strong>Deploy</strong> deyin, Google sizden izin isteyecektir ("Authorize access"). İzinleri çekinmeden verin (Gelişmiş &rsaquo; Go to Untitled projesine git).
                  </li>
                  <li>
                    Oluşan <strong>Web app URL</strong> adresini kopyalayarak yukarıdaki "Google Apps Script Web App URL" kısmına yapıştırın ve <strong>Bağla & Test</strong> butonuna tıklayın!
                  </li>
                </ol>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. DATA OPERATIONS (CSV BACKUP & HARD RESET) */}
      <div className="p-5 bg-white border border-rose-100/45 shadow-xs rounded-[25px] space-y-4" id="danger-operations-card">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <Database className="w-4.5 h-4.5 text-slate-500" /> Yedekleme ve Bellek İşlemleri
        </h3>
        
        <div className="space-y-2 pt-1 font-sans">
          {/* Backup Download Button */}
          <button
            onClick={handleDownloadCSVBackup}
            className="w-full py-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <FileDown className="w-4 h-4 text-slate-500" /> Tüm Verileri Excel/CSV Olarak Yedekle
          </button>

          {/* Backup Restore from CSV */}
          <div className="relative">
            <input
              type="file"
              id="csv-restore-file-input"
              accept=".csv"
              onChange={handleRestoreCSV}
              className="hidden"
            />
            <button
              onClick={() => document.getElementById('csv-restore-file-input')?.click()}
              className="w-full py-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-150 text-indigo-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <Import className="w-4 h-4 text-indigo-600" /> Yedeklenen CSV Dosyasından Geri Yükle
            </button>
          </div>

          {/* Hard Database Reset */}
          <button
            onClick={handleClearDatabase}
            className="w-full py-3 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <Trash className="w-4 h-4 text-rose-600" /> Tüm Kayıtları Sıfırla (Danger Zone)
          </button>
        </div>

        {/* CSV Backup Restore Preview Modal Overlay */}
        <AnimatePresence>
          {isCSVRestorePreviewOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-4 bg-indigo-50/70 border border-indigo-150 rounded-2xl space-y-3.5 animate-slide-up"
            >
              <div className="flex justify-between items-center pb-0.5">
                <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                  📥 Yedek Dosyası Çözümlendi ({csvRestoreRows.length} İşlem)
                </span>
                <span className="text-[9px] bg-indigo-200 text-indigo-850 font-bold px-1.5 py-0.5 rounded-full">Yedek İthalat</span>
              </div>

              {/* Parsed CSV mini Scroll list */}
              <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-200/50 bg-white shadow-2xs divide-y divide-slate-100 scrollbar-none">
                {csvRestoreRows.map((row, idx) => (
                  <div key={idx} className="p-2.5 flex justify-between items-center text-[10px] hover:bg-slate-50 animate-fade-in">
                    <div className="space-y-0.5">
                      <span className="font-mono text-slate-400">{row.tarih}</span>
                      <div className="flex items-center gap-1">
                        <span className={`text-[8.5px] font-extrabold px-1 py-0.5 rounded-md uppercase ${
                          row.tur === 'Gelir' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>{row.tur}</span>
                        <span className="font-bold text-slate-700">{row.kategori} &rsaquo; {row.altKategori}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-extrabold block text-slate-850 font-mono">{row.tutar.toLocaleString('tr-TR')} TL</span>
                      <span className="text-[9px] text-slate-450 italic block font-sans truncate max-w-[120px]">{row.aciklama}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-2 pt-1 font-sans">
                <button
                  type="button"
                  onClick={() => {
                    askConfirm(
                      "Mevcut Verilerle Birleştir",
                      `Dosyadaki ${csvRestoreRows.length} adet işlemi telefonunuzda zaten bulunan mevcut kayıtların üzerine eklemek istediğinize emin misiniz? Mevcut veriler kaybolmaz.`,
                      handleApplyRestoreMerge
                    );
                  }}
                  className="w-full py-2.5 px-3 text-xs font-bold bg-white hover:bg-slate-50 text-indigo-700 border border-slate-200 rounded-xl transition-all cursor-pointer text-center"
                >
                  Mevcut Kayıtların Üzerine Ekle (Tavsiye Edilen)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    askConfirm(
                      "⚠️ Üzerine Yazarak Geri Yükle",
                      `UYARI: Telefonunuzdaki tüm mevcut gelir-gider verileri kalıcı olarak silenecek ve yedek dosyasındaki ${csvRestoreRows.length} kayıt yüklenecektir. Onaylıyor musunuz?`,
                      handleApplyRestoreOverwrite,
                      true
                    );
                  }}
                  className="w-full py-2.5 px-3 text-xs font-black bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl shadow-xs transition-all cursor-pointer text-center"
                >
                  Tüm Verileri Temizle ve Geri Yükle
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCsvRestoreRows([]);
                    setIsCSVRestorePreviewOpen(false);
                  }}
                  className="w-full py-2 px-3 text-[11px] font-semibold text-slate-550 hover:text-slate-800 transition-all cursor-pointer text-center"
                >
                  İptal Et
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Reusable premium ConfirmModal */}
      <ConfirmModal
        isOpen={confirmModalOpen}
        title={confirmModalTitle}
        message={confirmModalMessage}
        confirmText="Evet, Onayla"
        cancelText="Vazgeç"
        isDangerous={confirmModalIsDangerous}
        onConfirm={() => {
          if (confirmModalAction) {
            confirmModalAction();
          }
          setConfirmModalOpen(false);
        }}
        onCancel={() => {
          setConfirmModalOpen(false);
        }}
      />

    </div>
  );
}
