// ============================================================
// 2048 — самодостаточный модуль мини-игры.
// window.Game2048.mount(container, { onGameOver, onScoreChange })
// Возвращает { destroy() }.
// ============================================================
(function () {
    const SIZE = 4;
    const COLORS = {
        2: '#eee4da', 4: '#ede0c8', 8: '#f2b179', 16: '#f59563',
        32: '#f67c5f', 64: '#f65e3b', 128: '#edcf72', 256: '#edcc61',
        512: '#edc850', 1024: '#edc53f', 2048: '#edc22e',
    };
    const TEXT_DARK = '#5c503f';

    function emptyBoard() {
        return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    }

    function emptyCells(board) {
        const cells = [];
        for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (!board[r][c]) cells.push([r, c]);
        return cells;
    }

    function spawnTile(board) {
        const cells = emptyCells(board);
        if (!cells.length) return;
        const [r, c] = cells[Math.floor(Math.random() * cells.length)];
        board[r][c] = Math.random() < 0.9 ? 2 : 4;
    }

    // Сдвигает и сливает одну строку влево, возвращает { row, gained }
    function slideRowLeft(row) {
        const vals = row.filter((v) => v);
        const result = [];
        let gained = 0;
        for (let i = 0; i < vals.length; i++) {
            if (vals[i] === vals[i + 1]) {
                const merged = vals[i] * 2;
                result.push(merged);
                gained += merged;
                i++;
            } else {
                result.push(vals[i]);
            }
        }
        while (result.length < SIZE) result.push(0);
        return { row: result, gained };
    }

    function rotateBoard(board) {
        // поворот на 90 градусов по часовой — переиспользуем slideLeft для всех 4 направлений
        const res = emptyBoard();
        for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) res[c][SIZE - 1 - r] = board[r][c];
        return res;
    }

    function moveLeft(board) {
        let gained = 0, moved = false;
        const newBoard = board.map((row) => {
            const before = row.join(',');
            const { row: newRow, gained: g } = slideRowLeft(row);
            gained += g;
            if (newRow.join(',') !== before) moved = true;
            return newRow;
        });
        return { board: newBoard, gained, moved };
    }

    function move(board, dir) {
        // dir: 'left' | 'right' | 'up' | 'down'
        let b = board;
        let rotations = { left: 0, up: 1, right: 2, down: 3 }[dir];
        for (let i = 0; i < rotations; i++) b = rotateBoard(b);
        const result = moveLeft(b);
        let resBoard = result.board;
        for (let i = 0; i < (4 - rotations) % 4; i++) resBoard = rotateBoard(resBoard);
        return { board: resBoard, gained: result.gained, moved: result.moved };
    }

    function hasMoves(board) {
        if (emptyCells(board).length > 0) return true;
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                const v = board[r][c];
                if (c + 1 < SIZE && board[r][c + 1] === v) return true;
                if (r + 1 < SIZE && board[r + 1][c] === v) return true;
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
        container.style.touchAction = 'none';

        const scoreEl = document.createElement('div');
        scoreEl.style.cssText = 'font-size:22px;font-weight:800;color:#fff;text-shadow:0 0 8px rgba(237,194,46,0.6);';
        scoreEl.textContent = 'Очки: 0';
        container.appendChild(scoreEl);

        const boardEl = document.createElement('div');
        const cellsPerSide = SIZE;
        boardEl.style.cssText = `display:grid;grid-template-columns:repeat(${cellsPerSide},1fr);gap:8px;
            width:min(88vw,320px);height:min(88vw,320px);background:#10131a;border-radius:12px;padding:8px;
            box-shadow:0 0 0 2px rgba(255,255,255,0.08) inset;box-sizing:border-box;`;
        container.appendChild(boardEl);

        const hint = document.createElement('div');
        hint.style.cssText = 'font-size:12px;color:#9aa0a6;';
        hint.textContent = 'Свайпни в любую сторону';
        container.appendChild(hint);

        let board = emptyBoard();
        let score = 0;
        let destroyed = false;

        function render() {
            boardEl.innerHTML = '';
            for (let r = 0; r < SIZE; r++) {
                for (let c = 0; c < SIZE; c++) {
                    const v = board[r][c];
                    const cell = document.createElement('div');
                    cell.style.cssText = `border-radius:6px;display:flex;align-items:center;justify-content:center;
                        font-weight:800;font-size:${v >= 1000 ? '16px' : '20px'};
                        background:${v ? (COLORS[v] || '#3c3a32') : 'rgba(255,255,255,0.04)'};
                        color:${v && v <= 4 ? TEXT_DARK : '#fff'};`;
                    cell.textContent = v || '';
                    boardEl.appendChild(cell);
                }
            }
        }

        function doMove(dir) {
            if (destroyed) return;
            const result = move(board, dir);
            if (!result.moved) return;
            board = result.board;
            score += result.gained;
            spawnTile(board);
            onScoreChange(score);
            scoreEl.textContent = `Очки: ${score}`;
            render();
            if (!hasMoves(board)) {
                setTimeout(() => onGameOver(score), 300);
            }
        }

        let touchStartX = 0, touchStartY = 0;
        function onTouchStart(e) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }
        function onTouchEnd(e) {
            const dx = e.changedTouches[0].clientX - touchStartX;
            const dy = e.changedTouches[0].clientY - touchStartY;
            if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return; // слишком короткий свайп, игнор
            if (Math.abs(dx) > Math.abs(dy)) {
                doMove(dx > 0 ? 'right' : 'left');
            } else {
                doMove(dy > 0 ? 'down' : 'up');
            }
        }
        boardEl.addEventListener('touchstart', onTouchStart, { passive: true });
        boardEl.addEventListener('touchend', onTouchEnd, { passive: true });

        function onKeyDown(e) {
            const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
            if (map[e.key]) { e.preventDefault(); doMove(map[e.key]); }
        }
        window.addEventListener('keydown', onKeyDown);

        spawnTile(board);
        spawnTile(board);
        render();

        return {
            destroy() {
                destroyed = true;
                window.removeEventListener('keydown', onKeyDown);
                container.innerHTML = '';
            },
            getScore() { return score; },
        };
    }

    window.Game2048 = { mount };
})();
