const game = {
    board: [],
    score: 0,
    level: 1,
    highScore: 0,
    combo: 0,
    maxCombo: 0,
    gameOver: false,
    history: [],
    tileCount: 0,
    maxTiles: 25,

    COLS: 5,
    ROWS: 5,

    init() {
        this.loadHighScore();
        this.newGame();
    },

    newGame() {
        this.board = [];
        this.score = 0;
        this.level = 1;
        this.combo = 0;
        this.maxCombo = 0;
        this.gameOver = false;
        this.history = [];
        this.tileCount = 0;
        this.maxTiles = 25;

        // ボード初期化
        for (let row = 0; row < this.ROWS; row++) {
            this.board[row] = [];
            for (let col = 0; col < this.COLS; col++) {
                this.board[row][col] = null;
            }
        }

        // 初期タイルを配置
        for (let i = 0; i < 10; i++) {
            this.addRandomTile();
        }

        this.updateUI();
        document.getElementById('gameOverScreen').classList.remove('show');
    },

    getMaxColors() {
        return Math.min(3 + Math.floor((this.level - 1) / 2), 6);
    },

    addRandomTile() {
        if (this.tileCount >= this.maxTiles) {
            return false;
        }

        const emptySpots = [];
        for (let row = 0; row < this.ROWS; row++) {
            for (let col = 0; col < this.COLS; col++) {
                if (this.board[row][col] === null) {
                    emptySpots.push({ row, col });
                }
            }
        }

        if (emptySpots.length === 0) {
            return false;
        }

        const spot = emptySpots[Math.floor(Math.random() * emptySpots.length)];
        const color = Math.floor(Math.random() * this.getMaxColors()) + 1;
        this.board[spot.row][spot.col] = color;
        this.tileCount++;

        return true;
    },

    getTile(row, col) {
        if (row < 0 || row >= this.ROWS || col < 0 || col >= this.COLS) {
            return null;
        }
        return this.board[row][col];
    },

    findGroup(row, col) {
        const color = this.board[row][col];
        if (color === null) return [];

        const visited = new Set();
        const group = [];
        const queue = [[row, col]];

        while (queue.length > 0) {
            const [r, c] = queue.shift();
            const key = `${r},${c}`;

            if (visited.has(key)) continue;
            visited.add(key);

            if (this.getTile(r, c) === color) {
                group.push({ row: r, col: c });

                // 上下左右をチェック
                queue.push([r - 1, c]);
                queue.push([r + 1, c]);
                queue.push([r, c - 1]);
                queue.push([r, c + 1]);
            }
        }

        return group.length >= 2 ? group : [];
    },

    onTileClick(row, col) {
        if (this.gameOver || this.board[row][col] === null) return;

        // グループを検出
        const group = this.findGroup(row, col);
        if (group.length === 0) return;

        // ゲーム状態を保存
        this.history.push(JSON.parse(JSON.stringify({
            board: this.board,
            score: this.score,
            level: this.level,
            tileCount: this.tileCount
        })));

        if (this.history.length > 20) {
            this.history.shift();
        }

        // グループを消去
        this.clearGroup(group);

        // スコア計算（グループサイズ²×10×コンボ）
        const baseScore = group.length * group.length * 10;
        this.combo++;
        const earnedScore = baseScore * this.combo;
        this.score += earnedScore;

        // 連鎖を検出
        this.detectChains();

        // ゲームオーバーをチェック
        this.checkGameOver();

        this.updateUI();
    },

    clearGroup(group) {
        group.forEach(({ row, col }) => {
            this.board[row][col] = null;
            this.tileCount--;
        });
    },

    detectChains() {
        let clearedThisTurn = true;

        while (clearedThisTurn) {
            clearedThisTurn = false;

            // 連鎖対象となるグループを検出
            for (let row = 0; row < this.ROWS; row++) {
                for (let col = 0; col < this.COLS; col++) {
                    if (this.board[row][col] !== null) {
                        const group = this.findGroup(row, col);
                        if (group.length > 0) {
                            this.clearGroup(group);
                            const baseScore = group.length * group.length * 10;
                            const earnedScore = baseScore * this.combo;
                            this.score += earnedScore;
                            clearedThisTurn = true;
                        }
                    }
                }
            }

            if (clearedThisTurn) {
                // タイルを落下させる
                this.applyGravity();
            }
        }

        // コンボをリセット
        this.combo = 0;

        // 新しいタイルを追加
        for (let i = 0; i < 3; i++) {
            if (!this.addRandomTile()) {
                break;
            }
        }

        // レベルアップをチェック
        this.checkLevelUp();
    },

    applyGravity() {
        for (let col = 0; col < this.COLS; col++) {
            const tiles = [];
            for (let row = 0; row < this.ROWS; row++) {
                if (this.board[row][col] !== null) {
                    tiles.push(this.board[row][col]);
                }
            }

            for (let row = 0; row < this.ROWS; row++) {
                this.board[row][col] = tiles[row] || null;
            }
        }
    },

    checkLevelUp() {
        const newLevel = Math.floor(this.score / 500) + 1;
        if (newLevel > this.level) {
            this.level = newLevel;
        }
    },

    checkGameOver() {
        if (this.tileCount >= this.maxTiles) {
            this.gameOver = true;
            this.showGameOver();
        }
    },

    showGameOver() {
        const isNewHighScore = this.score > this.highScore;
        if (isNewHighScore) {
            this.highScore = this.score;
            this.saveHighScore();
        }

        document.getElementById('gameOverTitle').textContent = isNewHighScore ? '🎉 新記録達成！' : 'ゲームオーバー';
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('finalLevel').textContent = this.level;
        document.getElementById('newHighScoreLabel').style.display = isNewHighScore ? 'block' : 'none';
        document.getElementById('gameOverScreen').classList.add('show');
    },

    undo() {
        if (this.history.length === 0 || this.gameOver) return;

        const state = this.history.pop();
        this.board = state.board;
        this.score = state.score;
        this.level = state.level;
        this.tileCount = state.tileCount;

        this.updateUI();
    },

    updateUI() {
        this.renderBoard();
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
        document.getElementById('highScore').textContent = this.highScore;

        if (this.combo > 0) {
            document.getElementById('comboDisplay').style.display = 'block';
            document.getElementById('comboValue').textContent = this.combo;
        } else {
            document.getElementById('comboDisplay').style.display = 'none';
        }
    },

    renderBoard() {
        const boardEl = document.getElementById('board');
        boardEl.innerHTML = '';

        for (let row = 0; row < this.ROWS; row++) {
            for (let col = 0; col < this.COLS; col++) {
                const tile = document.createElement('div');
                const color = this.board[row][col];

                if (color !== null) {
                    tile.className = `tile color-${color}`;
                    tile.textContent = color;
                    tile.onclick = () => this.onTileClick(row, col);
                } else {
                    tile.className = 'tile empty';
                }

                boardEl.appendChild(tile);
            }
        }
    },

    saveHighScore() {
        localStorage.setItem('clickClearHighScore', this.highScore);
    },

    loadHighScore() {
        const saved = localStorage.getItem('clickClearHighScore');
        this.highScore = saved ? parseInt(saved, 10) : 0;
    }
};

// ゲーム開始
document.addEventListener('DOMContentLoaded', () => {
    game.init();
});
