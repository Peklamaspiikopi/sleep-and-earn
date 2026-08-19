// lib/tonRate.js
//
// Курс TON/USD нужен, чтобы показывать пользователю понятную сумму
// вывода в TON, а не голое "1 Монета = $0.0001" (пугает мелким числом).
// Курс кэшируется в памяти инстанса на CACHE_TTL_MS — чтобы не дёргать
// внешний API на каждый заход в кабинет. Если внешний API недоступен —
// отдаём последний известный курс, а если кэша ещё не было — разумный
// дефолт (FALLBACK_TON_USD), чтобы страница не падала.

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 минут
const FALLBACK_TON_USD = 3.0; // на случай, если API недоступен и кэша ещё нет

let cachedRate = null;
let cachedAt = 0;

async function getTonUsdRate() {
  const now = Date.now();
  if (cachedRate && (now - cachedAt) < CACHE_TTL_MS) {
    return cachedRate;
  }

  try {
    const resp = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd',
      {
        signal: AbortSignal.timeout(4000),
        headers: { 'User-Agent': 'MintoStrk/1.0' },
      }
    );
    if (!resp.ok) throw new Error(`CoinGecko status ${resp.status}`);
    const data = await resp.json();
    const rate = data?.['the-open-network']?.usd;
    if (typeof rate === 'number' && rate > 0) {
      cachedRate = rate;
      cachedAt = now;
      return rate;
    }
    throw new Error('Bad response shape');
  } catch (err) {
    console.error('TON rate fetch failed:', err.message);
    // Отдаём последний известный курс, а если его нет — дефолт
    return cachedRate || FALLBACK_TON_USD;
  }
}

module.exports = { getTonUsdRate };
