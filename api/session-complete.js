// api/session-complete.js
//
// Начисляет награду за ролик и, если это 5-й ролик за день —
// запускает всю логику "активного дня": бонус +10, продвижение
// стрика, рост уровня награды, сундук раз в неделю, обработку
// пропущенных дней через токены-страховки.

const { verifyTelegramInitData } = require('../lib/telegramAuth');
const { supabaseAdmin } = require('../lib/supabaseAdmin');
const { ensureDailyReset } = require('../lib/userDaily');
const {
  daysBetween, rollBox, applyRewardMilestones,
  DAILY_ACTIVE_BONUS, POST8_GROWTH_ACTIVE_DAYS, REWARD_CAP,
} = require('../lib/streakLogic');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { initData, sessionId } = req.body || {};
  const auth = verifyTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN);
  if (!auth.ok) return res.status(401).json({ error: auth.error });

  const telegramId = auth.telegramId;

  const { data: session } = await supabaseAdmin
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('telegram_id', telegramId)
    .single();

  if (!session) return res.status(404).json({ error: 'Сессия не найдена' });
  if (session.status !== 'active') return res.status(409).json({ error: 'Сессия уже закрыта' });

  const now = Date.now();
  const startedAt = new Date(session.started_at).getTime();
  const expiresAt = new Date(session.expires_at).getTime();

  if (now - startedAt < session.duration_seconds * 1000) {
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

  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  const today = new Date().toISOString().slice(0, 10);
  user = await ensureDailyReset(supabaseAdmin, user, telegramId, today);

  let newBalance = user.balance + session.reward;
  const newAdsToday = (user.ads_watched_today || 0) + 1;

  const updates = { balance: newBalance, ads_watched_today: newAdsToday };
  const dayInfo = { dayCompleted: false };

  // Пятый ролик за день — засчитываем активный день (если ещё не засчитан сегодня)
  if (newAdsToday === 5 && user.last_active_date !== today && !(user.pending_miss_days > 0)) {
    newBalance += DAILY_ACTIVE_BONUS;
    updates.balance = newBalance;
    dayInfo.dayCompleted = true;
    dayInfo.dailyBonus = DAILY_ACTIVE_BONUS;

    const gap = user.last_active_date ? daysBetween(user.last_active_date, today) - 1 : 0;

    if (gap <= 0) {
      const newStreak = (user.streak_count || 0) + 1;
      updates.streak_count = newStreak;
      updates.last_active_date = today;
      updates.video_reward = applyRewardMilestones(user.video_reward, newStreak);
      dayInfo.streak = newStreak;

      if (updates.video_reward >= 8 && !user.reward_locked_permanent) {
        const newActiveDays = (user.active_days_since_level8 || 0) + 1;
        updates.active_days_since_level8 = newActiveDays;
        if (newActiveDays >= POST8_GROWTH_ACTIVE_DAYS && updates.video_reward < REWARD_CAP) {
          updates.video_reward = updates.video_reward + 1;
          updates.active_days_since_level8 = 0;
          if (updates.video_reward >= REWARD_CAP) updates.reward_locked_permanent = true;
        }
      }

      if (newStreak % 7 === 0) {
        const boxReward = rollBox();
        updates.balance += boxReward;
        newBalance += boxReward;
        dayInfo.box = boxReward;
      }
    } else {
      const tokensAvailable = user.streak_freeze_tokens || 0;
      const tokensUsed = Math.min(gap, tokensAvailable);
      updates.streak_freeze_tokens = tokensAvailable - tokensUsed;
      const remainingGap = gap - tokensUsed;

      if (remainingGap === 0) {
        const newStreak = (user.streak_count || 0) + 1;
        updates.streak_count = newStreak;
        updates.last_active_date = today;
        updates.video_reward = applyRewardMilestones(user.video_reward, newStreak);
        dayInfo.streak = newStreak;
        dayInfo.tokensUsed = tokensUsed;
      } else {
        updates.pending_miss_days = remainingGap;
        dayInfo.pendingMissDays = remainingGap;
        dayInfo.tokensUsed = tokensUsed;
      }
    }
  }

  const { error: updateErr } = await supabaseAdmin
    .from('users')
    .update(updates)
    .eq('telegram_id', telegramId);

  if (updateErr) return res.status(500).json({ error: 'Не удалось начислить награду' });

  await supabaseAdmin
    .from('sessions')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', sessionId);

  return res.status(200).json({ balance: newBalance, reward: session.reward, ...dayInfo });
};
