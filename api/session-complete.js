// api/session-complete.js
//
// Начисляет награду за ролик и, если это N-й ролик за день (N = минимум
// для активного дня, растёт вместе с дневным лимитом) — запускает
// логику "активного дня": рост уровня награды, бонус по недельной
// лестнице (или сундук на 7-й день, если уже разблокирован), рост
// дневного лимита роликов, и большую коробку раз в 30 активных дней
// (с мгновенным первым открытием в момент разблокировки).
//
// Стрик НИКОГДА не сбрасывается и не откатывается: пропущенный день
// просто не засчитывается, при следующей активности стрик продолжает
// расти с того же значения.

const { verifyTelegramInitData } = require('../lib/telegramAuth');
const { supabaseAdmin } = require('../lib/supabaseAdmin');
const { ensureDailyReset } = require('../lib/userDaily');
const {
  dailyBonusForStreak, rollBigBox, minAdsRequired, tierIndexFor,
  TIERS, TIER_GROWTH_DAYS, BOX_UNLOCK_TIER_IDX,
  LIMIT_GROWTH_ACTIVE_DAYS, LIMIT_CAP, BIG_BOX_INTERVAL_ACTIVE_DAYS,
} = require('../lib/streakLogic');
const { REVENUE_PER_VIDEO_AD } = require('../lib/economyConfig');
const { logTransaction } = require('../lib/transactions');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { initData, sessionId } = req.body || {};
  const auth = verifyTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN);
  if (!auth.ok) return res.status(401).json({ error: auth.error });

  const telegramId = auth.telegramId;

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
  let payoutThisAd = session.reward; // накапливаем всё, что реально начислилось за этот показ

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

  // Требуемое кол-во роликов для зачёта активного дня — считаем ДО
  // возможного роста лимита сегодня же (используем лимит на начало дня).
  const requiredAds = minAdsRequired(user);

  if (newAdsToday === requiredAds && user.last_active_date !== today) {
    dayInfo.dayCompleted = true;

    const newStreak = (user.streak_count || 0) + 1;
    updates.streak_count = newStreak;
    updates.last_active_date = today;
    dayInfo.streak = newStreak;

    // ---- Рост уровня награды за ролик ----
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

    // ---- Недельная лестница / сундук (по текущему, уже обновлённому тиру) ----
    const bonus = dailyBonusForStreak(newStreak, currentReward);
    newBalance += bonus.reward;
    payoutThisAd += bonus.reward;
    updates.balance = newBalance;
    dayInfo.dailyBonus = bonus.reward;
    dayInfo.isBox = bonus.isBox;
    if (bonus.locked) dayInfo.boxLocked = true;

    // ---- Большая коробка (разблокирована с BOX_UNLOCK_TIER_IDX) ----
    if (tierIdx >= BOX_UNLOCK_TIER_IDX) {
      if (justUnlockedBoxTier) {
        // Первый вход в этот тир — коробка открывается сразу, отсчёт начинается заново
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

  // Личный счётчик "доход с рекламы X/50%" — накопленная выплата и
  // накопленная сгенерированная выручка растут вместе с каждым
  // показом, независимо от того, был ли это обычный день или день с
  // бонусом/коробкой.
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
};
