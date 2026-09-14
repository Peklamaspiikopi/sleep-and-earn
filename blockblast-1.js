// ============================================================
// Block Blast — самодостаточный модуль мини-игры.
// Подключение: window.BlockBlast.mount(container, { onGameOver, onScoreChange })
// container — DOM-элемент, куда монтируется canvas + трей фигур.
// onGameOver(score) — вызывается, когда ни одну из 3 фигур некуда поставить.
// Возвращает { destroy() } для размонтирования при уходе с вкладки.
//
// Управление — полноценный drag-and-drop (Pointer Events, работает и
// мышью, и пальцем): фигура из трея поднимается над пальцем (чтобы
// сам палец её не закрывал), доска подсвечивается зелёным/красным по
// валидности, отпустил — фигура ставится с "поп"-анимацией, полные
// линии перед очисткой вспыхивают и гаснут, а не исчезают мгновенно.
// ============================================================
(function () {
    const GRID_SIZE = 8;
    const CELL_GAP = 3;
    const DRAG_LIFT_CELLS = 2.3; // на сколько клеток фигура поднимается над пальцем

    // Палитра в духе референса: сочные, но не кислотные цвета
    const COLORS = ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa', '#f783ac'];

    // Фигуры как смещения [row, col] от (0,0). Вращений нет — фигура
    // выпадает уже в случайной из этих ориентаций.
    const SHAPES = [
        [[0, 0]], // точка
        [[0, 0], [0, 1]], [[0, 0], [1, 0]], // домино
        [[0, 0], [0, 1], [0, 2]], [[0, 0], [1, 0], [2, 0]], // трио
        [[0, 0], [0, 1], [0, 2], [0, 3]], [[0, 0], [1, 0], [2, 0], [3, 0]], // тетро линия
        [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]], [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]], // пента линия
        [[0, 0], [0, 1], [1, 0], [1, 1]], // квадрат 2x2
        [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]], // квадрат 3x3 (редкая, бонусная)
        // L и его отражения/повороты
        [[0, 0], [1, 0], [2, 0], [2, 1]],
        [[0, 0], [0, 1], [0, 2], [1, 0]],
        [[0, 0], [0, 1], [1, 1], [2, 1]],
        [[1, 0], [1, 1], [1, 2], [0, 2]],
        [[0, 1], [1, 1], [2, 1], [2, 0]],
        [[0, 0], [1, 0], [1, 1], [1, 2]],
        [[0, 0], [0, 1], [1, 0], [2, 0]],
        [[0, 0], [0, 1], [0, 2], [1, 2]],
        // T
        [[0, 0], [0, 1], [0, 2], [1, 1]],
        [[0, 0], [1, 0], [2, 0], [1, 1]],
        [[1, 0], [1, 1], [1, 2], [0, 1]],
        [[0, 1], [1, 0], [1, 1], [2, 1]],
        // S / Z
        [[0, 1], [0, 2], [1, 0], [1, 1]],
        [[0, 0], [1, 0], [1, 1], [2, 1]],
        [[0, 0], [0, 1], [1, 1], [1, 2]],
        [[0, 1], [1, 0], [1, 1], [2, 0]],
    ];

    function randomPiece() {
        const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        return { shape, color, id: Math.random().toString(36).slice(2) };
    }

    function shapeSize(shape) {
        let maxR = 0, maxC = 0;
        for (const [r, c] of shape) { maxR = Math.max(maxR, r); maxC = Math.max(maxC, c); }
        return { rows: maxR + 1, cols: maxC + 1 };
    }

    function canPlace(board, shape, atRow, atCol) {
        for (const [dr, dc] of shape) {
            const r = atRow + dr, c = atCol + dc;
            if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return false;
            if (board[r][c]) return false;
        }
        return true;
    }

    function anyPlacementExists(board, shape) {
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (canPlace(board, shape, r, c)) return true;
            }
        }
        return false;
    }

    function roundRect(c, x, y, w, h, r) {
        c.beginPath();
        c.moveTo(x + r, y);
        c.arcTo(x + w, y, x + w, y + h, r);
        c.arcTo(x + w, y + h, x, y + h, r);
        c.arcTo(x, y + h, x, y, r);
        c.arcTo(x, y, x + w, y, r);
        c.closePath();
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
        container.style.touchAction = 'none'; // важно для drag пальцем — не даём странице скроллиться

        const scoreEl = document.createElement('div');
        scoreEl.style.cssText = 'font-size:22px;font-weight:800;color:#fff;text-shadow:0 0 8px rgba(105,219,124,0.6);';
        scoreEl.textContent = 'Очки: 0';
        container.appendChild(scoreEl);

        const canvas = document.createElement('canvas');
        const boardPx = 328;
        canvas.width = boardPx;
        canvas.height = boardPx;
        canvas.style.cssText = 'width:min(92vw,360px);height:min(92vw,360px);border-radius:12px;background:#10131a;box-shadow:0 0 0 2px rgba(255,255,255,0.08) inset;';
        container.appendChild(canvas);
        const ctx = canvas.getContext('2d');

        const trayEl = document.createElement('div');
        trayEl.style.cssText = 'display:flex;gap:10px;justify-content:center;width:100%;max-width:360px;';
        container.appendChild(trayEl);

        let board = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
        let score = 0;
        let tray = [randomPiece(), randomPiece(), randomPiece()];
        let destroyed = false;

        // ---- Анимационное состояние ----
        // popCells: недавно поставленные клетки, кратко "выпрыгивают" крупнее нормального размера
        // clearingCells: клетки на полных линиях, которые сейчас вспыхивают/гаснут перед удалением
        let popCells = []; // [{row, col, color, start}]
        let clearingCells = []; // [{row, col, color, start}]
        const POP_MS = 180;
        const CLEAR_MS = 260;
        let rafId = null;

        function cellPx() { return canvas.width / GRID_SIZE; }

        function anyActiveAnimation() {
            return popCells.length > 0 || clearingCells.length > 0;
        }

        function ensureAnimLoop() {
            if (rafId !== null) return;
            const step = () => {
                const now = performance.now();
                popCells = popCells.filter((p) => now - p.start < POP_MS);
                clearingCells = clearingCells.filter((p) => now - p.start < CLEAR_MS);
                drawBoard(currentGhost);
                if (anyActiveAnimation()) {
                    rafId = requestAnimationFrame(step);
                } else {
                    rafId = null;
                }
            };
            rafId = requestAnimationFrame(step);
        }

        let currentGhost = null;

        function drawBoard(ghost) {
            currentGhost = ghost || null;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const cs = cellPx();
            const now = performance.now();

            const clearingMap = {};
            clearingCells.forEach((p) => { clearingMap[`${p.row},${p.col}`] = p; });
            const popMap = {};
            popCells.forEach((p) => { popMap[`${p.row},${p.col}`] = p; });

            for (let r = 0; r < GRID_SIZE; r++) {
                for (let c = 0; c < GRID_SIZE; c++) {
                    const x = c * cs, y = r * cs;
                    const key = `${r},${c}`;
                    const clearing = clearingMap[key];
                    const popping = popMap[key];
                    let fill = board[r][c] ? board[r][c] : 'rgba(255,255,255,0.04)';
                    let scale = 1;
                    let alpha = 1;

                    if (clearing) {
                        const t = Math.min(1, (now - clearing.start) / CLEAR_MS);
                        // вспышка белым в начале, затем гаснет и сжимается
                        fill = t < 0.35 ? '#ffffff' : clearing.color;
                        alpha = 1 - Math.max(0, (t - 0.35) / 0.65);
                        scale = 1 - 0.25 * Math.max(0, (t - 0.35) / 0.65);
                    } else if (popping) {
                        const t = Math.min(1, (now - popping.start) / POP_MS);
                        // растёт до ~1.18x и возвращается к 1x
                        scale = 1 + 0.18 * Math.sin(t * Math.PI);
                    }

                    const size = (cs - CELL_GAP) * scale;
                    const cx = x + cs / 2;
                    const cy = y + cs / 2;
                    ctx.globalAlpha = alpha;
                    ctx.fillStyle = fill;
                    roundRect(ctx, cx - size / 2, cy - size / 2, size, size, 6 * scale);
                    ctx.fill();
                    ctx.globalAlpha = 1;
                }
            }

            if (ghost) {
                for (const [dr, dc] of ghost.shape) {
                    const r = ghost.row + dr, c = ghost.col + dc;
                    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) continue;
                    const x = c * cs, y = r * cs;
                    ctx.fillStyle = ghost.valid ? 'rgba(105,219,124,0.45)' : 'rgba(255,107,107,0.45)';
                    roundRect(ctx, x + CELL_GAP / 2, y + CELL_GAP / 2, cs - CELL_GAP, cs - CELL_GAP, 6);
                    ctx.fill();
                }
            }
        }

        function renderTray() {
            trayEl.innerHTML = '';
            tray.forEach((piece, idx) => {
                const holder = document.createElement('div');
                holder.dataset.idx = String(idx);
                holder.style.cssText = `flex:1;min-height:64px;display:flex;align-items:center;justify-content:center;
                    border-radius:10px;background:rgba(255,255,255,0.05);
                    border:2px solid transparent;touch-action:none;`;
                if (!piece) { trayEl.appendChild(holder); return; }
                const { rows, cols } = shapeSize(piece.shape);
                const miniCs = Math.min(38, 132 / Math.max(rows, cols));
                const mini = document.createElement('canvas');
                mini.width = cols * miniCs;
                mini.height = rows * miniCs;
                mini.style.cssText = `width:${cols * miniCs}px;height:${rows * miniCs}px;pointer-events:none;`;
                const mctx = mini.getContext('2d');
                mctx.fillStyle = piece.color;
                for (const [dr, dc] of piece.shape) {
                    roundRect(mctx, dc * miniCs + 2, dr * miniCs + 2, miniCs - 4, miniCs - 4, 4);
                    mctx.fill();
                }
                holder.appendChild(mini);
                holder.addEventListener('pointerdown', (evt) => startDrag(evt, idx));
                trayEl.appendChild(holder);
            });
        }

        function clearFullLinesAndAnimate() {
            const fullRows = [];
            const fullCols = [];
            for (let r = 0; r < GRID_SIZE; r++) {
                if (board[r].every((v) => v)) fullRows.push(r);
            }
            for (let c = 0; c < GRID_SIZE; c++) {
                let full = true;
                for (let r = 0; r < GRID_SIZE; r++) if (!board[r][c]) { full = false; break; }
                if (full) fullCols.push(c);
            }
            const cleared = fullRows.length + fullCols.length;
            if (cleared === 0) return 0;

            const now = performance.now();
            const seen = new Set();
            for (const r of fullRows) {
                for (let c = 0; c < GRID_SIZE; c++) {
                    const key = `${r},${c}`;
                    if (seen.has(key)) continue;
                    seen.add(key);
                    clearingCells.push({ row: r, col: c, color: board[r][c] || '#69db7c', start: now });
                }
            }
            for (const c of fullCols) {
                for (let r = 0; r < GRID_SIZE; r++) {
                    const key = `${r},${c}`;
                    if (seen.has(key)) continue;
                    seen.add(key);
                    clearingCells.push({ row: r, col: c, color: board[r][c] || '#69db7c', start: now });
                }
            }
            // Данные очищаем сразу (для логики), а визуально клетки ещё
            // "живут" clearingCells до конца анимации (drawBoard рисует
            // их по последнему сохранённому цвету, не по board).
            for (const r of fullRows) for (let c = 0; c < GRID_SIZE; c++) board[r][c] = null;
            for (const c of fullCols) for (let r = 0; r < GRID_SIZE; r++) board[r][c] = null;

            const bonusTable = { 1: 10, 2: 30, 3: 60 };
            ensureAnimLoop();
            return bonusTable[cleared] || 100;
        }

        function checkGameOver() {
            for (const piece of tray) {
                if (piece && anyPlacementExists(board, piece.shape)) return false;
            }
            return true;
        }

        function placeAt(idx, row, col) {
            const piece = tray[idx];
            if (!piece || !canPlace(board, piece.shape, row, col)) return false;
            const now = performance.now();
            for (const [dr, dc] of piece.shape) {
                board[row + dr][col + dc] = piece.color;
                popCells.push({ row: row + dr, col: col + dc, color: piece.color, start: now });
            }
            ensureAnimLoop();
            score += piece.shape.length;
            const clearBonus = clearFullLinesAndAnimate();
            score += clearBonus;
            tray[idx] = null;
            if (tray.every((p) => !p)) tray = [randomPiece(), randomPiece(), randomPiece()];
            onScoreChange(score);
            scoreEl.textContent = `Очки: ${score}`;
            renderTray();
            drawBoard(null);
            if (checkGameOver() && !destroyed) {
                setTimeout(() => onGameOver(score), 350);
            }
            return true;
        }

        // ==== Drag and drop (Pointer Events — мышь и палец единым кодом) ====
        let drag = null; // { idx, piece, ghostEl, cs, cssScale, originRect, pointerId, hoverRow, hoverCol, hoverValid }

        function boardCellFromTopLeft(clientX, clientY, cs) {
            const rect = canvas.getBoundingClientRect();
            const scale = canvas.width / rect.width; // canvas внутренние px -> css px
            const localX = (clientX - rect.left) * scale;
            const localY = (clientY - rect.top) * scale;
            const col = Math.round(localX / cs);
            const row = Math.round(localY / cs);
            return { row, col };
        }

        function makeGhostCanvas(piece, cs, cssScale) {
            const { rows, cols } = shapeSize(piece.shape);
            const c = document.createElement('canvas');
            c.width = cols * cs;
            c.height = rows * cs;
            c.style.cssText = `position:fixed; left:0; top:0; width:${cols * cs * cssScale}px; height:${rows * cs * cssScale}px; pointer-events:none; z-index:9999; filter:drop-shadow(0 6px 10px rgba(0,0,0,0.5));`;
            const gctx = c.getContext('2d');
            gctx.fillStyle = piece.color;
            for (const [dr, dc] of piece.shape) {
                roundRect(gctx, dc * cs + 2, dr * cs + 2, cs - 4, cs - 4, 6);
                gctx.fill();
            }
            return c;
        }

        function startDrag(evt, idx) {
            if (destroyed) return;
            const piece = tray[idx];
            if (!piece) return;
            evt.preventDefault();

            const cs = cellPx();
            const cssScale = canvas.getBoundingClientRect().width / canvas.width;
            const ghostEl = makeGhostCanvas(piece, cs, cssScale);
            document.body.appendChild(ghostEl);

            const holder = trayEl.querySelector(`[data-idx="${idx}"]`);
            const originRect = holder ? holder.getBoundingClientRect() : null;

            drag = { idx, piece, ghostEl, cs, cssScale, originRect, pointerId: evt.pointerId };
            if (holder) holder.style.opacity = '0.25';

            positionGhost(evt.clientX, evt.clientY);
            updateGhostHover(evt.clientX, evt.clientY);

            window.addEventListener('pointermove', onDragMove);
            window.addEventListener('pointerup', onDragEnd);
            window.addEventListener('pointercancel', onDragEnd);
        }

        function positionGhost(clientX, clientY) {
            if (!drag) return;
            const { ghostEl, cs, cssScale } = drag;
            const wCss = ghostEl.width * cssScale;
            const hCss = ghostEl.height * cssScale;
            const liftPx = DRAG_LIFT_CELLS * cs * cssScale;
            ghostEl.style.left = `${clientX - wCss / 2}px`;
            ghostEl.style.top = `${clientY - hCss / 2 - liftPx}px`;
        }

        function updateGhostHover(clientX, clientY) {
            if (!drag) return;
            const { ghostEl, cs, cssScale } = drag;
            const liftedX = clientX - (ghostEl.width * cssScale) / 2;
            const liftedY = clientY - (ghostEl.height * cssScale) / 2 - DRAG_LIFT_CELLS * cs * cssScale;
            const { row, col } = boardCellFromTopLeft(liftedX, liftedY, cs);
            const valid = canPlace(board, drag.piece.shape, row, col);
            drag.hoverRow = row;
            drag.hoverCol = col;
            drag.hoverValid = valid;
            drawBoard({ shape: drag.piece.shape, row, col, valid });
        }

        function onDragMove(evt) {
            if (!drag || evt.pointerId !== drag.pointerId) return;
            positionGhost(evt.clientX, evt.clientY);
            updateGhostHover(evt.clientX, evt.clientY);
        }

        function onDragEnd(evt) {
            if (!drag || evt.pointerId !== drag.pointerId) return;
            window.removeEventListener('pointermove', onDragMove);
            window.removeEventListener('pointerup', onDragEnd);
            window.removeEventListener('pointercancel', onDragEnd);

            const { idx, ghostEl, hoverRow, hoverCol, hoverValid, originRect, cssScale } = drag;
            const holder = trayEl.querySelector(`[data-idx="${idx}"]`);

            if (hoverValid) {
                ghostEl.remove();
                drag = null;
                placeAt(idx, hoverRow, hoverCol);
                return;
            }

            // Невалидное место — плавно возвращаем фигуру обратно в трей
            if (holder) holder.style.opacity = '1';
            if (originRect) {
                ghostEl.style.transition = 'left 160ms ease, top 160ms ease, opacity 160ms ease';
                const targetLeft = originRect.left + originRect.width / 2 - (ghostEl.width * cssScale) / 2;
                const targetTop = originRect.top + originRect.height / 2 - (ghostEl.height * cssScale) / 2;
                requestAnimationFrame(() => {
                    ghostEl.style.left = `${targetLeft}px`;
                    ghostEl.style.top = `${targetTop}px`;
                    ghostEl.style.opacity = '0.4';
                });
                setTimeout(() => ghostEl.remove(), 180);
            } else {
                ghostEl.remove();
            }
            drag = null;
            drawBoard(null);
        }

        function cancelActiveDrag() {
            if (!drag) return;
            window.removeEventListener('pointermove', onDragMove);
            window.removeEventListener('pointerup', onDragEnd);
            window.removeEventListener('pointercancel', onDragEnd);
            const holder = trayEl.querySelector(`[data-idx="${drag.idx}"]`);
            if (holder) holder.style.opacity = '1';
            if (drag.ghostEl) drag.ghostEl.remove();
            drag = null;
            drawBoard(null);
        }

        // Если мини-апп свернули посреди перетаскивания (Telegram WebView не
        // всегда шлёт pointerup/pointercancel при сворачивании), фигура
        // "зависала" — плавающий элемент оставался в DOM, а следующий тап
        // мог задвоить фигуру. Поэтому принудительно отменяем drag при
        // потере видимости/фокуса.
        function handleVisibilityChange() {
            if (document.hidden) cancelActiveDrag();
        }
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('pagehide', cancelActiveDrag);
        window.addEventListener('blur', cancelActiveDrag);

        renderTray();
        drawBoard(null);

        return {
            destroy() {
                destroyed = true;
                if (rafId !== null) cancelAnimationFrame(rafId);
                window.removeEventListener('pointermove', onDragMove);
                window.removeEventListener('pointerup', onDragEnd);
                window.removeEventListener('pointercancel', onDragEnd);
                document.removeEventListener('visibilitychange', handleVisibilityChange);
                window.removeEventListener('pagehide', cancelActiveDrag);
                window.removeEventListener('blur', cancelActiveDrag);
                if (drag && drag.ghostEl) drag.ghostEl.remove();
                container.innerHTML = '';
            },
            getScore() { return score; },
        };
    }

    window.BlockBlast = { mount };
})();
