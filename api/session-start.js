// api/session-start.js
//
// Раньше здесь было несколько режимов, включая многочасовые "авто"
// сессии на ночь — их убрали полностью. Остался только один честный
// режим: юзер реально смотрит один рекламный ролик за раз.

const { verifyTelegramInitData } = require('../lib/telegramAuth');
const { supabaseAdmin } = require('../lib/supabaseAdmin');
const crypto = require('crypto');

const MANUAL_REWARD = 7;
const MIN_WATCH_SECONDS = 12;      // минимальное честное время просмотра ролика
const SESSION_TTL_SECONDS = 120;   // сколько времени есть, чтобы завершить сессию
const MAX_MANUAL_PER_DAY = 20;     // сколько роликов в день можно посмотреть

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
        streak_count: 0,
        last_reset: today,
        flagged: false,
      }])
      .select()
      .single();

    if (insertErr) {
      console.error('INSERT ERROR (session-start):', JSON.stringify(insertErr));
      const { data: existingUser, error: selectErr } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('telegram_id', telegramId)
        .maybeSingle();
      if (selectErr) console.error('RESELECT ERROR (session-start):', JSON.stringify(selectErr));
      user = existingUser;
    } else {
      user = newUser;
    }

    if (!user) return res.status(500).json({ error: 'Не удалось создать или найти пользователя' });
  }

  if (user.last_reset !== today) {
    const { data: resetUser, error: resetErr } = await supabaseAdmin
      .from('users')
      .update({ manual_limit: MAX_MANUAL_PER_DAY, last_reset: today })
      .eq('telegram_id', telegramId)
      .select()
      .single();
    if (resetErr) return res.status(500).json({ error: 'Ошибка сброса лимита' });
    user = resetUser;
  }

  if (user.manual_limit <= 0) {
    return res.status(400).json({ error: 'Дневной лимит роликов исчерпан' });
  }

  const { data: activeSession } = await supabaseAdmin
    .from('sessions')
    .select('id')
    .eq('telegram_id', telegramId)
    .eq('status', 'active')
    .maybeSingle();

  if (activeSession) {
    return res.status(409).json({ error: 'Уже есть незавершённая сессия' });
  }

  const newLimit = user.manual_limit - 1;
  await supabaseAdmin.from('users').update({ manual_limit: newLimit }).eq('telegram_id', telegramId);

  const sessionId = crypto.randomUUID();
  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + SESSION_TTL_SECONDS * 1000);

  await supabaseAdmin.from('sessions').insert([{
    id: sessionId,
    telegram_id: telegramId,
    mode: 'manual',
    duration_seconds: MIN_WATCH_SECONDS,
    reward: MANUAL_REWARD,
    started_at: startedAt.toISOString(),
    expires_at: expiresAt.toISOString(),
    status: 'active',
  }]);

  return res.status(200).json({ sessionId, manual_limit: newLimit });
};
