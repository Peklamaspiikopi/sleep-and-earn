const AdController = window.Adsgram ? window.Adsgram.init({ blockId: "41720" }) : null;

let balance = parseInt(localStorage.getItem('sleep_balance')) || 0;
let lastLimitReset = localStorage.getItem('sleep_limit_reset') || '';
let usedPromos = JSON.parse(localStorage.getItem('used_promos')) || [];

let timerInterval = null;
let currentSeconds = 300; 
let isFarming = false;
let wakeLock = null;

let maxLimitMinutes = 120; 
let promoTimeEnd = localStorage.getItem('promo_time_end');

if (promoTimeEnd) {
    if (Date.now() > parseInt(promoTimeEnd)) {
        localStorage.removeItem('promo_time_end');
        maxLimitMinutes = 120;
    } else {
        maxLimitMinutes = 180;
    }
}

let limitMinutes = localStorage.getItem('sleep_limit_minutes') !== null ? parseInt(localStorage.getItem('sleep_limit_minutes')) : maxLimitMinutes;

const today = new Date().toDateString();
if (lastLimitReset !== today) {
    limitMinutes = maxLimitMinutes;
    localStorage.setItem('sleep_limit_minutes', limitMinutes);
    localStorage.setItem('sleep_limit_reset', today);
}

document.getElementById('balance').innerText = balance;
updateLimitDisplay();

function updateLimitDisplay() {
    document.getElementById('limitHours').innerText = (limitMinutes / 60).toFixed(1);
    document.getElementById('maxLimitHours').innerText = (maxLimitMinutes / 60).toFixed(1);
}

window.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('sleep_first_run_done')) {
        document.getElementById('welcomeModal').style.display = 'flex';
    }
});

window.closeModal = function() {
    localStorage.setItem('sleep_first_run_done', 'true');
    document.getElementById('welcomeModal').style.display = 'none';
}

document.getElementById('promoBtn').addEventListener('click', () => {
    let code = document.getElementById('promoInput').value.trim().toUpperCase();
    if (!code) return;
    
    if (usedPromos.includes(code)) {
        alert("Этот промокод уже был активирован вами ранее!");
        return;
    }

    if (code === "BONUS300") {
        balance += 300;
        localStorage.setItem('sleep_balance', balance);
        document.getElementById('balance').innerText = balance;
        usedPromos.push(code);
        localStorage.setItem('used_promos', JSON.stringify(usedPromos));
        alert("Успешно! Вам начислено +300 бонусных монет!");
        document.getElementById('promoInput').value = "";
    } 
    else if (code === "SUPERTIME2026") {
        let expireTime = Date.now() + (48 * 60 * 60 * 1000); 
        localStorage.setItem('promo_time_end', expireTime);
        localStorage.setItem('sleep_limit_minutes', 180);
        
        usedPromos.push(code);
        localStorage.setItem('used_promos', JSON.stringify(usedPromos));
        alert("Успешно! Ваш суточный лимит увеличен до 3 часов на следующие 48 часов!");
        location.reload();
    } else {
        alert("Ошибка: Такого промокода не существует или он устарел.");
    }
});

document.getElementById('withdrawBtn').addEventListener('click', () => {
    if (balance < 2000) {
        alert("Ошибка: Недостаточно монет! Для вывода на балансе должно быть минимум 2000 монет (20 руб.). Продолжайте авто-фарминг.");
    } else {
        alert("Заявка доступна! Скопируйте ваш баланс (" + balance + " монет) и отправьте в бота техподдержки @SleepEarnSupport_bot, указав ваш номер телефона. Администратор проверит баланс и переведет деньги на мобильный анонимно.");
    }
});

async function requestWakeLock() {
    try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } catch (err) {}
}
function releaseWakeLock() {
    if (wakeLock !== null) { wakeLock.release(); wakeLock = null; }
}

const startBtn = document.getElementById('startBtn');
const timerContainer = document.getElementById('timerContainer');
const timerDisplay = document.getElementById('timer');

startBtn.addEventListener('click', () => {
    if (!isFarming) {
        if (limitMinutes <= 0) {
            alert("Ваш суточный лимит исчерпан. Обновление лимита происходит раз в 24 часа. Возвращайтесь завтра!");
            return;
        }
        startFarming();
    }
});

function startFarming() {
    isFarming = true;
    startBtn.disabled = true;
    startBtn.innerText = "Авто-фарм запущен...";
    timerContainer.classList.add('active');
    requestWakeLock();

    timerInterval = setInterval(() => {
        currentSeconds--;
        let mins = Math.floor(currentSeconds / 60);
        let secs = currentSeconds % 60;
        timerDisplay.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

        if (currentSeconds <= 0) {
            clearInterval(timerInterval);
            triggerAd();
        }
    }, 1000);
}

function triggerAd() {
    if (AdController) {
        AdController.show().then(() => {
            balance += 7;
            limitMinutes -= 5;
            if (limitMinutes < 0) limitMinutes = 0;

            localStorage.setItem('sleep_balance', balance);
            localStorage.setItem('sleep_limit_minutes', limitMinutes);

            document.getElementById('balance').innerText = balance;
            updateLimitDisplay();
            
            alert("Просмотр завершен. Начислено +7 Монет!");
            resetTimer();
        }).catch(() => {
            alert("Рекламный ролик не загрузился или был пропущен. Попробуйте еще раз.");
            resetTimer();
        });
    } else {
        alert("Ошибка сети. Пожалуйста, отключите блокировщики рекламы.");
        resetTimer();
    }
}

function resetTimer() {
    clearInterval(timerInterval);
    currentSeconds = 300;
    timerDisplay.innerText = "05:00";
    isFarming = false;
    timerContainer.classList.remove('active');
    releaseWakeLock();
    
    if (limitMinutes > 0) {
        startBtn.disabled = false;
        startBtn.innerText = "Запустить авто-фарм";
        startFarming();
    } else {
        startBtn.innerText = "Лимит исчерпан";
        alert("Суточный лимит полностью исчерпан! Терминал остановлен до завтра.");
    }
}
