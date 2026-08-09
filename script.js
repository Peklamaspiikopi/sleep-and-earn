document.addEventListener('DOMContentLoaded', async () => {
    const SUPABASE_URL = window.ENV_SUPABASE_URL || "https://dpbrrirjnsobmtojzwtx.supabase.co";
    const SUPABASE_KEY = window.ENV_SUPABASE_KEY || "";
    const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

    const translations = {
        ru: {
            alert: "<b>Экран гаснет?</b> Во избежание пауз продлите время работы дисплея в настройках телефона или используйте софт для удержания активного экрана.",
            limitLabel: "⏱️ Суточный лимит:",
            resetTimeLabel: "🔄 Сброс лимитов в 00:00 UTC",
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
            claimBonusBtn: "🎁 Забрать бонус (+Реклама)",
            autoNotice: "🤖 Сейчас откроется авто-баннер для начисления награды...",
            backgroundWarning: "⚠️ Внимание! Нельзя сворачивать приложение или выключать экран во время работы терминала!",
            
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
            limitLabel: "⏱️ Daily Limit:",
            resetTimeLabel: "🔄 Limits reset at 00:00 UTC",
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
            claimBonusBtn: "🎁 Claim Bonus (+Ad)",
            autoNotice: "🤖 Opening auto-banner to credit your reward...",
            backgroundWarning: "⚠️ Warning! Do not minimize the app or turn off the screen while the terminal is running!",
            
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
    let maxManualLimit = 120; // 2 часа в минутах
    let maxAutoLimit = 180;   // 3 часа в минутах
    let maxLimitMinutes = isAutoMode ? maxAutoLimit : maxManualLimit; 
    
    let userData = {
        balance: 0,
        ref_count: 0,
        ref_earn: 0,
        manual_limit: 120,
        auto_limit: 180,
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
                userData.auto_limit = 180;
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
        const tAlert = document.getElementById('tAlert');
        if (tAlert) tAlert.innerHTML = t.alert;
        
        const tLimitLabel = document.getElementById('tLimitLabel');
        if (tLimitLabel) tLimitLabel.innerText = t.limitLabel;

        const tResetTime = document.getElementById('tResetTime');
        if (tResetTime) tResetTime.innerText = t.resetTimeLabel;
        
        const tHrsUnit = document.getElementById('tHrsUnit');
        if (tHrsUnit) tHrsUnit.innerText = t.hrsUnit;
        
        const tHrsUnitMax = document.getElementById('tHrsUnitMax');
        if (tHrsUnitMax) tHrsUnitMax.innerText = t.hrsUnit;
        
        const tPresetTitle = document.getElementById('tPresetTitle');
        if (tPresetTitle) tPresetTitle.innerText = t.presetTitle;
        
        const p1 = document.getElementById('preset1');
        const p2 = document.getElementById('preset2');
        const p3 = document.getElementById('preset3');
        if (p1) p1.innerText = t.preset1;
        if (p2) p2.innerText = t.preset2;
        if (p3) p3.innerText = t.preset3;
        
        const tBalanceLabel = document.getElementById('tBalanceLabel');
        if (tBalanceLabel) tBalanceLabel.innerText = t.balanceLabel;
        
        const tCoinUnit = document.getElementById('tCoinUnit');
        if (tCoinUnit) tCoinUnit.innerText = t.coinUnit;
        
        const tHonesty = document.getElementById('tHonesty');
        if (tHonesty) tHonesty.innerHTML = t.honesty;
        
        const tWithdrawLimit = document.getElementById('tWithdrawLimit');
        if (tWithdrawLimit) tWithdrawLimit.innerHTML = t.withdrawLimit;
        
        const promoInput = document.getElementById('promoInput');
        if (promoInput) promoInput.placeholder = t.promoPlaceholder;
        
        const withdrawBtn = document.getElementById('withdrawBtn');
        if (withdrawBtn) withdrawBtn.innerText = t.withdrawBtn;
        
        const tNavTerminal = document.getElementById('tNavTerminal');
        if (tNavTerminal) tNavTerminal.innerText = t.navTerminal;
        
        const tNavCabinet = document.getElementById('tNavCabinet');
        if (tNavCabinet) tNavCabinet.innerText = t.navCabinet;
        
        const tModalTitle = document.getElementById('tModalTitle');
        if (tModalTitle) tModalTitle.innerText = t.modalTitle;
        
        const tModalText = document.getElementById('tModalText');
        if (tModalText) tModalText.innerText = t.modalText;
        
        const tModalBtn = document.getElementById('tModalBtn');
        if (tModalBtn) tModalBtn.innerText = t.modalBtn;
        
        const tRefTitle = document.getElementById('tRefTitle');
        if (tRefTitle) tRefTitle.innerText = t.refTitle;
        
        const copyRefBtn = document.getElementById('copyRefBtn');
        if (copyRefBtn) copyRefBtn.innerText = t.copyBtn;
        
        const tRefCountLabel = document.getElementById('tRefCountLabel');
        if (tRefCountLabel) tRefCountLabel.innerText = t.refCountLabel;
        
        const tRefEarnLabel = document.getElementById('tRefEarnLabel');
        if (tRefEarnLabel) tRefEarnLabel.innerText = t.refEarnLabel;
        
        const tRefCoinUnit = document.getElementById('tRefCoinUnit');
        if (tRefCoinUnit) tRefCoinUnit.innerText = t.refCoinUnit;

        const dimLabelEl = document.getElementById('tDimLabel');
        if (dimLabelEl) dimLabelEl.innerText = t.dimLabel;

        const statCourseTitle = document.getElementById('statCourseTitle');
        const statCourseVal = document.getElementById('statCourseVal');
        const statVideoTitle = document.getElementById('statVideoTitle');
        const statVideoVal = document.getElementById('statVideoVal');
        const statBannerTitle = document.getElementById('statBannerTitle');
        const statBannerVal = document.getElementById('statBannerVal');
        const statRefTitle = document.getElementById('statRefTitle');
        const statRefVal = document.getElementById('statRefVal');

        if (statCourseTitle) statCourseTitle.innerText = t.statCourseTitle;
        if (statCourseVal) statCourseVal.innerText = t.statCourseVal;
        if (statVideoTitle) statVideoTitle.innerText = t.statVideoTitle;
        if (statVideoVal) statVideoVal.innerText = t.statVideoVal;
        if (statBannerTitle) statBannerTitle.innerText = t.statBannerTitle;
        if (statBannerVal) statBannerVal.innerText = t.statBannerVal;
        if (statRefTitle) statRefTitle.innerText = t.statRefTitle;
        if (statRefVal) statRefVal.innerText = t.statRefVal;

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
        const welcomeModal = document.getElementById('welcomeModal');
        if (welcomeModal) welcomeModal.style.display = 'flex';
    }

    if (modeToggle) modeToggle.checked = isAutoMode;
    toggleModeUI(false);
    setLanguage(currentLang);

    function toggleModeUI(updateLimitState = false) {
        const presetBox = document.getElementById('presetBox');
        const modeLabel = document.getElementById('modeLabel');
        const t = translations[currentLang];
        
        if (isAutoMode) {
            if (presetBox) presetBox.style.display = 'block';
            if (modeLabel) modeLabel.innerText = t.modeBanner;
            maxLimitMinutes = maxAutoLimit;
            limitMinutes = userData.auto_limit;
        } else {
            if (presetBox) presetBox.style.display = 'none';
            if (modeLabel) modeLabel.innerText = t.modeVideo;
            maxLimitMinutes = maxManualLimit;
            limitMinutes = userData.manual_limit;
            selectedTimerMinutes = 5;
        }

        if (!isFarming) {
            currentSeconds = selectedTimerMinutes * 60;
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
            
            toggleModeUI(false);
        });
    }

    window.setPreset = function(timeMins, limitMins, btn) {
        if (isFarming) return;
        selectedTimerMinutes = timeMins;
        
        currentSeconds = selectedTimerMinutes * 60;
        
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
        let mins = Math.floor(currentSeconds / 60);
        let secs = currentSeconds % 60;
        timerDisplay.classList.remove('timer-loading');
        timerDisplay.style.fontSize = "26px";
        timerDisplay.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
        startBtn.addEventListener('click', () => {
            if (isClickActionPending) return;
            isClickActionPending = true;
            setTimeout(() => { isClickActionPending = false; }, 1000);

            if (!isFarming) {
                if (limitMinutes <= 0) { 
                    alert(currentLang === 'ru' ? "Суточный лимит для этого режима исчерпан!" : "Daily limit for this mode is reached!"); 
                    return; 
                }
                
                isFarming = true;
                const t = translations[currentLang];
                startBtn.innerText = t.stopBtn;
                startBtn.disabled = false;
                startBtn.classList.add('btn-stop');
                if (timerContainer) timerContainer.classList.add('active');
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

            if (currentSeconds <= 0) {
                clearInterval(timerInterval);
                if (isFarming) {
                    handleTimerCompletion();
                }
            }
        }, 1000);
    }

    function handleTimerCompletion() {
        const rewardAmount = isAutoMode ? 2 : 7;

        if (isAutoMode) {
            alert(translations[currentLang].autoNotice);
            claimBonusReward(rewardAmount);
        } else {
            const msg = currentLang === 'ru' 
                ? `Сессия завершена! Посмотреть рекламу и получить +${rewardAmount} монет?` 
                : `Session finished! Watch an ad to claim +${rewardAmount} coins?`;

            if (confirm(msg)) {
                claimBonusReward(rewardAmount);
            } else {
                runFreeTimer();
            }
        }
    }

    window.claimBonusReward = function(reward) {
        if (window.location.protocol === 'file:') {
            grantReward(reward);
            return;
        }

        const t = translations[currentLang];
        if (timerDisplay) {
            timerDisplay.classList.add('timer-loading');
            timerDisplay.style.fontSize = "13px";
            timerDisplay.innerText = t.loadingAd;
        }

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

        if (isAutoMode) {
            userData.auto_limit = limitMinutes;
        } else {
            userData.manual_limit = limitMinutes;
        }

        const balanceElem = document.getElementById('balance');
        if (balanceElem) balanceElem.innerText = userData.balance;
        updateLimitDisplay();

        await updateSupabase({
            balance: userData.balance,
            manual_limit: userData.manual_limit,
            auto_limit: userData.auto_limit
        });

        // БЕЗОПАСНОСТЬ: Если лимит исчерпан, ПОЛНОСТЬЮ ОСТАНАВЛИВАЕМ терминал без авто-перезапуска
        if (limitMinutes <= 0) {
            stopFarming(currentLang === 'ru' ? "Суточный лимит исчерпан! Возвращайтесь завтра." : "Daily limit reached! Come back tomorrow.");
            if (startBtn) {
                startBtn.innerText = translations[currentLang].limitBtn;
                startBtn.disabled = true;
            }
            return;
        }

        currentSeconds = selectedTimerMinutes * 60;
        updateTimerDisplay();
        runFreeTimer();
    }

    function handleAdError(error) {
        alert(translations[currentLang].adErrorAlert);
        currentSeconds = selectedTimerMinutes * 60;
        updateTimerDisplay();
        runFreeTimer(); 
    }

    function stopFarming(message) {
        if (timerInterval) clearInterval(timerInterval);
        isFarming = false;
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
        
        currentSeconds = selectedTimerMinutes * 60;
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
