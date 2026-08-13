// api/decline-missed-day.js
//
// Юзер отказывается выкупать пропущенные дни — стрик сбрасывается
// на 1, награда 9-11 откатывается на -1 (не ниже 8), 12 не трогаем.

const { verifyTelegramInitData } = require('../lib/telegramAuth');
const { supabaseAdmin } = require('../lib/supabaseAdmin');
const { applyRewardDecay } = require('../lib/streakLogic');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { initData } = req.body || {};
  const auth = verifyTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN);
  if (!auth.ok) return res.status(401).json({ error: auth.error });

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('telegram_id', auth.telegramId)
    .single();

  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  const today = new Date().toISOString().slice(0, 10);
  const newReward = applyRewardDecay(user);

  await supabaseAdmin
    .from('users')
    .update({
      pending_miss_days: 0,
      streak_count: 1,
      last_active_date: today,
      video_reward: newReward,
      active_days_since_level8: 0,
    })
    .eq('telegram_id', auth.telegramId);

  return res.status(200).json({ streak: 1, video_reward: newReward });
};
