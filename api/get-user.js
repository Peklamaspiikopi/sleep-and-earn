// api/get-user.js
//
// Клиент вообще не подключается к Supabase — все данные идут только
// через эти серверные функции. Здесь же создаётся новый пользователь
// при первом заходе, и выполняется дневной сброс счётчиков по
// часовому поясу самого пользователя.

const { verifyTelegramInitData } = require('../lib/telegramAuth');
const { supabaseAdmin } = require('../lib/supabaseAdmin');
const { ensureDailyReset, getLocalDateString, MAX_MANUAL_PER_DAY } = require('../lib/userDaily');
const { daysToNextReward, daysToNextLimit, daysToNextBigBox, minWithdrawalFor, minAdsRequired } = require('../lib/streakLogic');
const { getTonUsdRate } = require('../lib/tonRate');
const { BANNER_COOLDOWN_SECONDS, MAX_AD_PAYOUT_RATIO_DISPLAY, BANNER_DAILY_LIMIT } = require('../lib/economyConfig');

// Внутренний курс монеты: 1 монета = $0.00001 (0.1 копейки — уменьшено
// в 10 раз против исходных $0.0001, чтобы баннер (Interstitial,
// вдвое дешевле по CPM, чем Rewarded-ролик) мог платить целое число
// монет, а не "0.5 монеты"). Это фиксированная продуктовая привязка,
// не рыночная — меняется только рыночный курс TON, к которому мы её
// пересчитываем для вывода.
const COIN_TO_USD = 0.00001;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { initData, startParam, timezone } = req.body || {};
  const auth = verifyTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN);
  if (!auth.ok) return res.status(401).json({ error: auth.error });

  const telegramId = auth.telegramId;
  const tz = (typeof timezone === 'string' && timezone) ? timezone : 'UTC';
  const today = getLocalDateString(tz);

  let referredBy = null;
  if (startParam && typeof startParam === 'string' && startParam.startsWith('ref_')) {
    const candidate = startParam.slice(4);
    if (candidate && candidate !== telegramId) referredBy = candidate;
  }

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
        referred_by: referredBy,
        referral_credited: false,
        timezone: tz,
        last_reset: today,
        loyalty_started_at: today,
        flagged: false,
      }])
      .select()
      .single();

    if (insertErr) {
      console.error('INSERT ERROR (get-user):', JSON.stringify(insertErr));
      const { data: existingUser, error: selectErr } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('telegram_id', telegramId)
        .maybeSingle();
      if (selectErr) console.error('RESELECT ERROR (get-user):', JSON.stringify(selectErr));
      user = existingUser;
    } else {
      user = newUser;
    }

    if (!user) {
      return res.status(500).json({ error: 'Не удалось создать или найти пользователя' });
    }
  } else if (user.timezone !== tz) {
    // Обновляем таймзону, если поменялась (юзер сменил регион/телефон)
    const { data: tzUser } = await supabaseAdmin
      .from('users')
      .update({ timezone: tz })
      .eq('telegram_id', telegramId)
      .select()
      .single();
    if (tzUser) user = tzUser;
  }

  const resetResult = await ensureDailyReset(supabaseAdmin, user, telegramId, tz);
  user = resetResult.user;

  const minWithdrawal = minWithdrawalFor(user);
  const tonUsdRate = await getTonUsdRate();
  const minWithdrawalTon = Number(((minWithdrawal * COIN_TO_USD) / tonUsdRate).toFixed(4));

  let bannerCooldownRemaining = 0;
  if (user.last_banner_watched_at) {
    const elapsed = (Date.now() - new Date(user.last_banner_watched_at).getTime()) / 1000;
    bannerCooldownRemaining = Math.max(0, Math.ceil(BANNER_COOLDOWN_SECONDS - elapsed));
  }

  // Личный счётчик "доход с рекламы X/50%" — сколько игрок реально
  // получает от сгенерированной им же рекламной выручки. Показ жёстко
  // ограничен потолком MAX_AD_PAYOUT_RATIO_DISPLAY на случай редкого
  // везения с коробками (см. lib/economyConfig.js).
  const lifetimeRevenue = user.lifetime_ad_revenue_usd || 0;
  const lifetimePayoutUsd = (user.lifetime_ad_payout_coins || 0) * COIN_TO_USD;
  const adPayoutRatio = lifetimeRevenue > 0
    ? Math.min(MAX_AD_PAYOUT_RATIO_DISPLAY, Number(((lifetimePayoutUsd / lifetimeRevenue) * 100).toFixed(1)))
    : 0;

  return res.status(200).json({
    balance: user.balance,
    manual_limit: user.manual_limit,
    max_manual_limit: user.manual_limit_max || MAX_MANUAL_PER_DAY,
    video_reward: user.video_reward || 10,
    ads_watched_today: user.ads_watched_today || 0,
    ads_required_today: minAdsRequired(user),
    streak_count: user.streak_count || 0,
    days_to_next_reward: daysToNextReward(user),
    days_to_next_limit: daysToNextLimit(user),
    days_to_next_big_box: daysToNextBigBox(user),
    min_withdrawal: minWithdrawal,
    min_withdrawal_ton: minWithdrawalTon,
    banner_cooldown_seconds: bannerCooldownRemaining,
    banners_watched_today: user.banners_watched_today || 0,
    banner_daily_limit: BANNER_DAILY_LIMIT,
    ad_payout_ratio: adPayoutRatio,
    max_ad_payout_ratio: MAX_AD_PAYOUT_RATIO_DISPLAY,
    ref_count: user.ref_count,
    ref_earn: user.ref_earn,
    age_confirmed: !!user.age_confirmed,
  });
};
