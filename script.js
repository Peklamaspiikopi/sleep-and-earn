document.addEventListener('DOMContentLoaded', () => {
    const translations = {
        ru: {
            alert: "<b>Экран гаснет?</b> Отключите автоотключение экрана в настройках смартфона или используйте специальную утилиту для удержания экрана.",
            limitLabel: "⏱️ Суточный лимит:",
            hrsUnit: "ч.",
            modeVideo: "🎥 Режим: Ручные видео",
            modeBanner: "🤖 Режим: Авто-баннеры",
            presetTitle: "Сессия авто-просмотров:",
            preset1: "⚡ 3 ЧАСА",
            preset2: "🛌 5 ЧАСОВ",
            preset3: "🌙 7 ЧАСОВ",
            balanceLabel: "Ваш баланс",
            coinUnit: "Монет",
            startBtn: "Запустить терминал",
            stopBtn: "Остановить терминал",
            limitBtn: "Лимит исчерпан",
            honesty: "🛡️ <b>Правило честности:</b> Просим о честном сотрудничестве! Накрутки проверяются. Даем 1 шанс списать накрутку без бана.",
            withdrawLimit: "🔒 Минимальный вывод: <b>2000 Монет (~0.1 TON)</b>",
            promoPlaceholder: "Введите промокод...",
            withdrawBtn: "Заказать вывод средств",
            navTerminal: "Терминал",
            navCabinet: "Кабинет",
            modalTitle: "🚀 Первый запуск!",
            modalText: "Привет! Это первый запуск авто-терминала. Пожалуйста, если вы заметите ошибку — напишите в техподдержку!",
            modalBtn: "Понятно",
            loadingAd: "⏳ Загрузка...",
            adErrorAlert: "❌ Реклама не загрузилась!\n\nЕсли у вас включен VPN или AdBlock, отключите их.",
            refTitle: "🔗 Ваша реферальная ссылка:",
            copyBtn: "Копировать",
            copiedMsg: "Ссылка скопирована!",
            refCountLabel: "Приглашено:",
            refEarnLabel: "Доход:",
            refCoinUnit: "монет"
        },
        en: {
            alert: "<b>Screen dims?</b> Disable auto-screen lock in your phone settings or use a keep-awake utility to run continuously.",
            limitLabel: "⏱️ Daily Limit:",
            hrsUnit: "hrs",
            modeVideo: "🎥 Mode: Manual Videos",
            modeBanner: "🤖 Mode: Auto-Banners",
            presetTitle: "Auto-session preset:",
            preset1: "⚡ 3 HOURS",
            preset2: "🛌 5 HOURS",
            preset3: "🌙 7 HOURS",
            balanceLabel: "Your balance",
            coinUnit: "Coins",
            startBtn: "Start Terminal",
            stopBtn: "Stop Terminal",
            limitBtn: "Limit Reached",
            honesty: "🛡️ <b>Fair Play:</b> Cheating attempts are verified. Contact support for 1 reset chance.",
            withdrawLimit: "🔒 Min Withdrawal: <b>2000 Coins (~0.1 TON)</b>",
            promoPlaceholder: "Enter promo code...",
            withdrawBtn: "Request Withdrawal",
            navTerminal: "Terminal",
            navCabinet: "Cabinet",
            modalTitle: "🚀 First Launch!",
            modalText: "Welcome! If you notice any bugs, please contact support!",
            modalBtn: "Got it",
            loadingAd: "⏳ Loading...",
            adErrorAlert: "❌ Ad failed to load! Please disable AdBlock or VPN.",
            refTitle: "🔗 Your Referral Link:",
            copyBtn: "Copy",
            copiedMsg: "Link copied!",
            refCountLabel: "Invited:",
            refEarnLabel: "Earned:",
            refCoinUnit: "coins"
        }
    };

    let currentLang = localStorage.getItem('sleep_lang') || (window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code === 'en' ? 'en' : 'ru');

    let myTelegramID = window.Telegram?.WebApp?.initDataUnsafe?.user?.id || "583920194";
    let botUsername = "SleepEarnSupport_bot"; 
    let fullRefLink = `https://t.me/${botUsername}?start=ref_${myTelegramID}`;

    document.getElementById('myRefLink').value = fullRefLink;

    let balance = parseInt(localStorage.getItem('sleep_balance')) || 0;
    let refCount = parseInt(localStorage.getItem('sleep_ref_count')) || 0;
    let refEarn = parseInt(localStorage.getItem('sleep_ref_earn')) || 0;

    let startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param || "";
    let isAlreadyReferred = localStorage.getItem('sleep_was_referred');

    if (startParam.startsWith("ref_") && !isAlreadyReferred) {
        let referrerID = startParam.replace("ref_", "");
        if (referrerID !== String(myTelegramID)) {
            balance += 200;
            localStorage.setItem('sleep_balance', balance);
            localStorage.setItem('sleep_was_referred', 'true');
            alert(currentLang === 'ru' ? "🎁 Вы получили +200 монет за переход!" : "🎁 +200 bonus coins received!");
        }
    }

    document.getElementById('refCount').innerText = refCount;
    document.getElementById('refEarn').innerText = refEarn;

    window.copyRefLink = function() {
        let copyText = document.getElementById("myRefLink");
        navigator.clipboard.writeText(copyText.value);
        alert(translations[currentLang].copiedMsg);
    };

    window.setLanguage = function(lang) {
        currentLang = lang;
        localStorage.setItem('sleep_lang', lang);

        document.getElementById('langRu').classList.toggle('active', lang === 'ru');
        document.getElementById('langEn').classList.toggle('active', lang === 'en');

        const t = translations[lang];
        document.getElementById('tAlert').innerHTML = t.alert;
        document.getElementById('tLimitLabel').innerText = t.limitLabel;
        document.getElementById('tHrsUnit').innerText = t.hrsUnit;
        document.getElementById('tHrsUnitMax').innerText = t.hrsUnit;
        document.getElementById('tPresetTitle').innerText = t.presetTitle;
        document.getElementById('preset1').innerText = t.preset1;
        document.getElementById('preset2').innerText = t.preset2;
        document.getElementById('preset3').innerText = t.preset3;
        document.getElementById('tBalanceLabel').innerText = t.balanceLabel;
        document.getElementById('tCoinUnit').innerText = t.coinUnit;
        document.getElementById('tHonesty').innerHTML = t.honesty;
        document.getElementById('tWithdrawLimit').innerHTML = t.withdrawLimit;
        document.getElementById('promoInput').placeholder = t.promoPlaceholder;
        document.getElementById('withdrawBtn').innerText = t.withdrawBtn;
        document.getElementById('tNavTerminal').innerText = t.navTerminal;
        document.getElementById('tNavCabinet').innerText = t.navCabinet;
        document.getElementById('tModalTitle').innerText = t.modalTitle;
        document.getElementById('tModalText').innerText = t.modalText;
        document.getElementById('tModalBtn').innerText = t.modalBtn;
        document.getElementById('tRefTitle').innerText = t.refTitle;
        document.getElementById('copyRefBtn').innerText = t.copyBtn;
        document.getElementById('tRefCountLabel').innerText = t.refCountLabel;
        document.getElementById('tRefEarnLabel').innerText = t.refEarnLabel;
        document.getElementById('tRefCoinUnit').innerText = t.refCoinUnit;

        if (!isFarming) {
            document.getElementById('startBtn').innerText = (limitMinutes > 0) ? t.startBtn : t.limitBtn;
        } else {
            document.getElementById('startBtn').innerText = t.stopBtn;
        }

        toggleModeUI();
    };

    const VideoController = window.Adsgram ? window.Adsgram.init({ blockId: "41720" }) : null;
    const BannerController = window.Adsgram ? window.Adsgram.init({ blockId: "YOUR_INTERSTITIAL_ID_HERE" }) : null;

    let lastLimitReset = localStorage.getItem('sleep_limit_reset') || '';
    let usedPromos = JSON.parse(localStorage.getItem('used_promos')) || [];

    let timerInterval = null;
    let currentSeconds = 300; 
    let isFarming = false;
    let wakeLock = null;
    let isClickActionPending = false;

    let isAutoMode = localStorage.getItem('sleep_auto_mode') === 'true';
    let selectedTimerMinutes = 5; 
    let maxLimitMinutes = 120; 
    let limitMinutes = localStorage.getItem('sleep_limit_minutes') !== null ? parseInt(localStorage.getItem('sleep_limit_minutes')) : maxLimitMinutes;

    const today = new Date().toDateString();
    if (lastLimitReset !== today) {
        limitMinutes = maxLimitMinutes;
        localStorage.setItem('sleep_limit_minutes', limitMinutes);
        localStorage.setItem('sleep_limit_reset', today);
    }

    const startBtn = document.getElementById('startBtn');
    const timerContainer = document.getElementById('timerContainer');
    const modeToggle = document.getElementById('modeToggle');
    const timerDisplay = document.getElementById('timer');
    const wakeVideo = document.getElementById('wakeVideo');

    if (!localStorage.getItem('sleep_first_run_done')) {
        document.getElementById('welcomeModal').style.display = 'flex';
    }

    modeToggle.checked = isAutoMode;
    
    setLanguage(currentLang);
    updateLimitDisplay();
    document.getElementById('balance').innerText = balance;

    function toggleModeUI() {
        const presetBox = document.getElementById('presetBox');
        const modeLabel = document.getElementById('modeLabel');
        const t = translations[currentLang];
        
        if (isAutoMode) {
            presetBox.style.display = 'block';
            modeLabel.innerText = t.modeBanner;
            let activePreset = document.querySelector('.preset-btn.active');
            if (activePreset) activePreset.click();
        } else {
            presetBox.style.display = 'none';
            modeLabel.innerText = t.modeVideo;
            selectedTimerMinutes = 5;
            maxLimitMinutes = 120;
            limitMinutes = maxLimitMinutes; // Сброс до макс. значения при переключении
            currentSeconds = selectedTimerMinutes * 60;
        }
        localStorage.setItem('sleep_limit_minutes', limitMinutes);
        updateTimerDisplay();
        updateLimitDisplay();
    }

    modeToggle.addEventListener('change', (e) => {
        if (isFarming) {
            alert(currentLang === 'ru' ? "Нельзя менять режим во время работы!" : "Cannot switch mode while running!");
            e.target.checked = isAutoMode;
            return;
        }
        isAutoMode = e.target.checked;
        localStorage.setItem('sleep_auto_mode', isAutoMode);
        toggleModeUI();
    });

    window.setPreset = function(timeMins, limitMins, btn) {
        if (isFarming) return;
        selectedTimerMinutes = timeMins;
        maxLimitMinutes = limitMins;
        limitMinutes = maxLimitMinutes; // Сброс до макс. значения при выборе пресета
        currentSeconds = selectedTimerMinutes * 60;
        
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        localStorage.setItem('sleep_limit_minutes', limitMinutes);
        updateTimerDisplay();
        updateLimitDisplay();
    };

    function updateLimitDisplay() {
        document.getElementById('limitHours').innerText = (limitMinutes / 60).toFixed(1);
        document.getElementById('maxLimitHours').innerText = (maxLimitMinutes / 60).toFixed(1);
    }

    function updateTimerDisplay() {
        let mins = Math.floor(currentSeconds / 60);
        let secs = currentSeconds % 60;
        timerDisplay.classList.remove('timer-loading');
        timerDisplay.style.fontSize = "26px";
        timerDisplay.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    window.closeModal = function() {
        localStorage.setItem('sleep_first_run_done', 'true');
        document.getElementById('welcomeModal').style.display = 'none';
    };

    async function enableScreenProtection() {
        try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } catch (e) {}
        if (wakeVideo) wakeVideo.play().catch(() => {});
    }

    function disableScreenProtection() {
        if (wakeLock !== null) { wakeLock.release(); wakeLock = null; }
        if (wakeVideo) wakeVideo.pause();
    }

    startBtn.addEventListener('click', () => {
        if (isClickActionPending) return;
        isClickActionPending = true;
        setTimeout(() => { isClickActionPending = false; }, 1000);

        if (!isFarming) {
            if (limitMinutes <= 0) { 
                alert(currentLang === 'ru' ? "Суточный лимит исчерпан!" : "Daily limit reached!"); 
                return; 
            }
            
            isFarming = true;
            const t = translations[currentLang];
            startBtn.innerText = t.stopBtn;
            startBtn.classList.add('btn-stop');
            timerContainer.classList.add('active');
            enableScreenProtection();

            runFarmingCycle();
        } else {
            stopFarming(currentLang === 'ru' ? "Терминал остановлен пользователем." : "Terminal stopped by user.");
        }
    });

    function runFarmingCycle() {
        if (!isFarming) return;

        const t = translations[currentLang];
        
        timerDisplay.classList.add('timer-loading');
        timerDisplay.style.fontSize = "13px";
        timerDisplay.innerText = t.loadingAd;

        const onAdWatchedSuccess = (reward) => {
            if (!isFarming) return;

            balance += reward;
            limitMinutes -= selectedTimerMinutes;
            if (limitMinutes < 0) limitMinutes = 0;

            localStorage.setItem('sleep_balance', balance);
            localStorage.setItem('sleep_limit_minutes', limitMinutes);
            document.getElementById('balance').innerText = balance;
            updateLimitDisplay();

            if (limitMinutes <= 0) {
                stopFarming(currentLang === 'ru' ? "Суточный лимит исчерпан!" : "Daily limit reached!");
                startBtn.innerText = t.limitBtn;
                startBtn.disabled = true;
                return;
            }

            currentSeconds = selectedTimerMinutes * 60;
            updateTimerDisplay();

            clearInterval(timerInterval);
            timerInterval = setInterval(() => {
                currentSeconds--;
                updateTimerDisplay();

                if (currentSeconds <= 0) {
                    clearInterval(timerInterval);
                    if (isFarming) {
                        runFarmingCycle(); 
                    }
                }
            }, 1000);
        };

        if (window.location.protocol === 'file:') {
            setTimeout(() => {
                onAdWatchedSuccess(isAutoMode ? 2 : 7);
            }, 2000);
            return;
        }

        if (isAutoMode) {
            if (BannerController) {
                BannerController.show()
                    .then(() => { onAdWatchedSuccess(2); })
                    .catch((err) => { handleAdError(err); });
            } else { 
                setTimeout(() => { onAdWatchedSuccess(2); }, 2000);
            }
        } else {
            if (VideoController) {
                VideoController.show()
                    .then(() => { onAdWatchedSuccess(7); })
                    .catch((err) => { handleAdError(err); });
            } else { 
                setTimeout(() => { onAdWatchedSuccess(7); }, 2000);
            }
        }
    }

    function handleAdError(error) {
        stopFarming();
        alert(translations[currentLang].adErrorAlert);
    }

    function stopFarming(message) {
        const t = translations[currentLang];
        clearInterval(timerInterval);
        isFarming = false;
        startBtn.innerText = t.startBtn;
        startBtn.classList.remove('btn-stop');
        timerContainer.classList.remove('active');
        disableScreenProtection();
        
        currentSeconds = selectedTimerMinutes * 60;
        updateTimerDisplay();
        
        if (message) alert(message);
    }

    document.getElementById('promoBtn').addEventListener('click', () => {
        let code = document.getElementById('promoInput').value.trim().toUpperCase();
        if (!code) return;
        
        if (usedPromos.includes(code)) {
            alert(currentLang === 'ru' ? "Вы уже активировали этот промокод!" : "Promo code already used!");
            return;
        }

        if (code === "BONUS300") {
            balance += 300;
            localStorage.setItem('sleep_balance', balance);
            document.getElementById('balance').innerText = balance;
            usedPromos.push(code);
            localStorage.setItem('used_promos', JSON.stringify(usedPromos));
            alert(currentLang === 'ru' ? "🎉 Бонус +300 монет зачислен!" : "🎉 Bonus +300 Coins claimed!");
            document.getElementById('promoInput').value = "";
        } 
        else { 
            alert(currentLang === 'ru' ? "❌ Неверный промокод." : "❌ Invalid promo code."); 
        }
    });

    document.getElementById('withdrawBtn').addEventListener('click', () => {
        if (balance < 2000) {
            alert(currentLang === 'ru' 
                ? "Недостаточно монет! Мин. вывод 2000 монет (~0.1 TON)." 
                : "Insufficient coins! Min withdrawal is 2000 coins.");
        } else {
            alert(currentLang === 'ru' 
                ? `Заявка доступна!\n\nНапишите администратору @${botUsername} для получения выплаты.` 
                : `Send request to @${botUsername} to receive payout.`);
        }
    });
});
