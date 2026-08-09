document.addEventListener('DOMContentLoaded', async () => {
    const SUPABASE_URL = window.ENV_SUPABASE_URL || "https://dpbrrirjnsobmtojzwtx.supabase.co";
    const SUPABASE_KEY = window.ENV_SUPABASE_KEY || "";
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
            modalText: "Привет! Это первый запуск терминала. Пожалуйста, если вы заметите ошибку — напишите в техподдержку!",
            modalBtn: "Понятно",
            loadingAd: "⏳ Загрузка...",
            adErrorAlert: "❌ Реклама не загрузилась!\n\nЕсли у вас включен VPN или AdBlock, отключите их.",
            refTitle: "🔗 Ваша реферальная ссылка:",
            copyBtn: "Копировать",
            copiedMsg: "Ссылка скопирована!",
            refCountLabel: "Приглашено:",
            refEarnLabel: "Доход:",
            refCoinUnit: "монет",
            dimLabel: "🌙 Затемнение экрана",
            claimBonusBtn: "🎁 Забрать бонус (+Реклама)"
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
            refCoinUnit: "coins",
            dimLabel: "🌙 Screen Dimmer",
            claimBonusBtn: "🎁 Claim Bonus (+Ad)"
        }
    };

    let currentLang = localStorage.getItem('sleep_lang') || (window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code === 'en' ? 'en' : 'ru');
    let myTelegramID = String(window.Telegram?.WebApp?.initDataUnsafe?.user?.id || "583920194");
    let botUsername = "SleepEarnSupport_bot"; 
    let fullRefLink = `https://t.me/${botUsername}?start=ref_${myTelegramID}`;
    document.getElementById('myRefLink').value = fullRefLink;

    let isAutoMode = localStorage.getItem('sleep_auto_mode') === 'true';
    let maxLimitMinutes = isAutoMode ? 180 : 120; 
    
    let userData = {
        balance: 0,
        ref_count: 0,
        ref_earn: 0,
        limit_minutes: maxLimitMinutes,
        used_promos: [],
        last_reset: new Date().toDateString()
    };

    if (supabaseClient) {
        let { data } = await supabaseClient
            .from('users')
            .select('*')
            .eq('telegram_id', myTelegramID)
            .single();

        const today = new Date().toDateString();

        if (data) {
            userData = data;
            if (userData.last_reset !== today) {
                userData.limit_minutes = maxLimitMinutes;
                userData.last_reset = today;
                await updateSupabase({ limit_minutes: maxLimitMinutes, last_reset: today });
            }
        } else {
            await supabaseClient.from('users').insert([{
                telegram_id: myTelegramID,
                balance: 0,
                ref_count: 0,
                ref_earn: 0,
                limit_minutes: maxLimitMinutes,
                used_promos: [],
                last_reset: today
            }]);
        }
    }

    let limitMinutes = userData.limit_minutes;

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

        const dimLabelEl = document.getElementById('tDimLabel');
        if (dimLabelEl) dimLabelEl.innerText = t.dimLabel;

        if (!isFarming) {
            document.getElementById('startBtn').innerText = (limitMinutes > 0) ? t.startBtn : t.limitBtn;
        } else {
            document.getElementById('startBtn').innerText = t.stopBtn;
        }

        toggleModeUI(false);
    };

    let videoController = null;
    let bannerController = null;

    if (window.Adsgram) {
        videoController = window.Adsgram.init({ blockId: "41922" });
        bannerController = window.Adsgram.init({ blockId: "int-41924" });
    }

    let timerInterval = null;
    let currentSeconds = 300; 
    let isFarming = false;
    let wakeLock = null;
    let isClickActionPending = false;
    let selectedTimerMinutes = 5; 

    const startBtn = document.getElementById('startBtn');
    const timerContainer = document.getElementById('timerContainer');
    const modeToggle = document.getElementById('modeToggle');
    const timerDisplay = document.getElementById('timer');
    const wakeVideo = document.getElementById('wakeVideo');

    // Затемнение экрана (добавим элемент динамически, если его нет в HTML)
    let dimOverlay = document.getElementById('dimOverlay');
    if (!dimOverlay) {
        dimOverlay = document.createElement('div');
        dimOverlay.id = 'dimOverlay';
        dimOverlay.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0); pointer-events: none; z-index: 999; transition: background-color 0.3s ease;";
        document.body.appendChild(dimOverlay);
    }

    const dimSlider = document.getElementById('dimSlider');
    if (dimSlider) {
        dimSlider.addEventListener('input', (e) => {
            const opacity = e.target.value / 100;
            dimOverlay.style.backgroundColor = `rgba(0, 0, 0, ${opacity})`;
            dimOverlay.style.pointerEvents = opacity > 0.5 ? 'auto' : 'none';
        });
        dimOverlay.addEventListener('click', () => {
            dimSlider.value = 0;
            dimOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0)';
            dimOverlay.style.pointerEvents = 'none';
        });
    }

    if (!localStorage.getItem('sleep_first_run_done')) {
        document.getElementById('welcomeModal').style.display = 'flex';
    }

    modeToggle.checked = isAutoMode;
    toggleModeUI(true);
    setLanguage(currentLang);

    function toggleModeUI(resetLimit = false) {
        const presetBox = document.getElementById('presetBox');
        const modeLabel = document.getElementById('modeLabel');
        const t = translations[currentLang];
        
        if (isAutoMode) {
            presetBox.style.display = 'block';
            modeLabel.innerText = t.modeBanner;
            if (resetLimit && (limitMinutes > 180 || limitMinutes === 120)) {
                maxLimitMinutes = 180;
                limitMinutes = 180;
            } else if (!maxLimitMinutes || maxLimitMinutes === 120) {
                maxLimitMinutes = 180;
            }
        } else {
            presetBox.style.display = 'none';
            modeLabel.innerText = t.modeVideo;
            maxLimitMinutes = 120;
            if (resetLimit && limitMinutes > 120) {
                limitMinutes = 120;
            }
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
        
        maxLimitMinutes = isAutoMode ? 180 : 120;
        limitMinutes = maxLimitMinutes;
        
        toggleModeUI(false);
        updateSupabase({ limit_minutes: limitMinutes });
    });

    window.setPreset = function(timeMins, limitMins, btn) {
        if (isFarming) return;
        selectedTimerMinutes = timeMins;
        maxLimitMinutes = limitMins;
        limitMinutes = limitMins; 
        
        currentSeconds = selectedTimerMinutes * 60;
        
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        updateTimerDisplay();
        updateLimitDisplay();
        updateSupabase({ limit_minutes: limitMinutes });
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

            runFreeTimer();
        } else {
            stopFarming(currentLang === 'ru' ? "Терминал остановлен пользователем." : "Terminal stopped by user.");
        }
    });

    function runFreeTimer() {
        if (!isFarming) return;
        if (timerInterval) clearInterval(timerInterval);

        currentSeconds = selectedTimerMinutes * 60;
        updateTimerDisplay();

        timerInterval = setInterval(() => {
            if (!isFarming) {
                clearInterval(timerInterval);
                return;
            }
            currentSeconds--;
            updateTimerDisplay();

            if (currentSeconds <= 0) {
                clearInterval(timerInterval);
                if (isFarming) {
                    // Цикл завершился: предлагаем добровольный бонус с просмотром рекламы
                    promptUserForBonus();
                }
            }
        }, 1000);
    }

    function promptUserForBonus() {
        const rewardAmount = isAutoMode ? 2 : 7;
        const msg = currentLang === 'ru' 
            ? `Сессия завершена! Посмотреть рекламу и получить +${reward} монет?` 
            : `Session finished! Watch an ad to claim +${reward} coins?`;

        if (confirm(msg)) {
            claimBonusReward(rewardAmount);
        } else {
            // Если отказался, запускаем следующий таймер бесплатно
            runFreeTimer();
        }
    }

    window.claimBonusReward = function(reward) {
        if (window.location.protocol === 'file:') {
            grantReward(reward);
            return;
        }

        const t = translations[currentLang];
        timerDisplay.classList.add('timer-loading');
        timerDisplay.style.fontSize = "13px";
        timerDisplay.innerText = t.loadingAd;

        if (isAutoMode) {
            if (bannerController) {
                bannerController.show()
                    .then(() => { grantReward(reward); })
                    .catch((err) => { handleAdError(err); });
            } else {
                handleAdError("Banner controller not initialized");
            }
        } else {
            if (videoController) {
                videoController.show()
                    .then((result) => {
                        if (result.done) { grantReward(reward); }
                        else { handleAdError("Ad closed"); }
                    })
                    .catch((err) => { handleAdError(err); });
            } else {
                handleAdError("Video controller not initialized");
            }
        }
    };

    async function grantReward(reward) {
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
            startBtn.innerText = translations[currentLang].limitBtn;
            startBtn.disabled = true;
            return;
        }

        runFreeTimer();
    }

    function handleAdError(error) {
        alert(translations[currentLang].adErrorAlert);
        runFreeTimer(); // продолжать работу таймера даже при сбое рекламы
    }

    function stopFarming(message) {
        if (timerInterval) clearInterval(timerInterval);
        isFarming = false;
        const t = translations[currentLang];
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
