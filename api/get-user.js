// api/get-user.js
//
// Клиент вообще не подключается к Supabase — все данные идут только
// через эти серверные функции. Здесь же создаётся новый пользователь
// при первом заходе, и выполняется дневной сброс счётчиков.

const { verifyTelegramInitData } = require('../lib/telegramAuth');
const { supabaseAdmin } = require('../lib/supabaseAdmin');
const { ensureDailyReset, MAX_MANUAL_PER_DAY } = require('../lib/userDaily');
const { daysToNextReward, daysToNextLimit } = require('../lib/streakLogic');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { initData } = req.body || {};
  const auth = verifyTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN);
  if (!auth.ok) return res.status(401).json({ error: auth.error });

  const telegramId = auth.telegramId;
  const today = new Date().toISOString().slice(0, 10);

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
  }

  user = await ensureDailyReset(supabaseAdmin, user, telegramId, today);

  return res.status(200).json({
    balance: user.balance,
    manual_limit: user.manual_limit,
    max_manual_limit: user.manual_limit_max || MAX_MANUAL_PER_DAY,
    video_reward: user.video_reward || 5,
    ads_watched_today: user.ads_watched_today || 0,
    streak_count: user.streak_count || 0,
    streak_freeze_tokens: user.streak_freeze_tokens || 0,
    pending_miss_days: user.pending_miss_days || 0,
    days_to_next_reward: daysToNextReward(user),
    days_to_next_limit: daysToNextLimit(user),
    ref_count: user.ref_count,
    ref_earn: user.ref_earn,
  });
};
