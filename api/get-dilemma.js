// api/get-dilemma.js
//
// Возвращает список доступных тем и текущую дилемму юзера в выбранной
// теме (по прогрессу — какую дилемму он должен увидеть следующей).
// Темы проходятся по кругу — после последней дилеммы снова первая,
// прогресс (completed_count) продолжает расти и дальше копит чекпоинты.

const { verifyTelegramInitData } = require('../lib/telegramAuth');
const { supabaseAdmin } = require('../lib/supabaseAdmin');
const { CHECKPOINT_INTERVAL } = require('../lib/dilemmaLogic');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { initData, topic, lang } = req.body || {};
  const activeLang = lang === 'en' ? 'en' : 'ru';
  const auth = verifyTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN);
  if (!auth.ok) return res.status(401).json({ error: auth.error });

  const telegramId = auth.telegramId;

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
};
