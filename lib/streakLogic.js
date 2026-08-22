// lib/streakLogic.js
//
// Общая логика прогрессии наград, стрика, недельной лестницы бонусов,
// роста дневного лимита, коробок и минимального порога вывода.
//
// Стрик НИКОГДА не сбрасывается: пропущенный день просто не
// засчитывается, стрик продолжает расти с того же места.
//
// ЭКОНОМИКА ПОДОБРАНА ПОД РЕАЛЬНУЮ ВЫРУЧКУ С РЕКЛАМЫ (см. Adsgram CPM:
// $0.5-1 за 1000 показов, среднее ≈$0.00075/показ). Цель — доля выплаты
// игрокам растёт от ~15% в начале до ~35-36% на максимальном уровне;
// с учётом реферального бонуса (+15% от суммы вывода рефереру, см.
// SQL-триггер handle_withdrawal_paid) итоговая доля на дистанции выходит
// на ~40-42% и дальше не растёт — подтверждено симуляцией на 2 года игры.
//
// МОНЕТА: 1 монета = $0.00001 (в 10 раз мельче, чем было изначально —
// нужно для того, чтобы баннер (Interstitial, вдвое дешевле по CPM,
// чем обычный Rewarded-ролик) мог платить целое число монет, а не
// "0.5 монеты").
//
// СИСТЕМА УРОВНЕЙ (video_reward — теперь не 1-12, а одно из 4
// конкретных значений):
const TIERS = [10, 18, 26, 33, 39];
// Активных дней НА ТЕКУЩЕМ уровне нужно накопить для перехода на
// следующий (длина массива на 1 меньше TIERS — для последнего уровня
// расти уже некуда)
const TIER_GROWTH_DAYS = [16, 24, 32, 40];

function tierIndexFor(reward) {
  const idx = TIERS.indexOf(reward);
  return idx === -1 ? 0 : idx;
}

const LIMIT_GROWTH_ACTIVE_DAYS = 10; // активных дней для +1 к дневному лимиту роликов
const LIMIT_CAP = 30;

// Сундук (день 7 недельной лестницы) и большая коробка открываются
// ОДНОВРЕМЕННО — как только игрок прошёл первый уровень (tierIdx >= 1).
// До этого момента сундук на 7-й день просто пуст (locked).
const BOX_UNLOCK_TIER_IDX = 1;

const BIG_BOX_INTERVAL_ACTIVE_DAYS = 24;
const WEEKLY_BOX_MIN = 55, WEEKLY_BOX_MAX = 330;
const BIG_BOX_MIN = 150, BIG_BOX_MAX = 650;

// Единая лестница ежедневного бонуса за стрик (6 будних дней, 7-й —
// сундук). Одна на всех — раньше была отдельная лестница на каждый
// тир, но при 4 уровнях вместо 12 разумнее держать её простой.
const DAILY_LADDER = [11, 17, 23, 29, 35, 41];

function rollInRange(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}
function rollWeeklyBox() { return rollInRange(WEEKLY_BOX_MIN, WEEKLY_BOX_MAX); }
function rollBigBox() { return rollInRange(BIG_BOX_MIN, BIG_BOX_MAX); }

// Бонус за активный день; на 7-й день — сундук (если разблокирован)
function dailyBonusForStreak(newStreak, reward) {
  const boxUnlocked = tierIndexFor(reward) >= BOX_UNLOCK_TIER_IDX;
  if (newStreak % 7 === 0) {
    if (boxUnlocked) return { isBox: true, reward: rollWeeklyBox(), locked: false };
    return { isBox: true, reward: 0, locked: true };
  }
  const idx = (newStreak - 1) % 7;
  return { isBox: false, reward: DAILY_LADDER[idx] };
}

// Минимум роликов в день, чтобы день засчитался активным
function minAdsRequired(user) {
  return (user.manual_limit_max || 20) - 5;
}

// Минимальный порог вывода — единый для всех уровней (10000 монет =
// $0.10 по новому курсу). При идеальной ежедневной игре достигается в
// среднем на 33-й день — быстрее физически не получится, не нарушив
// потолок доли выплаты 40-42%; подробный расчёт см. в истории чата.
function minWithdrawalFor(user) {
  return 10000; // ~31 день до первого вывода при идеальной ежедневной игре
}

// Сколько активных дней осталось до следующего роста награды за ролик
function daysToNextReward(user) {
  const idx = tierIndexFor(user.video_reward || TIERS[0]);
  if (idx >= TIERS.length - 1) return null;
  const needed = TIER_GROWTH_DAYS[idx];
  const progress = user.active_days_since_level8 || 0;
  return Math.max(0, needed - progress);
}

// Сколько активных дней осталось до следующего роста дневного лимита
function daysToNextLimit(user) {
  const limitMax = user.manual_limit_max || 20;
  if (limitMax >= LIMIT_CAP) return null;
  return Math.max(0, LIMIT_GROWTH_ACTIVE_DAYS - (user.active_days_since_limit_bump || 0));
}

// Сколько активных дней осталось до следующей большой коробки
// (null = ещё не разблокирована — нужен tierIdx >= BOX_UNLOCK_TIER_IDX)
function daysToNextBigBox(user) {
  if (tierIndexFor(user.video_reward || TIERS[0]) < BOX_UNLOCK_TIER_IDX) return null;
  return Math.max(0, BIG_BOX_INTERVAL_ACTIVE_DAYS - (user.active_days_since_big_box || 0));
}

module.exports = {
  TIERS, TIER_GROWTH_DAYS, tierIndexFor, BOX_UNLOCK_TIER_IDX,
  LIMIT_GROWTH_ACTIVE_DAYS, LIMIT_CAP,
  BIG_BOX_INTERVAL_ACTIVE_DAYS,
  rollWeeklyBox, rollBigBox, dailyBonusForStreak,
  minAdsRequired, minWithdrawalFor,
  daysToNextReward, daysToNextLimit, daysToNextBigBox,
};
