// api/banner-complete.js
//
// Как и session-complete.js: сессию можно закрыть только один раз
// (атомарный UPDATE ... WHERE status='active'), и нельзя закрыть раньше
// реального времени показа (сверяем started_at с now()).

const { verifyTelegramInitData } = require('../lib/telegramAuth');
const { supabaseAdmin } = require('../lib/supabaseAdmin');
const { logTransaction } = require('../lib/transactions');
const { BANNER_REWARD, BANNER_MIN_WATCH_SECONDS, REVENUE_PER_BANNER_AD } = require('../lib/economyConfig');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { initData, sessionId } = req.body || {};
  const auth = verifyTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN);
  if (!auth.ok) return res.status(401).json({ error: auth.error });

  const telegramId = auth.telegramId;

  const { data: session } = await supabaseAdmin
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('telegram_id', telegramId)
    .eq('status', 'active')
    .eq('session_type', 'banner')
    .maybeSingle();

  if (!session) {
    return res.status(400).json({ error: 'Сессия не найдена или уже завершена' });
  }

  const elapsedSec = (Date.now() - new Date(session.started_at).getTime()) / 1000;
  if (elapsedSec < BANNER_MIN_WATCH_SECONDS) {
    return res.status(400).json({ error: 'Слишком рано' });
  }

  // Атомарный захват именно этой сессии — если два запроса пришли
  // одновременно, второй получит 0 затронутых строк и завершится ниже
  const { data: closedSession } = await supabaseAdmin
    .from('sessions')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', sessionId)
    .eq('status', 'active')
    .select()
    .maybeSingle();

  if (!closedSession) {
    return res.status(200).json({ ok: true, alreadyClosed: true });
  }

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('balance, lifetime_ad_payout_coins, lifetime_ad_revenue_usd')
    .eq('telegram_id', telegramId)
    .single();

  const reward = BANNER_REWARD;
  const newBalance = user.balance + reward;

  const { data: updated } = await supabaseAdmin
    .from('users')
    .update({
      balance: newBalance,
      last_banner_watched_at: new Date().toISOString(),
      lifetime_ad_payout_coins: (user.lifetime_ad_payout_coins || 0) + reward,
      lifetime_ad_revenue_usd: (user.lifetime_ad_revenue_usd || 0) + REVENUE_PER_BANNER_AD,
    })
    .eq('telegram_id', telegramId)
    .eq('balance', user.balance) // compare-and-swap
    .select()
    .maybeSingle();

  if (!updated) {
    // Крайне маловероятная гонка с другой операцией баланса того же
    // юзера в тот же миг — безопаснее вернуть ошибку и дать клиенту
    // retry, чем рисковать потерянным начислением
    return res.status(409).json({ error: 'Повтори ещё раз' });
  }

  await logTransaction(supabaseAdmin, telegramId, 'banner_reward', reward, updated.balance);

  return res.status(200).json({ ok: true, reward, balance: updated.balance });
};
