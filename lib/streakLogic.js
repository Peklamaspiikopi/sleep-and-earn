// lib/streakLogic.js
//
// Общая логика прогрессии наград, стрика, недельной лестницы бонусов
// и роста дневного лимита — используется в нескольких /api файлах.

const REWARD_MILESTONES = [
  { streak: 5, reward: 6 },
  { streak: 14, reward: 7 },
  { streak: 28, reward: 8 },
];

const POST8_GROWTH_ACTIVE_DAYS = 30; // активных дней для +1 после уровня 8
const REWARD_CAP = 12;
const LIMIT_GROWTH_ACTIVE_DAYS = 10; // активных дней для +1 к дневному лимиту роликов
const LIMIT_CAP = 30;

// Недельная лестница бонусов (игровая неделя = 7 активных дней подряд,
// начинается заново после каждого 7-го дня). День 7 — только сундук.
const WEEKLY_LADDER = [10, 15, 20, 25, 30, 35];

const BOX_ODDS = [
  { upTo: 60, reward: 40 },
  { upTo: 85, reward: 90 },
  { upTo: 95, reward: 140 },
  { upTo: 100, reward: 200 },
];

const TOKEN_COST = 150;
const TOKEN_CAP = 7;
const BUY_MISSED_DAY_COST = 150;

function rollBox() {
  const roll = Math.random() * 100;
  for (const tier of BOX_ODDS) {
    if (roll < tier.upTo) return tier.reward;
  }
  return BOX_ODDS[BOX_ODDS.length - 1].reward;
}

function daysBetween(a, b) {
  return Math.floor((new Date(b) - new Date(a)) / 86400000);
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

// Откат при разрыве стрика: -1 только для уровней 9-11, не ниже 8, 12 не трогаем
function applyRewardDecay(user) {
  let reward = user.video_reward || 5;
  if (!user.reward_locked_permanent && reward > 8 && reward < 12) {
    reward = reward - 1;
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

module.exports = {
  daysBetween, rollBox, applyRewardMilestones, applyRewardDecay,
  dailyBonusForStreak, daysToNextReward, daysToNextLimit,
  WEEKLY_LADDER, POST8_GROWTH_ACTIVE_DAYS, REWARD_CAP,
  LIMIT_GROWTH_ACTIVE_DAYS, LIMIT_CAP,
  TOKEN_COST, TOKEN_CAP, BUY_MISSED_DAY_COST,
};
