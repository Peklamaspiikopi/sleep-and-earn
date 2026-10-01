// lib/adProviders.js
//
// Суточные лимиты показов по рекламным партнёрам. Считаем по таблице
// sessions: завершённые (status = 'completed') сессии с нужным
// ad_provider за текущие сутки по часовому поясу игрока. Отдельных
// счётчиков в users не нужно, а отменённые/неудавшиеся показы в лимит
// не попадают.
//
// Лимит по RichAds — НАША осторожная оценка, а не официальная цифра
// (RichAds публично безопасный лимит не называет; по их же материалам
// частоту показов для паблишера настраивает менеджер). Уточни у
// поддержки RichAds и поправь число ниже.

const AD_PROVIDER_LIMITS = {
  adsgram: 25,
  richads: 10,
};
const AD_PROVIDER_NAMES = { adsgram: 'Adsgram', richads: 'RichAds' };
const DEFAULT_AD_PROVIDER = 'adsgram';

function normalizeProvider(value) {
  return Object.prototype.hasOwnProperty.call(AD_PROVIDER_LIMITS, value) ? value : DEFAULT_AD_PROVIDER;
}

function adProviderOf(req) {
  return normalizeProvider(req && req.body && req.body.provider);
}

// Секунды, прошедшие с начала местных суток, и секунды до их конца.
function localDayInfo(timezone) {
  let h = 0, m = 0, s = 0;
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone || 'UTC', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    }).formatToParts(new Date());
    const get = (t) => parseInt((parts.find((p) => p.type === t) || {}).value || '0', 10) % 24;
    h = get('hour'); m = get('minute'); s = get('second');
  } catch (e) {
    const d = new Date();
    h = d.getUTCHours(); m = d.getUTCMinutes(); s = d.getUTCSeconds();
  }
  const elapsed = h * 3600 + m * 60 + s;
  return { startMs: Date.now() - elapsed * 1000, resetSeconds: Math.max(1, 86400 - elapsed) };
}

async function getAdStats(supabaseAdmin, telegramId, timezone) {
  const { startMs, resetSeconds } = localDayInfo(timezone);
  const since = new Date(startMs).toISOString();
  const out = { resetSeconds };
  for (const provider of Object.keys(AD_PROVIDER_LIMITS)) {
    const { count, error } = await supabaseAdmin
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('telegram_id', telegramId)
      .eq('ad_provider', provider)
      .eq('status', 'completed')
      .gte('completed_at', since);
    if (error) console.error('getAdStats failed:', provider, error);
    const used = count || 0;
    out[provider] = { used, limit: AD_PROVIDER_LIMITS[provider] };
  }
  return out;
}

function fmtHM(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.ceil((sec % 3600) / 60);
  return h > 0 ? `${h}ч ${m}м` : `${m}м`;
}

// Если лимит выбранного партнёра исчерпан — вернёт объект для ответа 429,
// иначе null.
async function providerBlock(supabaseAdmin, req, telegramId) {
  const provider = adProviderOf(req);
  const { data: u } = await supabaseAdmin.from('users').select('timezone').eq('telegram_id', telegramId).maybeSingle();
  const stats = await getAdStats(supabaseAdmin, telegramId, (req.body && req.body.timezone) || (u && u.timezone));
  const st = stats[provider];
  if (st.used < st.limit) return null;
  return {
    error: `Лимит рекламы ${AD_PROVIDER_NAMES[provider]} на сегодня исчерпан (${st.used}/${st.limit}). Переключи партнёра вверху или подожди ${fmtHM(stats.resetSeconds)}.`,
    providerLimit: true, provider, used: st.used, limit: st.limit, resetSeconds: stats.resetSeconds,
  };
}

module.exports = { AD_PROVIDER_LIMITS, AD_PROVIDER_NAMES, adProviderOf, getAdStats, providerBlock };
