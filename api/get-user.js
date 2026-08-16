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
        video_reward: 1,
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

  return res.status(200).json({
    balance: user.balance,
    manual_limit: user.manual_limit,
    max_manual_limit: user.manual_limit_max || MAX_MANUAL_PER_DAY,
    video_reward: user.video_reward || 1,
    ads_watched_today: user.ads_watched_today || 0,
    ads_required_today: minAdsRequired(user),
    streak_count: user.streak_count || 0,
    days_to_next_reward: daysToNextReward(user),
    days_to_next_limit: daysToNextLimit(user),
    days_to_next_big_box: daysToNextBigBox(user),
    min_withdrawal: minWithdrawalFor(user),
    ref_count: user.ref_count,
    ref_earn: user.ref_earn,
    age_confirmed: !!user.age_confirmed,
  });
};
