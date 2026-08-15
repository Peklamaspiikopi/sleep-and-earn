// lib/streakLogic.js
//
// Общая логика прогрессии наград, стрика, недельной лестницы бонусов,
// роста дневного лимита и "большой коробки" — используется в нескольких
// /api файлах.
//
// Стрик НИКОГДА не сбрасывается: если юзер пропустил день, этот день
// просто не засчитывается, а стрик продолжает расти с того же места
// при следующей активности.

const REWARD_MILESTONES = [
  { streak: 5, reward: 6 },
  { streak: 14, reward: 7 },
  { streak: 28, reward: 8 },
];

const POST8_GROWTH_ACTIVE_DAYS = 30; // активных дней для +1 после уровня 8
const REWARD_CAP = 12;
const LIMIT_GROWTH_ACTIVE_DAYS = 10; // активных дней для +1 к дневному лимиту роликов
const LIMIT_CAP = 30;

// Недельная лестница бонусов (игровая неделя = 7 активных дней подряд по
// счётчику стрика, начинается заново после каждого 7-го дня). День 7 — сундук.
const WEEKLY_LADDER = [10, 15, 20, 25, 30, 35];

const BOX_ODDS = [
  { upTo: 60, reward: 40 },
  { upTo: 85, reward: 90 },
  { upTo: 95, reward: 140 },
  { upTo: 100, reward: 200 },
];

// "Большая коробка" — раз в 30 активных дней, награда случайна в диапазоне
// 50-500 монет. Диапазон разбит на взвешенные подуровни: маленькие суммы
// выпадают гораздо чаще больших, чтобы экономика оставалась предсказуемой.
const BIG_BOX_INTERVAL_ACTIVE_DAYS = 30;
const BIG_BOX_ODDS = [
  { upTo: 55, min: 50, max: 90 },    // 55% шанс
  { upTo: 85, min: 91, max: 200 },   // 30% шанс
  { upTo: 97, min: 201, max: 350 },  // 12% шанс
  { upTo: 100, min: 351, max: 500 }, // 3% шанс
];

function rollBox() {
  const roll = Math.random() * 100;
  for (const tier of BOX_ODDS) {
    if (roll < tier.upTo) return tier.reward;
  }
  return BOX_ODDS[BOX_ODDS.length - 1].reward;
}

function rollBigBox() {
  const roll = Math.random() * 100;
  for (const tier of BIG_BOX_ODDS) {
    if (roll < tier.upTo) {
      return tier.min + Math.floor(Math.random() * (tier.max - tier.min + 1));
    }
  }
  const last = BIG_BOX_ODDS[BIG_BOX_ODDS.length - 1];
  return last.min + Math.floor(Math.random() * (last.max - last.min + 1));
}

// Бонус за активный день по недельной лестнице; на 7-й день — сундук
function dailyBonusForStreak(newStreak) {
  if (newStreak % 7 === 0) {
    return { isBox: true, reward: rollBox() };
  }
  const idx = (newStreak - 1) % 7;
  return { isBox: false, reward: WEEKLY_LADDER[idx] };
}

// Награда только растёт по достигнутым порогам стрика (до уровня 8 включительно)
function applyRewardMilestones(currentReward, newStreak) {
  let reward = currentReward || 5;
  for (const m of REWARD_MILESTONES) {
    if (newStreak >= m.streak && reward < m.reward) reward = m.reward;
  }
  return reward;
}

// Сколько активных дней осталось до следующего роста награды за ролик
function daysToNextReward(user) {
  const reward = user.video_reward || 5;
  const streak = user.streak_count || 0;
  if (reward >= REWARD_CAP) return null;
  if (reward < 6) return Math.max(0, 5 - streak);
  if (reward < 7) return Math.max(0, 14 - streak);
  if (reward < 8) return Math.max(0, 28 - streak);
  return Math.max(0, POST8_GROWTH_ACTIVE_DAYS - (user.active_days_since_level8 || 0));
}

// Сколько активных дней осталось до следующего роста дневного лимита
function daysToNextLimit(user) {
  const limitMax = user.manual_limit_max || 20;
  if (limitMax >= LIMIT_CAP) return null;
  return Math.max(0, LIMIT_GROWTH_ACTIVE_DAYS - (user.active_days_since_limit_bump || 0));
}

// Сколько активных дней осталось до следующей большой коробки
function daysToNextBigBox(user) {
  return Math.max(0, BIG_BOX_INTERVAL_ACTIVE_DAYS - (user.active_days_since_big_box || 0));
}

module.exports = {
  rollBox, rollBigBox, applyRewardMilestones,
  dailyBonusForStreak, daysToNextReward, daysToNextLimit, daysToNextBigBox,
  WEEKLY_LADDER, POST8_GROWTH_ACTIVE_DAYS, REWARD_CAP,
  LIMIT_GROWTH_ACTIVE_DAYS, LIMIT_CAP, BIG_BOX_INTERVAL_ACTIVE_DAYS,
};
