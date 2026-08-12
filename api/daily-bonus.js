// api/daily-bonus.js
//
// Новая фича удержания: юзер раз в день может забрать бонус.
// Если заходит день за днём подряд — стрик растёт и награда больше.
// Если пропустил день — стрик сгорает и начинается заново.

const { verifyTelegramInitData } = require('../lib/telegramAuth');
const { supabaseAdmin } = require('../lib/supabaseAdmin');

// Награда по дню стрика (1-й день, 2-й, ... 7-й и дальше по кругу)
const STREAK_REWARDS = [10, 15, 20, 25, 30, 40, 60];

function rewardForStreak(streakDay) {
  const index = Math.min(streakDay - 1, STREAK_REWARDS.length - 1);
  return STREAK_REWARDS[index];
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { initData } = req.body || {};
  const auth = verifyTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN);
  if (!auth.ok) return res.status(401).json({ error: auth.error });

  const telegramId = auth.telegramId;
  const today = new Date().toISOString().slice(0, 10);

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('telegram_id', telegramId)
    .single();

  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  if (user.last_bonus_date === today) {
    return res.status(409).json({ error: 'Бонус уже забран сегодня', streak: user.streak_count });
  }

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const newStreak = user.last_bonus_date === yesterday ? user.streak_count + 1 : 1;
  const reward = rewardForStreak(newStreak);
  const newBalance = user.balance + reward;

  await supabaseAdmin
    .from('users')
    .update({ balance: newBalance, streak_count: newStreak, last_bonus_date: today })
    .eq('telegram_id', telegramId);

  return res.status(200).json({ balance: newBalance, streak: newStreak, reward });
};
