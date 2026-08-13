// api/buy-streak-token.js
//
// Заранее покупает "токен-страховку" за 150 монет — банк максимум 7.
// Такие токены автоматически тратятся, если юзер пропустит день(-и).

const { verifyTelegramInitData } = require('../lib/telegramAuth');
const { supabaseAdmin } = require('../lib/supabaseAdmin');
const { TOKEN_COST, TOKEN_CAP } = require('../lib/streakLogic');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { initData } = req.body || {};
  const auth = verifyTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN);
  if (!auth.ok) return res.status(401).json({ error: auth.error });

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('telegram_id', auth.telegramId)
    .single();

  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  const currentTokens = user.streak_freeze_tokens || 0;
  if (currentTokens >= TOKEN_CAP) {
    return res.status(400).json({ error: `Уже максимум токенов (${TOKEN_CAP})` });
  }
  if (user.balance < TOKEN_COST) {
    return res.status(400).json({ error: 'Недостаточно монет' });
  }

  const newBalance = user.balance - TOKEN_COST;
  const newTokens = currentTokens + 1;

  await supabaseAdmin
    .from('users')
    .update({ balance: newBalance, streak_freeze_tokens: newTokens })
    .eq('telegram_id', auth.telegramId);

  return res.status(200).json({ balance: newBalance, tokens: newTokens });
};
