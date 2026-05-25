import { Transaction, RecurringPayment } from './types';

export const getAppsScriptUrl = (): string => {
  return localStorage.getItem('apps_script_url') || '';
};

export const setAppsScriptUrl = (url: string) => {
  if (url) {
    localStorage.setItem('apps_script_url', url.trim());
  } else {
    localStorage.removeItem('apps_script_url');
  }
};

export const getUseCloudSync = (): boolean => {
  return localStorage.getItem('use_cloud_sync') === 'true';
};

export const setUseCloudSync = (enabled: boolean) => {
  localStorage.setItem('use_cloud_sync', enabled ? 'true' : 'false');
};

export const getAutoSyncOnLoad = (): boolean => {
  return localStorage.getItem('auto_sync_on_load') !== 'false'; // default to true
};

export const setAutoSyncOnLoad = (enabled: boolean) => {
  localStorage.setItem('auto_sync_on_load', enabled ? 'true' : 'false');
};

export const getLastSyncTime = (): string => {
  return localStorage.getItem('last_sync_time') || 'Henüz Eşitlenmedi';
};

export const setLastSyncTime = (timeStr: string) => {
  localStorage.setItem('last_sync_time', timeStr);
};

export const isSyncEnabled = (): boolean => {
  return !!getAppsScriptUrl() && getUseCloudSync();
};

// Generic API caller that handles remote fetch using simple text/plain to bypass CORS
async function callAppsScript(action: string, args: Record<string, any> = {}): Promise<any> {
  const url = getAppsScriptUrl();
  if (!url) {
    throw new Error('Google Apps Script URL adresi yapılandırılmamış!');
  }

  const payload = {
    action,
    ...args,
  };

  const separator = url.includes('?') ? '&' : '?';
  const targetUrl = `${url}${separator}action=${action}`;

  const response = await fetch(targetUrl, {
    method: 'POST',
    mode: 'cors',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8', 
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`HTTP Bağlantı Hatası! Durum: ${response.status}`);
  }

  const json = await response.json();
  return json;
}

// Fetch all transactions and payments
export async function syncGetAllData(): Promise<{
  success: boolean;
  transactions?: Transaction[];
  payments?: RecurringPayment[];
  error?: string;
}> {
  try {
    const result = await callAppsScript('getAllData');
    if (result && result.success) {
      return {
        success: true,
        transactions: result.transactions || [],
        payments: result.payments || [],
      };
    }
    return { success: false, error: result?.error || 'Veri çekme işlemi başarısız oldu.' };
  } catch (e: any) {
    return { success: false, error: e.toString() };
  }
}

// Save all transactions and payments to sheets (supports optional targeted sheet sync with backward compatibility)
export async function syncSaveAllData(
  transactions: Transaction[],
  payments: RecurringPayment[],
  target?: 'transactions' | 'payments' | 'all'
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const activeTarget = target || 'all';

    // A single execution post is extremely fast, avoids Google Apps Script lock/concurrency errors,
    // and is 100% backward & forward compatible with both older and newer Apps Script.
    const result = await callAppsScript('saveAllData', { transactions, payments, target: activeTarget });
    if (result && result.success) {
      setLastSyncTime(new Date().toLocaleString('tr-TR'));
      return { success: true, message: result.message };
    }
    return { success: false, error: result?.error || 'Buluta kaydetme işlemi başarısız oldu.' };
  } catch (e: any) {
    return { success: false, error: e.toString() };
  }
}

// Test the script connection
export async function syncTestConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await callAppsScript('getAllData');
    if (result && result.hasOwnProperty('success')) {
      return { success: true };
    }
    return { success: false, error: 'Eksik veya geçersiz API cevabı döndürüldü.' };
  } catch (e: any) {
    return { success: false, error: e?.message || e.toString() };
  }
}
