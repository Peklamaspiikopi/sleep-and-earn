// api/confirm-age.js
//
// Записывает подтверждение возраста (18+) — показывается один раз при
// первом запуске, до входа в основной интерфейс. Это не техническая
// проверка возраста (её и не бывает без паспорта), а зафиксированное
// согласие пользователя с условиями использования.

const { verifyTelegramInitData } = require('../lib/telegramAuth');
const { supabaseAdmin } = require('../lib/supabaseAdmin');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { initData } = req.body || {};
  const auth = verifyTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN);
  if (!auth.ok) return res.status(401).json({ error: auth.error });

  const telegramId = auth.telegramId;

  await supabaseAdmin
    .from('users')
    .update({ age_confirmed: true })
    .eq('telegram_id', telegramId);

  return res.status(200).json({ ok: true });
};
