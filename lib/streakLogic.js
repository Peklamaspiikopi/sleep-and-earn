// lib/streakLogic.js
//
// Общая логика прогрессии наград, стрика и "коробки" — используется
// в session-complete.js и в операциях покупки токенов/выкупа дней.

const REWARD_MILESTONES = [
  { streak: 5, reward: 6 },
  { streak: 14, reward: 7 },
  { streak: 28, reward: 8 },
];

const POST8_GROWTH_ACTIVE_DAYS = 30; // сколько активных дней нужно для +1 после уровня 8
const REWARD_CAP = 12;
const DAILY_ACTIVE_BONUS = 10;       // бонус за 5-й ролик в день

// Коробка раз в 7 активных дней подряд
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

module.exports = {
  daysBetween, rollBox, applyRewardMilestones, applyRewardDecay,
  DAILY_ACTIVE_BONUS, POST8_GROWTH_ACTIVE_DAYS, REWARD_CAP,
  TOKEN_COST, TOKEN_CAP, BUY_MISSED_DAY_COST,
};
