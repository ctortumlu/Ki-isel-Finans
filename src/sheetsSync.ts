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

// Generic API caller that handles remote fetch using simple text/plain to bypass CORS or GET for fetching
async function callAppsScript(
  action: string,
  args: Record<string, any> = {},
  options: { method?: 'GET' | 'POST'; useNoCors?: boolean } = {}
): Promise<any> {
  const url = getAppsScriptUrl();
  if (!url) {
    throw new Error('Google Apps Script URL adresi yapılandırılmamış!');
  }

  const method = options.method || 'POST';
  const separator = url.includes('?') ? '&' : '?';

  if (method === 'GET') {
    // For GET: put action and other parameters inside query string
    const queryParams = new URLSearchParams({
      action,
      ...args,
    });
    const targetUrl = `${url}${separator}${queryParams.toString()}`;

    const response = await fetch(targetUrl, {
      method: 'GET',
      mode: 'cors',
    });

    if (!response.ok) {
      throw new Error(`HTTP Bağlantı Hatası! Durum: ${response.status}`);
    }

    return await response.json();
  } else {
    // For POST (writing/saving):
    const payload = {
      action,
      ...args,
    };
    const targetUrl = `${url}${separator}action=${action}`;

    if (options.useNoCors) {
      // Simple POST request with no-cors. Bypass iOS Safari CORS redirection blocks.
      // Google Apps Script will receive and process the payload, and Safari won't block or throw an error on the 302 redirect.
      await fetch(targetUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
      });

      // In no-cors, we cannot read the response, but we can assume success as it resolves without error
      return { success: true, message: 'Veriler arka planda Google Sheets\'e gönderildi.' };
    } else {
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

      return await response.json();
    }
  }
}

// Fetch all transactions and payments
export async function syncGetAllData(): Promise<{
  success: boolean;
  transactions?: Transaction[];
  payments?: RecurringPayment[];
  error?: string;
}> {
  try {
    const result = await callAppsScript('getAllData', {}, { method: 'GET' });
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
  const activeTarget = target || 'all';
  try {
    // 1. Try with CORS first (useNoCors: false) to get real success/failure feedback from Google Sheets!
    const result = await callAppsScript(
      'saveAllData',
      { transactions, payments, target: activeTarget },
      { method: 'POST', useNoCors: false }
    );
    if (result && result.success) {
      setLastSyncTime(new Date().toLocaleString('tr-TR'));
      return { success: true, message: result.message || 'Veriler başarıyla eşitlendi.' };
    }
    // If Google Sheets returns success: false, return the actual error!
    return { success: false, error: result?.error || 'Buluta kaydetme işlemi başarısız oldu.' };
  } catch (corsError: any) {
    console.warn("CORS POST failed or was blocked, falling back to silent no-cors sync...", corsError);
    // 2. Fallback to useNoCors: true for environments (like Safari/iOS Safari) where CORS redirects are blocked
    try {
      const result = await callAppsScript(
        'saveAllData',
        { transactions, payments, target: activeTarget },
        { method: 'POST', useNoCors: true }
      );
      if (result && result.success) {
        setLastSyncTime(new Date().toLocaleString('tr-TR'));
        return { success: true, message: result.message || 'Veriler başarıyla eşitlendi.' };
      }
      return { success: false, error: result?.error || 'Buluta kaydetme işlemi başarısız oldu.' };
    } catch (fallbackError: any) {
      return { success: false, error: fallbackError.toString() };
    }
  }
}

// Test the script connection
export async function syncTestConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await callAppsScript('getAllData', {}, { method: 'GET' });
    if (result && result.hasOwnProperty('success')) {
      return { success: true };
    }
    return { success: false, error: 'Eksik veya geçersiz API cevabı döndürüldü.' };
  } catch (e: any) {
    return { success: false, error: e?.message || e.toString() };
  }
}
