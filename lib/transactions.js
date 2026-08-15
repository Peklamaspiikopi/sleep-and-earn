// lib/transactions.js
//
// Общая функция логирования операций с балансом — используется во
// всех эндпоинтах, которые начисляют или списывают монеты.

async function logTransaction(supabaseAdmin, telegramId, type, amount, balanceAfter, meta) {
  await supabaseAdmin.from('transactions').insert([{
    telegram_id: telegramId,
    type,
    amount,
    balance_after: balanceAfter,
    meta: meta || null,
  }]);
}

module.exports = { logTransaction };
