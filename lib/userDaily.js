// lib/userDaily.js
//
// Общий сброс дневных счётчиков (лимит роликов и счётчик "роликов
// сегодня") — используется во всех эндпоинтах, чтобы не дублировать.

const MAX_MANUAL_PER_DAY = 20;

async function ensureDailyReset(supabaseAdmin, user, telegramId, today) {
  if (user.last_reset === today) return user;

  const { data: resetUser } = await supabaseAdmin
    .from('users')
    .update({
      manual_limit: user.manual_limit_max || MAX_MANUAL_PER_DAY,
      ads_watched_today: 0,
      last_reset: today,
    })
    .eq('telegram_id', telegramId)
    .select()
    .single();

  return resetUser || user;
}

module.exports = { ensureDailyReset, MAX_MANUAL_PER_DAY };
