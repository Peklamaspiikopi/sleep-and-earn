// lib/userDaily.js
//
// Общий сброс дневных счётчиков (лимит роликов и счётчик "роликов
// сегодня"). Раньше "новый день" считался по UTC серверу — теперь
// считается по часовому поясу самого пользователя, чтобы сброс
// происходил у него ночью, а не в случайное время суток.

const MAX_MANUAL_PER_DAY = 20;

// Через сколько минут после сброса разрешаем первый ролик нового дня
// (случайный разброс — чтобы не выглядело как бот, который стартует
// ровно в момент обновления лимита)
const POST_RESET_COOLDOWN_MIN_MINUTES = 5;
const POST_RESET_COOLDOWN_MAX_MINUTES = 25;

function getLocalDateString(timezone) {
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone || 'UTC',
      year: 'numeric', month: '2-digit', day: '2-digit',
    });
    return fmt.format(new Date()); // формат YYYY-MM-DD
  } catch (e) {
    return new Date().toISOString().slice(0, 10); // если таймзона некорректная — fallback на UTC
  }
}

async function ensureDailyReset(supabaseAdmin, user, telegramId, timezone) {
  const today = getLocalDateString(timezone || user.timezone);
  if (user.last_reset === today) return { user, today };

  const { data: resetUser } = await supabaseAdmin
    .from('users')
    .update({
      manual_limit: user.manual_limit_max || MAX_MANUAL_PER_DAY,
      ads_watched_today: 0,
      last_reset: today,
      last_reset_at: new Date().toISOString(),
    })
    .eq('telegram_id', telegramId)
    .select()
    .single();

  return { user: resetUser || user, today };
}

// Проверка "остыл" ли пользователь после сегодняшнего сброса лимита
function postResetCooldownRemaining(user) {
  if (!user.last_reset_at) return 0;
  const cooldownMinutes = POST_RESET_COOLDOWN_MIN_MINUTES +
    Math.random() * (POST_RESET_COOLDOWN_MAX_MINUTES - POST_RESET_COOLDOWN_MIN_MINUTES);
  const elapsedMs = Date.now() - new Date(user.last_reset_at).getTime();
  const remainingMs = cooldownMinutes * 60000 - elapsedMs;
  return remainingMs > 0 ? Math.ceil(remainingMs / 60000) : 0;
}

module.exports = { ensureDailyReset, getLocalDateString, postResetCooldownRemaining, MAX_MANUAL_PER_DAY };
