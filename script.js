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
            walletPlaceholder: "Адрес TON-кошелька для вывода",
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
            modalText: "Привет! Проходи дилеммы или включай терминал и начинай зарабатывать монеты. Заходи каждый день — награда растёт!",
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
            statVideoTitle: "📺 ВИДЕО-РОЛИК",
            statAdRatioTitle: "📊 ДОХОД С РЕКЛАМЫ",
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
            weeklyBoxLockedNote: "🔒 Сундук откроется, когда награда за ролик вырастет до 18 монет — станет доступен диапазон 55-330 монет.",
            bigBoxLockedNote: "🔒 Большая коробка откроется на том же уровне (18 монет за ролик) — и сразу же выдастся первая.",
            bannerBtnPrefix: "Быстрый баннер",
            bannerWaitBtn: (mmss) => `Баннер через ${mmss}`,
            bannerLoadingBtn: "Загрузка баннера...",
            bannerDailyLimitBtn: "Баннеры на сегодня закончились",
            confirmBanner: "Посмотреть короткий баннер за",
            bannerRewardMsg: (r) => `📺 +${r} монет за баннер!`,
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
            walletPlaceholder: "TON wallet address for withdrawal",
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
            modalText: "Welcome! Go through the dilemmas or turn on the terminal and start earning coins. Come back every day — your reward grows!",
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
            statVideoTitle: "📺 VIDEO",
            statAdRatioTitle: "📊 AD INCOME SHARE",
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
            weeklyBoxLockedNote: "🔒 The chest unlocks once your video reward grows to 18 coins — a 55-330 coin range opens up.",
            bigBoxLockedNote: "🔒 The big box unlocks at the same point (18 coins/video) — and the first one is granted right away.",
            bannerBtnPrefix: "Quick banner",
            bannerWaitBtn: (mmss) => `Banner in ${mmss}`,
            bannerLoadingBtn: "Loading banner...",
            bannerDailyLimitBtn: "No more banners today",
            confirmBanner: "Watch a short banner for",
            bannerRewardMsg: (r) => `📺 +${r} coins for the banner!`,
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
        balance: 0, manual_limit: 20, max_manual_limit: 20, video_reward: 10,
        ads_watched_today: 0, ads_required_today: 15, streak_count: 0,
        ref_count: 0, ref_earn: 0, min_withdrawal: 10000,
        days_to_next_reward: null, days_to_next_limit: null, days_to_next_big_box: null,
        banner_cooldown_seconds: 0, banners_watched_today: 0, banner_daily_limit: 6,
        game_tokens: 0, game_ads_watched_today: 0, game_daily_limit: 8,
    };

    // Награда за баннер — только для текста кнопки, реальное начисление
    // считает сервер (см. lib/economyConfig.js: BANNER_REWARD).
    const BANNER_REWARD_DISPLAY = 8;

    // Зеркало серверной лестницы наград (lib/streakLogic.js: DAILY_LADDER
    // и BOX_UNLOCK_TIER_IDX) — только для отображения, реальные начисления
    // считает сервер. Сундук открывается со 2-го тира (video_reward = 18).
    function weeklyLadderFor(reward) {
        return { values: [11, 17, 23, 29, 35, 41], boxUnlocked: reward >= 18 };
    }

    async function refreshUser() {
        try {
            userState = await api('get-user', { startParam, timezone: userTimezone });
            startBannerCountdown(userState.banner_cooldown_seconds || 0);
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
        if (withdrawLimitEl) withdrawLimitEl.innerHTML = translations[currentLang].withdrawLimit(userState.min_withdrawal || 10000);

        updateCourseDisplay();

        renderWeekLadder();
        renderProgressHints();
        updateVideoRewardDisplay();

        updateWatchButton();
        updateBannerButton();
        updateGameJetonsDisplay();
    }

    function updateVideoRewardDisplay() {
        const el = document.getElementById('statVideoVal');
        if (el) el.innerText = `${userState.video_reward} ${translations[currentLang].videoRewardUnit}`;
    }

    function updateCourseDisplay() {
        const el = document.getElementById('statCourseVal');
        if (el && userState.min_withdrawal_ton != null) {
            const coinLabel = currentLang === 'ru' ? 'Монет' : 'Coins';
            el.innerText = `${userState.min_withdrawal} ${coinLabel} ≈ ${userState.min_withdrawal_ton} TON`;
        }
        const ratioEl = document.getElementById('statAdRatioVal');
        if (ratioEl && userState.ad_payout_ratio != null) {
            const cur = Number(userState.ad_payout_ratio).toFixed(1);
            const max = Number(userState.max_ad_payout_ratio || 50).toFixed(1);
            ratioEl.innerText = `${cur}/${max}%`;
        }
    }

    function renderWeekLadder() {
        const nextPos = (userState.streak_count % 7) + 1;
        const { values, boxUnlocked } = weeklyLadderFor(userState.video_reward || 10);
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
            } else if ((userState.video_reward || 10) < 18) {
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
                ? (currentLang === 'ru' ? 'Большая коробка: откроется на уровне 18 монет/ролик' : 'Big box: unlocks at 18 coins/video')
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
        setText('statAdRatioTitle', t.statAdRatioTitle);
        setText('statVideoTitle', t.statVideoTitle);
        setText('tRefBonusText', t.tRefBonusText);
        updateVideoRewardDisplay();
        setText('tAdsProgressLabel', t.tAdsProgressLabel);
        setText('tDailyStreakLabel', t.tDailyStreakLabel);

        updateCourseDisplay();

        const promoInput = document.getElementById('promoInput');
        if (promoInput) promoInput.placeholder = t.promoPlaceholder;

        const walletInput = document.getElementById('payoutAddressInput');
        if (walletInput) walletInput.placeholder = t.walletPlaceholder;

        updateWatchButton();
        updateBannerButton();
    };

    // ==== Реклама (Adsgram) ====
    // Переключатель: пока боевой блок 43383 (новая площадка) на модерации,
    // стоит USE_TEST_ADS = true с ID тестовой платформы в TEST_BLOCK_ID —
    // так можно проверять показ рекламы прямо сейчас, не дожидаясь
    // одобрения. После модерации верните USE_TEST_ADS = false.
    const USE_TEST_ADS = false;
    const PROD_BLOCK_ID = "44049";
    const TEST_BLOCK_ID = "43046";
    // Interstitial — отдельный от Reward тип блока, для баннеров в
    // Терминале. task-44051 получен про запас на будущее (Task ad —
    // нативный блок в стиле "список заданий"), пока не используется.
    const BANNER_BLOCK_ID = "int-44050";

    let videoController = null;
    let bannerController = null;
    if (window.Adsgram) {
        videoController = window.Adsgram.init({
            blockId: USE_TEST_ADS ? TEST_BLOCK_ID : PROD_BLOCK_ID,
            debug: USE_TEST_ADS,
        });
        bannerController = window.Adsgram.init({
            blockId: USE_TEST_ADS ? TEST_BLOCK_ID : BANNER_BLOCK_ID,
            debug: USE_TEST_ADS,
        });
    }

    // ==== Баннер (Interstitial) ====
    const bannerBtn = document.getElementById('bannerBtn');
    let isBannerLoading = false;
    let bannerCooldownRemaining = 0;
    let bannerCountdownTimer = null;

    function formatMMSS(totalSeconds) {
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return `${m}:${String(s).padStart(2, '0')}`;
    }

    function updateBannerButton() {
        if (!bannerBtn) return;
        const t = translations[currentLang];
        const dailyLimitReached = (userState.banners_watched_today || 0) >= (userState.banner_daily_limit || 6);
        if (isBannerLoading) {
            bannerBtn.innerText = t.bannerLoadingBtn;
            bannerBtn.disabled = true;
        } else if (dailyLimitReached) {
            bannerBtn.innerText = t.bannerDailyLimitBtn;
            bannerBtn.disabled = true;
        } else if (bannerCooldownRemaining > 0) {
            bannerBtn.innerText = t.bannerWaitBtn(formatMMSS(bannerCooldownRemaining));
            bannerBtn.disabled = true;
        } else {
            const left = (userState.banner_daily_limit || 6) - (userState.banners_watched_today || 0);
            bannerBtn.innerText = `${t.bannerBtnPrefix} (+${BANNER_REWARD_DISPLAY} ${t.coinWord}) · ${left}/${userState.banner_daily_limit || 6}`;
            bannerBtn.disabled = false;
        }
    }

    function startBannerCountdown(seconds) {
        bannerCooldownRemaining = Math.max(0, Math.floor(seconds || 0));
        if (bannerCountdownTimer) clearInterval(bannerCountdownTimer);
        if (bannerCooldownRemaining <= 0) {
            updateBannerButton();
            return;
        }
        bannerCountdownTimer = setInterval(() => {
            bannerCooldownRemaining -= 1;
            if (bannerCooldownRemaining <= 0) {
                bannerCooldownRemaining = 0;
                clearInterval(bannerCountdownTimer);
                bannerCountdownTimer = null;
            }
            updateBannerButton();
        }, 1000);
        updateBannerButton();
    }

    if (bannerBtn) {
        bannerBtn.addEventListener('click', async () => {
            const dailyLimitReached = (userState.banners_watched_today || 0) >= (userState.banner_daily_limit || 6);
            if (isBannerLoading || bannerCooldownRemaining > 0 || dailyLimitReached) return;
            if (!confirm(`${translations[currentLang].confirmBanner} +${BANNER_REWARD_DISPLAY}?`)) return;

            isBannerLoading = true;
            updateBannerButton();

            let session;
            try {
                session = await api('session', { action: 'banner_start' });
            } catch (e) {
                isBannerLoading = false;
                alert(e.message);
                await refreshUser();
                return;
            }

            const finishBannerSuccess = async () => {
                try {
                    const result = await api('session', { action: 'banner_complete', sessionId: session.sessionId });
                    userState.balance = result.balance;
                    renderUser();
                    alert(translations[currentLang].bannerRewardMsg(result.reward));
                } catch (e) {
                    alert(e.message);
                } finally {
                    isBannerLoading = false;
                    await refreshUser();
                }
            };

            const finishBannerFail = async () => {
                isBannerLoading = false;
                await refreshUser();
                alert(translations[currentLang].adErrorAlert);
            };

            if (bannerController) {
                bannerController.show()
                    .then((result) => { if (result?.done !== false) finishBannerSuccess(); else finishBannerFail(); })
                    .catch(finishBannerFail);
            } else {
                setTimeout(finishBannerSuccess, session.durationSeconds ? session.durationSeconds * 1000 : 8000);
            }
        });
    }

    // ==== Мини-игры (закрытый период, валюта game_tokens) ====
    const gameContainer = document.getElementById('gameContainer');
    const gameJetonsEl = document.getElementById('gameJetons');
    const gameClaimBox = document.getElementById('gameClaimBox');
    const gameClaimScoreText = document.getElementById('gameClaimScoreText');
    const gameClaimBtn = document.getElementById('gameClaimBtn');
    const gameRestartBtn = document.getElementById('gameRestartBtn');
    const btnNavGames = document.getElementById('btnNavGames');
    const gamePickBlockBlast = document.getElementById('gamePickBlockBlast');
    const gamePick2048 = document.getElementById('gamePick2048');
    const gamePickWaterSort = document.getElementById('gamePickWaterSort');

    const GAME_ENGINES = {
        blockblast: () => window.BlockBlast,
        '2048': () => window.Game2048,
        watersort: () => window.WaterSort,
    };
    let currentGameKey = 'blockblast';
    let currentGameInstance = null;
    let lastGameScore = 0;
    let isGameClaimLoading = false;

    function updateGameJetonsDisplay() {
        if (gameJetonsEl) gameJetonsEl.innerText = `Жетоны: ${userState.game_tokens || 0}`;
    }

    function updateGamePickButtons() {
        if (gamePickBlockBlast) gamePickBlockBlast.style.background = currentGameKey === 'blockblast' ? '' : 'rgba(255,255,255,0.08)';
        if (gamePick2048) gamePick2048.style.background = currentGameKey === '2048' ? '' : 'rgba(255,255,255,0.08)';
        if (gamePickWaterSort) gamePickWaterSort.style.background = currentGameKey === 'watersort' ? '' : 'rgba(255,255,255,0.08)';
    }

    function startCurrentGameRound() {
        const engine = GAME_ENGINES[currentGameKey] && GAME_ENGINES[currentGameKey]();
        if (!engine || !gameContainer) return;
        gameClaimBox.style.display = 'none';
        currentGameInstance = engine.mount(gameContainer, {
            onGameOver: (score) => {
                lastGameScore = score;
                gameClaimScoreText.innerText = `Раунд окончен! Очки: ${score}`;
                gameClaimBox.style.display = 'block';
            },
        });
    }

    function destroyCurrentGame() {
        if (currentGameInstance) {
            currentGameInstance.destroy();
            currentGameInstance = null;
        }
    }

    function switchGame(key) {
        if (currentGameKey === key) return;
        currentGameKey = key;
        updateGamePickButtons();
        destroyCurrentGame();
        startCurrentGameRound();
    }

    if (gamePickBlockBlast) gamePickBlockBlast.addEventListener('click', () => switchGame('blockblast'));
    if (gamePick2048) gamePick2048.addEventListener('click', () => switchGame('2048'));
    if (gamePickWaterSort) gamePickWaterSort.addEventListener('click', () => switchGame('watersort'));

    if (btnNavGames) {
        btnNavGames.addEventListener('click', () => {
            switchTab('games');
            updateGameJetonsDisplay();
            if (!currentGameInstance) startCurrentGameRound();
        });
    }

    // При уходе на другие вкладки гасим игру, чтобы не тратить ресурсы в фоне
    ['btnNavDilemmas', 'btnNavTerminal', 'btnNavFinance', 'btnNavHistory'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', destroyCurrentGame);
    });

    if (gameRestartBtn) {
        gameRestartBtn.addEventListener('click', startCurrentGameRound);
    }

    if (gameClaimBtn) {
        gameClaimBtn.addEventListener('click', async () => {
            if (isGameClaimLoading) return;
            isGameClaimLoading = true;
            gameClaimBtn.disabled = true;
            gameClaimBtn.innerText = 'Загрузка...';

            let session;
            try {
                session = await api('session', { action: 'game_start', game: currentGameKey, timezone: userTimezone });
            } catch (e) {
                alert(e.message);
                isGameClaimLoading = false;
                gameClaimBtn.disabled = false;
                gameClaimBtn.innerText = 'Получить награду';
                return;
            }

            const finishGameSuccess = async () => {
                try {
                    const result = await api('session', { action: 'game_complete', sessionId: session.sessionId, score: lastGameScore });
                    userState.game_tokens = result.gameTokens;
                    updateGameJetonsDisplay();
                    alert(`🧩 +${result.reward} жетонов!`);
                } catch (e) {
                    alert(e.message);
                } finally {
                    isGameClaimLoading = false;
                    gameClaimBtn.disabled = false;
                    gameClaimBtn.innerText = 'Получить награду';
                    gameClaimBox.style.display = 'none';
                    startCurrentGameRound();
                }
            };

            const finishGameFail = () => {
                isGameClaimLoading = false;
                gameClaimBtn.disabled = false;
                gameClaimBtn.innerText = 'Получить награду';
            };

            // Именно Reward-блок (videoController), а не баннер — только он
            // гарантирует настоящий полный просмотр (см. разбор done-семантики
            // Interstitial в чате). Для claim'а награды это важнее, чем для
            // бонусного баннера.
            if (videoController) {
                videoController.show()
                    .then((result) => { if (result?.done !== false) finishGameSuccess(); else finishGameFail(); })
                    .catch(finishGameFail);
            } else {
                setTimeout(finishGameSuccess, 15000);
            }
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
            } else if (userState.manual_limit <= 0) {
                checkpointBtn.innerText = t.limitBtn;
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
            session = await api('session', { action: 'start', sessionType, topic });
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
                const result = await api('session', { action: 'complete', sessionId: session.sessionId });
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
                    await api('session', { action: 'cancel', sessionId: session.sessionId });
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
                const result = await api('economy', { action: 'promo_redeem', code });
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
                const result = await api('account', { action: 'withdraw', payoutAddress });
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
        updateWatchButton();
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
            const result = await api('dilemma', { action: 'get', topic, lang: currentLang });
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
            const result = await api('dilemma', {
                action: 'choose',
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
                    await api('account', { action: 'confirm_age' });
                } catch (e) {
                    console.error('confirm-age failed', e);
                }
                userState.age_confirmed = true;
                if (ageGateModal) ageGateModal.style.display = 'none';
            }, { once: true });
        }
    }
});
