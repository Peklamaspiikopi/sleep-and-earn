// lib/streakLogic.js
//
// Общая логика прогрессии наград, стрика, недельной лестницы бонусов,
// роста дневного лимита, коробок и минимального порога вывода.
//
// Стрик НИКОГДА не сбрасывается: пропущенный день просто не
// засчитывается, стрик продолжает расти с того же места.
//
// СИСТЕМА УРОВНЕЙ (video_reward, 1-12):
//   Награда за ролик растёт от 1 до 12 монет. Скорость роста задаётся
//   таблицей REWARD_GROWTH_DAYS — сколько активных дней нужно пройти
//   С МОМЕНТА ПОСЛЕДНЕГО ПОВЫШЕНИЯ, чтобы получить следующий уровень
//   (счётчик каждый раз обнуляется после +1, копится заново).
//
//   Уровни 1-3, 4-6, 7-9, 10-12 — это 4 "тира" с разной недельной
//   лестницей бонусов и разным поведением коробок:
//     тир A (1-3): сундук на 7-й день ЗАКРЫТ
//     тир B (4-6): сундук всё ещё ЗАКРЫТ
//     тир C (7-9): сундук ОТКРЫВАЕТСЯ, диапазон 20-200 монет
//     тир D (10-12): при первом входе в тир — большая коробка
//       открывается СРАЗУ один раз, дальше обычный отсчёт 30 дней
//
//   Минимальный порог вывода растёт вместе с тиром: 2000 → 3000 (тир C)
//   → 4000 (тир D).
//
//   Минимум роликов в день для зачёта активного дня = (макс. дневной
//   лимит юзера) − 5. Стартует с 15 (при лимите 20), доходит до 25
//   (при максимальном лимите 30).

const REWARD_CAP = 12;

// Сколько активных дней нужно копить С ТЕКУЩЕГО уровня до следующего
const REWARD_GROWTH_DAYS = {
  1: 3, 2: 4, 3: 5, 4: 7, 5: 7, 6: 9,
  7: 14, 8: 21, 9: 28, 10: 34, 11: 42,
};

const LIMIT_GROWTH_ACTIVE_DAYS = 10; // активных дней для +1 к дневному лимиту роликов
const LIMIT_CAP = 30;

const BIG_BOX_INTERVAL_ACTIVE_DAYS = 30;
const BIG_BOX_ODDS = [
  { upTo: 55, min: 50, max: 90 },    // 55% шанс
  { upTo: 85, min: 91, max: 200 },   // 30% шанс
  { upTo: 97, min: 201, max: 350 },  // 12% шанс
  { upTo: 100, min: 351, max: 500 }, // 3% шанс
];

const WEEKLY_BOX_ODDS = [
  { upTo: 50, min: 20, max: 50 },   // 50% шанс
  { upTo: 80, min: 51, max: 100 },  // 30% шанс
  { upTo: 95, min: 101, max: 150 }, // 15% шанс
  { upTo: 100, min: 151, max: 200 }, // 5% шанс
];

function rollFromOdds(odds) {
  const roll = Math.random() * 100;
  for (const tier of odds) {
    if (roll < tier.upTo) {
      return tier.min + Math.floor(Math.random() * (tier.max - tier.min + 1));
    }
  }
  const last = odds[odds.length - 1];
  return last.min + Math.floor(Math.random() * (last.max - last.min + 1));
}

function rollWeeklyBox() { return rollFromOdds(WEEKLY_BOX_ODDS); }
function rollBigBox() { return rollFromOdds(BIG_BOX_ODDS); }

// Недельная лестница + статус сундука для текущего уровня награды
function weeklyLadderFor(reward) {
  if (reward <= 3) return { values: [5, 10, 15, 20, 25, 30], boxUnlocked: false };
  if (reward <= 6) return { values: [10, 15, 20, 25, 30, 35], boxUnlocked: false };
  if (reward <= 9) return { values: [15, 20, 25, 30, 35, 40], boxUnlocked: true };
  return { values: [20, 25, 30, 35, 40, 45], boxUnlocked: true };
}

// Бонус за активный день; на 7-й день — сундук (если разблокирован для тира)
function dailyBonusForStreak(newStreak, reward) {
  const { values, boxUnlocked } = weeklyLadderFor(reward);
  if (newStreak % 7 === 0) {
    if (boxUnlocked) return { isBox: true, reward: rollWeeklyBox(), locked: false };
    return { isBox: true, reward: 0, locked: true };
  }
  const idx = (newStreak - 1) % 7;
  return { isBox: false, reward: values[idx] };
}

// Минимум роликов в день, чтобы день засчитался активным
function minAdsRequired(user) {
  return (user.manual_limit_max || 20) - 5;
}

// Минимальный порог вывода зависит от текущего тира
function minWithdrawalFor(user) {
  const reward = user.video_reward || 1;
  if (reward >= 10) return 4000;
  if (reward >= 7) return 3000;
  return 2000;
}

// Сколько активных дней осталось до следующего роста награды за ролик
function daysToNextReward(user) {
  const reward = user.video_reward || 1;
  if (reward >= REWARD_CAP) return null;
  const needed = REWARD_GROWTH_DAYS[reward];
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
// (null = ещё не разблокирована, нужен уровень 10)
function daysToNextBigBox(user) {
  if ((user.video_reward || 1) < 10) return null;
  return Math.max(0, BIG_BOX_INTERVAL_ACTIVE_DAYS - (user.active_days_since_big_box || 0));
}

module.exports = {
  REWARD_CAP, REWARD_GROWTH_DAYS,
  LIMIT_GROWTH_ACTIVE_DAYS, LIMIT_CAP,
  BIG_BOX_INTERVAL_ACTIVE_DAYS,
  rollWeeklyBox, rollBigBox, weeklyLadderFor, dailyBonusForStreak,
  minAdsRequired, minWithdrawalFor,
  daysToNextReward, daysToNextLimit, daysToNextBigBox,
};
