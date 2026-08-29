// lib/userDaily.js
//
// Общий сброс дневных счётчиков (лимит роликов и счётчик "роликов
// сегодня"). "Новый день" считается по часовому поясу самого
// пользователя, чтобы сброс происходил у него ночью, а не в случайное
// время суток.
//
// ВАЖНО: timezone приходит от клиента (Intl.DateTimeFormat в браузере)
// и НИКАК не подписан/не проверен — его тривиально подделать (сменить
// пояс в настройках телефона за 2 клика, без рута и консоли). Если бы
// "новый день" определялся ТОЛЬКО по этой дате, пользователь мог бы
// щёлкать между часовыми поясами и получать сброс лимита (и продвижение
// стрика/уровня/лимита/больших коробок — всё это тоже завязано на
// "today" из ensureDailyReset) много раз за реальные сутки.
//
// Поэтому дата от клиента используется только чтобы ВЫБРАТЬ удобный
// момент сброса (ближе к местной полуночи), а не чтобы РАЗРЕШИТЬ сам
// факт сброса — это разрешает независимая проверка по last_reset_at
// (серверная метка времени, клиент её не контролирует): сброс не
// произойдёт чаще, чем раз в MIN_HOURS_BETWEEN_RESETS реальных часов,
// какую бы дату ни прислал клиент.

const MAX_MANUAL_PER_DAY = 20;

// Через сколько минут после сброса разрешаем первый ролик нового дня
// (случайный разброс — чтобы не выглядело как бот, который стартует
// ровно в момент обновления лимита)
const POST_RESET_COOLDOWN_MIN_MINUTES = 5;
const POST_RESET_COOLDOWN_MAX_MINUTES = 25;

// Минимум реальных часов между двумя сбросами — не зависит от того,
// что присылает клиент в timezone. 20, а не 24: оставляет небольшой
// запас для честных пользователей, у которых локальная полночь
// наступает чуть раньше по календарю сервера, но не даёт получить
// больше одного "лишнего" сброса в день даже при постоянной подмене
// часового пояса.
const MIN_HOURS_BETWEEN_RESETS = 20;

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
  const claimedToday = getLocalDateString(timezone || user.timezone);
  if (user.last_reset === claimedToday) return { user, today: claimedToday };

  if (user.last_reset_at) {
    const hoursSinceLastReset = (Date.now() - new Date(user.last_reset_at).getTime()) / 3600000;
    if (hoursSinceLastReset < MIN_HOURS_BETWEEN_RESETS) {
      // Клиент утверждает, что уже наступил новый день, но по серверным
      // часам с прошлого сброса прошло подозрительно мало времени —
      // не сбрасываем лимит и возвращаем СТАБИЛЬНУЮ дату (последний
      // настоящий сброс), а не то, что прислал клиент. Это важно: если
      // здесь вернуть claimedToday, вызывающий код (session-complete.js)
      // может засчитать лишний "активный день" по поддельной дате, даже
      // не тронув сам лимит.
      return { user, today: user.last_reset };
    }
  }

  const { data: resetUser } = await supabaseAdmin
    .from('users')
    .update({
      manual_limit: user.manual_limit_max || MAX_MANUAL_PER_DAY,
      ads_watched_today: 0,
      banners_watched_today: 0,
      game_ads_watched_today: 0,
      last_reset: claimedToday,
      last_reset_at: new Date().toISOString(),
    })
    .eq('telegram_id', telegramId)
    .select()
    .single();

  return { user: resetUser || user, today: claimedToday };
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
