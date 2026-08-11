document.addEventListener('DOMContentLoaded', async () => {
    const SUPABASE_URL = window.ENV_SUPABASE_URL || "https://dpbrrirjnsobmtojzwtx.supabase.co";
    const SUPABASE_KEY = window.ENV_SUPABASE_KEY || "";
    const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

    const translations = {
        ru: {
            alert: "<b>Экран гаснет?</b> Во избежание пауз продлите время работы дисплея в настройках телефона или используйте софт для удержания активного экрана.",
            fairPlayWarning: "⚠️ <b>Важно:</b> Для честного начисления наград приложение должно быть открыто на экране (нельзя сворачивать и гасить экран). Использование ботов и автокликеров запрещено.",
            limitLabel: "⏱️ Суточный лимит:",
            hrsUnit: "ч.",
            modeVideo: "🎥 Режим: Ручные видео",
            modeBanner: "🤖 Режим: Авто-баннеры",
            presetTitle: "Сессия авто-просмотров:",
            pr1: "3 ЧАСА",
            pr2: "5 ЧАСОВ",
            pr3: "7 ЧАСОВ",
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
            adErrorAlert: "❌ Реклама не загрузилась!\n\nЕсли у вас включен VPN или AdBlock, отключите их.",
            refTitle: "🔗 Ваша реферальная ссылка:",
            copyBtn: "Копировать",
            copiedMsg: "Ссылка скопирована!",
            refCountLabel: "Приглашено:",
            refEarnLabel: "Доход:",
            refCoinUnit: "монет",
            dimLabel: "🌙 Затемнение экрана",
            backgroundWarning: "⚠️ Внимание! Нельзя сворачивать приложение или выключать экран во время работы терминала!",
            autoConfirmMsg: "🤖 Внимание! Вы активируете авто-режим на выбранное время. Лимит выбранного пресета спишется сразу. Не закрывайте приложение и не выключайте экран. Подтвердить запуск?",
            presetLimitError: "❌ Недостаточно суточного лимита для этого пресета!",
            
            statCourseTitle: "💎 КУРС",
            statCourseVal: "1 Монета = $0.0001",
            statVideoTitle: "📺 ВИДЕО-РОЛИК",
            statVideoVal: "+7 Монет",
            statBannerTitle: "🤖 АВТО-БАННЕР",
            statBannerVal: "+2 Монеты",
            statRefTitle: "👥 РЕФЕРАЛЫ",
            statRefVal: "+15% от вывода"
        },
        en: {
            alert: "<b>Screen turning off?</b> To avoid pauses, extend display timeout in your phone settings or use an active screen app.",
            fairPlayWarning: "⚠️ <b>Important:</b> For fair rewards, the app must stay open on screen (do not minimize or turn off the screen). Bots and auto-clickers are prohibited.",
            limitLabel: "⏱️ Daily Limit:",
            hrsUnit: "hrs",
            modeVideo: "🎥 Mode: Manual Videos",
            modeBanner: "🤖 Mode: Auto-Banners",
            presetTitle: "Auto-session preset:",
            pr1: "3 HOURS",
            pr2: "5 HOURS",
            pr3: "7 HOURS",
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
            adErrorAlert: "❌ Ad failed to load! Please disable AdBlock or VPN.",
            refTitle: "🔗 Your Referral Link:",
            copyBtn: "Copy",
            copiedMsg: "Link copied!",
            refCountLabel: "Invited:",
            refEarnLabel: "Earned:",
            refCoinUnit: "coins",
            dimLabel: "🌙 Screen Dimmer",
            backgroundWarning: "⚠️ Warning! Do not minimize the app or turn off the screen while the terminal is running!",
            autoConfirmMsg: "🤖 Warning! You are activating the auto-mode. The preset limit will be deducted immediately. Do not close the app or turn off the screen. Confirm start?",
            presetLimitError: "❌ Insufficient daily limit for this preset!",
            
            statCourseTitle: "💎 RATE",
            statCourseVal: "1 Coin = $0.0001",
            statVideoTitle: "📺 MANUAL VIDEO",
            statVideoVal: "+7 Coins",
            statBannerTitle: "🤖 AUTO-BANNER",
            statBannerVal: "+2 Coins",
            statRefTitle: "👥 REFERRALS",
            statRefVal: "+15% of payout"
        }
    };

    let currentLang = localStorage.getItem('sleep_lang') || (window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code === 'en' ? 'en' : 'ru');
    let myTelegramID = String(window.Telegram?.WebApp?.initDataUnsafe?.user?.id || "583920194");
    let botUsername = "SleepEarnSupport_bot"; 
    let fullRefLink = `https://t.me/${botUsername}?start=ref_${myTelegramID}`;
    const refLinkInput = document.getElementById('myRefLink');
    if (refLinkInput) refLinkInput.value = fullRefLink;

    let isAutoMode = localStorage.getItem('sleep_auto_mode') === 'true';
    let maxManualLimit = 120; // 2 часа для ручного
    let maxAutoLimit = 420;   // 7 часов максимальный пресет для авто
    let maxLimitMinutes = isAutoMode ? maxAutoLimit : maxManualLimit; 
    
    let userData = {
        balance: 0,
        ref_count: 0,
        ref_earn: 0,
        manual_limit: 120,
        auto_limit: 420,
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
            if (userData.limit_minutes !== undefined && userData.manual_limit === undefined) {
                userData.manual_limit = userData.limit_minutes;
                userData.auto_limit = 420;
            }
            if (userData.last_reset !== today) {
                userData.manual_limit = maxManualLimit;
                userData.auto_limit = maxAutoLimit;
                userData.last_reset = today;
                await updateSupabase({ manual_limit: maxManualLimit, auto_limit: maxAutoLimit, last_reset: today });
            }
        } else {
            await supabaseClient.from('users').insert([{
                telegram_id: myTelegramID,
                balance: 0,
                ref_count: 0,
                ref_earn: 0,
                manual_limit: maxManualLimit,
                auto_limit: maxAutoLimit,
                used_promos: [],
                last_reset: today
            }]);
        }
    }

    let limitMinutes = isAutoMode ? userData.auto_limit : userData.manual_limit;

    async function updateSupabase(fields) {
        if (!supabaseClient) return;
        await supabaseClient
            .from('users')
            .update(fields)
            .eq('telegram_id', myTelegramID);
    }

    const refCountEl = document.getElementById('refCount');
    const refEarnEl = document.getElementById('refEarn');
    const balanceEl = document.getElementById('balance');
    if (refCountEl) refCountEl.innerText = userData.ref_count;
    if (refEarnEl) refEarnEl.innerText = userData.ref_earn;
    if (balanceEl) balanceEl.innerText = userData.balance;

    window.copyRefLink = function() {
        let copyText = document.getElementById("myRefLink");
        if (copyText) {
            navigator.clipboard.writeText(copyText.value);
            alert(translations[currentLang].copiedMsg);
        }
    };

    window.setLanguage = function(lang) {
        currentLang = lang;
        localStorage.setItem('sleep_lang', lang);

        const langRu = document.getElementById('langRu');
        const langEn = document.getElementById('langEn');
        if (langRu) langRu.classList.toggle('active', lang === 'ru');
        if (langEn) langEn.classList.toggle('active', lang === 'en');

        const t = translations[lang];
        
        const setText = (id, text) => { const el = document.getElementById(id); if (el) el.innerHTML = text; };
        
        setText('tAlert', t.alert);
        setText('tFairPlayWarning', t.fairPlayWarning);
        setText('tLimitLabel', t.limitLabel);
        setText('tHrsUnit', t.hrsUnit);
        setText('tHrsUnitMax', t.hrsUnit);
        setText('tPresetTitle', t.presetTitle);
        setText('tPr1', t.pr1);
        setText('tPr2', t.pr2);
        setText('tPr3', t.pr3);
        setText('tBalanceLabel', t.balanceLabel);
        setText('tCoinUnit', t.coinUnit);
        setText('tHonesty', t.honesty);
        setText('tWithdrawLimit', t.withdrawLimit);
        setText('withdrawBtn', t.withdrawBtn);
        setText('tNavTerminal', t.navTerminal);
        setText('tNavCabinet', t.navCabinet);
        setText('tModalTitle', t.modalTitle);
        setText('tModalText', t.modalText);
        setText('tModalBtn', t.modalBtn);
        setText('tRefTitle', t.refTitle);
        setText('copyRefBtn', t.copyBtn);
        setText('tRefCountLabel', t.refCountLabel);
        setText('tRefEarnLabel', t.refEarnLabel);
        setText('tRefCoinUnit', t.refCoinUnit);
        setText('tDimLabel', t.dimLabel);
        
        setText('statCourseTitle', t.statCourseTitle);
        setText('statCourseVal', t.statCourseVal);
        setText('statVideoTitle', t.statVideoTitle);
        setText('statVideoVal', t.statVideoVal);
        setText('statBannerTitle', t.statBannerTitle);
        setText('statBannerVal', t.statBannerVal);
        setText('statRefTitle', t.statRefTitle);
        setText('statRefVal', t.statRefVal);

        const promoInput = document.getElementById('promoInput');
        if (promoInput) promoInput.placeholder = t.promoPlaceholder;

        const startBtn = document.getElementById('startBtn');
        if (startBtn) {
            if (!isFarming) {
                if (limitMinutes > 0) {
                    startBtn.innerText = t.startBtn;
                    startBtn.disabled = false;
                } else {
                    startBtn.innerText = t.limitBtn;
                    startBtn.disabled = true;
                }
            } else {
                startBtn.innerText = t.stopBtn;
                startBtn.disabled = false;
            }
        }

        toggleModeUI();
    };

    let timerInterval = null;
    let selectedSessionSeconds = 180 * 60; // По умолчанию 3 часа для авто
    let currentSeconds = selectedSessionSeconds; 
    let isFarming = false;
    let wakeLock = null;
    let isClickActionPending = false;

    const startBtn = document.getElementById('startBtn');
    const timerContainer = document.getElementById('timerContainer');
    const modeToggle = document.getElementById('modeToggle');
    const timerDisplay = document.getElementById('timer');
    const wakeVideo = document.getElementById('wakeVideo');
    const adsterraBannerContainer = document.getElementById('adsterraBannerContainer');

    let dimOverlay = document.getElementById('dimOverlay');
    const dimSlider = document.getElementById('dimSlider');
    if (dimSlider && dimOverlay) {
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
        const welcomeModal = document.getElementById('welcomeModal');
        if (welcomeModal) welcomeModal.style.display = 'flex';
    }

    if (modeToggle) modeToggle.checked = isAutoMode;
    toggleModeUI();
    setLanguage(currentLang);

    function toggleModeUI() {
        const presetBox = document.getElementById('presetBox');
        const modeLabel = document.getElementById('modeLabel');
        const t = translations[currentLang];
        
        if (isAutoMode) {
            if (presetBox) presetBox.style.display = 'block';
            if (modeLabel) modeLabel.innerText = t.modeBanner;
            maxLimitMinutes = maxAutoLimit;
            limitMinutes = userData.auto_limit;
            
            const activePreset = document.querySelector('.preset-btn.active');
            let presetMins = 180;
            if (activePreset) {
                if (activePreset.id === 'preset2') presetMins = 300; 
                else if (activePreset.id === 'preset3') presetMins = 420; 
                else presetMins = 180; 
            }
            selectedSessionSeconds = presetMins * 60;
            if (adsterraBannerContainer && isFarming) adsterraBannerContainer.style.display = 'block';
        } else {
            if (presetBox) presetBox.style.display = 'none';
            if (modeLabel) modeLabel.innerText = t.modeVideo;
            maxLimitMinutes = maxManualLimit;
            limitMinutes = userData.manual_limit;
            selectedSessionSeconds = 5 * 60; // Ручной режим строго 5 минут
            if (adsterraBannerContainer) adsterraBannerContainer.style.display = 'none';
        }

        if (!isFarming) {
            currentSeconds = selectedSessionSeconds;
            updateTimerDisplay();
        }
        updateLimitDisplay();

        if (startBtn) {
            if (limitMinutes <= 0) {
                startBtn.innerText = t.limitBtn;
                startBtn.disabled = true;
            } else {
                startBtn.innerText = t.startBtn;
                startBtn.disabled = false;
            }
        }
    }

    if (modeToggle) {
        modeToggle.addEventListener('change', (e) => {
            if (isFarming) {
                alert(currentLang === 'ru' ? "Нельзя менять режим во время работы!" : "Cannot switch mode while running!");
                e.target.checked = isAutoMode;
                return;
            }
            isAutoMode = e.target.checked;
            localStorage.setItem('sleep_auto_mode', isAutoMode);
            limitMinutes = isAutoMode ? userData.auto_limit : userData.manual_limit;
            toggleModeUI();
        });
    }

    window.setPreset = function(timeMins, btn) {
        if (isFarming) return;
        selectedSessionSeconds = timeMins * 60;
        currentSeconds = selectedSessionSeconds;
        
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');
        
        updateTimerDisplay();
    };

    function updateLimitDisplay() {
        const limitHours = document.getElementById('limitHours');
        const maxLimitHours = document.getElementById('maxLimitHours');
        if (limitHours) limitHours.innerText = (limitMinutes / 60).toFixed(1);
        if (maxLimitHours) maxLimitHours.innerText = (maxLimitMinutes / 60).toFixed(1);
    }

    function updateTimerDisplay() {
        if (!timerDisplay) return;
        let hours = Math.floor(currentSeconds / 3600);
        let mins = Math.floor((currentSeconds % 3600) / 60);
        let secs = currentSeconds % 60;
        
        if (hours > 0) {
            timerDisplay.style.fontSize = "22px";
            timerDisplay.innerText = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            timerDisplay.style.fontSize = "26px";
            timerDisplay.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
    }

    window.closeModal = function() {
        localStorage.setItem('sleep_first_run_done', 'true');
        const welcomeModal = document.getElementById('welcomeModal');
        if (welcomeModal) welcomeModal.style.display = 'none';
    };

    async function enableScreenProtection() {
        try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } catch (e) {}
        if (wakeVideo) wakeVideo.play().catch(() => {});
    }

    function disableScreenProtection() {
        if (wakeLock !== null) { wakeLock.release(); wakeLock = null; }
        if (wakeVideo) wakeVideo.pause();
    }

    if (startBtn) {
        startBtn.addEventListener('click', async () => {
            if (isClickActionPending) return;
            isClickActionPending = true;
            setTimeout(() => { isClickActionPending = false; }, 1000);

            if (!isFarming) {
                const sessionMinsNeeded = Math.ceil(selectedSessionSeconds / 60);
                
                if (limitMinutes < sessionMinsNeeded) { 
                    alert(translations[currentLang].presetLimitError); 
                    return; 
                }

                if (isAutoMode) {
                    if (!confirm(translations[currentLang].autoConfirmMsg)) {
                        return;
                    }
                    limitMinutes -= sessionMinsNeeded;
                    userData.auto_limit = limitMinutes;
                    updateLimitDisplay();
                    await updateSupabase({ auto_limit: userData.auto_limit });
                }
                
                isFarming = true;
                const t = translations[currentLang];
                startBtn.innerText = t.stopBtn;
                startBtn.disabled = false;
                startBtn.classList.add('btn-stop');
                if (timerContainer) timerContainer.classList.add('active');
                
                if (isAutoMode && adsterraBannerContainer) {
                    adsterraBannerContainer.style.display = 'block';
                }

                if (modeToggle) modeToggle.disabled = true;
                const presetContainer = document.getElementById('presetOptionsContainer');
                if (presetContainer) presetContainer.style.pointerEvents = 'none';

                enableScreenProtection();
                runFreeTimer();
            } else {
                stopFarming(currentLang === 'ru' ? "Терминал остановлен пользователем." : "Terminal stopped by user.");
            }
        });
    }

    function runFreeTimer() {
        if (!isFarming) return;
        if (timerInterval) clearInterval(timerInterval);

        timerInterval = setInterval(() => {
            if (!isFarming) {
                clearInterval(timerInterval);
                return;
            }
            currentSeconds--;
            updateTimerDisplay();

            if (!isAutoMode && currentSeconds % 60 === 0) {
                deductOneMinuteLimit();
            }

            if (currentSeconds <= 0) {
                clearInterval(timerInterval);
                if (isFarming) {
                    handleTimerCompletion();
                }
            }
        }, 1000);
    }

    async function deductOneMinuteLimit() {
        limitMinutes -= 1;
        if (limitMinutes < 0) limitMinutes = 0;

        userData.manual_limit = limitMinutes;
        updateLimitDisplay();
        await updateSupabase({
            manual_limit: userData.manual_limit
        });
    }

    function handleTimerCompletion() {
        const rewardAmount = isAutoMode ? 40 : 7;
        grantReward(rewardAmount);
    }

    async function grantReward(reward) {
        if (!isFarming) return;

        userData.balance += reward;
        const balanceElem = document.getElementById('balance');
        if (balanceElem) balanceElem.innerText = userData.balance;

        await updateSupabase({ balance: userData.balance });

        stopFarming(currentLang === 'ru' ? "🎉 Сессия успешно завершена, монеты зачислены!" : "🎉 Session completed successfully, coins credited!");
    }

    function stopFarming(message) {
        if (timerInterval) clearInterval(timerInterval);
        isFarming = false;
        
        if (adsterraBannerContainer) adsterraBannerContainer.style.display = 'none';

        if (modeToggle) modeToggle.disabled = false;
        const presetContainer = document.getElementById('presetOptionsContainer');
        if (presetContainer) presetContainer.style.pointerEvents = 'auto';

        const t = translations[currentLang];
        if (startBtn) {
            if (limitMinutes > 0) {
                startBtn.innerText = t.startBtn;
                startBtn.disabled = false;
            } else {
                startBtn.innerText = t.limitBtn;
                startBtn.disabled = true;
            }
            startBtn.classList.remove('btn-stop');
        }
        if (timerContainer) timerContainer.classList.remove('active');
        disableScreenProtection();
        
        currentSeconds = selectedSessionSeconds;
        updateTimerDisplay();
        
        if (message) alert(message);
    }

    document.addEventListener("visibilitychange", () => {
        if (document.hidden && isFarming) {
            if (timerInterval) clearInterval(timerInterval);
            disableScreenProtection();
            alert(translations[currentLang].backgroundWarning);
            stopFarming(currentLang === 'ru' ? "Терминал остановлен: нельзя покидать приложение!" : "Terminal stopped: cannot leave the app!");
        }
    });

    const promoBtn = document.getElementById('promoBtn');
    if (promoBtn) {
        promoBtn.addEventListener('click', async () => {
            const promoInput = document.getElementById('promoInput');
            if (!promoInput) return;
            let code = promoInput.value.trim().toUpperCase();
            if (!code) return;
            
            if (userData.used_promos && userData.used_promos.includes(code)) {
                alert(currentLang === 'ru' ? "Вы уже активировали этот промокод!" : "Promo code already used!");
                return;
            }

            if (code === "BONUS300") {
                userData.balance += 300;
                if (!userData.used_promos) userData.used_promos = [];
                userData.used_promos.push(code);

                const balanceElem = document.getElementById('balance');
                if (balanceElem) balanceElem.innerText = userData.balance;

                await updateSupabase({
                    balance: userData.balance,
                    used_promos: userData.used_promos
                });

                alert(currentLang === 'ru' ? "🎉 Бонус +300 монет зачислен!" : "🎉 Bonus +300 Coins claimed!");
                promoInput.value = "";
            } 
            else { 
                alert(currentLang === 'ru' ? "❌ Неверный промокод." : "❌ Invalid promo code."); 
            }
        });
    }

    const withdrawBtn = document.getElementById('withdrawBtn');
    if (withdrawBtn) {
        withdrawBtn.addEventListener('click', () => {
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
    }
});
