// api/account.js
//
// Роутер для двух одноразовых/редких действий с аккаунтом:
// подтверждение возраста и запрос на вывод средств. Объединены из
// отдельных файлов (confirm-age, request-withdrawal) по техническим
// причинам — лимит Vercel Hobby на 12 serverless-функций.
//
// action: 'confirm_age' | 'withdraw'

const { verifyTelegramInitData } = require('../lib/telegramAuth');
const { supabaseAdmin } = require('../lib/supabaseAdmin');
const { logTransaction } = require('../lib/transactions');
const { minWithdrawalFor } = require('../lib/streakLogic');
const { isValidTonAddress } = require('../lib/tonAddress');

// ==== action: confirm_age ====
async function handleConfirmAge(req, res, telegramId) {
  await supabaseAdmin
    .from('users')
    .update({ age_confirmed: true })
    .eq('telegram_id', telegramId);

  return res.status(200).json({ ok: true });
}

// ==== action: withdraw ====
//
// Монеты списываются сразу (эскроу). Одобрение (перевод статуса в
// 'paid') делается вручную в Supabase Table Editor — после этого
// бонус рефереру начислится автоматически (см. триггер в SQL-схеме).
// Списание баланса — атомарное (optimistic locking).
async function handleWithdraw(req, res, telegramId) {
  const { payoutAddress } = req.body || {};

  const address = String(payoutAddress || '').trim();
  if (!address) {
    return res.status(400).json({ error: 'Укажи адрес кошелька для вывода' });
  }
  if (!isValidTonAddress(address)) {
    return res.status(400).json({ error: 'Похоже, в адресе TON-кошелька опечатка — проверь и вставь ещё раз' });
  }

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
    .select('balance, video_reward')
    .eq('telegram_id', telegramId)
    .single();

  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  const minWithdrawal = minWithdrawalFor(user);
  if (user.balance < minWithdrawal) {
    return res.status(400).json({ error: `Минимальный вывод — ${minWithdrawal} монет`, minWithdrawal });
  }

  const amount = user.balance;

  const { data: claimed } = await supabaseAdmin
    .from('users')
    .update({ balance: 0 })
    .eq('telegram_id', telegramId)
    .eq('balance', amount)
    .select()
    .maybeSingle();

  if (!claimed) {
    return res.status(409).json({ error: 'Баланс изменился, попробуй ещё раз' });
  }

  await supabaseAdmin.from('withdrawal_requests').insert([{ telegram_id: telegramId, amount, status: 'pending', payout_address: address }]);
  await logTransaction(supabaseAdmin, telegramId, 'withdrawal_request', -amount, 0, null);

  return res.status(200).json({ balance: 0, amount });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { initData, action } = req.body || {};
  const auth = verifyTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN);
  if (!auth.ok) return res.status(401).json({ error: auth.error });

  const telegramId = auth.telegramId;

  switch (action) {
    case 'confirm_age': return handleConfirmAge(req, res, telegramId);
    case 'withdraw': return handleWithdraw(req, res, telegramId);
    default: return res.status(400).json({ error: 'Неизвестное действие' });
  }
};
