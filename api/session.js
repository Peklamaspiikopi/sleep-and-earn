// api/session.js
//
// Единый роутер для всего жизненного цикла показов рекламы —
// объединяет то, что раньше было 5 отдельными файлами
// (session-start/complete/cancel, banner-start/complete). Причина
// объединения чисто техническая: у Vercel Hobby-плана лимит 12
// serverless-функций на деплой, и по одному файлу на функцию мы в
// него не помещались. Внутренняя логика каждого action — дословно
// то же самое, что было в отдельных файлах, просто вызывается через
// req.body.action вместо отдельного URL.
//
// action: 'start' | 'complete' | 'cancel' | 'banner_start' | 'banner_complete'

const { verifyTelegramInitData } = require('../lib/telegramAuth');
const { supabaseAdmin } = require('../lib/supabaseAdmin');
const { ensureDailyReset, postResetCooldownRemaining, MAX_MANUAL_PER_DAY, getLocalDateString } = require('../lib/userDaily');
const { atomicIncrement } = require('../lib/atomicIncrement');
const {
  dailyBonusForStreak, rollBigBox, minAdsRequired, tierIndexFor,
  TIERS, TIER_GROWTH_DAYS, BOX_UNLOCK_TIER_IDX,
  LIMIT_GROWTH_ACTIVE_DAYS, LIMIT_CAP, BIG_BOX_INTERVAL_ACTIVE_DAYS,
} = require('../lib/streakLogic');
const {
  REVENUE_PER_VIDEO_AD, BANNER_REWARD, BANNER_COOLDOWN_SECONDS,
  BANNER_MIN_WATCH_SECONDS, REVENUE_PER_BANNER_AD, BANNER_DAILY_LIMIT,
  GAME_DAILY_LIMIT, GAME_MIN_WATCH_SECONDS, GAME_SESSION_TTL_SECONDS,
  BASE_GAME_REWARD, computeGameBonus,
  DAILY_GAME_LADDER_FULL, DAILY_GAME_LADDER_SKIP, DAY7_POSITION,
  rollKeyWheel, TERMINAL_CLOSED, TERMINAL_CLOSED_MESSAGE, CHECKPOINT_TOKEN_REWARD,
} = require('../lib/economyConfig');
const ALLOWED_GAMES = ['blockblast', '2048', 'watersort'];
const { logTransaction } = require('../lib/transactions');
const crypto = require('crypto');

const MIN_WATCH_SECONDS = 12;
const SESSION_TTL_SECONDS = 120;
const COOLDOWN_MIN_SECONDS = 75;
const COOLDOWN_MAX_SECONDS = 120;

// ==== action: start (ролик) ====
async function handleStart(req, res, telegramId) {
  if (TERMINAL_CLOSED) return res.status(403).json({ error: TERMINAL_CLOSED_MESSAGE });
  const { sessionType, topic } = req.body || {};
  const type = 'video';

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
      console.error('INSERT ERROR (session start):', JSON.stringify(insertErr));
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

  if (user.flagged || user.reward_locked_permanent) {
    return res.status(403).json({ error: 'Начисления для этого аккаунта временно недоступны' });
  }

  if (user.ads_watched_today === 0) {
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
      await supabaseAdmin.from('sessions').update({ status: 'expired' }).eq('id', activeSession.id);
    } else {
      return res.status(409).json({ error: 'Уже есть незавершённая сессия' });
    }
  }

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
    dilemma_topic: null,
  }]);

  return res.status(200).json({ sessionId, manual_limit: newLimit, reward });
}

// ==== action: complete (ролик) ====
async function handleComplete(req, res, telegramId) {
  if (TERMINAL_CLOSED) return res.status(403).json({ error: TERMINAL_CLOSED_MESSAGE });
  const { sessionId } = req.body || {};

  const { data: session } = await supabaseAdmin
    .from('sessions')
    .update({ status: 'processing' })
    .eq('id', sessionId)
    .eq('telegram_id', telegramId)
    .eq('status', 'active')
    .select()
    .maybeSingle();

  if (!session) {
    return res.status(409).json({ error: 'Сессия уже обрабатывается или закрыта' });
  }

  const now = Date.now();
  const startedAt = new Date(session.started_at).getTime();
  const expiresAt = new Date(session.expires_at).getTime();

  if (now - startedAt < session.duration_seconds * 1000) {
    await supabaseAdmin.from('sessions').update({ status: 'active' }).eq('id', sessionId);
    return res.status(400).json({ error: 'Слишком рано — ролик ещё не досмотрен' });
  }
  if (now > expiresAt) {
    await supabaseAdmin.from('sessions').update({ status: 'expired' }).eq('id', sessionId);
    return res.status(410).json({ error: 'Время сессии истекло' });
  }

  let { data: user } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('telegram_id', telegramId)
    .single();

  if (!user) {
    await supabaseAdmin.from('sessions').update({ status: 'active' }).eq('id', sessionId);
    return res.status(404).json({ error: 'Пользователь не найден' });
  }

  const resetResult = await ensureDailyReset(supabaseAdmin, user, telegramId, user.timezone);
  user = resetResult.user;
  const today = resetResult.today;

  let newBalance = user.balance + session.reward;
  const newAdsToday = (user.ads_watched_today || 0) + 1;

  const updates = { balance: newBalance, ads_watched_today: newAdsToday };
  const dayInfo = { dayCompleted: false };
  let payoutThisAd = session.reward;

  function applyLimitGrowth() {
    if ((user.manual_limit_max || 20) >= LIMIT_CAP) return;
    const newActiveDaysLimit = (user.active_days_since_limit_bump || 0) + 1;
    if (newActiveDaysLimit >= LIMIT_GROWTH_ACTIVE_DAYS) {
      updates.manual_limit_max = (user.manual_limit_max || 20) + 1;
      updates.active_days_since_limit_bump = 0;
      dayInfo.limitBump = updates.manual_limit_max;
    } else {
      updates.active_days_since_limit_bump = newActiveDaysLimit;
    }
  }

  const requiredAds = minAdsRequired(user);

  if (newAdsToday === requiredAds && user.last_active_date !== today) {
    dayInfo.dayCompleted = true;

    const newStreak = (user.streak_count || 0) + 1;
    updates.streak_count = newStreak;
    updates.last_active_date = today;
    dayInfo.streak = newStreak;

    let currentReward = user.video_reward || TIERS[0];
    let tierIdx = tierIndexFor(currentReward);
    let justUnlockedBoxTier = false;
    if (tierIdx < TIERS.length - 1) {
      const needed = TIER_GROWTH_DAYS[tierIdx];
      const progress = (user.active_days_since_level8 || 0) + 1;
      if (progress >= needed) {
        tierIdx += 1;
        currentReward = TIERS[tierIdx];
        updates.video_reward = currentReward;
        updates.active_days_since_level8 = 0;
        dayInfo.levelUp = currentReward;
        if (tierIdx === BOX_UNLOCK_TIER_IDX) justUnlockedBoxTier = true;
      } else {
        updates.active_days_since_level8 = progress;
      }
    }

    const bonus = dailyBonusForStreak(newStreak, currentReward);
    newBalance += bonus.reward;
    payoutThisAd += bonus.reward;
    updates.balance = newBalance;
    dayInfo.dailyBonus = bonus.reward;
    dayInfo.isBox = bonus.isBox;
    if (bonus.locked) dayInfo.boxLocked = true;

    if (tierIdx >= BOX_UNLOCK_TIER_IDX) {
      if (justUnlockedBoxTier) {
        const bigBoxReward = rollBigBox();
        newBalance += bigBoxReward;
        payoutThisAd += bigBoxReward;
        updates.balance = newBalance;
        updates.active_days_since_big_box = 0;
        dayInfo.bigBox = bigBoxReward;
        dayInfo.bigBoxFirstUnlock = true;
      } else {
        const newActiveDaysBigBox = (user.active_days_since_big_box || 0) + 1;
        if (newActiveDaysBigBox >= BIG_BOX_INTERVAL_ACTIVE_DAYS) {
          const bigBoxReward = rollBigBox();
          newBalance += bigBoxReward;
          payoutThisAd += bigBoxReward;
          updates.balance = newBalance;
          updates.active_days_since_big_box = 0;
          dayInfo.bigBox = bigBoxReward;
        } else {
          updates.active_days_since_big_box = newActiveDaysBigBox;
        }
      }
    }

    applyLimitGrowth();
  }

  updates.lifetime_ad_payout_coins = (user.lifetime_ad_payout_coins || 0) + payoutThisAd;
  updates.lifetime_ad_revenue_usd = (user.lifetime_ad_revenue_usd || 0) + REVENUE_PER_VIDEO_AD;

  // CAS с повтором на самом balance: остальные поля в updates (стрик,
  // тир, счётчики) безопасно фиксировать по первому чтению — их не
  // трогает ни один другой обработчик. А вот balance параллельно
  // меняют shop_buy/wheel_spin/promo_redeem/withdraw, и без проверки
  // здесь их запись могла бы быть затёрта этим update'ом "вслепую"
  // (и наоборот — см. разбор в чате). Поэтому именно balance всегда
  // пересчитываем от СВЕЖЕГО значения на каждой попытке.
  let committed = null;
  let currentBalanceForRetry = user.balance;
  for (let attempt = 0; attempt < 5 && !committed; attempt++) {
    const attemptBalance = currentBalanceForRetry + payoutThisAd;
    const { data: result } = await supabaseAdmin
      .from('users')
      .update({ ...updates, balance: attemptBalance })
      .eq('telegram_id', telegramId)
      .eq('balance', currentBalanceForRetry)
      .select()
      .maybeSingle();

    if (result) {
      committed = result;
    } else {
      const { data: freshUser } = await supabaseAdmin.from('users').select('balance').eq('telegram_id', telegramId).maybeSingle();
      if (!freshUser) break;
      currentBalanceForRetry = freshUser.balance;
    }
  }

  if (!committed) {
    await supabaseAdmin.from('sessions').update({ status: 'active' }).eq('id', sessionId);
    return res.status(409).json({ error: 'Не удалось начислить награду, попробуй ещё раз' });
  }
  newBalance = committed.balance;

  await supabaseAdmin
    .from('sessions')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', sessionId);

  const rewardType = 'video_reward';
  await logTransaction(supabaseAdmin, telegramId, rewardType, session.reward, newBalance);
  if (dayInfo.dailyBonus) {
    await logTransaction(supabaseAdmin, telegramId, dayInfo.isBox ? 'box' : 'daily_bonus', dayInfo.dailyBonus, newBalance, `Активный день ${dayInfo.streak}`);
  }
  if (dayInfo.bigBox) {
    await logTransaction(supabaseAdmin, telegramId, 'big_box', dayInfo.bigBox, newBalance, `Большая коробка`);
  }

  return res.status(200).json({ balance: newBalance, reward: session.reward, ...dayInfo });
}

// ==== action: cancel (ролик/чекпоинт дилеммы) ====
async function handleCancel(req, res, telegramId) {
  const { sessionId } = req.body || {};

  const { data: session } = await supabaseAdmin
    .from('sessions')
    .update({ status: 'cancelled', completed_at: new Date().toISOString() })
    .eq('id', sessionId)
    .eq('telegram_id', telegramId)
    .eq('status', 'active')
    .select()
    .maybeSingle();

  if (!session) {
    return res.status(200).json({ ok: true, alreadyClosed: true });
  }

  await atomicIncrement(supabaseAdmin, 'users', { telegram_id: telegramId }, 'manual_limit', 1);

  return res.status(200).json({ ok: true });
}

// ==== action: banner_start ====
async function handleBannerStart(req, res, telegramId) {
  if (TERMINAL_CLOSED) return res.status(403).json({ error: TERMINAL_CLOSED_MESSAGE });
  const { timezone } = req.body || {};
  const { data: rawUser } = await supabaseAdmin
    .from('users')
    .select('last_banner_watched_at, banners_watched_today, manual_limit, manual_limit_max, ads_watched_today, last_reset, last_reset_at, timezone, flagged, reward_locked_permanent')
    .eq('telegram_id', telegramId)
    .single();

  if (!rawUser) return res.status(404).json({ error: 'Пользователь не найден' });
  if (rawUser.flagged || rawUser.reward_locked_permanent) {
    return res.status(403).json({ error: 'Начисления для этого аккаунта временно недоступны' });
  }

  const { user } = await ensureDailyReset(supabaseAdmin, rawUser, telegramId, timezone);

  if ((user.banners_watched_today || 0) >= BANNER_DAILY_LIMIT) {
    return res.status(429).json({ error: 'Дневной лимит баннеров исчерпан, возвращайся завтра', daily_limit_reached: true });
  }

  if (user.last_banner_watched_at) {
    const elapsedSec = (Date.now() - new Date(user.last_banner_watched_at).getTime()) / 1000;
    const remaining = Math.ceil(BANNER_COOLDOWN_SECONDS - elapsedSec);
    if (remaining > 0) {
      return res.status(429).json({ error: 'Ещё рано', retry_after_seconds: remaining });
    }
  }

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
}

// ==== action: banner_complete ====
async function handleBannerComplete(req, res, telegramId) {
  if (TERMINAL_CLOSED) return res.status(403).json({ error: TERMINAL_CLOSED_MESSAGE });
  const { sessionId } = req.body || {};

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
    .select('balance, lifetime_ad_payout_coins, lifetime_ad_revenue_usd, banners_watched_today')
    .eq('telegram_id', telegramId)
    .single();

  const reward = BANNER_REWARD;
  const newBalance = user.balance + reward;

  const { data: updated } = await supabaseAdmin
    .from('users')
    .update({
      balance: newBalance,
      last_banner_watched_at: new Date().toISOString(),
      banners_watched_today: (user.banners_watched_today || 0) + 1,
      lifetime_ad_payout_coins: (user.lifetime_ad_payout_coins || 0) + reward,
      lifetime_ad_revenue_usd: (user.lifetime_ad_revenue_usd || 0) + REVENUE_PER_BANNER_AD,
    })
    .eq('telegram_id', telegramId)
    .eq('balance', user.balance)
    .select()
    .maybeSingle();

  if (!updated) {
    return res.status(409).json({ error: 'Повтори ещё раз' });
  }

  await logTransaction(supabaseAdmin, telegramId, 'banner_reward', reward, updated.balance);

  return res.status(200).json({ ok: true, reward, balance: updated.balance });
}

// ==== action: game_start ====
// Общий вход для всех мини-игр закрытого периода (blockblast/2048/watersort).
// ==== action: checkpoint_start (дилеммы — не завязано на manual_limit) ====
async function handleCheckpointStart(req, res, telegramId) {
  const { topic } = req.body || {};
  if (!topic) return res.status(400).json({ error: 'Не указана тема дилемм' });

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('flagged, reward_locked_permanent')
    .eq('telegram_id', telegramId)
    .single();

  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  if (user.flagged || user.reward_locked_permanent) {
    return res.status(403).json({ error: 'Начисления для этого аккаунта временно недоступны' });
  }

  const { data: progress } = await supabaseAdmin
    .from('dilemma_progress')
    .select('*')
    .eq('telegram_id', telegramId)
    .eq('topic', topic)
    .maybeSingle();

  if (!progress || progress.pending_checkpoints <= 0) {
    return res.status(400).json({ error: 'Нет доступных чекпоинтов' });
  }

  const { data: activeSession } = await supabaseAdmin
    .from('sessions')
    .select('id, expires_at')
    .eq('telegram_id', telegramId)
    .eq('status', 'active')
    .maybeSingle();

  if (activeSession && new Date(activeSession.expires_at) > new Date()) {
    return res.status(409).json({ error: 'Уже есть незавершённая сессия' });
  }

  const { data: claimedCheckpoint } = await supabaseAdmin
    .from('dilemma_progress')
    .update({ pending_checkpoints: progress.pending_checkpoints - 1 })
    .eq('telegram_id', telegramId)
    .eq('topic', topic)
    .eq('pending_checkpoints', progress.pending_checkpoints)
    .select()
    .maybeSingle();

  if (!claimedCheckpoint) return res.status(409).json({ error: 'Попробуй ещё раз' });

  const now = new Date();
  const expiresAt = new Date(now.getTime() + GAME_SESSION_TTL_SECONDS * 1000);
  const { data: session, error } = await supabaseAdmin
    .from('sessions')
    .insert({
      telegram_id: telegramId, mode: 'manual', duration_seconds: GAME_MIN_WATCH_SECONDS,
      reward: 0, started_at: now.toISOString(), expires_at: expiresAt.toISOString(),
      status: 'active', session_type: 'dilemma_checkpoint', dilemma_topic: topic,
    })
    .select()
    .single();

  if (error || !session) {
    // вернуть чекпоинт, раз сессию создать не удалось
    await atomicIncrement(supabaseAdmin, 'dilemma_progress', { telegram_id: telegramId, topic }, 'pending_checkpoints', 1);
    return res.status(500).json({ error: 'Не удалось начать' });
  }

  return res.status(200).json({ sessionId: session.id });
}

// ==== action: checkpoint_complete ====
async function handleCheckpointComplete(req, res, telegramId) {
  const { sessionId } = req.body || {};

  const { data: session } = await supabaseAdmin
    .from('sessions')
    .update({ status: 'processing' })
    .eq('id', sessionId)
    .eq('telegram_id', telegramId)
    .eq('status', 'active')
    .eq('session_type', 'dilemma_checkpoint')
    .select()
    .maybeSingle();

  if (!session) return res.status(409).json({ error: 'Сессия не найдена или уже обработана' });

  const elapsedSec = (Date.now() - new Date(session.started_at).getTime()) / 1000;
  if (elapsedSec < GAME_MIN_WATCH_SECONDS) {
    await supabaseAdmin.from('sessions').update({ status: 'active' }).eq('id', sessionId);
    return res.status(400).json({ error: 'Слишком рано' });
  }

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('game_tokens, topic_keys')
    .eq('telegram_id', telegramId)
    .single();

  const reward = CHECKPOINT_TOKEN_REWARD;

  let committed = null;
  let base = user.game_tokens || 0;
  for (let attempt = 0; attempt < 5 && !committed; attempt++) {
    const attemptTokens = base + reward;
    const { data: result } = await supabaseAdmin
      .from('users')
      .update({ game_tokens: attemptTokens, topic_keys: (user.topic_keys || 0) + 1 })
      .eq('telegram_id', telegramId)
      .eq('game_tokens', base)
      .select()
      .maybeSingle();
    if (result) {
      committed = result;
    } else {
      const { data: freshUser } = await supabaseAdmin.from('users').select('game_tokens').eq('telegram_id', telegramId).maybeSingle();
      if (!freshUser) break;
      base = freshUser.game_tokens;
    }
  }

  if (!committed) {
    await supabaseAdmin.from('sessions').update({ status: 'active' }).eq('id', sessionId);
    await atomicIncrement(supabaseAdmin, 'dilemma_progress', { telegram_id: telegramId, topic: session.dilemma_topic }, 'pending_checkpoints', 1);
    return res.status(409).json({ error: 'Не удалось начислить награду, попробуй ещё раз' });
  }

  await supabaseAdmin.from('sessions').update({ status: 'completed', completed_at: new Date().toISOString(), reward }).eq('id', sessionId);
  await logTransaction(supabaseAdmin, telegramId, 'checkpoint_reward', reward, committed.game_tokens, session.dilemma_topic);

  return res.status(200).json({ ok: true, reward, gameTokens: committed.game_tokens, topicKeys: committed.topic_keys });
}

// ==== action: direct_ad_start (после покупки direct_ad_unlock в магазине) ====
// Тот же дневной счётчик, что у мини-игр — это ярлык в тот же пул
// наград, а не новый источник токенов.
async function handleDirectAdStart(req, res, telegramId) {
  const { timezone } = req.body || {};
  const { data: rawUser } = await supabaseAdmin
    .from('users')
    .select('game_ads_watched_today, manual_limit, manual_limit_max, ads_watched_today, last_reset, last_reset_at, timezone, flagged, reward_locked_permanent, direct_ad_unlocked')
    .eq('telegram_id', telegramId)
    .single();

  if (!rawUser) return res.status(404).json({ error: 'Пользователь не найден' });
  if (!rawUser.direct_ad_unlocked) return res.status(403).json({ error: 'Функция не куплена в магазине' });
  if (rawUser.flagged || rawUser.reward_locked_permanent) {
    return res.status(403).json({ error: 'Начисления для этого аккаунта временно недоступны' });
  }

  const { user } = await ensureDailyReset(supabaseAdmin, rawUser, telegramId, timezone);
  if ((user.game_ads_watched_today || 0) >= GAME_DAILY_LIMIT) {
    return res.status(429).json({ error: 'Дневной лимит наград исчерпан, возвращайся завтра', daily_limit_reached: true });
  }

  const { data: activeSession } = await supabaseAdmin
    .from('sessions')
    .select('id, expires_at')
    .eq('telegram_id', telegramId)
    .eq('status', 'active')
    .maybeSingle();

  if (activeSession && new Date(activeSession.expires_at) > new Date()) {
    return res.status(409).json({ error: 'Уже есть незавершённая сессия' });
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + GAME_SESSION_TTL_SECONDS * 1000);
  const { data: session, error } = await supabaseAdmin
    .from('sessions')
    .insert({
      telegram_id: telegramId, mode: 'manual', duration_seconds: GAME_MIN_WATCH_SECONDS,
      reward: 0, started_at: now.toISOString(), expires_at: expiresAt.toISOString(),
      status: 'active', session_type: 'direct_ad',
    })
    .select()
    .single();

  if (error || !session) return res.status(500).json({ error: 'Не удалось начать' });
  return res.status(200).json({ sessionId: session.id });
}

// ==== action: direct_ad_complete ====
async function handleDirectAdComplete(req, res, telegramId) {
  const { sessionId } = req.body || {};

  const { data: session } = await supabaseAdmin
    .from('sessions')
    .update({ status: 'processing' })
    .eq('id', sessionId)
    .eq('telegram_id', telegramId)
    .eq('status', 'active')
    .eq('session_type', 'direct_ad')
    .select()
    .maybeSingle();

  if (!session) return res.status(409).json({ error: 'Сессия не найдена или уже обработана' });

  const elapsedSec = (Date.now() - new Date(session.started_at).getTime()) / 1000;
  if (elapsedSec < GAME_MIN_WATCH_SECONDS) {
    await supabaseAdmin.from('sessions').update({ status: 'active' }).eq('id', sessionId);
    return res.status(400).json({ error: 'Слишком рано' });
  }

  const reward = BASE_GAME_REWARD; // без бонуса по очкам — раунд не игрался

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('game_tokens, game_ads_watched_today')
    .eq('telegram_id', telegramId)
    .single();

  let committed = null;
  let base = user.game_tokens || 0;
  for (let attempt = 0; attempt < 5 && !committed; attempt++) {
    const attemptTokens = base + reward;
    const { data: result } = await supabaseAdmin
      .from('users')
      .update({ game_tokens: attemptTokens, game_ads_watched_today: (user.game_ads_watched_today || 0) + 1 })
      .eq('telegram_id', telegramId)
      .eq('game_tokens', base)
      .select()
      .maybeSingle();
    if (result) {
      committed = result;
    } else {
      const { data: freshUser } = await supabaseAdmin.from('users').select('game_tokens').eq('telegram_id', telegramId).maybeSingle();
      if (!freshUser) break;
      base = freshUser.game_tokens;
    }
  }

  if (!committed) {
    await supabaseAdmin.from('sessions').update({ status: 'active' }).eq('id', sessionId);
    return res.status(409).json({ error: 'Не удалось начислить награду, попробуй ещё раз' });
  }

  await supabaseAdmin.from('sessions').update({ status: 'completed', completed_at: new Date().toISOString(), reward }).eq('id', sessionId);
  await logTransaction(supabaseAdmin, telegramId, 'direct_ad_reward', reward, committed.game_tokens);

  return res.status(200).json({ ok: true, reward, gameTokens: committed.game_tokens });
}

async function handleGameStart(req, res, telegramId) {
  const { game, timezone } = req.body || {};
  if (!ALLOWED_GAMES.includes(game)) {
    return res.status(400).json({ error: 'Неизвестная игра' });
  }

  const { data: rawUser } = await supabaseAdmin
    .from('users')
    .select('game_ads_watched_today, manual_limit, manual_limit_max, ads_watched_today, last_reset, last_reset_at, timezone, flagged, reward_locked_permanent')
    .eq('telegram_id', telegramId)
    .single();

  if (!rawUser) return res.status(404).json({ error: 'Пользователь не найден' });
  if (rawUser.flagged || rawUser.reward_locked_permanent) {
    return res.status(403).json({ error: 'Начисления для этого аккаунта временно недоступны' });
  }

  const { user } = await ensureDailyReset(supabaseAdmin, rawUser, telegramId, timezone);

  if ((user.game_ads_watched_today || 0) >= GAME_DAILY_LIMIT) {
    return res.status(429).json({ error: 'Дневной лимит наград за игры исчерпан, возвращайся завтра', daily_limit_reached: true });
  }

  const { data: activeSession } = await supabaseAdmin
    .from('sessions')
    .select('id, expires_at')
    .eq('telegram_id', telegramId)
    .eq('status', 'active')
    .maybeSingle();

  if (activeSession && new Date(activeSession.expires_at) > new Date()) {
    return res.status(409).json({ error: 'Уже есть незавершённая сессия' });
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + GAME_SESSION_TTL_SECONDS * 1000);

  const { data: session, error } = await supabaseAdmin
    .from('sessions')
    .insert({
      telegram_id: telegramId,
      mode: 'manual',
      duration_seconds: GAME_MIN_WATCH_SECONDS,
      reward: 0,
      started_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      status: 'active',
      session_type: `game_${game}`,
    })
    .select()
    .single();

  if (error || !session) return res.status(500).json({ error: 'Не удалось начать раунд' });

  return res.status(200).json({ sessionId: session.id });
}

// ==== action: game_complete ====
async function handleGameComplete(req, res, telegramId) {
  const { sessionId, score } = req.body || {};
  const safeScore = Math.max(0, Math.min(100000, Number(score) || 0));

  const { data: session } = await supabaseAdmin
    .from('sessions')
    .update({ status: 'processing' })
    .eq('id', sessionId)
    .eq('telegram_id', telegramId)
    .eq('status', 'active')
    .select()
    .maybeSingle();

  if (!session || !session.session_type || !session.session_type.startsWith('game_')) {
    return res.status(409).json({ error: 'Сессия не найдена или уже обработана' });
  }

  const elapsedSec = (Date.now() - new Date(session.started_at).getTime()) / 1000;
  if (elapsedSec < GAME_MIN_WATCH_SECONDS) {
    await supabaseAdmin.from('sessions').update({ status: 'active' }).eq('id', sessionId);
    return res.status(400).json({ error: 'Слишком рано' });
  }

  const reward = BASE_GAME_REWARD + computeGameBonus(safeScore);

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('game_tokens, game_ads_watched_today')
    .eq('telegram_id', telegramId)
    .single();

  // CAS с повтором на game_tokens — тот же принцип, что и на balance у
  // ролика/промокода: game_tokens параллельно может трогать магазин
  // (списание при покупке), поэтому нельзя писать вслепую.
  let committed = null;
  let base = user.game_tokens || 0;
  for (let attempt = 0; attempt < 5 && !committed; attempt++) {
    const attemptTokens = base + reward;
    const { data: result } = await supabaseAdmin
      .from('users')
      .update({ game_tokens: attemptTokens, game_ads_watched_today: (user.game_ads_watched_today || 0) + 1 })
      .eq('telegram_id', telegramId)
      .eq('game_tokens', base)
      .select()
      .maybeSingle();
    if (result) {
      committed = result;
    } else {
      const { data: freshUser } = await supabaseAdmin.from('users').select('game_tokens').eq('telegram_id', telegramId).maybeSingle();
      if (!freshUser) break;
      base = freshUser.game_tokens;
    }
  }

  if (!committed) {
    await supabaseAdmin.from('sessions').update({ status: 'active' }).eq('id', sessionId);
    return res.status(409).json({ error: 'Не удалось начислить награду, попробуй ещё раз' });
  }

  await supabaseAdmin.from('sessions').update({ status: 'completed', completed_at: new Date().toISOString(), reward, score: safeScore }).eq('id', sessionId);
  await logTransaction(supabaseAdmin, telegramId, 'game_reward', reward, committed.game_tokens, session.session_type);

  return res.status(200).json({ ok: true, reward, gameTokens: committed.game_tokens });
}

// ==== Игровой стрик: ежедневный вход с выбором реклама/скип ====

function streakLadderPosition(streakCount) {
  // streakCount уже ПОСЛЕ инкремента на этот чек-ин (1-based)
  return ((streakCount - 1) % 7);
}

const REFERRAL_ACTIVE_DAYS_THRESHOLD = 3;

// Реферал засчитывается рефереру (ref_count += 1, один раз) как только
// приглашённый друг наберёт REFERRAL_ACTIVE_DAYS_THRESHOLD дней в новом
// игровом стрике — вместо старого триггера на оплаченный вывод (вывод
// сейчас закрыт). Переиспользуем поле referral_credited: смысл тот же
// ("этот реферал уже засчитан"), просто другой триггер события.
async function creditReferralIfEligible(telegramId, newStreakCount, referredBy, alreadyCredited) {
  if (alreadyCredited || !referredBy) return;
  if (newStreakCount < REFERRAL_ACTIVE_DAYS_THRESHOLD) return;

  const { data: marked } = await supabaseAdmin
    .from('users')
    .update({ referral_credited: true })
    .eq('telegram_id', telegramId)
    .eq('referral_credited', false)
    .select()
    .maybeSingle();

  if (!marked) return; // гонка или уже засчитан кем-то параллельным запросом

  await atomicIncrement(supabaseAdmin, 'users', { telegram_id: referredBy }, 'ref_count', 1);
}

async function fetchStreakUser(telegramId) {
  return supabaseAdmin
    .from('users')
    .select('game_streak_count, game_streak_last_active_date, game_streak_last_weekly_wheel_date, secret_keys, game_tokens, timezone, flagged, reward_locked_permanent, referred_by, referral_credited')
    .eq('telegram_id', telegramId)
    .single();
}

// ==== action: streak_skip (без рекламы, половина награды, мгновенно) ====
async function handleStreakSkip(req, res, telegramId) {
  const { timezone } = req.body || {};
  const { data: user } = await fetchStreakUser(telegramId);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  if (user.flagged || user.reward_locked_permanent) {
    return res.status(403).json({ error: 'Начисления для этого аккаунта временно недоступны' });
  }

  const today = getLocalDateString(timezone || user.timezone);
  if (user.game_streak_last_active_date === today) {
    return res.status(429).json({ error: 'Уже отмечался сегодня' });
  }

  const newStreakCount = (user.game_streak_count || 0) + 1;
  const pos = streakLadderPosition(newStreakCount);
  const reward = DAILY_GAME_LADDER_SKIP[pos];
  const newTokens = (user.game_tokens || 0) + reward;

  const { data: updated } = await supabaseAdmin
    .from('users')
    .update({
      game_streak_count: newStreakCount,
      game_streak_last_active_date: today,
      game_tokens: newTokens,
    })
    .eq('telegram_id', telegramId)
    .eq('game_tokens', user.game_tokens)
    .select()
    .maybeSingle();

  if (!updated) return res.status(409).json({ error: 'Повтори ещё раз' });

  await logTransaction(supabaseAdmin, telegramId, 'streak_skip', reward, updated.game_tokens);
  await creditReferralIfEligible(telegramId, newStreakCount, user.referred_by, user.referral_credited);

  return res.status(200).json({ ok: true, reward, gameTokens: updated.game_tokens, streakCount: newStreakCount, dayPosition: pos + 1 });
}

// ==== action: streak_ad_start ====
async function handleStreakAdStart(req, res, telegramId) {
  const { timezone } = req.body || {};
  const { data: user } = await fetchStreakUser(telegramId);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  if (user.flagged || user.reward_locked_permanent) {
    return res.status(403).json({ error: 'Начисления для этого аккаунта временно недоступны' });
  }

  const today = getLocalDateString(timezone || user.timezone);
  if (user.game_streak_last_active_date === today) {
    return res.status(429).json({ error: 'Уже отмечался сегодня' });
  }

  const { data: activeSession } = await supabaseAdmin
    .from('sessions')
    .select('id, expires_at')
    .eq('telegram_id', telegramId)
    .eq('status', 'active')
    .maybeSingle();

  if (activeSession && new Date(activeSession.expires_at) > new Date()) {
    return res.status(409).json({ error: 'Уже есть незавершённая сессия' });
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + GAME_SESSION_TTL_SECONDS * 1000);
  const { data: session, error } = await supabaseAdmin
    .from('sessions')
    .insert({
      telegram_id: telegramId, mode: 'manual', duration_seconds: GAME_MIN_WATCH_SECONDS,
      reward: 0, started_at: now.toISOString(), expires_at: expiresAt.toISOString(),
      status: 'active', session_type: 'streak_checkin',
    })
    .select()
    .single();

  if (error || !session) return res.status(500).json({ error: 'Не удалось начать' });

  return res.status(200).json({ sessionId: session.id });
}

// ==== action: streak_ad_complete ====
async function handleStreakAdComplete(req, res, telegramId) {
  const { sessionId, timezone } = req.body || {};

  const { data: session } = await supabaseAdmin
    .from('sessions')
    .update({ status: 'processing' })
    .eq('id', sessionId)
    .eq('telegram_id', telegramId)
    .eq('status', 'active')
    .eq('session_type', 'streak_checkin')
    .select()
    .maybeSingle();

  if (!session) return res.status(409).json({ error: 'Сессия не найдена или уже обработана' });

  const elapsedSec = (Date.now() - new Date(session.started_at).getTime()) / 1000;
  if (elapsedSec < GAME_MIN_WATCH_SECONDS) {
    await supabaseAdmin.from('sessions').update({ status: 'active' }).eq('id', sessionId);
    return res.status(400).json({ error: 'Слишком рано' });
  }

  const { data: user } = await fetchStreakUser(telegramId);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  const today = getLocalDateString(timezone || user.timezone);
  if (user.game_streak_last_active_date === today) {
    return res.status(429).json({ error: 'Уже отмечался сегодня' });
  }

  const newStreakCount = (user.game_streak_count || 0) + 1;
  const pos = streakLadderPosition(newStreakCount);
  const reward = DAILY_GAME_LADDER_FULL[pos];
  const isBigDay = (pos + 1) === DAY7_POSITION;
  const newTokens = (user.game_tokens || 0) + reward;
  const newSecretKeys = (user.secret_keys || 0) + (isBigDay ? 1 : 0);

  const { data: updated } = await supabaseAdmin
    .from('users')
    .update({
      game_streak_count: newStreakCount,
      game_streak_last_active_date: today,
      game_tokens: newTokens,
      secret_keys: newSecretKeys,
    })
    .eq('telegram_id', telegramId)
    .eq('game_tokens', user.game_tokens)
    .select()
    .maybeSingle();

  if (!updated) {
    await supabaseAdmin.from('sessions').update({ status: 'active' }).eq('id', sessionId);
    return res.status(409).json({ error: 'Не удалось начислить награду, попробуй ещё раз' });
  }

  await supabaseAdmin.from('sessions').update({ status: 'completed', completed_at: new Date().toISOString(), reward }).eq('id', sessionId);
  await logTransaction(supabaseAdmin, telegramId, 'streak_ad', reward, updated.game_tokens);
  await creditReferralIfEligible(telegramId, newStreakCount, user.referred_by, user.referral_credited);

  return res.status(200).json({
    ok: true, reward, gameTokens: updated.game_tokens, streakCount: newStreakCount,
    dayPosition: pos + 1, gotSecretKey: isBigDay, secretKeys: updated.secret_keys,
  });
}

// ==== action: weekly_key_wheel (бесплатно, раз в 7 дней, без рекламы) ====
async function handleWeeklyKeyWheel(req, res, telegramId) {
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('secret_keys, game_streak_last_weekly_wheel_date, flagged, reward_locked_permanent')
    .eq('telegram_id', telegramId)
    .single();

  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  if (user.flagged || user.reward_locked_permanent) {
    return res.status(403).json({ error: 'Начисления для этого аккаунта временно недоступны' });
  }

  if (user.game_streak_last_weekly_wheel_date) {
    const daysSince = (Date.now() - new Date(user.game_streak_last_weekly_wheel_date).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 7) {
      return res.status(429).json({ error: 'Следующий бесплатный спин ещё не доступен', days_remaining: Math.ceil(7 - daysSince) });
    }
  }

  const keysWon = rollKeyWheel();
  const newKeys = (user.secret_keys || 0) + keysWon;

  const { data: updated } = await supabaseAdmin
    .from('users')
    .update({ secret_keys: newKeys, game_streak_last_weekly_wheel_date: new Date().toISOString() })
    .eq('telegram_id', telegramId)
    .eq('secret_keys', user.secret_keys)
    .select()
    .maybeSingle();

  if (!updated) return res.status(409).json({ error: 'Повтори ещё раз' });

  return res.status(200).json({ ok: true, keysWon, secretKeys: updated.secret_keys });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { initData, action } = req.body || {};
  const auth = verifyTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN);
  if (!auth.ok) return res.status(401).json({ error: auth.error });

  const telegramId = auth.telegramId;

  switch (action) {
    case 'start': return handleStart(req, res, telegramId);
    case 'complete': return handleComplete(req, res, telegramId);
    case 'cancel': return handleCancel(req, res, telegramId);
    case 'banner_start': return handleBannerStart(req, res, telegramId);
    case 'banner_complete': return handleBannerComplete(req, res, telegramId);
    case 'game_start': return handleGameStart(req, res, telegramId);
    case 'game_complete': return handleGameComplete(req, res, telegramId);
    case 'checkpoint_start': return handleCheckpointStart(req, res, telegramId);
    case 'checkpoint_complete': return handleCheckpointComplete(req, res, telegramId);
    case 'direct_ad_start': return handleDirectAdStart(req, res, telegramId);
    case 'direct_ad_complete': return handleDirectAdComplete(req, res, telegramId);
    case 'streak_skip': return handleStreakSkip(req, res, telegramId);
    case 'streak_ad_start': return handleStreakAdStart(req, res, telegramId);
    case 'streak_ad_complete': return handleStreakAdComplete(req, res, telegramId);
    case 'weekly_key_wheel': return handleWeeklyKeyWheel(req, res, telegramId);
    default: return res.status(400).json({ error: 'Неизвестное действие' });
  }
};
