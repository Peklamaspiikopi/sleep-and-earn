// api/dilemma.js
//
// Роутер для двух действий с дилеммами: получение текущей дилеммы по
// прогрессу и обработка выбора игрока. Объединены из отдельных файлов
// (get-dilemma, dilemma-choose) по техническим причинам — лимит
// Vercel Hobby на 12 serverless-функций.
//
// action: 'get' | 'choose'

const { verifyTelegramInitData } = require('../lib/telegramAuth');
const { supabaseAdmin } = require('../lib/supabaseAdmin');
const { CHECKPOINT_INTERVAL } = require('../lib/dilemmaLogic');

// ==== action: get ====
//
// Темы проходятся по кругу — после последней дилеммы снова первая,
// прогресс (completed_count) продолжает расти и дальше копит чекпоинты.
async function handleGet(req, res, telegramId) {
  const { topic, lang } = req.body || {};
  const activeLang = lang === 'en' ? 'en' : 'ru';

  const { data: topicsRaw } = await supabaseAdmin
    .from('dilemmas')
    .select('topic')
    .eq('lang', activeLang)
    .order('topic');

  const topics = [...new Set((topicsRaw || []).map(r => r.topic))];

  const activeTopic = topic && topics.includes(topic) ? topic : topics[0];
  if (!activeTopic) return res.status(200).json({ topics: [], dilemma: null });

  const { data: topicDilemmas } = await supabaseAdmin
    .from('dilemmas')
    .select('*')
    .eq('topic', activeTopic)
    .eq('lang', activeLang)
    .order('order_index');

  if (!topicDilemmas || topicDilemmas.length === 0) {
    return res.status(200).json({ topics, dilemma: null });
  }

  let { data: progress } = await supabaseAdmin
    .from('dilemma_progress')
    .select('*')
    .eq('telegram_id', telegramId)
    .eq('topic', activeTopic)
    .maybeSingle();

  if (!progress) {
    const { data: created } = await supabaseAdmin
      .from('dilemma_progress')
      .insert([{ telegram_id: telegramId, topic: activeTopic, completed_count: 0, pending_checkpoints: 0 }])
      .select()
      .single();
    progress = created;
  }

  const total = topicDilemmas.length;
  const currentIndex = progress.completed_count % total;
  const current = topicDilemmas[currentIndex];

  return res.status(200).json({
    topics,
    activeTopic,
    dilemma: {
      id: current.id,
      title: current.title,
      scenarioText: current.scenario_text,
      optionA: current.option_a,
      optionB: current.option_b,
      optionC: current.option_c,
    },
    progress: {
      completedCount: progress.completed_count,
      pendingCheckpoints: progress.pending_checkpoints,
      inCycle: progress.completed_count % CHECKPOINT_INTERVAL,
      cycleLength: CHECKPOINT_INTERVAL,
      totalInTopic: total,
    },
  });
}

// ==== action: choose ====
//
// Проверяет, что присланный dilemmaId действительно соответствует
// ожидаемой (по прогрессу) дилемме — чтобы нельзя было переслать один
// и тот же id много раз подряд и накрутить completed_count без
// реального прохождения.
async function handleChoose(req, res, telegramId) {
  const { topic, dilemmaId, choice, lang } = req.body || {};
  const activeLang = lang === 'en' ? 'en' : 'ru';

  if (!['a', 'b', 'c'].includes(choice)) return res.status(400).json({ error: 'Некорректный выбор' });

  const { data: topicDilemmas } = await supabaseAdmin
    .from('dilemmas')
    .select('*')
    .eq('topic', topic)
    .eq('lang', activeLang)
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
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { initData, action } = req.body || {};
  const auth = verifyTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN);
  if (!auth.ok) return res.status(401).json({ error: auth.error });

  const telegramId = auth.telegramId;

  switch (action) {
    case 'get': return handleGet(req, res, telegramId);
    case 'choose': return handleChoose(req, res, telegramId);
    default: return res.status(400).json({ error: 'Неизвестное действие' });
  }
};
