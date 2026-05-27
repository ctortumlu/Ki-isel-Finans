/**
 * Dynamic Exchange Rate Fetcher Service for Turkish Lira (USD/TRY)
 * Supports historical dates and auto-fallback chains.
 */

export async function fetchExchangeRateForDate(dateStr: string): Promise<number | null> {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return null;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const targetDate = dateStr > todayStr ? todayStr : dateStr;

  // Fallback 1: Frankfurter API (Extremely fast, reliable historical records since 1999)
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 4000); // 4 sec timeout
    
    const res = await fetch(`https://api.frankfurter.app/${targetDate}?from=USD&to=TRY`, {
      signal: controller.signal
    });
    clearTimeout(id);

    if (res.ok) {
      const data = await res.json();
      if (data && data.rates && typeof data.rates.TRY === 'number') {
        const rate = parseFloat(data.rates.TRY.toFixed(4));
        if (rate > 1 && rate < 200) {
          return rate;
        }
      }
    }
  } catch (err) {
    console.warn(`Frankfurter fetch failed for date ${targetDate}:`, err);
  }

  // Fallback 2: fawazahmed0 CDN Currency API (Excellent historical repository)
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 4000);
    
    const res = await fetch(`https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${targetDate}/v1/currencies/usd.json`, {
      signal: controller.signal
    });
    clearTimeout(id);

    if (res.ok) {
      const data = await res.json();
      if (data && data.usd && typeof data.usd.try === 'number') {
        const rate = parseFloat(data.usd.try.toFixed(4));
        if (rate > 1 && rate < 200) {
          return rate;
        }
      }
    }
  } catch (err) {
    console.warn(`fawazahmed0 CDN failed for date ${targetDate}:`, err);
  }

  // Fallback 3: Live open.er-api (Last backup for real-time rates)
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    if (res.ok) {
      const data = await res.json();
      if (data && data.rates && typeof data.rates.TRY === 'number') {
        const rate = parseFloat(data.rates.TRY.toFixed(4));
        if (rate > 1 && rate < 200) {
          return rate;
        }
      }
    }
  } catch (err) {
    console.error('All exchange rate fallbacks failed:', err);
  }

  return null;
}
