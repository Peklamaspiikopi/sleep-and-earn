document.addEventListener('DOMContentLoaded', async () => {

    // ==== Telegram ====
    const tg = window.Telegram?.WebApp;
    if (tg) { tg.ready(); tg.expand(); }
    const initData = tg?.initData || "";
    let botUsername = "mintrostreakly_bot";
    let miniAppShortName = "MintoStrk";

    // ==== Переводы ====
    const translations = {
        ru: {
            alert: "<b>Экран гаснет?</b> Во избежание пауз продлите время работы дисплея в настройках телефона.",
            limitLabel: "🎬 Осталось роликов сегодня:",
            balanceLabel: "Ваш баланс",
            coinUnit: "Монет",
            watchBtnPrefix: "Смотреть ролик",
            coinWord: "монет",
            limitBtn: "Лимит на сегодня исчерпан",
            watchingBtn: "Загрузка ролика...",
            honesty: "🛡️ <b>Правило честности:</b> Мы за прозрачное сотрудничество. Любые накрутки фиксируются системой.",
            withdrawLimit: (min) => `🔒 Минимальный вывод: <b>${min} Монет</b>`,
            promoPlaceholder: "Введите промокод...",
            withdrawBtn: "Заказать вывод средств",
            navTerminal: "Терминал",
            navCabinet: "Кабинет",
            navDilemmas: "Дилеммы",
            consequenceLabel: "Что произошло:",
            checkpointReady: "🎁 Чекпоинт готов!",
            checkpointBtn: "Посмотреть рекламу за монеты",
            dilemmaNextBtn: "Дальше",
            publicPayoutsTitle: "🛡️ Публичные выплаты (последние 50)",
            modalTitle: "🚀 Первый запуск!",
            modalText: "Привет! Смотри рекламу и получай монеты. Заходи каждый день, смотри по 5 роликов — награда растёт!",
            modalBtn: "Понятно",
            ageGateTitle: "⚠️ Внимание!",
            ageGateText: "MintoStrk доступен только пользователям 18+. Продолжая, вы подтверждаете, что вам есть 18 лет и вы согласны с <a href=\"terms.html\" target=\"_blank\" style=\"color:#00b0ff;\">условиями использования</a>.",
            ageGateBtn: "Подтверждаю, мне есть 18",
            adErrorAlert: "❌ Реклама не загрузилась.\n\nЕсли включён VPN или AdBlock — отключите их и попробуйте снова.",
            refTitle: "🔗 Ваша реферальная ссылка:",
            copyBtn: "Копировать",
            copiedMsg: "Ссылка скопирована!",
            refCountLabel: "Приглашено:",
            refEarnLabel: "Доход:",
            refCoinUnit: "монет",
            confirmWatch: "Посмотреть рекламный ролик за",
            statCourseTitle: "💎 КУРС",
            statCourseVal: "1 Монета = $0.0001",
            statVideoTitle: "📺 ВИДЕО-РОЛИК",
            tRefBonusText: "+15% пожизненно с каждого вывода приглашённого друга. Друг засчитывается в статистику только после своего первого вывода — так в счётчик не попадают неактивные приглашённые.",
            videoRewardUnit: "Монет",
            tAdsProgressLabel: "Роликов сегодня:",
            tDailyStreakLabel: "Активных дней подряд:",
            dailyBonusMsg: (r) => `🎉 Активный день засчитан! +${r} монет`,
            streakUpMsg: (s) => `Стрик: ${s} дн.`,
            boxMsg: (r) => `🎁 Сундук! +${r} монет!`,
            bigBoxMsg: (r) => `🎉📦 Большая коробка! +${r} монет!`,
            levelUpMsg: (lvl) => `⬆️ Награда за ролик выросла до ${lvl} монет!`,
            nextRewardLabel: "До роста награды за ролик:",
            nextLimitLabel: "До +1 ролика в день:",
            nextBigBoxLabel: "До большой коробки:",
            activeDaysWord: "активных дней",
            weeklyBoxLockedNote: "🔒 Сундук откроется на 7 уровне награды за ролик — станет доступен диапазон 20-200 монет.",
            bigBoxLockedNote: "🔒 Большая коробка откроется на 10 уровне награды за ролик — и сразу же выдастся первая.",
        },
        en: {
            alert: "<b>Screen turning off?</b> Extend display timeout in your phone settings.",
            limitLabel: "🎬 Videos left today:",
            balanceLabel: "Your balance",
            coinUnit: "Coins",
            watchBtnPrefix: "Watch video",
            coinWord: "coins",
            limitBtn: "Daily limit reached",
            watchingBtn: "Loading video...",
            honesty: "🛡️ <b>Fair Play:</b> We stand for transparent cooperation. Any cheating is logged.",
            withdrawLimit: (min) => `🔒 Min Withdrawal: <b>${min} Coins</b>`,
            promoPlaceholder: "Enter promo code...",
            withdrawBtn: "Request Withdrawal",
            navTerminal: "Terminal",
            navCabinet: "Cabinet",
            navDilemmas: "Dilemmas",
            consequenceLabel: "What happened:",
            checkpointReady: "🎁 Checkpoint ready!",
            checkpointBtn: "Watch ad for coins",
            dilemmaNextBtn: "Next",
            publicPayoutsTitle: "🛡️ Public payouts (last 50)",
            modalTitle: "🚀 First Launch!",
            modalText: "Welcome! Watch ads to earn coins. Watch 5 videos a day, every day — your reward grows!",
            modalBtn: "Got it",
            ageGateTitle: "⚠️ Attention!",
            ageGateText: "MintoStrk is available to users 18+ only. By continuing, you confirm you are 18 or older and agree to the <a href=\"terms.html\" target=\"_blank\" style=\"color:#00b0ff;\">terms of use</a>.",
            ageGateBtn: "I confirm, I'm 18+",
            adErrorAlert: "❌ Ad failed to load. Please disable AdBlock or VPN and try again.",
            refTitle: "🔗 Your Referral Link:",
            copyBtn: "Copy",
            copiedMsg: "Link copied!",
            refCountLabel: "Invited:",
            refEarnLabel: "Earned:",
            refCoinUnit: "coins",
            confirmWatch: "Watch an ad video for",
            statCourseTitle: "💎 RATE",
            statCourseVal: "1 Coin = $0.0001",
            statVideoTitle: "📺 VIDEO",
            tRefBonusText: "+15% for life from every withdrawal your invited friend makes. A friend only counts in your stats after their first withdrawal — so inactive invites don't inflate the numbers.",
            videoRewardUnit: "Coins",
            tAdsProgressLabel: "Videos today:",
            tDailyStreakLabel: "Active days streak:",
            dailyBonusMsg: (r) => `🎉 Active day counted! +${r} coins`,
            streakUpMsg: (s) => `Streak: ${s} days`,
            boxMsg: (r) => `🎁 Chest! +${r} coins!`,
            bigBoxMsg: (r) => `🎉📦 Big box! +${r} coins!`,
            levelUpMsg: (lvl) => `⬆️ Video reward increased to ${lvl} coins!`,
            nextRewardLabel: "Until video reward grows:",
            nextLimitLabel: "Until +1 daily video:",
            nextBigBoxLabel: "Until big box:",
            activeDaysWord: "active days",
            weeklyBoxLockedNote: "🔒 The chest unlocks at video-reward level 7 — a 20-200 coin range opens up.",
            bigBoxLockedNote: "🔒 The big box unlocks at video-reward level 10 — and the first one is granted right away.",
        }
    };

    let currentLang = localStorage.getItem('sleep_lang') ||
        (tg?.initDataUnsafe?.user?.language_code === 'en' ? 'en' : 'ru');

    let myTelegramID = String(tg?.initDataUnsafe?.user?.id || "");
    let fullRefLink = myTelegramID ? `https://t.me/${botUsername}/${miniAppShortName}?startapp=ref_${myTelegramID}` : "";
    const refLinkInput = document.getElementById('myRefLink');
    if (refLinkInput) refLinkInput.value = fullRefLink;

    const startParam = tg?.initDataUnsafe?.start_param || null;
    let userTimezone = 'UTC';
    try { userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) {}

    // ==== Вызов серверных функций ====
    async function api(path, body = {}) {
        const res = await fetch(`/api/${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData, ...body }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Ошибка сервера');
        return data;
    }

    let userState = {
        balance: 0, manual_limit: 20, max_manual_limit: 20, video_reward: 1,
        ads_watched_today: 0, ads_required_today: 15, streak_count: 0,
        ref_count: 0, ref_earn: 0, min_withdrawal: 2000,
        days_to_next_reward: null, days_to_next_limit: null, days_to_next_big_box: null,
    };

    // Зеркало серверной лестницы наград (lib/streakLogic.js) — только
    // для отображения, реальные начисления считает сервер.
    function weeklyLadderFor(reward) {
        if (reward <= 3) return { values: [5, 10, 15, 20, 25, 30], boxUnlocked: false };
        if (reward <= 6) return { values: [10, 15, 20, 25, 30, 35], boxUnlocked: false };
        if (reward <= 9) return { values: [15, 20, 25, 30, 35, 40], boxUnlocked: true };
        return { values: [20, 25, 30, 35, 40, 45], boxUnlocked: true };
    }

    async function refreshUser() {
        try {
            userState = await api('get-user', { startParam, timezone: userTimezone });
            renderUser();
        } catch (e) {
            console.error(e);
        }
    }

    function renderUser() {
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
        set('balance', userState.balance);
        set('limitCount', userState.manual_limit);
        set('maxLimitCount', userState.max_manual_limit);
        set('refCount', userState.ref_count);
        set('refEarn', userState.ref_earn);
        set('adsToday', Math.min(userState.ads_watched_today, userState.ads_required_today));
        set('adsRequired', userState.ads_required_today);
        set('streakDay', userState.streak_count);

        const withdrawLimitEl = document.getElementById('tWithdrawLimit');
        if (withdrawLimitEl) withdrawLimitEl.innerHTML = translations[currentLang].withdrawLimit(userState.min_withdrawal || 2000);

        renderWeekLadder();
        renderProgressHints();
        updateVideoRewardDisplay();

        updateWatchButton();
    }

    function updateVideoRewardDisplay() {
        const el = document.getElementById('statVideoVal');
        if (el) el.innerText = `${userState.video_reward} ${translations[currentLang].videoRewardUnit}`;
    }

    function renderWeekLadder() {
        const nextPos = (userState.streak_count % 7) + 1;
        const { values, boxUnlocked } = weeklyLadderFor(userState.video_reward || 1);
        document.querySelectorAll('.week-day').forEach(el => {
            const day = parseInt(el.dataset.day, 10);
            el.classList.toggle('active', day === nextPos);
            if (day >= 1 && day <= 6) {
                const rewardEl = el.querySelector('.week-day-reward');
                if (rewardEl) rewardEl.innerText = values[day - 1];
            }
        });
        const day7El = document.getElementById('weekDay7Reward');
        if (day7El) day7El.innerText = boxUnlocked ? '🎁' : '🔒';

        const note = document.getElementById('tBoxesLockedNote');
        if (note) {
            const t = translations[currentLang];
            if (!boxUnlocked) {
                note.style.display = 'block';
                note.innerText = t.weeklyBoxLockedNote;
            } else if ((userState.video_reward || 1) < 10) {
                note.style.display = 'block';
                note.innerText = t.bigBoxLockedNote;
            } else {
                note.style.display = 'none';
            }
        }
    }

    function renderProgressHints() {
        const t = translations[currentLang];
        const rewardEl = document.getElementById('tNextRewardHint');
        const limitEl = document.getElementById('tNextLimitHint');
        if (rewardEl) {
            rewardEl.innerText = userState.days_to_next_reward === null
                ? (currentLang === 'ru' ? 'Награда за ролик достигла максимума!' : 'Video reward is maxed out!')
                : `${t.nextRewardLabel} ${userState.days_to_next_reward} ${t.activeDaysWord}`;
        }
        if (limitEl) {
            limitEl.innerText = userState.days_to_next_limit === null
                ? (currentLang === 'ru' ? 'Дневной лимит роликов достиг максимума!' : 'Daily video limit is maxed out!')
                : `${t.nextLimitLabel} ${userState.days_to_next_limit} ${t.activeDaysWord}`;
        }
        const bigBoxEl = document.getElementById('tNextBigBoxHint');
        if (bigBoxEl) {
            bigBoxEl.innerText = userState.days_to_next_big_box === null
                ? (currentLang === 'ru' ? 'Большая коробка: откроется на 10 уровне награды' : 'Big box: unlocks at reward level 10')
                : `${t.nextBigBoxLabel} ${userState.days_to_next_big_box} ${t.activeDaysWord}`;
        }
    }

    // ==== Язык ====
    window.setLanguage = function (lang) {
        currentLang = lang;
        localStorage.setItem('sleep_lang', lang);
        document.getElementById('langRu')?.classList.toggle('active', lang === 'ru');
        document.getElementById('langEn')?.classList.toggle('active', lang === 'en');
        if (currentDilemmaTopic) {
            loadDilemma(currentDilemmaTopic);
        }

        const t = translations[lang];
        const setText = (id, text) => { const el = document.getElementById(id); if (el) el.innerHTML = text; };

        setText('tAlert', t.alert);
        setText('tLimitLabel', t.limitLabel);
        setText('tBalanceLabel', t.balanceLabel);
        setText('tCoinUnit', t.coinUnit);
        setText('tHonesty', t.honesty);
        setText('withdrawBtn', t.withdrawBtn);
        setText('tNavTerminal', t.navTerminal);
        setText('tNavDilemmas', t.navDilemmas);
        setText('tConsequenceLabel', t.consequenceLabel);
        setText('tCheckpointReady', t.checkpointReady);
        setText('dilemmaCheckpointBtn', t.checkpointBtn);
        setText('dilemmaNextBtn', t.dilemmaNextBtn);
        setText('tPublicPayoutsTitle', t.publicPayoutsTitle);
        setText('tNavCabinet', t.navCabinet);
        setText('tModalTitle', t.modalTitle);
        setText('tModalText', t.modalText);
        setText('tModalBtn', t.modalBtn);
        setText('tAgeGateTitle', t.ageGateTitle);
        setText('tAgeGateText', t.ageGateText);
        setText('ageGateBtn', t.ageGateBtn);
        setText('tRefTitle', t.refTitle);
        setText('copyRefBtn', t.copyBtn);
        setText('tRefCountLabel', t.refCountLabel);
        setText('tRefEarnLabel', t.refEarnLabel);
        setText('tRefCoinUnit', t.refCoinUnit);
        setText('statCourseTitle', t.statCourseTitle);
        setText('statCourseVal', t.statCourseVal);
        setText('statVideoTitle', t.statVideoTitle);
        setText('tRefBonusText', t.tRefBonusText);
        updateVideoRewardDisplay();
        setText('tAdsProgressLabel', t.tAdsProgressLabel);
        setText('tDailyStreakLabel', t.tDailyStreakLabel);

        const promoInput = document.getElementById('promoInput');
        if (promoInput) promoInput.placeholder = t.promoPlaceholder;

        updateWatchButton();
    };

    // ==== Реклама (Adsgram) ====
    // Переключатель: пока боевой блок 43005 на модерации, поставьте
    // USE_TEST_ADS = true и впишите ID тестовой платформы в TEST_BLOCK_ID —
    // так можно проверять показ рекламы прямо сейчас, не дожидаясь
    // одобрения. После модерации верните USE_TEST_ADS = false.
    const USE_TEST_ADS = true;
    const PROD_BLOCK_ID = "43005";
    const TEST_BLOCK_ID = "43046";

    let videoController = null;
    if (window.Adsgram) {
        videoController = window.Adsgram.init({
            blockId: USE_TEST_ADS ? TEST_BLOCK_ID : PROD_BLOCK_ID,
            debug: USE_TEST_ADS,
        });
    }

    // ==== Первый запуск ====
    if (!localStorage.getItem('sleep_first_run_done')) {
        const welcomeModal = document.getElementById('welcomeModal');
        if (welcomeModal) welcomeModal.style.display = 'flex';
    }
    window.closeModal = function () {
        localStorage.setItem('sleep_first_run_done', 'true');
        const welcomeModal = document.getElementById('welcomeModal');
        if (welcomeModal) welcomeModal.style.display = 'none';
    };

    // ==== Просмотр рекламы ====
    const watchBtn = document.getElementById('watchBtn');
    let isWatching = false;
    let wakeLock = null;

    function updateWatchButton() {
        if (!watchBtn) return;
        const t = translations[currentLang];
        if (isWatching) {
            watchBtn.innerText = t.watchingBtn;
            watchBtn.disabled = true;
        } else if (userState.manual_limit <= 0) {
            watchBtn.innerText = t.limitBtn;
            watchBtn.disabled = true;
        } else {
            watchBtn.innerText = `${t.watchBtnPrefix} (+${userState.video_reward} ${t.coinWord})`;
            watchBtn.disabled = false;
        }

        const checkpointBtn = document.getElementById('dilemmaCheckpointBtn');
        if (checkpointBtn) {
            if (isWatching) {
                checkpointBtn.innerText = t.watchingBtn;
                checkpointBtn.disabled = true;
            } else {
                checkpointBtn.innerText = t.checkpointBtn;
                checkpointBtn.disabled = false;
            }
        }
    }

    async function enableScreenProtection() {
        try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } catch (e) {}
    }
    function disableScreenProtection() {
        if (wakeLock) { wakeLock.release(); wakeLock = null; }
    }

    function showDayCompletionResults(result) {
        const t = translations[currentLang];
        const lines = [];
        if (result.dayCompleted) {
            if (result.isBox && result.boxLocked) {
                lines.push(currentLang === 'ru' ? '🔒 Сундук пока закрыт — прокачай уровень награды, чтобы открыть' : '🔒 Chest is still locked — level up your reward to unlock it');
            } else {
                lines.push(result.isBox ? t.boxMsg(result.dailyBonus) : t.dailyBonusMsg(result.dailyBonus));
            }
            if (result.streak) lines.push(t.streakUpMsg(result.streak));
            if (result.levelUp) lines.push(t.levelUpMsg(result.levelUp));
            if (result.bigBox) {
                lines.push(result.bigBoxFirstUnlock
                    ? (currentLang === 'ru' ? `🎉📦 Большая коробка разблокирована! +${result.bigBox} монет!` : `🎉📦 Big box unlocked! +${result.bigBox} coins!`)
                    : t.bigBoxMsg(result.bigBox));
            }
            alert(lines.join('\n'));
        }
    }

    async function watchAd({ sessionType = 'video', topic = null, onComplete }) {
        if (isWatching) return;
        isWatching = true;
        updateWatchButton();
        await enableScreenProtection();

        let session;
        try {
            session = await api('session-start', { sessionType, topic });
        } catch (e) {
            alert(e.message);
            isWatching = false;
            disableScreenProtection();
            await refreshUser();
            updateWatchButton();
            return;
        }

        if (sessionType === 'video') {
            userState.manual_limit = session.manual_limit;
            renderUser();
        }

        const finishSuccess = async () => {
            try {
                const result = await api('session-complete', { sessionId: session.sessionId });
                userState.balance = result.balance;
                await refreshUser();
                if (onComplete) onComplete(result);
            } catch (e) {
                alert(e.message);
            } finally {
                isWatching = false;
                disableScreenProtection();
                updateWatchButton();
            }
        };

        const finishFail = async () => {
            let cancelled = false;
            for (let attempt = 0; attempt < 2 && !cancelled; attempt++) {
                try {
                    await api('session-cancel', { sessionId: session.sessionId });
                    cancelled = true;
                } catch (e) {
                    console.error('session-cancel failed, attempt', attempt, e);
                }
            }
            await refreshUser();
            alert(translations[currentLang].adErrorAlert);
            isWatching = false;
            disableScreenProtection();
            updateWatchButton();
        };

        if (videoController) {
            videoController.show()
                .then((result) => { if (result?.done !== false) finishSuccess(); else finishFail(); })
                .catch(finishFail);
        } else {
            setTimeout(finishSuccess, 13000);
        }
    }

    if (watchBtn) {
        watchBtn.addEventListener('click', async () => {
            if (isWatching || userState.manual_limit <= 0) return;
            if (!confirm(`${translations[currentLang].confirmWatch} +${userState.video_reward}?`)) return;
            await watchAd({ sessionType: 'video', onComplete: showDayCompletionResults });
        });
    }

    // ==== Промокод ====
    const promoBtn = document.getElementById('promoBtn');
    if (promoBtn) {
        promoBtn.addEventListener('click', async () => {
            const promoInput = document.getElementById('promoInput');
            if (!promoInput) return;
            const code = promoInput.value.trim();
            if (!code) return;
            try {
                const result = await api('promo-redeem', { code });
                userState.balance = result.balance;
                renderUser();
                alert(currentLang === 'ru' ? `🎉 Бонус +${result.reward} монет!` : `🎉 Bonus +${result.reward} coins!`);
                promoInput.value = "";
            } catch (e) {
                alert(e.message);
            }
        });
    }

    // ==== Вывод средств ====
    const withdrawBtn = document.getElementById('withdrawBtn');
    if (withdrawBtn) {
        withdrawBtn.addEventListener('click', async () => {
            const minW = userState.min_withdrawal || 2000;
            if (userState.balance < minW) {
                alert(currentLang === 'ru'
                    ? `Недостаточно монет! Мин. вывод ${minW} монет.`
                    : `Insufficient coins! Min withdrawal is ${minW} coins.`);
                return;
            }
            const addressInput = document.getElementById('payoutAddressInput');
            const payoutAddress = addressInput ? addressInput.value.trim() : '';
            if (!payoutAddress) {
                alert(currentLang === 'ru'
                    ? 'Укажи адрес TON-кошелька для вывода'
                    : 'Enter your TON wallet address to withdraw');
                return;
            }
            if (!confirm(currentLang === 'ru'
                ? `Вывести ${userState.balance} монет на ${payoutAddress}? Заявка уйдёт на обработку.`
                : `Withdraw ${userState.balance} coins to ${payoutAddress}? The request will be processed.`)) return;
            try {
                const result = await api('request-withdrawal', { payoutAddress });
                userState.balance = result.balance;
                renderUser();
                if (addressInput) addressInput.value = '';
                alert(currentLang === 'ru'
                    ? `✅ Заявка на ${result.amount} монет отправлена, ожидай обработки.`
                    : `✅ Request for ${result.amount} coins sent, awaiting processing.`);
            } catch (e) {
                alert(e.message);
            }
        });
    }

    // ==== История операций ====
    const historyList = document.getElementById('historyList');
    const historyLabels = {
        video_reward: { ru: '📺 Просмотр ролика', en: '📺 Video watched' },
        daily_bonus: { ru: '🎁 Дневной бонус', en: '🎁 Daily bonus' },
        box: { ru: '🎁 Сундук', en: '🎁 Chest' },
        big_box: { ru: '📦 Большая коробка', en: '📦 Big box' },
        promo: { ru: '🏷️ Промокод', en: '🏷️ Promo code' },
        token_purchase: { ru: '🛡️ Покупка токена', en: '🛡️ Token purchase' },
        missed_day_purchase: { ru: '📅 Выкуп дня', en: '📅 Day buyback' },
        withdrawal_request: { ru: '💸 Заявка на вывод', en: '💸 Withdrawal request' },
        referral_bonus: { ru: '👥 Реферальный бонус', en: '👥 Referral bonus' },
        dilemma_checkpoint: { ru: '🎭 Чекпоинт дилемм', en: '🎭 Dilemma checkpoint' },
    };
    async function loadHistory() {
        if (!historyList) return;
        historyList.innerHTML = currentLang === 'ru' ? 'Загрузка...' : 'Loading...';
        try {
            const result = await api('get-history', { offset: 0 });
            if (!result.items || result.items.length === 0) {
                historyList.innerHTML = currentLang === 'ru' ? 'Пока пусто' : 'Nothing yet';
                return;
            }
            historyList.innerHTML = result.items.map(item => {
                const label = (historyLabels[item.type] && historyLabels[item.type][currentLang]) || item.type;
                const sign = item.amount >= 0 ? '+' : '';
                const color = item.amount >= 0 ? '#00e676' : '#ff8a80';
                const date = new Date(item.created_at).toLocaleString(currentLang === 'ru' ? 'ru-RU' : 'en-US', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
                return `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);font-size:12px;">
                    <span>${label}<br><span style="color:#6c727f;font-size:10px;">${date}</span></span>
                    <span style="color:${color};font-weight:700;">${sign}${item.amount}</span>
                </div>`;
            }).join('');
        } catch (e) {
            historyList.innerHTML = e.message;
        }
    }
    const historyNavBtn = document.getElementById('btnNavHistory');
    if (historyNavBtn) {
        historyNavBtn.addEventListener('click', () => { switchTab('history'); loadHistory(); loadPublicPayouts(); });
    }

    // ==== Публичные выплаты (доказательство реальных выводов) ====
    async function loadPublicPayouts() {
        const el = document.getElementById('publicPayoutsList');
        if (!el) return;
        el.innerText = currentLang === 'ru' ? 'Загрузка...' : 'Loading...';
        try {
            const result = await api('get-public-payouts');
            if (!result.payouts || result.payouts.length === 0) {
                el.innerText = currentLang === 'ru' ? 'Пока нет выплат' : 'No payouts yet';
                return;
            }
            el.innerHTML = result.payouts.map(p => {
                const date = new Date(p.paid_at).toLocaleDateString(currentLang === 'ru' ? 'ru-RU' : 'en-US');
                return `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
                    <span>${p.masked_id}</span>
                    <span style="color:#00e676;">+${p.amount}</span>
                    <span style="color:#6c727f;">${date}</span>
                </div>`;
            }).join('');
        } catch (e) {
            el.innerText = e.message;
        }
    }

    // ==== Дилеммы ====
    let currentDilemma = null;
    let currentDilemmaTopic = null;
    const dilemmaTopicSwitcher = document.getElementById('dilemmaTopicSwitcher');
    const dilemmaTitle = document.getElementById('dilemmaTitle');
    const dilemmaText = document.getElementById('dilemmaText');
    const dilemmaOptions = document.getElementById('dilemmaOptions');
    const dilemmaConsequenceBox = document.getElementById('dilemmaConsequenceBox');
    const dilemmaConsequenceText = document.getElementById('dilemmaConsequenceText');
    const dilemmaNextBtn = document.getElementById('dilemmaNextBtn');
    const dilemmaProgressLine = document.getElementById('dilemmaProgressLine');
    const dilemmaCheckpointCard = document.getElementById('dilemmaCheckpointCard');
    const dilemmaCheckpointBtn = document.getElementById('dilemmaCheckpointBtn');

    const topicNames = {
        work: { ru: '💼 Работа', en: '💼 Work' },
        money: { ru: '💰 Деньги', en: '💰 Money' },
    };

    function renderDilemmaProgress(progress) {
        if (!dilemmaProgressLine) return;
        const label = currentLang === 'ru'
            ? `Прогресс: ${progress.inCycle}/${progress.cycleLength} до чекпоинта · пройдено всего: ${progress.completedCount}`
            : `Progress: ${progress.inCycle}/${progress.cycleLength} to checkpoint · total completed: ${progress.completedCount}`;
        dilemmaProgressLine.innerText = label;

        if (dilemmaCheckpointCard) {
            dilemmaCheckpointCard.style.display = progress.pendingCheckpoints > 0 ? 'block' : 'none';
        }
    }

    function renderDilemma(dilemma) {
        currentDilemma = dilemma;
        if (dilemmaTitle) dilemmaTitle.innerText = dilemma.title;
        if (dilemmaText) dilemmaText.innerText = dilemma.scenarioText;
        if (dilemmaConsequenceBox) dilemmaConsequenceBox.style.display = 'none';
        if (dilemmaOptions) {
            const opts = [
                { key: 'a', text: dilemma.optionA },
                { key: 'b', text: dilemma.optionB },
                { key: 'c', text: dilemma.optionC },
            ].filter(o => o.text);
            dilemmaOptions.innerHTML = '';
            opts.forEach(opt => {
                const btn = document.createElement('button');
                btn.className = 'btn';
                btn.style.background = '#2a2d37';
                btn.innerText = opt.text;
                btn.addEventListener('click', () => chooseDilemmaOption(opt.key));
                dilemmaOptions.appendChild(btn);
            });
            dilemmaOptions.style.display = 'flex';
        }
    }

    async function loadDilemma(topic) {
        try {
            const result = await api('get-dilemma', { topic, lang: currentLang });
            currentDilemmaTopic = result.activeTopic;

            if (dilemmaTopicSwitcher && result.topics) {
                dilemmaTopicSwitcher.innerHTML = result.topics.map(t => {
                    const name = (topicNames[t] && topicNames[t][currentLang]) || t;
                    const active = t === currentDilemmaTopic;
                    return `<button class="btn" data-topic="${t}" style="flex:1; padding:8px; font-size:12px; ${active ? '' : 'background:#2a2d37; opacity:0.7;'}">${name}</button>`;
                }).join('');
                dilemmaTopicSwitcher.querySelectorAll('button').forEach(b => {
                    b.addEventListener('click', () => loadDilemma(b.dataset.topic));
                });
            }

            if (!result.dilemma) {
                if (dilemmaTitle) dilemmaTitle.innerText = currentLang === 'ru' ? 'Дилеммы скоро появятся' : 'Dilemmas coming soon';
                if (dilemmaText) dilemmaText.innerText = '';
                if (dilemmaOptions) dilemmaOptions.innerHTML = '';
                return;
            }

            renderDilemma(result.dilemma);
            renderDilemmaProgress(result.progress);
        } catch (e) {
            if (dilemmaText) dilemmaText.innerText = e.message;
        }
    }

    async function chooseDilemmaOption(choice) {
        if (!currentDilemma || !currentDilemmaTopic) return;
        if (dilemmaOptions) dilemmaOptions.style.display = 'none';
        try {
            const result = await api('dilemma-choose', {
                topic: currentDilemmaTopic,
                dilemmaId: currentDilemma.id,
                choice,
                lang: currentLang,
            });
            if (dilemmaConsequenceText) dilemmaConsequenceText.innerText = result.consequence;
            if (dilemmaConsequenceBox) dilemmaConsequenceBox.style.display = 'block';
            renderDilemmaProgress(result.progress);
        } catch (e) {
            alert(e.message);
            if (dilemmaOptions) dilemmaOptions.style.display = 'flex';
        }
    }

    if (dilemmaNextBtn) {
        dilemmaNextBtn.addEventListener('click', () => loadDilemma(currentDilemmaTopic));
    }

    if (dilemmaCheckpointBtn) {
        dilemmaCheckpointBtn.addEventListener('click', async () => {
            if (isWatching) return;
            await watchAd({
                sessionType: 'dilemma_checkpoint',
                topic: currentDilemmaTopic,
                onComplete: (result) => {
                    alert(currentLang === 'ru' ? `🎉 +${result.reward} монет!` : `🎉 +${result.reward} coins!`);
                    loadDilemma(currentDilemmaTopic);
                },
            });
        });
    }

    // ==== Копирование реф. ссылки ====
    window.copyRefLink = function () {
        const copyText = document.getElementById("myRefLink");
        if (copyText && copyText.value) {
            navigator.clipboard.writeText(copyText.value);
            alert(translations[currentLang].copiedMsg);
        }
    };

    // ==== Старт ====
    setLanguage(currentLang);
    await refreshUser();
    await loadDilemma(null);

    // ==== Возрастной гейт (18+) ====
    // Показывается один раз, до входа в интерфейс. Пропустить нельзя —
    // подтверждение записывается в базу через confirm-age.
    if (!userState.age_confirmed) {
        const ageGateModal = document.getElementById('ageGateModal');
        if (ageGateModal) ageGateModal.style.display = 'flex';
        const ageGateBtn = document.getElementById('ageGateBtn');
        if (ageGateBtn) {
            ageGateBtn.addEventListener('click', async () => {
                try {
                    await api('confirm-age');
                } catch (e) {
                    console.error('confirm-age failed', e);
                }
                userState.age_confirmed = true;
                if (ageGateModal) ageGateModal.style.display = 'none';
            }, { once: true });
        }
    }
});
