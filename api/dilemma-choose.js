// api/dilemma-choose.js
//
// Принимает выбор игрока по текущей дилемме, продвигает прогресс на
// шаг вперёд и возвращает текст последствия выбранного варианта.
// Проверяет, что присланный dilemmaId действительно соответствует
// ожидаемой (по прогрессу) дилемме — чтобы нельзя было переслать один
// и тот же id много раз подряд и накрутить completed_count без
// реального прохождения.

const { verifyTelegramInitData } = require('../lib/telegramAuth');
const { supabaseAdmin } = require('../lib/supabaseAdmin');
const { CHECKPOINT_INTERVAL } = require('../lib/dilemmaLogic');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { initData, topic, dilemmaId, choice } = req.body || {};
  const auth = verifyTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN);
  if (!auth.ok) return res.status(401).json({ error: auth.error });

  if (!['a', 'b', 'c'].includes(choice)) return res.status(400).json({ error: 'Некорректный выбор' });

  const telegramId = auth.telegramId;

  const { data: topicDilemmas } = await supabaseAdmin
    .from('dilemmas')
    .select('*')
    .eq('topic', topic)
    .order('order_index');

  if (!topicDilemmas || topicDilemmas.length === 0) {
    return res.status(404).json({ error: 'Тема не найдена' });
  }

  const { data: progress } = await supabaseAdmin
    .from('dilemma_progress')
    .select('*')
    .eq('telegram_id', telegramId)
    .eq('topic', topic)
    .maybeSingle();

  if (!progress) return res.status(404).json({ error: 'Прогресс не найден, обнови страницу' });

  const total = topicDilemmas.length;
  const expected = topicDilemmas[progress.completed_count % total];

  if (!expected || expected.id !== dilemmaId) {
    return res.status(409).json({ error: 'Дилемма устарела, обнови страницу' });
  }

  const consequence = choice === 'a' ? expected.consequence_a : choice === 'b' ? expected.consequence_b : expected.consequence_c;
  if (!consequence) return res.status(400).json({ error: 'У этой дилеммы нет такого варианта' });

  const newCompletedCount = progress.completed_count + 1;
  const newCheckpointEarned = newCompletedCount % CHECKPOINT_INTERVAL === 0;
  const newPendingCheckpoints = progress.pending_checkpoints + (newCheckpointEarned ? 1 : 0);

  await supabaseAdmin
    .from('dilemma_progress')
    .update({ completed_count: newCompletedCount, pending_checkpoints: newPendingCheckpoints })
    .eq('telegram_id', telegramId)
    .eq('topic', topic);

  return res.status(200).json({
    consequence,
    progress: {
      completedCount: newCompletedCount,
      pendingCheckpoints: newPendingCheckpoints,
      inCycle: newCompletedCount % CHECKPOINT_INTERVAL,
      cycleLength: CHECKPOINT_INTERVAL,
      checkpointEarned: newCheckpointEarned,
    },
  });
};
