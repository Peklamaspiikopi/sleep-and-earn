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

// Порядок открытия новых тем ключами — совпадает с комментарием в
// 004_new_topics.sql. work/money доступны всем всегда, без ключа.
const ALWAYS_OPEN_TOPICS = ['work', 'money'];
const KEY_UNLOCK_ORDER = ['friendship', 'family', 'internet', 'neighbors', 'school', 'pets', 'tech'];

async function getUnlockedTopics(telegramId) {
  const { data: rows } = await supabaseAdmin
    .from('user_unlocked_topics')
    .select('topic')
    .eq('telegram_id', telegramId);
  return new Set((rows || []).map((r) => r.topic));
}

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
    .eq('pool', 'main')
    .order('topic');

  const allTopics = [...new Set((topicsRaw || []).map(r => r.topic))];
  const unlockedByKey = await getUnlockedTopics(telegramId);
  const topics = allTopics.filter((t) => ALWAYS_OPEN_TOPICS.includes(t) || unlockedByKey.has(t));

  const requestedIsAllowed = topic && topics.includes(topic);
  const activeTopic = requestedIsAllowed ? topic : topics[0];
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

  if (!ALWAYS_OPEN_TOPICS.includes(topic)) {
    const unlockedByKey = await getUnlockedTopics(telegramId);
    if (!unlockedByKey.has(topic)) {
      return res.status(403).json({ error: 'Тема ещё не открыта' });
    }
  }

  const { data: topicDilemmas } = await supabaseAdmin
    .from('dilemmas')
    .select('*')
    .eq('topic', topic)
    .eq('lang', activeLang)
    .eq('pool', 'main')
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

// ==== action: unlock_topic (тратит 1 topic_key на следующую по порядку тему) ====
async function handleUnlockTopic(req, res, telegramId) {
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('topic_keys')
    .eq('telegram_id', telegramId)
    .single();

  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  if ((user.topic_keys || 0) <= 0) return res.status(400).json({ error: 'Нет доступных ключей' });

  const unlocked = await getUnlockedTopics(telegramId);
  const nextTopic = KEY_UNLOCK_ORDER.find((t) => !unlocked.has(t));
  if (!nextTopic) return res.status(400).json({ error: 'Все темы уже открыты' });

  const { data: spent } = await supabaseAdmin
    .from('users')
    .update({ topic_keys: user.topic_keys - 1 })
    .eq('telegram_id', telegramId)
    .eq('topic_keys', user.topic_keys)
    .select()
    .maybeSingle();

  if (!spent) return res.status(409).json({ error: 'Повтори ещё раз' });

  const { error: insertErr } = await supabaseAdmin
    .from('user_unlocked_topics')
    .insert({ telegram_id: telegramId, topic: nextTopic });

  if (insertErr) {
    // Возвращаем ключ, если тема почему-то не встала (гонка/дубль)
    await supabaseAdmin.from('users').update({ topic_keys: spent.topic_keys + 1 }).eq('telegram_id', telegramId).eq('topic_keys', spent.topic_keys);
    return res.status(409).json({ error: 'Не удалось открыть тему, попробуй ещё раз' });
  }

  return res.status(200).json({ ok: true, unlockedTopic: nextTopic, topicKeys: spent.topic_keys });
}

// ==== action: unlock_secret (тратит 1 secret_key на случайную неоткрытую секретную дилемму) ====
async function handleUnlockSecret(req, res, telegramId) {
  const { lang } = req.body || {};
  const activeLang = lang === 'en' ? 'en' : 'ru';

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('secret_keys')
    .eq('telegram_id', telegramId)
    .single();

  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  if ((user.secret_keys || 0) <= 0) return res.status(400).json({ error: 'Нет доступных ключей' });

  const { data: alreadyOpened } = await supabaseAdmin
    .from('user_unlocked_secrets')
    .select('dilemma_id')
    .eq('telegram_id', telegramId);
  const openedIds = new Set((alreadyOpened || []).map((r) => r.dilemma_id));

  const { data: allSecrets } = await supabaseAdmin
    .from('dilemmas')
    .select('*')
    .eq('pool', 'secret')
    .eq('lang', activeLang);

  const candidates = (allSecrets || []).filter((d) => !openedIds.has(d.id));
  if (!candidates.length) return res.status(400).json({ error: 'Все секретные дилеммы уже открыты' });

  const picked = candidates[Math.floor(Math.random() * candidates.length)];

  const { data: spent } = await supabaseAdmin
    .from('users')
    .update({ secret_keys: user.secret_keys - 1 })
    .eq('telegram_id', telegramId)
    .eq('secret_keys', user.secret_keys)
    .select()
    .maybeSingle();

  if (!spent) return res.status(409).json({ error: 'Повтори ещё раз' });

  const { error: insertErr } = await supabaseAdmin
    .from('user_unlocked_secrets')
    .insert({ telegram_id: telegramId, dilemma_id: picked.id });

  if (insertErr) {
    await supabaseAdmin.from('users').update({ secret_keys: spent.secret_keys + 1 }).eq('telegram_id', telegramId).eq('secret_keys', spent.secret_keys);
    return res.status(409).json({ error: 'Не удалось открыть дилемму, попробуй ещё раз' });
  }

  return res.status(200).json({
    ok: true,
    secretKeys: spent.secret_keys,
    dilemma: {
      id: picked.id,
      title: picked.title,
      scenarioText: picked.scenario_text,
      optionA: picked.option_a,
      optionB: picked.option_b,
      optionC: picked.option_c,
    },
  });
}

// ==== action: choose_secret (выбор варианта в уже открытой секретной дилемме) ====
async function handleChooseSecret(req, res, telegramId) {
  const { dilemmaId, choice, lang } = req.body || {};
  const activeLang = lang === 'en' ? 'en' : 'ru';
  if (!['a', 'b', 'c'].includes(choice)) return res.status(400).json({ error: 'Некорректный выбор' });

  const { data: owns } = await supabaseAdmin
    .from('user_unlocked_secrets')
    .select('dilemma_id')
    .eq('telegram_id', telegramId)
    .eq('dilemma_id', dilemmaId)
    .maybeSingle();

  if (!owns) return res.status(403).json({ error: 'Эта дилемма ещё не открыта тобой' });

  const { data: dilemma } = await supabaseAdmin
    .from('dilemmas')
    .select('*')
    .eq('id', dilemmaId)
    .eq('pool', 'secret')
    .eq('lang', activeLang)
    .maybeSingle();

  if (!dilemma) return res.status(404).json({ error: 'Дилемма не найдена' });

  const consequence = choice === 'a' ? dilemma.consequence_a : choice === 'b' ? dilemma.consequence_b : dilemma.consequence_c;
  return res.status(200).json({ consequence });
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
    case 'unlock_topic': return handleUnlockTopic(req, res, telegramId);
    case 'unlock_secret': return handleUnlockSecret(req, res, telegramId);
    case 'choose_secret': return handleChooseSecret(req, res, telegramId);
    default: return res.status(400).json({ error: 'Неизвестное действие' });
  }
};
