// api/session-start.js
//
// Честный ручной режим просмотра рекламы. Между роликами — случайная
// пауза 75-120 секунд на сервере (обойти с клиента нельзя), чтобы
// не выглядеть как бот для рекламной сети.

const { verifyTelegramInitData } = require('../lib/telegramAuth');
const { supabaseAdmin } = require('../lib/supabaseAdmin');
const { ensureDailyReset, postResetCooldownRemaining, MAX_MANUAL_PER_DAY } = require('../lib/userDaily');
const crypto = require('crypto');

const MIN_WATCH_SECONDS = 12;
const SESSION_TTL_SECONDS = 120;
const COOLDOWN_MIN_SECONDS = 75;
const COOLDOWN_MAX_SECONDS = 120;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { initData } = req.body || {};
  const auth = verifyTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN);
  if (!auth.ok) return res.status(401).json({ error: auth.error });

  const telegramId = auth.telegramId;

  let { data: user } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('telegram_id', telegramId)
    .maybeSingle();

  if (!user) {
    const { data: newUser, error: insertErr } = await supabaseAdmin
      .from('users')
      .insert([{
        telegram_id: telegramId,
        balance: 0,
        ref_count: 0,
        ref_earn: 0,
        manual_limit: MAX_MANUAL_PER_DAY,
        manual_limit_max: MAX_MANUAL_PER_DAY,
        video_reward: 5,
        streak_count: 0,
        ads_watched_today: 0,
        streak_freeze_tokens: 0,
        pending_miss_days: 0,
        active_days_since_level8: 0,
        active_days_since_limit_bump: 0,
        reward_locked_permanent: false,
        timezone: 'UTC',
        last_reset: new Date().toISOString().slice(0, 10),
        loyalty_started_at: new Date().toISOString().slice(0, 10),
        flagged: false,
      }])
      .select()
      .single();

    if (insertErr) {
      console.error('INSERT ERROR (session-start):', JSON.stringify(insertErr));
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('telegram_id', telegramId)
        .maybeSingle();
      user = existingUser;
    } else {
      user = newUser;
    }

    if (!user) return res.status(500).json({ error: 'Не удалось создать или найти пользователя' });
  }

  const resetResult = await ensureDailyReset(supabaseAdmin, user, telegramId, user.timezone);
  user = resetResult.user;

  // Первый ролик сразу после сброса лимита — просим подождать немного,
  // чтобы это не выглядело как бот, который бьёт лимит ровно в 00:00
  if (user.ads_watched_today === 0) {
    const waitMinutes = postResetCooldownRemaining(user);
    if (waitMinutes > 0) {
      return res.status(429).json({ error: `Лимит обновился недавно, попробуй через ${waitMinutes} мин.`, retryAfterMinutes: waitMinutes });
    }
  }

  if (user.pending_miss_days > 0) {
    return res.status(423).json({
      error: 'Сначала реши вопрос с пропущенными днями',
      pendingMissDays: user.pending_miss_days,
    });
  }

  if (user.manual_limit <= 0) {
    return res.status(400).json({ error: 'Дневной лимит роликов исчерпан' });
  }

  const { data: activeSession } = await supabaseAdmin
    .from('sessions')
    .select('id, expires_at')
    .eq('telegram_id', telegramId)
    .eq('status', 'active')
    .maybeSingle();

  if (activeSession) {
    if (new Date(activeSession.expires_at).getTime() < Date.now()) {
      // Сессия зависла (например, юзер закрыл приложение) — считаем её протухшей
      await supabaseAdmin.from('sessions').update({ status: 'expired' }).eq('id', activeSession.id);
    } else {
      return res.status(409).json({ error: 'Уже есть незавершённая сессия' });
    }
  }

  // Пауза между роликами — случайная 75-120 сек, чтобы не выглядеть как бот
  const { data: lastSession } = await supabaseAdmin
    .from('sessions')
    .select('completed_at')
    .eq('telegram_id', telegramId)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastSession && lastSession.completed_at) {
    const cooldown = COOLDOWN_MIN_SECONDS + Math.random() * (COOLDOWN_MAX_SECONDS - COOLDOWN_MIN_SECONDS);
    const elapsed = (Date.now() - new Date(lastSession.completed_at).getTime()) / 1000;
    if (elapsed < cooldown) {
      const wait = Math.ceil(cooldown - elapsed);
      return res.status(429).json({ error: `Подожди ещё ${wait} сек. перед следующим роликом`, retryAfter: wait });
    }
  }

  const newLimit = user.manual_limit - 1;
  await supabaseAdmin.from('users').update({ manual_limit: newLimit }).eq('telegram_id', telegramId);

  const sessionId = crypto.randomUUID();
  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + SESSION_TTL_SECONDS * 1000);
  const reward = user.video_reward || 5;

  await supabaseAdmin.from('sessions').insert([{
    id: sessionId,
    telegram_id: telegramId,
    mode: 'manual',
    duration_seconds: MIN_WATCH_SECONDS,
    reward,
    started_at: startedAt.toISOString(),
    expires_at: expiresAt.toISOString(),
    status: 'active',
  }]);

  return res.status(200).json({ sessionId, manual_limit: newLimit, reward });
};
