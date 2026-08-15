// api/request-withdrawal.js
//
// Создаёт заявку на вывод. Монеты списываются сразу (эскроу), чтобы
// нельзя было отправить две заявки подряд на одни и те же монеты.
// Одобрение заявки (перевод статуса в 'paid') делается вручную в
// Supabase Table Editor — после этого бонус рефереру начислится
// автоматически (см. триггер в SQL-схеме).

const { verifyTelegramInitData } = require('../lib/telegramAuth');
const { supabaseAdmin } = require('../lib/supabaseAdmin');
const { logTransaction } = require('../lib/transactions');

const MIN_WITHDRAWAL = 2000;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { initData } = req.body || {};
  const auth = verifyTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN);
  if (!auth.ok) return res.status(401).json({ error: auth.error });

  const telegramId = auth.telegramId;

  const { data: existingPending } = await supabaseAdmin
    .from('withdrawal_requests')
    .select('id')
    .eq('telegram_id', telegramId)
    .eq('status', 'pending')
    .maybeSingle();

  if (existingPending) {
    return res.status(409).json({ error: 'У тебя уже есть заявка в обработке' });
  }

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('balance')
    .eq('telegram_id', telegramId)
    .single();

  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  if (user.balance < MIN_WITHDRAWAL) {
    return res.status(400).json({ error: `Минимальный вывод — ${MIN_WITHDRAWAL} монет` });
  }

  const amount = user.balance;
  const newBalance = 0;

  await supabaseAdmin.from('users').update({ balance: newBalance }).eq('telegram_id', telegramId);
  await supabaseAdmin.from('withdrawal_requests').insert([{ telegram_id: telegramId, amount, status: 'pending' }]);
  await logTransaction(supabaseAdmin, telegramId, 'withdrawal_request', -amount, newBalance, null);

  return res.status(200).json({ balance: newBalance, amount });
};
