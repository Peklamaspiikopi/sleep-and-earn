// ============================================================
// Block Blast — самодостаточный модуль мини-игры.
// Подключение: window.BlockBlast.mount(container, { onGameOver, onScoreChange })
// container — DOM-элемент, куда монтируется canvas + трей фигур.
// onGameOver(score) — вызывается, когда ни одну из 3 фигур некуда поставить.
// Возвращает { destroy() } для размонтирования при уходе с вкладки.
// ============================================================
(function () {
    const GRID_SIZE = 8;
    const CELL_GAP = 3;

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
        container.style.touchAction = 'manipulation';

        const scoreEl = document.createElement('div');
        scoreEl.style.cssText = 'font-size:22px;font-weight:800;color:#fff;text-shadow:0 0 8px rgba(105,219,124,0.6);';
        scoreEl.textContent = 'Очки: 0';
        container.appendChild(scoreEl);

        const canvas = document.createElement('canvas');
        const boardPx = 328; // 8 * (38 + gap) примерно, подстроится ниже
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
        let selectedIdx = null;
        let destroyed = false;

        function cellPx() { return canvas.width / GRID_SIZE; }

        function drawBoard(ghost) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const cs = cellPx();
            for (let r = 0; r < GRID_SIZE; r++) {
                for (let c = 0; c < GRID_SIZE; c++) {
                    const x = c * cs, y = r * cs;
                    ctx.fillStyle = board[r][c] ? board[r][c] : 'rgba(255,255,255,0.04)';
                    roundRect(ctx, x + CELL_GAP / 2, y + CELL_GAP / 2, cs - CELL_GAP, cs - CELL_GAP, 6);
                    ctx.fill();
                }
            }
            if (ghost) {
                ctx.fillStyle = ghost.valid ? 'rgba(105,219,124,0.45)' : 'rgba(255,107,107,0.45)';
                for (const [dr, dc] of ghost.shape) {
                    const r = ghost.row + dr, c = ghost.col + dc;
                    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) continue;
                    const x = c * cs, y = r * cs;
                    roundRect(ctx, x + CELL_GAP / 2, y + CELL_GAP / 2, cs - CELL_GAP, cs - CELL_GAP, 6);
                    ctx.fill();
                }
            }
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

        function renderTray() {
            trayEl.innerHTML = '';
            tray.forEach((piece, idx) => {
                const holder = document.createElement('div');
                const isSel = idx === selectedIdx;
                holder.style.cssText = `flex:1;min-height:64px;display:flex;align-items:center;justify-content:center;
                    border-radius:10px;background:${isSel ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.05)'};
                    border:2px solid ${isSel ? '#69db7c' : 'transparent'};cursor:pointer;`;
                if (!piece) { trayEl.appendChild(holder); return; }
                const { rows, cols } = shapeSize(piece.shape);
                const miniCs = Math.min(38, 132 / Math.max(rows, cols));
                const mini = document.createElement('canvas');
                mini.width = cols * miniCs;
                mini.height = rows * miniCs;
                mini.style.cssText = `width:${cols * miniCs}px;height:${rows * miniCs}px;`;
                const mctx = mini.getContext('2d');
                mctx.fillStyle = piece.color;
                for (const [dr, dc] of piece.shape) {
                    roundRect(mctx, dc * miniCs + 2, dr * miniCs + 2, miniCs - 4, miniCs - 4, 4);
                    mctx.fill();
                }
                holder.appendChild(mini);
                holder.addEventListener('click', () => {
                    selectedIdx = (selectedIdx === idx) ? null : idx;
                    renderTray();
                    drawBoard(null);
                });
                trayEl.appendChild(holder);
            });
        }

        function clearFullLines() {
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
            for (const r of fullRows) for (let c = 0; c < GRID_SIZE; c++) board[r][c] = null;
            for (const c of fullCols) for (let r = 0; r < GRID_SIZE; r++) board[r][c] = null;
            // бонус за комбо: 1 линия=10, 2=30, 3=60, 4+=100
            const bonusTable = { 1: 10, 2: 30, 3: 60 };
            return bonusTable[cleared] || 100;
        }

        function checkGameOver() {
            for (const piece of tray) {
                if (piece && anyPlacementExists(board, piece.shape)) return false;
            }
            return true;
        }

        function placeAt(row, col) {
            if (selectedIdx === null) return;
            const piece = tray[selectedIdx];
            if (!piece || !canPlace(board, piece.shape, row, col)) return;
            for (const [dr, dc] of piece.shape) board[row + dr][col + dc] = piece.color;
            score += piece.shape.length;
            const clearBonus = clearFullLines();
            score += clearBonus;
            tray[selectedIdx] = null;
            selectedIdx = null;
            if (tray.every((p) => !p)) tray = [randomPiece(), randomPiece(), randomPiece()];
            onScoreChange(score);
            scoreEl.textContent = `Очки: ${score}`;
            renderTray();
            drawBoard(null);
            if (checkGameOver() && !destroyed) {
                setTimeout(() => onGameOver(score), 300);
            }
        }

        function cellFromEvent(evt) {
            const rect = canvas.getBoundingClientRect();
            const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
            const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const x = (clientX - rect.left) * scaleX;
            const y = (clientY - rect.top) * scaleY;
            const cs = cellPx();
            return { row: Math.floor(y / cs), col: Math.floor(x / cs) };
        }

        function onCanvasMove(evt) {
            if (selectedIdx === null) return;
            const { row, col } = cellFromEvent(evt);
            const piece = tray[selectedIdx];
            if (!piece) return;
            drawBoard({ shape: piece.shape, row, col, valid: canPlace(board, piece.shape, row, col) });
        }

        function onCanvasClick(evt) {
            if (selectedIdx === null) return;
            const { row, col } = cellFromEvent(evt);
            placeAt(row, col);
        }

        canvas.addEventListener('mousemove', onCanvasMove);
        canvas.addEventListener('click', onCanvasClick);
        canvas.addEventListener('touchstart', (e) => { onCanvasMove(e); }, { passive: true });
        canvas.addEventListener('touchend', (e) => {
            // используем последнюю известную позицию через touchmove/touchstart
            if (e.changedTouches && e.changedTouches[0]) {
                const rect = canvas.getBoundingClientRect();
                const scaleX = canvas.width / rect.width;
                const scaleY = canvas.height / rect.height;
                const x = (e.changedTouches[0].clientX - rect.left) * scaleX;
                const y = (e.changedTouches[0].clientY - rect.top) * scaleY;
                const cs = cellPx();
                placeAt(Math.floor(y / cs), Math.floor(x / cs));
            }
        });

        renderTray();
        drawBoard(null);

        return {
            destroy() {
                destroyed = true;
                container.innerHTML = '';
            },
            getScore() { return score; },
        };
    }

    window.BlockBlast = { mount };
})();
