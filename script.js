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
            watchBtn: "Смотреть ролик (+7 монет)",
            limitBtn: "Лимит на сегодня исчерпан",
            watchingBtn: "Загрузка ролика...",
            honesty: "🛡️ <b>Правило честности:</b> Мы за прозрачное сотрудничество. Любые накрутки фиксируются системой.",
            withdrawLimit: "🔒 Минимальный вывод: <b>2000 Монет (~0.1 TON)</b>",
            promoPlaceholder: "Введите промокод...",
            withdrawBtn: "Заказать вывод средств",
            navTerminal: "Терминал",
            navCabinet: "Кабинет",
            modalTitle: "🚀 Первый запуск!",
            modalText: "Привет! Смотри рекламу и получай монеты. Заходи каждый день — бонус растёт!",
            modalBtn: "Понятно",
            adErrorAlert: "❌ Реклама не загрузилась.\n\nЕсли включён VPN или AdBlock — отключите их и попробуйте снова.",
            refTitle: "🔗 Ваша реферальная ссылка:",
            copyBtn: "Копировать",
            copiedMsg: "Ссылка скопирована!",
            refCountLabel: "Приглашено:",
            refEarnLabel: "Доход:",
            refCoinUnit: "монет",
            confirmWatch: "Посмотреть рекламный ролик за +7 монет?",
            statCourseTitle: "💎 КУРС",
            statCourseVal: "1 Монета = $0.0001",
            statVideoTitle: "📺 ВИДЕО-РОЛИК",
            statVideoVal: "+7 Монет",
            statRefTitle: "👥 РЕФЕРАЛЫ",
            statRefVal: "+15% от вывода",
            dailyTitle: "🎁 Ежедневный бонус",
            dailyStreak: "День стрика:",
            dailyClaim: "Забрать бонус",
            dailyClaimed: "Уже забрано сегодня",
            dailyGot: (r, s) => `🎉 Бонус +${r} монет! Стрик: ${s} дн.`,
        },
        en: {
            alert: "<b>Screen turning off?</b> Extend display timeout in your phone settings.",
            limitLabel: "🎬 Videos left today:",
            balanceLabel: "Your balance",
            coinUnit: "Coins",
            watchBtn: "Watch video (+7 coins)",
            limitBtn: "Daily limit reached",
            watchingBtn: "Loading video...",
            honesty: "🛡️ <b>Fair Play:</b> We stand for transparent cooperation. Any cheating is logged.",
            withdrawLimit: "🔒 Min Withdrawal: <b>2000 Coins (~0.1 TON)</b>",
            promoPlaceholder: "Enter promo code...",
            withdrawBtn: "Request Withdrawal",
            navTerminal: "Terminal",
            navCabinet: "Cabinet",
            modalTitle: "🚀 First Launch!",
            modalText: "Welcome! Watch ads to earn coins. Come back daily — bonus grows!",
            modalBtn: "Got it",
            adErrorAlert: "❌ Ad failed to load. Please disable AdBlock or VPN and try again.",
            refTitle: "🔗 Your Referral Link:",
            copyBtn: "Copy",
            copiedMsg: "Link copied!",
            refCountLabel: "Invited:",
            refEarnLabel: "Earned:",
            refCoinUnit: "coins",
            confirmWatch: "Watch an ad video for +7 coins?",
            statCourseTitle: "💎 RATE",
            statCourseVal: "1 Coin = $0.0001",
            statVideoTitle: "📺 VIDEO",
            statVideoVal: "+7 Coins",
            statRefTitle: "👥 REFERRALS",
            statRefVal: "+15% of payout",
            dailyTitle: "🎁 Daily Bonus",
            dailyStreak: "Streak day:",
            dailyClaim: "Claim bonus",
            dailyClaimed: "Already claimed today",
            dailyGot: (r, s) => `🎉 Bonus +${r} coins! Streak: ${s} days.`,
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

    let userState = { balance: 0, manual_limit: 20, max_manual_limit: 20, ref_count: 0, ref_earn: 0, streak_count: 0, bonus_claimed_today: false };

    async function refreshUser() {
        try {
            userState = await api('get-user');
            renderUser();
        } catch (e) {
            console.error(e);
        }
    }

    function renderUser() {
        const balanceEl = document.getElementById('balance');
        const limitEl = document.getElementById('limitCount');
        const maxLimitEl = document.getElementById('maxLimitCount');
        const refCountEl = document.getElementById('refCount');
        const refEarnEl = document.getElementById('refEarn');
        const streakEl = document.getElementById('streakDay');

        if (balanceEl) balanceEl.innerText = userState.balance;
        if (limitEl) limitEl.innerText = userState.manual_limit;
        if (maxLimitEl) maxLimitEl.innerText = userState.max_manual_limit;
        if (refCountEl) refCountEl.innerText = userState.ref_count;
        if (refEarnEl) refEarnEl.innerText = userState.ref_earn;
        if (streakEl) streakEl.innerText = userState.streak_count;

        updateWatchButton();
        updateDailyButton();
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
        setText('statVideoVal', t.statVideoVal);
        setText('statRefTitle', t.statRefTitle);
        setText('statRefVal', t.statRefVal);
        setText('tDailyTitle', t.dailyTitle);
        setText('tDailyStreakLabel', t.dailyStreak);

        const promoInput = document.getElementById('promoInput');
        if (promoInput) promoInput.placeholder = t.promoPlaceholder;

        updateWatchButton();
        updateDailyButton();
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
        if (isWatching) {
            watchBtn.innerText = t.watchingBtn;
            watchBtn.disabled = true;
        } else if (userState.manual_limit <= 0) {
            watchBtn.innerText = t.limitBtn;
            watchBtn.disabled = true;
        } else {
            watchBtn.innerText = t.watchBtn;
            watchBtn.disabled = false;
        }
    }

    async function enableScreenProtection() {
        try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } catch (e) {}
    }
    function disableScreenProtection() {
        if (wakeLock) { wakeLock.release(); wakeLock = null; }
    }

    if (watchBtn) {
        watchBtn.addEventListener('click', async () => {
            if (isWatching || userState.manual_limit <= 0) return;
            if (!confirm(translations[currentLang].confirmWatch)) return;

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
                updateWatchButton();
                return;
            }

            userState.manual_limit = session.manual_limit;
            renderUser();

            const finishSuccess = async () => {
                try {
                    const result = await api('session-complete', { sessionId: session.sessionId });
                    userState.balance = result.balance;
                    renderUser();
                } catch (e) {
                    alert(e.message);
                } finally {
                    isWatching = false;
                    disableScreenProtection();
                    updateWatchButton();
                }
            };

            const finishFail = async (err) => {
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
                // Резервный путь, если Adsgram не подключился — просто ждём минимальное время
                setTimeout(finishSuccess, 13000);
            }
        });
    }

    // ==== Ежедневный бонус ====
    const dailyBtn = document.getElementById('dailyBonusBtn');
    function updateDailyButton() {
        if (!dailyBtn) return;
        const t = translations[currentLang];
        if (userState.bonus_claimed_today) {
            dailyBtn.innerText = t.dailyClaimed;
            dailyBtn.disabled = true;
        } else {
            dailyBtn.innerText = t.dailyClaim;
            dailyBtn.disabled = false;
        }
    }
    if (dailyBtn) {
        dailyBtn.addEventListener('click', async () => {
            dailyBtn.disabled = true;
            try {
                const result = await api('daily-bonus');
                userState.balance = result.balance;
                userState.streak_count = result.streak;
                userState.bonus_claimed_today = true;
                renderUser();
                alert(translations[currentLang].dailyGot(result.reward, result.streak));
            } catch (e) {
                alert(e.message);
                dailyBtn.disabled = false;
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
