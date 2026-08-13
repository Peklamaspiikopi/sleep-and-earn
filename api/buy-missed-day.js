// api/buy-missed-day.js
//
// Выкупает ОДИН пропущенный день за 150 монет (вызывается повторно,
// если пропущено несколько дней). Когда все пропуски закрыты —
// стрик продолжается как ни в чём не бывало.

const { verifyTelegramInitData } = require('../lib/telegramAuth');
const { supabaseAdmin } = require('../lib/supabaseAdmin');
const { BUY_MISSED_DAY_COST, applyRewardMilestones } = require('../lib/streakLogic');

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

  if (!user.pending_miss_days || user.pending_miss_days <= 0) {
    return res.status(400).json({ error: 'Нет пропущенных дней для выкупа' });
  }
  if (user.balance < BUY_MISSED_DAY_COST) {
    return res.status(400).json({ error: 'Недостаточно монет' });
  }

  const newBalance = user.balance - BUY_MISSED_DAY_COST;
  const newPending = user.pending_miss_days - 1;
  const today = new Date().toISOString().slice(0, 10);

  const updates = { balance: newBalance, pending_miss_days: newPending };

  if (newPending === 0) {
    const newStreak = (user.streak_count || 0) + 1;
    updates.streak_count = newStreak;
    updates.last_active_date = today;
    updates.video_reward = applyRewardMilestones(user.video_reward, newStreak);
  }

  await supabaseAdmin.from('users').update(updates).eq('telegram_id', auth.telegramId);

  return res.status(200).json({
    balance: newBalance,
    pendingMissDays: newPending,
    resolved: newPending === 0,
  });
};
