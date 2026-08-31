// ============================================================
// Water Sort — самодостаточный модуль мини-игры.
// window.WaterSort.mount(container, { onGameOver, onScoreChange })
// onGameOver вызывается при победе (все колбы однородны) — у этой
// игры нет "проигрыша" в привычном смысле, только решение головоломки.
// Возвращает { destroy() }.
// ============================================================
(function () {
    const TUBE_CAPACITY = 4;
    const COLORS = ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa', '#f783ac', '#20c997'];

    function generatePuzzle(numColors, emptyTubes) {
        // Скремблим ходом "перенести один шарик с верха A на верх B"
        // (без требования совпадения цвета — это генерация, а не игровой
        // ход) из уже решённого состояния. Так гарантированно возникает
        // реальное смешение цветов в трубках, и головоломка разрешима
        // обычным pour() в обратную сторону — стандартный приём для игр
        // такого жанра.
        const tubes = [];
        for (let i = 0; i < numColors; i++) tubes.push(Array(TUBE_CAPACITY).fill(i));
        for (let i = 0; i < emptyTubes; i++) tubes.push([]);

        const targetMoves = 40 + numColors * 12;
        for (let step = 0; step < targetMoves; step++) {
            const nonEmpty = [];
            for (let i = 0; i < tubes.length; i++) if (tubes[i].length > 0) nonEmpty.push(i);
            const fromIdx = nonEmpty[Math.floor(Math.random() * nonEmpty.length)];
            const notFull = [];
            for (let i = 0; i < tubes.length; i++) if (i !== fromIdx && tubes[i].length < TUBE_CAPACITY) notFull.push(i);
            if (!notFull.length) continue;
            const toIdx = notFull[Math.floor(Math.random() * notFull.length)];
            tubes[toIdx].push(tubes[fromIdx].pop());
        }
        // Если скремблинг случайно вернул уже решённое поле (крайне маловероятно) — повторим один раз
        if (isSolved(tubes)) return generatePuzzle(numColors, emptyTubes);
        return tubes;
    }

    function topColor(tube) {
        return tube.length ? tube[tube.length - 1] : null;
    }

    function canPour(from, to) {
        if (!from.length) return false;
        if (to.length >= TUBE_CAPACITY) return false;
        const fromColor = topColor(from);
        if (to.length === 0) return true;
        return topColor(to) === fromColor;
    }

    function pour(tubes, fromIdx, toIdx) {
        const from = tubes[fromIdx], to = tubes[toIdx];
        if (!canPour(from, to)) return false;
        const color = topColor(from);
        let moved = 0;
        while (from.length && topColor(from) === color && to.length < TUBE_CAPACITY) {
            to.push(from.pop());
            moved++;
        }
        return moved > 0;
    }

    function isSolved(tubes) {
        return tubes.every((t) => t.length === 0 || (t.length === TUBE_CAPACITY && t.every((v) => v === t[0])));
    }

    function mount(container, opts) {
        opts = opts || {};
        const onGameOver = opts.onGameOver || function () {};
        const onScoreChange = opts.onScoreChange || function () {};

        container.innerHTML = '';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.alignItems = 'center';
        container.style.gap = '14px';
        container.style.userSelect = 'none';

        const infoEl = document.createElement('div');
        infoEl.style.cssText = 'font-size:14px;font-weight:700;color:#fff;';
        infoEl.textContent = 'Ходов: 0';
        container.appendChild(infoEl);

        const fieldEl = document.createElement('div');
        fieldEl.style.cssText = 'display:flex;flex-wrap:wrap;gap:12px;justify-content:center;max-width:360px;';
        container.appendChild(fieldEl);

        const controlsEl = document.createElement('div');
        controlsEl.style.cssText = 'display:flex;gap:10px;';
        const newGameBtn = document.createElement('button');
        newGameBtn.className = 'btn';
        newGameBtn.style.cssText = 'padding:8px 16px;font-size:13px;background:rgba(255,255,255,0.08);';
        newGameBtn.textContent = 'Новая головоломка';
        controlsEl.appendChild(newGameBtn);
        container.appendChild(controlsEl);

        const NUM_COLORS = 6;
        const EMPTY_TUBES = 2;
        let tubes = generatePuzzle(NUM_COLORS, EMPTY_TUBES);
        let selected = null;
        let moves = 0;
        let destroyed = false;

        function render() {
            fieldEl.innerHTML = '';
            tubes.forEach((tube, idx) => {
                const tubeEl = document.createElement('div');
                const isSel = idx === selected;
                tubeEl.style.cssText = `width:44px;height:${TUBE_CAPACITY * 26 + 10}px;border-radius:0 0 10px 10px;
                    border:3px solid ${isSel ? '#69db7c' : 'rgba(255,255,255,0.25)'};border-top:none;
                    display:flex;flex-direction:column-reverse;padding:4px;box-sizing:border-box;
                    background:rgba(255,255,255,0.03);cursor:pointer;`;
                tube.forEach((colorIdx) => {
                    const seg = document.createElement('div');
                    seg.style.cssText = `width:100%;height:22px;border-radius:4px;margin-top:2px;background:${COLORS[colorIdx]};`;
                    tubeEl.appendChild(seg);
                });
                tubeEl.addEventListener('click', () => onTubeClick(idx));
                fieldEl.appendChild(tubeEl);
            });
            infoEl.textContent = `Ходов: ${moves}`;
        }

        function onTubeClick(idx) {
            if (destroyed) return;
            if (selected === null) {
                if (tubes[idx].length > 0) selected = idx;
                render();
                return;
            }
            if (selected === idx) {
                selected = null;
                render();
                return;
            }
            const success = pour(tubes, selected, idx);
            selected = null;
            if (success) {
                moves++;
                // Очки: чем меньше ходов до победы, тем выше итоговый счёт при решении
                onScoreChange(Math.max(0, 500 - moves * 10));
                render();
                if (isSolved(tubes)) {
                    const finalScore = Math.max(50, 500 - moves * 10);
                    setTimeout(() => onGameOver(finalScore), 300);
                    return;
                }
            }
            render();
        }

        newGameBtn.addEventListener('click', () => {
            tubes = generatePuzzle(NUM_COLORS, EMPTY_TUBES);
            selected = null;
            moves = 0;
            onScoreChange(0);
            render();
        });

        render();

        return {
            destroy() {
                destroyed = true;
                container.innerHTML = '';
            },
            getScore() { return Math.max(0, 500 - moves * 10); },
        };
    }

    window.WaterSort = { mount };
})();
