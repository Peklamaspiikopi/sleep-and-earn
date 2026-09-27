// lib/ensureUser.js
//
// Обычно строка в `users` создаётся вызовом /api/get-user при
// открытии приложения. Но если тот запрос не прошёл (обрыв сети,
// холодный старт функции, временная недоступность Supabase) —
// строки в базе нет, а get-user молча проглатывает ошибку на клиенте
// (script.js: refreshUser() только логирует её в консоль). Игрок
// продолжает пользоваться дилеммами (они не завязаны на `users`), а
// потом упирается в "Пользователь не найден" на первом действии,
// которое туда обращается — необъяснимо для него и не восстановимо
// без перезахода.
//
// ensureUser — страховка на этот случай: отдаёт существующего
// пользователя или создаёт нового с теми же дефолтами, что и
// get-user.js (который тоже переведён на эту функцию, чтобы дефолты
// не могли разъехаться в двух местах).
//
// НЕ предназначена для замены get-user как основного пути создания
// (там есть тайм-зона и startParam от клиента) — это именно fallback
// для остальных обработчиков, которые лишь читают пользователя.

const { MAX_MANUAL_PER_DAY } = require('./userDaily');

async function ensureUser(supabaseAdmin, telegramId, timezone) {
  const tz = (typeof timezone === 'string' && timezone) ? timezone : 'UTC';

  // limit(1) до maybeSingle() — важно: maybeSingle() сам по себе
  // ошибается (а не просто возвращает null), если по telegram_id
  // находится больше одной строки. Если где-то в базе уже случайно
  // образовался дубль (гонка двух параллельных первых заходов до
  // того, как появился этот fallback, или ручная правка через SQL-
  // редактор), вся страховка ensureUser молча переставала работать
  // именно в момент, когда должна была спасти — отсюда "Пользователь
  // не найден" у тех, кто явно уже есть в базе. limit(1) заставляет
  // Postgres отдать только одну (первую подвернувшуюся) строку и не
  // даёт этому случиться.
  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('telegram_id', telegramId)
    .limit(1)
    .maybeSingle();

  if (existing) return existing;

  const today = new Date().toISOString().slice(0, 10);
  const { data: inserted, error: insertErr } = await supabaseAdmin
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
      referral_credited: false,
      timezone: tz,
      last_reset: today,
      flagged: false,
    }])
    .select()
    .single();

  if (!insertErr && inserted) return inserted;

  if (insertErr) console.error('ENSURE_USER INSERT ERROR:', JSON.stringify(insertErr));

  // Гонка: строку создал параллельный запрос между SELECT и INSERT —
  // просто читаем то, что уже встало (снова с limit(1) по той же
  // причине, что и выше).
  const { data: raceWinner } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('telegram_id', telegramId)
    .limit(1)
    .maybeSingle();

  return raceWinner || null;
}

module.exports = { ensureUser };
