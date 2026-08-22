// api/shop-buy.js
//
// Покупка +SHOP_EXTRA_PLAYS_AMOUNT к сегодняшнему остатку дневного
// лимита роликов. Чистый coin sink: монеты только тратятся, новых не
// появляется, и в отличие от "буста-множителя" (первая версия дизайна)
// не может случайно раздуть долю выплаты за счёт округления — просто
// разрешает посмотреть больше роликов сегодня по той же безопасной
// ставке за штуку.

const { verifyTelegramInitData } = require('../lib/telegramAuth');
const { supabaseAdmin } = require('../lib/supabaseAdmin');
const { logTransaction } = require('../lib/transactions');
const { atomicIncrement } = require('../lib/atomicIncrement');
const { SHOP_EXTRA_PLAYS_COST, SHOP_EXTRA_PLAYS_AMOUNT } = require('../lib/economyConfig');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { initData, item } = req.body || {};
  const auth = verifyTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN);
  if (!auth.ok) return res.status(401).json({ error: auth.error });

  if (item !== 'extra_plays') {
    return res.status(400).json({ error: 'Неизвестный товар' });
  }

  const telegramId = auth.telegramId;

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('balance')
    .eq('telegram_id', telegramId)
    .single();

  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  if (user.balance < SHOP_EXTRA_PLAYS_COST) {
    return res.status(400).json({ error: 'Недостаточно монет' });
  }

  const newBalance = user.balance - SHOP_EXTRA_PLAYS_COST;

  const { data: updated } = await supabaseAdmin
    .from('users')
    .update({ balance: newBalance })
    .eq('telegram_id', telegramId)
    .eq('balance', user.balance) // compare-and-swap — от двойного клика/параллельной покупки
    .select()
    .maybeSingle();

  if (!updated) {
    return res.status(409).json({ error: 'Повтори ещё раз' });
  }

  const updatedLimit = await atomicIncrement(
    supabaseAdmin, 'users', { telegram_id: telegramId }, 'manual_limit', SHOP_EXTRA_PLAYS_AMOUNT
  );

  await logTransaction(supabaseAdmin, telegramId, 'shop_purchase', -SHOP_EXTRA_PLAYS_COST, updated.balance, 'extra_plays');

  return res.status(200).json({
    ok: true,
    balance: updated.balance,
    manualLimit: updatedLimit ? updatedLimit.manual_limit : undefined,
  });
};
