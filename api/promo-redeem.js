// api/promo-redeem.js
//
// Промокоды хранятся в таблице promo_codes в базе, а не в открытом
// JS-файле — их нельзя подсмотреть в исходниках сайта.
//
// Защита от повторного использования сделана на уровне БД (уникальный
// индекс на promo_redemptions(telegram_id, code)), а не только проверкой
// в коде — иначе при быстром двойном/тройном нажатии кнопки несколько
// запросов успевают пройти проверку "уже использован?" одновременно,
// до того как первый из них запишет свою отметку об использовании
// (race condition), и код срабатывает по нескольку раз подряд.
// Требуется выполнить один раз в Supabase (SQL Editor):
//   ALTER TABLE promo_redemptions
//     ADD CONSTRAINT unique_user_code UNIQUE (telegram_id, code);

const { verifyTelegramInitData } = require('../lib/telegramAuth');
const { supabaseAdmin } = require('../lib/supabaseAdmin');
const { logTransaction } = require('../lib/transactions');

const DUPLICATE_KEY_CODE = '23505'; // Postgres: unique_violation

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { initData, code } = req.body || {};
  const auth = verifyTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN);
  if (!auth.ok) return res.status(401).json({ error: auth.error });

  const telegramId = auth.telegramId;
  const normalizedCode = String(code || '').trim().toUpperCase();
  if (!normalizedCode) return res.status(400).json({ error: 'Пустой промокод' });

  const { data: promo } = await supabaseAdmin
    .from('promo_codes')
    .select('*')
    .eq('code', normalizedCode)
    .eq('active', true)
    .maybeSingle();

  if (!promo) return res.status(404).json({ error: 'Промокод не найден или неактивен' });

  // Атомарная "бронь" использования: если этот telegram_id + code уже
  // есть в таблице, insert упадёт с ошибкой уникальности — даже если
  // два запроса пришли одновременно, база пропустит только один из них.
  const { error: insertErr } = await supabaseAdmin
    .from('promo_redemptions')
    .insert([{ telegram_id: telegramId, code: normalizedCode }]);

  if (insertErr) {
    if (insertErr.code === DUPLICATE_KEY_CODE) {
      return res.status(409).json({ error: 'Промокод уже был использован' });
    }
    return res.status(500).json({ error: 'Не удалось активировать промокод' });
  }

  if (promo.max_uses !== null) {
    const { count } = await supabaseAdmin
      .from('promo_redemptions')
      .select('id', { count: 'exact', head: true })
      .eq('code', normalizedCode);

    if (count > promo.max_uses) {
      // Лимит уже исчерпан кем-то другим — откатываем нашу "бронь".
      await supabaseAdmin
        .from('promo_redemptions')
        .delete()
        .eq('telegram_id', telegramId)
        .eq('code', normalizedCode);
      return res.status(410).json({ error: 'Лимит активаций промокода исчерпан' });
    }
  }

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('balance')
    .eq('telegram_id', telegramId)
    .single();

  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  const newBalance = user.balance + promo.reward;

  await supabaseAdmin.from('users').update({ balance: newBalance }).eq('telegram_id', telegramId);
  await logTransaction(supabaseAdmin, telegramId, 'promo', promo.reward, newBalance, normalizedCode);

  return res.status(200).json({ balance: newBalance, reward: promo.reward });
};
