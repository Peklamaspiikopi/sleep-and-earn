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
const { ensureDailyReset, postResetCooldownRemaining, MAX_MANUAL_PER_DAY } = require('../lib/userDaily');
const { atomicIncrement } = require('../lib/atomicIncrement');
const {
  dailyBonusForStreak, rollBigBox, minAdsRequired, tierIndexFor,
  TIERS, TIER_GROWTH_DAYS, BOX_UNLOCK_TIER_IDX,
  LIMIT_GROWTH_ACTIVE_DAYS, LIMIT_CAP, BIG_BOX_INTERVAL_ACTIVE_DAYS,
} = require('../lib/streakLogic');
const {
  REVENUE_PER_VIDEO_AD, BANNER_REWARD, BANNER_COOLDOWN_SECONDS,
  BANNER_MIN_WATCH_SECONDS, REVENUE_PER_BANNER_AD,
} = require('../lib/economyConfig');
const { logTransaction } = require('../lib/transactions');
const crypto = require('crypto');

const MIN_WATCH_SECONDS = 12;
const SESSION_TTL_SECONDS = 120;
const COOLDOWN_MIN_SECONDS = 75;
const COOLDOWN_MAX_SECONDS = 120;

// ==== action: start (ролик/чекпоинт дилеммы) ====
async function handleStart(req, res, telegramId) {
  const { sessionType, topic } = req.body || {};
  const type = sessionType === 'dilemma_checkpoint' ? 'dilemma_checkpoint' : 'video';

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

  if (type === 'dilemma_checkpoint') {
    const { data: claimedCheckpoint } = await supabaseAdmin
      .from('dilemma_progress')
      .update({ pending_checkpoints: dilemmaProgress.pending_checkpoints - 1 })
      .eq('telegram_id', telegramId)
      .eq('topic', topic)
      .eq('pending_checkpoints', dilemmaProgress.pending_checkpoints)
      .select()
      .maybeSingle();

    if (!claimedCheckpoint) {
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
}

// ==== action: complete (ролик/чекпоинт дилеммы) ====
async function handleComplete(req, res, telegramId) {
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

  const { error: updateErr } = await supabaseAdmin
    .from('users')
    .update(updates)
    .eq('telegram_id', telegramId);

  if (updateErr) {
    await supabaseAdmin.from('sessions').update({ status: 'active' }).eq('id', sessionId);
    return res.status(500).json({ error: 'Не удалось начислить награду' });
  }

  await supabaseAdmin
    .from('sessions')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', sessionId);

  const rewardType = session.session_type === 'dilemma_checkpoint' ? 'dilemma_checkpoint' : 'video_reward';
  await logTransaction(supabaseAdmin, telegramId, rewardType, session.reward, newBalance, session.session_type === 'dilemma_checkpoint' ? session.dilemma_topic : null);
  if (dayInfo.dailyBonus) {
    await logTransaction(supabaseAdmin, telegramId, dayInfo.isBox ? 'box' : 'daily_bonus', dayInfo.dailyBonus, newBalance, `Активный день ${dayInfo.streak}`);
  }
  if (dayInfo.bigBox) {
    await logTransaction(supabaseAdmin, telegramId, 'big_box', dayInfo.bigBox, newBalance, `Большая коробка`);
  }

  return res.status(200).json({ balance: newBalance, reward: session.reward, dilemmaTopic: session.dilemma_topic, ...dayInfo });
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

  if (session.session_type === 'dilemma_checkpoint') {
    await atomicIncrement(
      supabaseAdmin, 'dilemma_progress',
      { telegram_id: telegramId, topic: session.dilemma_topic },
      'pending_checkpoints', 1
    );
  }

  await atomicIncrement(supabaseAdmin, 'users', { telegram_id: telegramId }, 'manual_limit', 1);

  return res.status(200).json({ ok: true });
}

// ==== action: banner_start ====
async function handleBannerStart(req, res, telegramId) {
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
    .eq('balance', user.balance)
    .select()
    .maybeSingle();

  if (!updated) {
    return res.status(409).json({ error: 'Повтори ещё раз' });
  }

  await logTransaction(supabaseAdmin, telegramId, 'banner_reward', reward, updated.balance);

  return res.status(200).json({ ok: true, reward, balance: updated.balance });
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
    default: return res.status(400).json({ error: 'Неизвестное действие' });
  }
};
