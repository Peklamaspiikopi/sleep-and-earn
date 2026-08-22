// api/session-start.js
//
// Честный ручной режим просмотра рекламы. Между роликами — случайная
// пауза 75-120 секунд на сервере (обойти с клиента нельзя), чтобы
// не выглядеть как бот для рекламной сети.
//
// Используется для двух целей — обычный ролик за монеты (sessionType
// 'video', по умолчанию) и чекпоинт дилемм (sessionType
// 'dilemma_checkpoint'). Оба типа тратят ОДИН общий суточный лимит
// показов (manual_limit) — реклама из дилемм не даёт второй, отдельный
// от основного раздела, канал показов. Это и честнее по отношению к
// рекламной сети (не выглядит как аномально много показов на юзера в
// день), и не даёт дилеммам стать более дешёвым способом получить те
// же самые показы в обход дневного лимита.

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

  const { initData, sessionType, topic } = req.body || {};
  const type = sessionType === 'dilemma_checkpoint' ? 'dilemma_checkpoint' : 'video';
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
        video_reward: 10,
        streak_count: 0,
        ads_watched_today: 0,
        active_days_since_level8: 0,
        active_days_since_limit_bump: 0,
        active_days_since_big_box: 0,
        reward_locked_permanent: false,
        age_confirmed: false,
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

  let dilemmaProgress = null;
  if (type === 'dilemma_checkpoint') {
    if (!topic) return res.status(400).json({ error: 'Не указана тема дилемм' });

    const { data: progress } = await supabaseAdmin
      .from('dilemma_progress')
      .select('*')
      .eq('telegram_id', telegramId)
      .eq('topic', topic)
      .maybeSingle();

    if (!progress || progress.pending_checkpoints <= 0) {
      return res.status(400).json({ error: 'Нет доступных чекпоинтов для получения монет' });
    }
    dilemmaProgress = progress;
  }

  // Дневной лимит показов — общий для обоих типов сессий
  if (user.ads_watched_today === 0) {
    // Первый ролик сразу после сброса лимита — просим подождать немного,
    // чтобы это не выглядело как бот, который бьёт лимит ровно в 00:00
    const waitMinutes = postResetCooldownRemaining(user);
    if (waitMinutes > 0) {
      return res.status(429).json({ error: `Лимит обновился недавно, попробуй через ${waitMinutes} мин.`, retryAfterMinutes: waitMinutes });
    }
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

  // Пауза между роликами — случайная 75-120 сек, общая для видео и
  // чекпоинтов дилемм (один источник правды по последнему показу)
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

  // Атомарное списание дневного лимита — общее для видео и чекпоинтов.
  // UPDATE проходит только если лимит всё ещё равен тому, что мы
  // прочитали, иначе двойной клик мог бы создать две сессии на один
  // и тот же остаток лимита (бесплатный лишний показ).
  const newLimit = user.manual_limit - 1;
  const { data: claimed } = await supabaseAdmin
    .from('users')
    .update({ manual_limit: newLimit })
    .eq('telegram_id', telegramId)
    .eq('manual_limit', user.manual_limit)
    .select()
    .maybeSingle();

  if (!claimed) {
    return res.status(409).json({ error: 'Попробуй ещё раз' });
  }

  if (type === 'dilemma_checkpoint') {
    // Дополнительно атомарно резервируем один чекпоинт дилемм, чтобы
    // двойной клик не позволил получить два чекпоинт-ролика на один и
    // тот же накопленный чекпоинт
    const { data: claimedCheckpoint } = await supabaseAdmin
      .from('dilemma_progress')
      .update({ pending_checkpoints: dilemmaProgress.pending_checkpoints - 1 })
      .eq('telegram_id', telegramId)
      .eq('topic', topic)
      .eq('pending_checkpoints', dilemmaProgress.pending_checkpoints)
      .select()
      .maybeSingle();

    if (!claimedCheckpoint) {
      // Откатываем уже списанный лимит, раз чекпоинт зарезервировать не вышло
      await supabaseAdmin.from('users').update({ manual_limit: user.manual_limit }).eq('telegram_id', telegramId).eq('manual_limit', newLimit);
      return res.status(409).json({ error: 'Попробуй ещё раз' });
    }
  }

  const sessionId = crypto.randomUUID();
  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + SESSION_TTL_SECONDS * 1000);
  const reward = user.video_reward || 10;

  await supabaseAdmin.from('sessions').insert([{
    id: sessionId,
    telegram_id: telegramId,
    mode: 'manual',
    duration_seconds: MIN_WATCH_SECONDS,
    reward,
    started_at: startedAt.toISOString(),
    expires_at: expiresAt.toISOString(),
    status: 'active',
    session_type: type,
    dilemma_topic: type === 'dilemma_checkpoint' ? topic : null,
  }]);

  return res.status(200).json({ sessionId, manual_limit: newLimit, reward });
};
