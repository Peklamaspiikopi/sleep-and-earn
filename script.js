document.addEventListener('DOMContentLoaded', async () => {
    // Безопасное чтение ключей из окружения Vercel или window-переменных
    const SUPABASE_URL = window.ENV_SUPABASE_URL || "https://dpbrrirjnsobmtojzwtx.supabase.co";
    const SUPABASE_KEY = window.ENV_SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."; // Публичный anon ключ или переменная
    const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

    const translations = {
        ru: {
            alert: "<b>Экран гаснет?</b> Во избежание пауз продлите время работы дисплея в настройках телефона или используйте софт для удержания активного экрана.",
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
            honesty: "🛡️ <b>Правило честности:</b> Мы за прозрачное сотрудничество. Любые накрутки фиксируются системой. Предоставляем 1 предупреждение без блокировки аккаунта.",
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
            alert: "<b>Screen turning off?</b> To avoid pauses, extend display timeout in your phone settings or use an active screen app.",
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
            honesty: "🛡️ <b>Fair Play:</b> We stand for transparent cooperation. Any cheating is logged by the system. 1 warning is given before account ban.",
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
    let myTelegramID = String(window.Telegram?.WebApp?.initDataUnsafe?.user?.id || "583920194");
    let botUsername = "SleepEarnSupport_bot"; 
    let fullRefLink = `https://t.me/${botUsername}?start=ref_${myTelegramID}`;
    document.getElementById('myRefLink').value = fullRefLink;

    let userData = {
        balance: 0,
        ref_count: 0,
        ref_earn: 0,
        limit_minutes: 120,
        used_promos: [],
        last_reset: new Date().toDateString()
    };

    if (supabaseClient) {
        let { data, error } = await supabaseClient
            .from('users')
            .select('*')
            .eq('telegram_id', myTelegramID)
            .single();

        const today = new Date().toDateString();

        if (data) {
            userData = data;
            if (userData.last_reset !== today) {
                userData.limit_minutes = 120;
                userData.last_reset = today;
                await updateSupabase({ limit_minutes: 120, last_reset: today });
            }
        } else {
            await supabaseClient.from('users').insert([{
                telegram_id: myTelegramID,
                balance: 0,
                ref_count: 0,
                ref_earn: 0,
                limit_minutes: 120,
                used_promos: [],
                last_reset: today
            }]);
        }
    }

    async function updateSupabase(fields) {
        if (!supabaseClient) return;
        await supabaseClient
            .from('users')
            .update(fields)
            .eq('telegram_id', myTelegramID);
    }

    document.getElementById('refCount').innerText = userData.ref_count;
    document.getElementById('refEarn').innerText = userData.ref_earn;
    document.getElementById('balance').innerText = userData.balance;

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
            document.getElementById('startBtn').innerText = (userData.limit_minutes > 0) ? t.startBtn : t.limitBtn;
        } else {
            document.getElementById('startBtn').innerText = t.stopBtn;
        }

        toggleModeUI(false);
    };

    const VideoController = window.Adsgram ? window.Adsgram.init({ blockId: "41720" }) : null;
    const BannerController = window.Adsgram ? window.Adsgram.init({ blockId: "YOUR_INTERSTITIAL_ID_HERE" }) : null;

    let timerInterval = null;
    let currentSeconds = 300; 
    let isFarming = false;
    let wakeLock = null;
    let isClickActionPending = false;

    let isAutoMode = localStorage.getItem('sleep_auto_mode') === 'true';
    let selectedTimerMinutes = 5; 
    let maxLimitMinutes = isAutoMode ? 180 : 120; 
    let limitMinutes = userData.limit_minutes;

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

    function toggleModeUI() {
        const presetBox = document.getElementById('presetBox');
        const modeLabel = document.getElementById('modeLabel');
        const t = translations[currentLang];
        
        if (isAutoMode) {
            presetBox.style.display = 'block';
            modeLabel.innerText = t.modeBanner;
            maxLimitMinutes = 180; 
        } else {
            presetBox.style.display = 'none';
            modeLabel.innerText = t.modeVideo;
            maxLimitMinutes = 120;
            selectedTimerMinutes = 5;
        }
        
        if (limitMinutes > maxLimitMinutes) {
            limitMinutes = maxLimitMinutes;
        }

        currentSeconds = selectedTimerMinutes * 60;
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
        
        if (limitMinutes > maxLimitMinutes) {
            limitMinutes = maxLimitMinutes;
        }
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

        const onAdWatchedSuccess = async (reward) => {
            if (!isFarming) return;

            userData.balance += reward;
            limitMinutes -= selectedTimerMinutes;
            if (limitMinutes < 0) limitMinutes = 0;
            userData.limit_minutes = limitMinutes;

            document.getElementById('balance').innerText = userData.balance;
            updateLimitDisplay();

            await updateSupabase({
                balance: userData.balance,
                limit_minutes: userData.limit_minutes
            });

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

    document.getElementById('promoBtn').addEventListener('click', async () => {
        let code = document.getElementById('promoInput').value.trim().toUpperCase();
        if (!code) return;
        
        if (userData.used_promos && userData.used_promos.includes(code)) {
            alert(currentLang === 'ru' ? "Вы уже активировали этот промокод!" : "Promo code already used!");
            return;
        }

        if (code === "BONUS300") {
            userData.balance += 300;
            if (!userData.used_promos) userData.used_promos = [];
            userData.used_promos.push(code);

            document.getElementById('balance').innerText = userData.balance;

            await updateSupabase({
                balance: userData.balance,
                used_promos: userData.used_promos
            });

            alert(currentLang === 'ru' ? "🎉 Бонус +300 монет зачислен!" : "🎉 Bonus +300 Coins claimed!");
            document.getElementById('promoInput').value = "";
        } 
        else { 
            alert(currentLang === 'ru' ? "❌ Неверный промокод." : "❌ Invalid promo code."); 
        }
    });

    document.getElementById('withdrawBtn').addEventListener('click', () => {
        if (userData.balance < 2000) {
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
