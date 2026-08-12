// api/get-user.js
//
// Раньше клиент напрямую читал/писал таблицу users через Supabase
// anon-ключ. Теперь клиент вообще не подключается к Supabase — все
// данные идут только через эти серверные функции.

const { verifyTelegramInitData } = require('../lib/telegramAuth');
const { supabaseAdmin } = require('../lib/supabaseAdmin');

const MAX_MANUAL_PER_DAY = 20;

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
      // Запись могла уже существовать (гонка/повторная попытка) — просто читаем её
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('telegram_id', telegramId)
        .maybeSingle();
      user = existingUser;
    } else {
      user = newUser;
    }

    if (!user) {
      return res.status(500).json({ error: 'Не удалось создать или найти пользователя' });
    }
  }

  if (user.last_reset !== today) {
    const { data: resetUser } = await supabaseAdmin
      .from('users')
      .update({ manual_limit: MAX_MANUAL_PER_DAY, last_reset: today })
      .eq('telegram_id', telegramId)
      .select()
      .single();
    user = resetUser;
  }

  return res.status(200).json({
    balance: user.balance,
    manual_limit: user.manual_limit,
    max_manual_limit: MAX_MANUAL_PER_DAY,
    ref_count: user.ref_count,
    ref_earn: user.ref_earn,
    streak_count: user.streak_count,
    bonus_claimed_today: user.last_bonus_date === today,
  });
};
