// api/banner-start.js
//
// Баннер (Interstitial) — отдельный от роликов источник монет. Не
// трогает manual_limit (общий дневной пул для video/dilemma_checkpoint),
// ограничен только кулдауном между показами — проверка идёт по
// серверному времени (last_banner_watched_at), клиент это время никак
// не контролирует, в отличие от timezone (см. lib/userDaily.js).

const { verifyTelegramInitData } = require('../lib/telegramAuth');
const { supabaseAdmin } = require('../lib/supabaseAdmin');
const { BANNER_COOLDOWN_SECONDS, BANNER_MIN_WATCH_SECONDS } = require('../lib/economyConfig');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { initData } = req.body || {};
  const auth = verifyTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN);
  if (!auth.ok) return res.status(401).json({ error: auth.error });

  const telegramId = auth.telegramId;

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('last_banner_watched_at')
    .eq('telegram_id', telegramId)
    .single();

  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  if (user.last_banner_watched_at) {
    const elapsedSec = (Date.now() - new Date(user.last_banner_watched_at).getTime()) / 1000;
    const remaining = Math.ceil(BANNER_COOLDOWN_SECONDS - elapsedSec);
    if (remaining > 0) {
      return res.status(429).json({ error: 'Ещё рано', retry_after_seconds: remaining });
    }
  }

  // Проверка на уже активную сессию любого типа (переиспользуем ту же
  // таблицу sessions, что и видео/дилеммы — единая история, единая
  // защита от повторного старта)
  const { data: activeSession } = await supabaseAdmin
    .from('sessions')
    .select('id')
    .eq('telegram_id', telegramId)
    .eq('status', 'active')
    .maybeSingle();

  if (activeSession) {
    return res.status(409).json({ error: 'Уже есть незавершённая сессия' });
  }

  const { data: session, error } = await supabaseAdmin
    .from('sessions')
    .insert({
      telegram_id: telegramId,
      session_type: 'banner',
      status: 'active',
      duration_seconds: BANNER_MIN_WATCH_SECONDS,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error || !session) {
    return res.status(500).json({ error: 'Не удалось начать баннер' });
  }

  return res.status(200).json({ sessionId: session.id, durationSeconds: BANNER_MIN_WATCH_SECONDS });
};
