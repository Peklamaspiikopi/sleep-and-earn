let timer;
let timeLeft = 300; // 5 минут в секундах (5 * 60)
let limitSeconds = 7200; // 2 часа суточного лимита в секундах (2 * 3600)
let isRunning = false;
let wakeLock = null;
let balance = 0;

const timerDisplay = document.getElementById('timer');
const startBtn = document.getElementById('startBtn');
const timerContainer = document.getElementById('timerContainer');
const balanceDisplay = document.getElementById('balance');
const limitHoursDisplay = document.getElementById('limitHours');

// НАСТРОЙКА РЕКЛАМЫ ADSGRAM (Сюда вставите свой Block ID)
const AdController = window.Adsgram ? window.Adsgram.init({ blockId: "YOUR_BLOCK_ID_HERE" }) : null;

// Функция защиты экрана от выключения (Wake Lock API)
async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log('Защита экрана активирована: дисплей не погаснет');
        }
    } catch (err) {
        console.log(`Ошибка Wake Lock: ${err.message}`);
    }
}

// Функция отключения защиты экрана
function releaseWakeLock() {
    if (wakeLock !== null) {
        wakeLock.release();
        wakeLock = null;
        console.log('Защита экрана отключена');
    }
}

// Обновление шкалы лимита на экране
function updateLimitDisplay() {
    const hoursLeft = (limitSeconds / 3600).toFixed(2);
    limitHoursDisplay.innerText = hoursLeft;
}

// Функция запуска таймера
function startTimer() {
    if (limitSeconds <= 0) {
        stopFarmDueToLimit();
        return;
    }

    isRunning = true;
    startBtn.disabled = true;
    startBtn.innerText = "Авто-фарм активен...";
    timerContainer.classList.add('active');
    requestWakeLock(); // Включаем защиту экрана

    timer = setInterval(() => {
        timeLeft--;
        limitSeconds--; // Отнимаем суточный лимит каждую секунду
        
        updateTimerDisplay();
        updateLimitDisplay();

        // Если суточный лимит кончился прямо во время таймера
        if (limitSeconds <= 0) {
            clearInterval(timer);
            stopFarmDueToLimit();
        }
        // Если таймер дошел до 0
        else if (timeLeft <= 0) {
            clearInterval(timer);
            triggerAdShow(); // Автоматически вызываем рекламу!
        }
    }, 1000);
}

// Обновление цифр таймера
function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerDisplay.innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Остановка фарминга при исчерпании лимита
function stopFarmDueToLimit() {
    isRunning = false;
    releaseWakeLock();
    timerContainer.classList.remove('active');
    startBtn.disabled = true;
    startBtn.innerText = "Лимит исчерпан! Ждите обновления.";
    alert("Ваш суточный лимит авто-фарма на сегодня полностью закончен! Возвращайтесь завтра или приглашайте рефералов.");
}

// Функция автоматического показа рекламы Adsgram
function triggerAdShow() {
    console.log('Запуск рекламного ролика...');
    
    if (AdController) {
        AdController.show().then((result) => {
            // Видео успешно просмотрено до конца!
            balance += 7; // Честно начисляем 7 монет (7 копеек)
            balanceDisplay.innerText = balance;
            restartCycle();
        }).catch((result) => {
            // Ошибка или пропуск рекламы
            alert("Реклама пропущена или не загрузилась. Монеты не начислены.");
            restartCycle();
        });
    } else {
        // ТЕСТОВЫЙ РЕЖИМ (Если код запущен локально без сети Adsgram)
        balance += 7;
        balanceDisplay.innerText = balance;
        alert("[ТЕСТ ПОКАЗА] 5 минут прошло! Начислено +7 монет. Запуск нового цикла.");
        restartCycle();
    }
}

// Перезапуск цикла авто-фарма
function restartCycle() {
    timeLeft = 300; // Сбрасываем таймер обратно на 5 минут
    updateTimerDisplay();
    startTimer(); // Запускаем заново бесконечный цикл
}

// Обработчик клика по кнопке запуска
startBtn.addEventListener('click', () => {
    if (!isRunning) {
        startTimer();
    }
});

