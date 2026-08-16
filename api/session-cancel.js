// api/session-cancel.js
//
// Если реклама не загрузилась или юзер закрыл её раньше времени —
// возвращаем списанный лимит обратно.
//
// Захват сессии — атомарный (UPDATE ... WHERE status='active'), чтобы
// если отмена придёт дважды подряд (или наложится на session-complete
// для той же сессии), только один из запросов реально сработал и
// вернул лимит — а не оба, задваивая бесплатный ролик.

const { verifyTelegramInitData } = require('../lib/telegramAuth');
const { supabaseAdmin } = require('../lib/supabaseAdmin');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { initData, sessionId } = req.body || {};
  const auth = verifyTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN);
  if (!auth.ok) return res.status(401).json({ error: auth.error });

  const telegramId = auth.telegramId;

  const { data: session } = await supabaseAdmin
    .from('sessions')
    .update({ status: 'cancelled', completed_at: new Date().toISOString() })
    .eq('id', sessionId)
    .eq('telegram_id', telegramId)
    .eq('status', 'active')
    .select()
    .maybeSingle();

  if (!session) {
    // Либо уже отменена/завершена кем-то другим (или этим же запросом
    // повторно) — в обоих случаях лимит второй раз возвращать не нужно.
    return res.status(200).json({ ok: true, alreadyClosed: true });
  }

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('manual_limit')
    .eq('telegram_id', telegramId)
    .single();

  if (user) {
    await supabaseAdmin
      .from('users')
      .update({ manual_limit: user.manual_limit + 1 })
      .eq('telegram_id', telegramId);
  }

  return res.status(200).json({ ok: true });
};
