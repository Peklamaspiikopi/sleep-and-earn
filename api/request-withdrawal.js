// api/request-withdrawal.js
//
// Создаёт заявку на вывод. Монеты списываются сразу (эскроу), чтобы
// нельзя было отправить две заявки подряд на одни и те же монеты.
// Одобрение заявки (перевод статуса в 'paid') делается вручную в
// Supabase Table Editor — после этого бонус рефереру начислится
// автоматически (см. триггер в SQL-схеме).
//
// Минимальный порог вывода растёт вместе с уровнем награды за ролик
// (см. minWithdrawalFor в lib/streakLogic.js) — самые активные игроки
// выводят чуть реже, порог поднимается плавно, без резких скачков.
//
// Списание баланса — атомарное (optimistic locking): UPDATE идёт с
// условием "баланс всё ещё равен тому, что мы прочитали". Если два
// запроса пришли одновременно, второй просто не найдёт подходящую
// строку для обновления (баланс уже не совпадает) и получит отказ —
// вместо того чтобы оба создали заявку на одну и ту же сумму.

const { verifyTelegramInitData } = require('../lib/telegramAuth');
const { supabaseAdmin } = require('../lib/supabaseAdmin');
const { logTransaction } = require('../lib/transactions');
const { minWithdrawalFor } = require('../lib/streakLogic');

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
    .select('balance, video_reward')
    .eq('telegram_id', telegramId)
    .single();

  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  const minWithdrawal = minWithdrawalFor(user);
  if (user.balance < minWithdrawal) {
    return res.status(400).json({ error: `Минимальный вывод — ${minWithdrawal} монет`, minWithdrawal });
  }

  const amount = user.balance;

  // Атомарно: обнуляем баланс, только если он всё ещё равен amount —
  // это и есть защита от гонки двух одновременных запросов.
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

  await supabaseAdmin.from('withdrawal_requests').insert([{ telegram_id: telegramId, amount, status: 'pending' }]);
  await logTransaction(supabaseAdmin, telegramId, 'withdrawal_request', -amount, 0, null);

  return res.status(200).json({ balance: 0, amount });
};
