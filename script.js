document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 1. ДВУЯЗЫЧНЫЙ СЛОВАРЬ (RU / EN)
    // ==========================================
    const translations = {
        ru: {
            alert: "💡 <b>Экран гаснет?</b> Отключите спящий режим в настройках телефона или используйте утилиту удержания экрана (например, <i>Caffeine</i> или <i>Keep Screen On</i>).",
            limitLabel: "⏱️ Суточный лимит:",
            hrsUnit: "ч.",
            modeVideo: "🎥 Режим: Ручные видео",
            modeBanner: "🤖 Режим: Авто-баннеры",
            presetTitle: "РЕЖИМ АВТОНОМНОЙ СЕССИИ:",
            preset1: "⚡ 3 ЧАСА",
            preset2: "🛌 5 ЧАСОВ",
            preset3: "🌙 7 ЧАСОВ",
            balanceLabel: "Ваш баланс:",
            coinUnit: "Монет",
            startBtn: "Запустить терминал",
            stopBtn: "Остановить терминал",
            limitBtn: "Лимит исчерпан",
            infoRate: "💎 Курс: <b>1 Монета = $0.0001 (выплаты в TON)</b>",
            infoVid: "📺 Награда за видео-ролик: <b style='color:#00e676'>+7 Монет</b>",
            infoBan: "🤖 Награда за авто-баннер: <b style='color:#00b0ff'>+2 Монеты</b>",
            infoRef: "👥 Приглашенному: <b style='color:#00e676'>+200 монет</b> | Вам: <b style='color:#e040fb'>+15% от вывода!</b>",
            honesty: "🛡️ <b>Правило честности:</b> Просим о честном сотрудничестве! Попытки накрутки проверяются. Если вы оступились, напишите в поддержку — даем 1 шанс списать накрученный баланс без бана.",
            withdrawLimit: "🔒 Минимальный вывод: <b>2000 Монет (~0.1 TON)</b>.",
            promoPlaceholder: "Введите акционный промокод...",
            withdrawBtn: "Заказать вывод средств",
            navTerminal: "Терминал",
            navCabinet: "Кабинет",
            modalTitle: "🚀 Первый запуск!",
            modalText: "Привет! Это первый запуск авто-терминала. Пожалуйста, если вы заметите ошибку — напишите в техподдержку!",
            modalBtn: "Понятно",
            loadingAd: "⏳ Идет просмотр рекламы...",
            adErrorAlert: "❌ Реклама не досмотрена или не загрузилась!\n\nМонеты не начислены. Если у вас включен VPN или AdBlock, отключите блокировщики.",
            refTitle: "🔗 Ваша реферальная ссылка:",
            copyBtn: "Копировать",
            copiedMsg: "Реферальная ссылка скопирована!",
            refCountLabel: "Приглашено:",
            refEarnLabel: "Доход:",
            refCoinUnit: "монет"
        },
        en: {
            alert: "💡 <b>Screen dims?</b> Disable sleep mode in phone settings or use screen keep-awake apps (e.g., <i>Caffeine</i> or <i>Keep Screen On</i>).",
            limitLabel: "⏱️ Daily Limit:",
            hrsUnit: "hrs",
            modeVideo: "🎥 Mode: Manual Videos",
            modeBanner: "🤖 Mode: Auto-Banners",
            presetTitle: "AUTONOMOUS SESSION MODE:",
            preset1: "⚡ 3 HOURS",
            preset2: "🛌 5 HOURS",
            preset3: "🌙 7 HOURS",
            balanceLabel: "Your Balance:",
            coinUnit: "Coins",
            startBtn: "Start Terminal",
            stopBtn: "Stop Terminal",
            limitBtn: "Limit Reached",
            infoRate: "💎 Rate: <b>1 Coin = $0.0001 (Payouts in TON)</b>",
            infoVid: "📺 Reward per Video: <b style='color:#00e676'>+7 Coins</b>",
            infoBan: "🤖 Reward per Auto-Banner: <b style='color:#00b0ff'>+2 Coins</b>",
            infoRef: "👥 Invited gets: <b style='color:#00e676'>+200 coins</b> | You get: <b style='color:#e040fb'>+15% from payout!</b>",
            honesty: "🛡️ <b>Fair Play Rule:</b> Please cooperate honestly! Any cheat attempts are checked. If you made a mistake, contact support for 1 chance to reset cheated coins without a ban.",
            withdrawLimit: "🔒 Min Withdrawal: <b>2000 Coins (~0.1 TON)</b>.",
            promoPlaceholder: "Enter promo code...",
            withdrawBtn: "Request Withdrawal",
            navTerminal: "Terminal",
            navCabinet: "Cabinet",
            modalTitle: "🚀 First Launch!",
            modalText: "Welcome! This is the first launch of the auto-terminal. If you notice any bugs, please contact support!",
            modalBtn: "Got it",
            loadingAd: "⏳ Watching ad...",
            adErrorAlert: "❌ Ad was not completed or failed to load!\n\nCoins were not rewarded. Please disable AdBlock / VPN rules if enabled.",
            refTitle: "🔗 Your Referral Link:",
            copyBtn: "Copy",
            copiedMsg: "Referral link copied!",
            refCountLabel: "Invited:",
            refEarnLabel: "Earned:",
            refCoinUnit: "coins"
        }
    };

    let currentLang = localStorage.getItem('sleep_lang') || (window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code === 'en' ? 'en' : 'ru');

    // ==========================================
    // 2. ИНИЦИАЛИЗАЦИЯ TELEGRAM И РЕФЕРАЛОВ
    // ==========================================
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
            alert(currentLang === 'ru' ? "🎁 Вы перешли по приглашению и получили +200 монет!" : "🎁 You joined via invite link and got +200 bonus coins!");
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
        document.getElementById('tInfoRate').innerHTML = t.infoRate;
        document.getElementById('tInfoVid').innerHTML = t.infoVid;
        document.getElementById('tInfoBan').innerHTML = t.infoBan;
        document.getElementById('tInfoRef').innerHTML = t.infoRef;
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

    // ==========================================
    // 3. ADSGRAM КОНТРОЛЛЕРЫ (ЗАМЕНИТЕ ID ПОСЛЕ ПОЛУЧЕНИЯ КЛЮЧЕЙ!)
    // ==========================================
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
            limitMinutes = maxLimitMinutes;
            currentSeconds = selectedTimerMinutes * 60;
        }
        updateTimerDisplay();
        updateLimitDisplay();
    }

    modeToggle.addEventListener('change', (e) => {
        if (isFarming) {
            alert(currentLang === 'ru' ? "Нельзя менять режим во время работы терминала!" : "Cannot switch mode while terminal is running!");
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
        limitMinutes = maxLimitMinutes;
        currentSeconds = selectedTimerMinutes * 60;
        
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
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

    // ==========================================
    // 4. ТЕРМИНАЛ И ПРОВЕРЕННЫЙ ПОКАЗ РЕКЛАМЫ
    // ==========================================

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

            timerDisplay.style.fontSize = "20px";
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
            }, 3000);
            return;
        }

        if (isAutoMode) {
            if (BannerController) {
                BannerController.show()
                    .then(() => { onAdWatchedSuccess(2); })
                    .catch((err) => { handleAdError(err); });
            } else { handleAdError("Controller Error"); }
        } else {
            if (VideoController) {
                VideoController.show()
                    .then(() => { onAdWatchedSuccess(7); })
                    .catch((err) => { handleAdError(err); });
            } else { handleAdError("Controller Error"); }
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
        
        timerDisplay.style.fontSize = "20px";
        currentSeconds = selectedTimerMinutes * 60;
        updateTimerDisplay();
        
        if (message) alert(message);
    }

    // ==========================================
    // 5. ПРОМОКОДЫ И ВЫВОД СРЕДСТВ
    // ==========================================
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
            alert(currentLang === 'ru' ? "🎉 Приветственный бонус +300 монет зачислен!" : "🎉 Welcome bonus +300 Coins claimed!");
            document.getElementById('promoInput').value = "";
        } 
        else { 
            alert(currentLang === 'ru' ? "❌ Неверный промокод." : "❌ Invalid promo code."); 
        }
    });

    document.getElementById('withdrawBtn').addEventListener('click', () => {
        if (balance < 2000) {
            alert(currentLang === 'ru' 
                ? "Ошибка: Недостаточно монет! Мин. вывод 2000 монет (~0.1 TON)." 
                : "Error: Insufficient coins! Min withdrawal is 2000 coins (~0.1 TON).");
        } else {
            alert(currentLang === 'ru' 
                ? `Заявка доступна!\n\nОтправьте ваш TON-адрес (или Telegram ID) администратору @${botUsername} для получения выплаты.` 
                : `Request available!\n\nSend your TON address (or Telegram ID) to @${botUsername} to receive payout.`);
        }
    });
});
