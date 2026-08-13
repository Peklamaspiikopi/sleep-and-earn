document.addEventListener('DOMContentLoaded', async () => {

    // ==== Telegram ====
    const tg = window.Telegram?.WebApp;
    if (tg) { tg.ready(); tg.expand(); }
    const initData = tg?.initData || "";
    let botUsername = "SleepEarnSupport_bot";

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
            withdrawLimit: "🔒 Минимальный вывод: <b>2000 Монет (~0.1 TON)</b>",
            promoPlaceholder: "Введите промокод...",
            withdrawBtn: "Заказать вывод средств",
            navTerminal: "Терминал",
            navCabinet: "Кабинет",
            modalTitle: "🚀 Первый запуск!",
            modalText: "Привет! Смотри рекламу и получай монеты. Заходи каждый день, смотри по 5 роликов — награда растёт!",
            modalBtn: "Понятно",
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
            tRefBonusText: "+15% от суммы вывода каждого приглашённого",
            videoRewardUnit: "Монет",
            tAdsProgressLabel: "Роликов сегодня:",
            tDailyStreakLabel: "Активных дней подряд:",
            tTokensLabel: "Токены-страховки:",
            buyTokenBtn: "Купить токен (150 монет)",
            tMissedTitle: "⚠️ Пропущены дни",
            buyMissedDayBtn: "Купить день (150 монет)",
            declineMissedDayBtn: "Отказаться (сброс стрика)",
            missedDayText: (n) => `Не хватило токенов, чтобы закрыть все пропуски. Осталось незакрытых дней: ${n}.`,
            dailyBonusMsg: (r) => `🎉 Активный день засчитан! +${r} монет`,
            streakUpMsg: (s) => `Стрик: ${s} дн.`,
            boxMsg: (r) => `🎁 Сундук! +${r} монет!`,
            levelUpMsg: (lvl) => `⬆️ Награда за ролик выросла до ${lvl} монет!`,
            nextRewardLabel: "До роста награды за ролик:",
            nextLimitLabel: "До +1 ролика в день:",
            activeDaysWord: "активных дней",
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
            withdrawLimit: "🔒 Min Withdrawal: <b>2000 Coins (~0.1 TON)</b>",
            promoPlaceholder: "Enter promo code...",
            withdrawBtn: "Request Withdrawal",
            navTerminal: "Terminal",
            navCabinet: "Cabinet",
            modalTitle: "🚀 First Launch!",
            modalText: "Welcome! Watch ads to earn coins. Watch 5 videos a day, every day — your reward grows!",
            modalBtn: "Got it",
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
            tRefBonusText: "+15% of payout from each invited friend",
            videoRewardUnit: "Coins",
            tAdsProgressLabel: "Videos today:",
            tDailyStreakLabel: "Active days streak:",
            tTokensLabel: "Insurance tokens:",
            buyTokenBtn: "Buy token (150 coins)",
            tMissedTitle: "⚠️ Missed days",
            buyMissedDayBtn: "Buy day (150 coins)",
            declineMissedDayBtn: "Decline (reset streak)",
            missedDayText: (n) => `Not enough tokens to cover all missed days. Unresolved days left: ${n}.`,
            dailyBonusMsg: (r) => `🎉 Active day counted! +${r} coins`,
            streakUpMsg: (s) => `Streak: ${s} days`,
            boxMsg: (r) => `🎁 Chest! +${r} coins!`,
            levelUpMsg: (lvl) => `⬆️ Video reward increased to ${lvl} coins!`,
            nextRewardLabel: "Until video reward grows:",
            nextLimitLabel: "Until +1 daily video:",
            activeDaysWord: "active days",
        }
    };

    let currentLang = localStorage.getItem('sleep_lang') ||
        (tg?.initDataUnsafe?.user?.language_code === 'en' ? 'en' : 'ru');

    let myTelegramID = String(tg?.initDataUnsafe?.user?.id || "");
    let fullRefLink = myTelegramID ? `https://t.me/${botUsername}?start=ref_${myTelegramID}` : "";
    const refLinkInput = document.getElementById('myRefLink');
    if (refLinkInput) refLinkInput.value = fullRefLink;

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
        balance: 0, manual_limit: 20, max_manual_limit: 20, video_reward: 5,
        ads_watched_today: 0, streak_count: 0, streak_freeze_tokens: 0,
        pending_miss_days: 0, ref_count: 0, ref_earn: 0,
        days_to_next_reward: null, days_to_next_limit: null,
    };

    async function refreshUser() {
        try {
            userState = await api('get-user');
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
        set('adsToday', Math.min(userState.ads_watched_today, 5));
        set('streakDay', userState.streak_count);
        set('tokenCount', userState.streak_freeze_tokens);

        renderWeekLadder();
        renderProgressHints();
        updateVideoRewardDisplay();

        updateWatchButton();
        updateTokenButton();
        updateMissedDayCard();
    }

    function updateVideoRewardDisplay() {
        const el = document.getElementById('statVideoVal');
        if (el) el.innerText = `${userState.video_reward} ${translations[currentLang].videoRewardUnit}`;
    }

    function renderWeekLadder() {
        const nextPos = (userState.streak_count % 7) + 1;
        document.querySelectorAll('.week-day').forEach(el => {
            const day = parseInt(el.dataset.day, 10);
            el.classList.toggle('active', day === nextPos);
        });
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
    }

    // ==== Язык ====
    window.setLanguage = function (lang) {
        currentLang = lang;
        localStorage.setItem('sleep_lang', lang);
        document.getElementById('langRu')?.classList.toggle('active', lang === 'ru');
        document.getElementById('langEn')?.classList.toggle('active', lang === 'en');

        const t = translations[lang];
        const setText = (id, text) => { const el = document.getElementById(id); if (el) el.innerHTML = text; };

        setText('tAlert', t.alert);
        setText('tLimitLabel', t.limitLabel);
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
        setText('statCourseTitle', t.statCourseTitle);
        setText('statCourseVal', t.statCourseVal);
        setText('statVideoTitle', t.statVideoTitle);
        setText('tRefBonusText', t.tRefBonusText);
        updateVideoRewardDisplay();
        setText('tAdsProgressLabel', t.tAdsProgressLabel);
        setText('tDailyStreakLabel', t.tDailyStreakLabel);
        setText('tTokensLabel', t.tTokensLabel);
        setText('buyTokenBtn', t.buyTokenBtn);
        setText('tMissedTitle', t.tMissedTitle);
        setText('buyMissedDayBtn', t.buyMissedDayBtn);
        setText('declineMissedDayBtn', t.declineMissedDayBtn);

        const promoInput = document.getElementById('promoInput');
        if (promoInput) promoInput.placeholder = t.promoPlaceholder;

        updateWatchButton();
    };

    // ==== Реклама (Adsgram) ====
    let videoController = null;
    if (window.Adsgram) {
        videoController = window.Adsgram.init({ blockId: "41922" });
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
        if (userState.pending_miss_days > 0) {
            watchBtn.innerText = currentLang === 'ru' ? 'Сначала реши вопрос с пропусками' : 'Resolve missed days first';
            watchBtn.disabled = true;
        } else if (isWatching) {
            watchBtn.innerText = t.watchingBtn;
            watchBtn.disabled = true;
        } else if (userState.manual_limit <= 0) {
            watchBtn.innerText = t.limitBtn;
            watchBtn.disabled = true;
        } else {
            watchBtn.innerText = `${t.watchBtnPrefix} (+${userState.video_reward} ${t.coinWord})`;
            watchBtn.disabled = false;
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
            lines.push(t.dailyBonusMsg(result.dailyBonus));
            if (result.streak) lines.push(t.streakUpMsg(result.streak));
            if (result.box) lines.push(t.boxMsg(result.box));
            if (result.pendingMissDays) {
                lines.push(currentLang === 'ru'
                    ? `⚠️ Не все пропуски закрыты токенами, осталось: ${result.pendingMissDays}`
                    : `⚠️ Not all missed days covered by tokens, remaining: ${result.pendingMissDays}`);
            }
            alert(lines.join('\n'));
        }
    }

    if (watchBtn) {
        watchBtn.addEventListener('click', async () => {
            if (isWatching || userState.manual_limit <= 0 || userState.pending_miss_days > 0) return;
            if (!confirm(`${translations[currentLang].confirmWatch} +${userState.video_reward}?`)) return;

            isWatching = true;
            updateWatchButton();
            await enableScreenProtection();

            let session;
            try {
                session = await api('session-start');
            } catch (e) {
                alert(e.message);
                isWatching = false;
                disableScreenProtection();
                await refreshUser();
                return;
            }

            userState.manual_limit = session.manual_limit;
            renderUser();

            const finishSuccess = async () => {
                try {
                    const result = await api('session-complete', { sessionId: session.sessionId });
                    userState.balance = result.balance;
                    await refreshUser();
                    showDayCompletionResults(result);
                } catch (e) {
                    alert(e.message);
                } finally {
                    isWatching = false;
                    disableScreenProtection();
                    updateWatchButton();
                }
            };

            const finishFail = async () => {
                try { await api('session-cancel', { sessionId: session.sessionId }); } catch (e) {}
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
        });
    }

    // ==== Покупка токена-страховки ====
    const buyTokenBtn = document.getElementById('buyTokenBtn');
    function updateTokenButton() {
        if (!buyTokenBtn) return;
        buyTokenBtn.disabled = userState.streak_freeze_tokens >= 7 || userState.balance < 150;
    }
    if (buyTokenBtn) {
        buyTokenBtn.addEventListener('click', async () => {
            try {
                const result = await api('buy-streak-token');
                userState.balance = result.balance;
                userState.streak_freeze_tokens = result.tokens;
                renderUser();
            } catch (e) {
                alert(e.message);
            }
        });
    }

    // ==== Карточка пропущенных дней ====
    const missedDayCard = document.getElementById('missedDayCard');
    const missedDayText = document.getElementById('missedDayText');
    function updateMissedDayCard() {
        if (!missedDayCard) return;
        if (userState.pending_miss_days > 0) {
            missedDayCard.style.display = 'block';
            if (missedDayText) missedDayText.innerText = translations[currentLang].missedDayText(userState.pending_miss_days);
        } else {
            missedDayCard.style.display = 'none';
        }
    }
    const buyMissedDayBtn = document.getElementById('buyMissedDayBtn');
    if (buyMissedDayBtn) {
        buyMissedDayBtn.addEventListener('click', async () => {
            try {
                const result = await api('buy-missed-day');
                userState.balance = result.balance;
                userState.pending_miss_days = result.pendingMissDays;
                await refreshUser();
                if (result.resolved) {
                    alert(currentLang === 'ru' ? '✅ Все пропуски закрыты, стрик продолжается!' : '✅ All missed days covered, streak continues!');
                }
            } catch (e) {
                alert(e.message);
            }
        });
    }
    const declineMissedDayBtn = document.getElementById('declineMissedDayBtn');
    if (declineMissedDayBtn) {
        declineMissedDayBtn.addEventListener('click', async () => {
            if (!confirm(currentLang === 'ru' ? 'Точно отказаться? Стрик сбросится.' : 'Are you sure? Streak will reset.')) return;
            try {
                await api('decline-missed-day');
                await refreshUser();
            } catch (e) {
                alert(e.message);
            }
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
        withdrawBtn.addEventListener('click', () => {
            if (userState.balance < 2000) {
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
});
