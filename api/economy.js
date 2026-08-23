// api/economy.js
//
// Роутер для трёх действий с монетами игрока: покупка в магазине,
// спин колеса фортуны, активация промокода. Объединены из отдельных
// файлов (shop-buy, wheel-spin, promo-redeem) чисто по техническим
// причинам — лимит Vercel Hobby на 12 serverless-функций. Внутренняя
// логика каждого action не менялась.
//
// action: 'shop_buy' | 'wheel_spin' | 'promo_redeem'

const { verifyTelegramInitData } = require('../lib/telegramAuth');
const { supabaseAdmin } = require('../lib/supabaseAdmin');
const { logTransaction } = require('../lib/transactions');
const { atomicIncrement } = require('../lib/atomicIncrement');
const { SHOP_EXTRA_PLAYS_COST, SHOP_EXTRA_PLAYS_AMOUNT, WHEEL_SPIN_COST, rollWheel } = require('../lib/economyConfig');

const DUPLICATE_KEY_CODE = '23505'; // Postgres: unique_violation

// ==== action: shop_buy ====
//
// Покупка +SHOP_EXTRA_PLAYS_AMOUNT к сегодняшнему остатку дневного
// лимита роликов. Чистый coin sink: монеты только тратятся, новых не
// появляется — безопасно для доли выплаты независимо от цены.
async function handleShopBuy(req, res, telegramId) {
  const { item } = req.body || {};
  if (item !== 'extra_plays') {
    return res.status(400).json({ error: 'Неизвестный товар' });
  }

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
    .eq('balance', user.balance)
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
}

// ==== action: wheel_spin ====
//
// Экономика (полный расчёт — см. lib/economyConfig.js): матожидание
// выплаты 900 монет при ставке 1000 — house edge ~10%, подтверждено
// Монте-Карло симуляцией на 2 млн прогонов. Списание ставки и
// начисление выигрыша — одна атомарная операция (net = payout - cost).
async function handleWheelSpin(req, res, telegramId) {
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('balance')
    .eq('telegram_id', telegramId)
    .single();

  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  if (user.balance < WHEEL_SPIN_COST) {
    return res.status(400).json({ error: 'Недостаточно монет для спина' });
  }

  const payout = rollWheel();
  const net = payout - WHEEL_SPIN_COST;
  const newBalance = user.balance + net;

  const { data: updated } = await supabaseAdmin
    .from('users')
    .update({ balance: newBalance })
    .eq('telegram_id', telegramId)
    .eq('balance', user.balance)
    .select()
    .maybeSingle();

  if (!updated) {
    return res.status(409).json({ error: 'Повтори ещё раз' });
  }

  await logTransaction(supabaseAdmin, telegramId, 'wheel_spin', net, updated.balance, String(payout));

  return res.status(200).json({ ok: true, payout, net, balance: updated.balance });
}

// ==== action: promo_redeem ====
//
// Защита от повторного использования — на уровне БД (уникальный
// индекс на promo_redemptions(telegram_id, code)), требуется выполнить
// один раз в Supabase:
//   ALTER TABLE promo_redemptions
//     ADD CONSTRAINT unique_user_code UNIQUE (telegram_id, code);
async function handlePromoRedeem(req, res, telegramId) {
  const { code } = req.body || {};
  const normalizedCode = String(code || '').trim().toUpperCase();
  if (!normalizedCode) return res.status(400).json({ error: 'Пустой промокод' });

  const { data: promo } = await supabaseAdmin
    .from('promo_codes')
    .select('*')
    .eq('code', normalizedCode)
    .eq('active', true)
    .maybeSingle();

  if (!promo) return res.status(404).json({ error: 'Промокод не найден или неактивен' });

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
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { initData, action } = req.body || {};
  const auth = verifyTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN);
  if (!auth.ok) return res.status(401).json({ error: auth.error });

  const telegramId = auth.telegramId;

  switch (action) {
    case 'shop_buy': return handleShopBuy(req, res, telegramId);
    case 'wheel_spin': return handleWheelSpin(req, res, telegramId);
    case 'promo_redeem': return handlePromoRedeem(req, res, telegramId);
    default: return res.status(400).json({ error: 'Неизвестное действие' });
  }
};
