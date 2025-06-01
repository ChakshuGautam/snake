(function () {
    // --- Constants and Enums ---
    // Definitions moved to js/common/constants.js

    // --- Utility Functions ---
    // Definitions moved to js/common/utils.js

    // --- Custom Deque ---
    // Definition moved to js/common/deque.js

    // --- Core Game Classes ---
    // Definition moved to js/common/point.js

    // Definition moved to js/common/pos.js

    // Definition moved to js/core/map.js

    // Definition moved to js/core/snake.js

    // --- Solver Base Class ---
    // Definition moved to js/solvers/baseSolver.js

    // --- Path Solver ---
    // Definitions moved to js/solvers/pathSolver.js

    // --- Greedy Solver ---
    // Definition moved to js/solvers/greedySolver.js

    // --- Hamilton Solver ---
    // Definitions moved to js/solvers/hamiltonSolver.js

    // --- DQN Solver (Simplified Placeholder) ---
    // Definition moved to js/solvers/dqnSolver.js

    // --- Game Configuration (mirrors Python GameConf) ---
    // Definition moved to js/config/gameConf.js

    // --- GUI Class (using HTML Canvas) ---
    class GameGUI {
        constructor(title, conf, gameMap, gameInstance) {
            document.title = title;
            this.conf = conf;
            this.gameMap = gameMap;
            this.game = gameInstance;
            this.canvas = document.getElementById('gameCanvas');
            this.ctx = this.canvas.getContext('2d');
            this.infoPanelElement = document.getElementById('infoPanel');
            this._setupCanvas();
            this._initDrawParams();
            this._initKeybindings();

            this.gameLoopIntervalId = null;
        }

        _setupCanvas() {
            this.canvas.width = this.conf.map_width;
            this.canvas.height = this.conf.map_height;
        }

        _initDrawParams() {
            this.grid_cell_width = this.conf.map_width / (this.gameMap.num_cols - 2);
            this.grid_cell_height = this.conf.map_height / (this.gameMap.num_rows - 2);
            const pr = this.conf.grid_pad_ratio; // pad_ratio
            const fpr = 0.9 * pr; // food_pad_ratio

            this.dx1 = pr * this.grid_cell_width;
            this.dx2 = (1 - pr) * this.grid_cell_width; // Simpler: width of inner rect
            this.dy1 = pr * this.grid_cell_height;
            this.dy2 = (1 - pr) * this.grid_cell_height;

            this.dx1_food = fpr * this.grid_cell_width;
            this.dx2_food = (1 - fpr) * this.grid_cell_width;
            this.dy1_food = fpr * this.grid_cell_height;
            this.dy2_food = (1 - fpr) * this.grid_cell_height;
        }

        _initKeybindings() {
            // Handled by Game class now for central control
        }

        // show(gameLoopFn) in Python is tricky. In JS, we use requestAnimationFrame for rendering
        // and setTimeout/setInterval for game logic updates.
        runGameLoop(gameLogicTickFn) {
            if (this.gameLoopIntervalId) clearInterval(this.gameLoopIntervalId);

            const logicLoop = () => {
                gameLogicTickFn(); // Call the game's main logic function
                // Rendering is separate via requestAnimationFrame
            };
            this.gameLoopIntervalId = setInterval(logicLoop, this.conf.interval_draw);

            const renderLoop = () => {
                this._updateContents(); // Render current state
                requestAnimationFrame(renderLoop);
            };
            requestAnimationFrame(renderLoop);
        }

        stopGameLoop() {
            if (this.gameLoopIntervalId) {
                clearInterval(this.gameLoopIntervalId);
                this.gameLoopIntervalId = null;
            }
            // requestAnimationFrame will stop if not called again, but good to have a flag if needed
        }


        _updateContents() {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this._drawBg();
            if (this.conf.show_grid_line) this._drawGridLine();
            this._drawMapContents();
            if (this.conf.show_info_panel && this.infoPanelElement) this._updateInfoPanelDOM();
        }

        _drawBg() {
            this.ctx.fillStyle = this.conf.color_bg;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
        _drawGridLine() {
            this.ctx.strokeStyle = this.conf.color_line;
            this.ctx.lineWidth = 1;
            for (let i = 1; i < this.gameMap.num_cols - 2; i++) {
                const x = i * this.grid_cell_width;
                this.ctx.beginPath(); this.ctx.moveTo(x, 0); this.ctx.lineTo(x, this.conf.map_height); this.ctx.stroke();
            }
            for (let i = 1; i < this.gameMap.num_rows - 2; i++) {
                const y = i * this.grid_cell_height;
                this.ctx.beginPath(); this.ctx.moveTo(0, y); this.ctx.lineTo(this.conf.map_width, y); this.ctx.stroke();
            }
        }
        _updateInfoPanelDOM() {
            let status_str;
            if (this.game.snake.dead) status_str = this.conf.info_status[1];
            else if (this.gameMap.is_full()) status_str = this.conf.info_status[2];
            else status_str = this.conf.info_status[0];

            const infoText = this.conf.info_str_template
                .replace("{status}", status_str)
                .replace("{episode}", this.game.episode)
                .replace("{step}", this.game.snake.steps)
                .replace("{length}", this.game.snake.len())
                .replace("{capacity}", this.gameMap.capacity)
                .replace("{map_rows}", this.conf.map_rows)
                .replace("{map_cols}", this.conf.map_cols);

            this.infoPanelElement.innerHTML = infoText.replace(/\n/g, "<br>");
        }

        _drawMapContents() {
            for (let r = 0; r < this.gameMap.num_rows - 2; r++) { // iterate drawable area
                for (let c = 0; c < this.gameMap.num_cols - 2; c++) {
                    this._drawGridCell(
                        c * this.grid_cell_width, // x-coord on canvas
                        r * this.grid_cell_height, // y-coord on canvas
                        this.gameMap.point(new Pos(r + 1, c + 1)).type // Get type from map (r+1, c+1 due to walls)
                    );
                }
            }
        }

        _drawGridCell(canvas_x, canvas_y, type) {
            const w = this.grid_cell_width;
            const h = this.grid_cell_height;
            // dx1, dy1 are padding for main body part, dx2, dy2 are width/height of main body part
            // For head and body parts, the drawing logic from Python GUI is complex.
            // Simplified rendering for head/body parts: just rectangles.
            // The Python _draw_grid uses specific dx1,dy1,dx2,dy2 based on PointType for curves.
            // This will be a direct translation of that.

            this.ctx.fillStyle = this.conf.color_body; // Default for body parts

            switch (type) {
                case PointType.EMPTY: break; // Do nothing
                case PointType.WALL:
                    this.ctx.fillStyle = this.conf.color_wall;
                    this.ctx.fillRect(canvas_x, canvas_y, w, h);
                    break;
                case PointType.FOOD:
                    this.ctx.fillStyle = this.conf.color_food;
                    this.ctx.fillRect(canvas_x + this.dx1_food, canvas_y + this.dy1_food,
                        this.dx2_food, this.dy2_food);
                    break;
                // HEAD types
                case PointType.HEAD_L:
                    this.ctx.fillStyle = this.conf.color_head;
                    this.ctx.fillRect(canvas_x + this.dx1, canvas_y + this.dy1, w - this.dx1, this.dy2);
                    break;
                case PointType.HEAD_U:
                    this.ctx.fillStyle = this.conf.color_head;
                    this.ctx.fillRect(canvas_x + this.dx1, canvas_y + this.dy1, this.dx2, h - this.dy1);
                    break;
                case PointType.HEAD_R:
                    this.ctx.fillStyle = this.conf.color_head;
                    this.ctx.fillRect(canvas_x, canvas_y + this.dy1, this.dx2 + this.dx1, this.dy2); // Python uses x + self._dx2 (width), not pos.
                    break;
                case PointType.HEAD_D:
                    this.ctx.fillStyle = this.conf.color_head;
                    this.ctx.fillRect(canvas_x + this.dx1, canvas_y, this.dx2, this.dy2 + this.dy1);
                    break;
                // BODY types (corners)
                case PointType.BODY_LU: // Body turning Left then Up
                    this.ctx.fillRect(canvas_x, canvas_y + this.dy1, this.dx1 + this.dx2, this.dy2); // Horizontal part
                    this.ctx.fillRect(canvas_x + this.dx1, canvas_y, this.dx2, this.dy1 + this.dy2); // Vertical part
                    break;
                case PointType.BODY_UR: // Up then Right
                    this.ctx.fillRect(canvas_x + this.dx1, canvas_y, this.dx2, this.dy1 + this.dy2);
                    this.ctx.fillRect(canvas_x + this.dx1, canvas_y + this.dy1, w - this.dx1, this.dy2);
                    break;
                case PointType.BODY_RD: // Right then Down
                    this.ctx.fillRect(canvas_x + this.dx1, canvas_y + this.dy1, w - this.dx1, this.dy2);
                    this.ctx.fillRect(canvas_x + this.dx1, canvas_y + this.dy1, this.dx2, h - this.dy1);
                    break;
                case PointType.BODY_DL: // Down then Left
                    this.ctx.fillRect(canvas_x + this.dx1, canvas_y + this.dy1, this.dx2, h - this.dy1);
                    this.ctx.fillRect(canvas_x, canvas_y + this.dy1, this.dx1 + this.dx2, this.dy2);
                    break;
                // BODY types (straight)
                case PointType.BODY_HOR:
                    this.ctx.fillRect(canvas_x, canvas_y + this.dy1, w, this.dy2);
                    break;
                case PointType.BODY_VER:
                    this.ctx.fillRect(canvas_x + this.dx1, canvas_y, this.dx2, h);
                    break;
                default: // Other snake body parts (if any defined but not drawn specifically)
                    this.ctx.fillStyle = this.conf.color_body;
                    this.ctx.fillRect(canvas_x + this.dx1, canvas_y + this.dy1, this.dx2, this.dy2);
                    break;
            }
        }
    }


    // --- Main Game Class ---
    let currentGameInstance = null; // To manage global game state for UI controls

    class Game {
        constructor(conf) {
            this.conf = conf;
            this.map = new Map(conf.map_rows + 2, conf.map_cols + 2);

            // Convert init_bodies_coords to Pos objects for Snake constructor
            const init_bodies_pos = conf.init_bodies_coords.map(p => new Pos(p.x, p.y));
            this.snake = new Snake(this.map, conf.init_direc, init_bodies_pos, conf.init_types);

            this.paused = false;
            const solverClasses = { GreedySolver, HamiltonSolver, DQNSolver };
            if (solverClasses[conf.solver_name]) {
                this.solver = new solverClasses[conf.solver_name](this.snake);
            } else {
                log(`Error: Unknown solver name '${conf.solver_name}'. Defaulting to GreedySolver.`);
                this.solver = new GreedySolver(this.snake);
                this.conf.solver_name = "GreedySolver"; // Update conf to reflect actual solver
            }
            this.episode = 1;
            this.gui = null; // Will be set in run() if GUI mode
            log(`Game initialized. Solver: ${this.conf.solver_name}, Mode: ${this.conf.mode}`);
            this._bindKeyEvents(); // Bind global key events
        }

        _bindKeyEvents() {
            document.addEventListener('keydown', (e) => {
                if (!currentGameInstance || currentGameInstance !== this) return; // Only active game handles keys

                let key = e.key.toLowerCase();
                if (e.code === 'Space') key = 'space'; // Normalize spacebar

                switch (key) {
                    case 'w': case 'arrowup': this._update_direc(Direc.UP); break;
                    case 'a': case 'arrowleft': this._update_direc(Direc.LEFT); break;
                    case 's': case 'arrowdown': this._update_direc(Direc.DOWN); break;
                    case 'd': case 'arrowright': this._update_direc(Direc.RIGHT); break;
                    case 'r': this._reset(); break;
                    case ' ': this._toggle_pause(); break; // Spacebar for pause
                    // case 'escape': this._on_exit(); break; // Exit is usually browser close
                }
                if (['w', 'a', 's', 'd', 'r', ' ', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'].includes(key)) {
                    e.preventDefault();
                }
            });
        }


        run() {
            currentGameInstance = this; // Set as active game instance

            if (this.gui) { // If GUI was previously active, stop its loop
                this.gui.stopGameLoop();
            }

            if (this.conf.mode === GameMode.NORMAL || this.conf.mode === GameMode.TRAIN_DQN_GUI) {
                this.gui = new GameGUI("Snake JS", this.conf, this.map, this);
                let gameLogicTickFn;
                if (this.conf.mode === GameMode.NORMAL) {
                    gameLogicTickFn = () => this._game_main_normal();
                } else { // TRAIN_DQN_GUI
                    gameLogicTickFn = () => this._game_main_dqn_train_gui();
                }
                this.gui.runGameLoop(gameLogicTickFn);
            } else if (this.conf.mode === GameMode.BENCHMARK) {
                this._run_benchmarks_js();
            } else if (this.conf.mode === GameMode.TRAIN_DQN) {
                this._run_dqn_train_js();
            }
        }

        _game_main_normal() {
            if (this.paused || this._is_episode_end()) return;
            if (!this.map.has_food()) {
                this.map.create_rand_food();
            }
            this._update_direc(this.solver.next_direc());
            this.snake.move();
            if (this._is_episode_end()) {
                log(`Episode ${this.episode} ended. Score: ${this.snake.len()}, Steps: ${this.snake.steps}`);
                // Optionally auto-restart or wait for 'R'
            }
        }

        _game_main_dqn_train_gui() { // Simplified for GUI, actual training is very complex
            if (this.paused) return;
            if (!this.map.has_food()) {
                this.map.create_rand_food();
            }

            if (this.solver && typeof this.solver.train === 'function') {
                const { episode_end, learn_end } = this.solver.train();
                if (episode_end) {
                    log(`DQN (sim) Episode ${this.episode} ended. Score: ${this.snake.len()}, Steps: ${this.snake.steps}`);
                    this._reset(); // Reset snake and map for new episode
                }
                if (learn_end) {
                    log("DQN (sim) Learning Ended.");
                    this.paused = true; // Pause game
                    if (this.gui) this.gui.stopGameLoop();
                    if (this.solver.plot) this.solver.plot(); // Will just log
                }
            } else { // Fallback if solver has no train method
                this._game_main_normal();
                if (this._is_episode_end()) this._reset();
            }
        }

        _run_benchmarks_js() {
            const steps_limit = this.conf.map_capacity * 100; // More generous step limit
            const num_episodes = parseInt(prompt("Enter number of episodes for benchmark:", "10"), 10) || 10;
            log(`Benchmarking ${this.conf.solver_name} for ${num_episodes} episodes.`);

            let totalLen = 0, totalSteps = 0, episodes_completed = 0;

            // Need to run this async or it will block UI updates if any.
            // For now, simple blocking loop for console.
            for (let i = 0; i < num_episodes; i++) {
                this._reset(false); // Reset for new episode, don't increment episode from UI perspective yet
                this.episode = i + 1; // Local episode counter for benchmark

                // log(`Benchmark Episode ${this.episode} starting...`);
                while (true) {
                    this._game_main_normal(); // Run one step, it handles food, move, pause (though pause not typical in benchmark)
                    if (this._is_episode_end() || this.snake.steps >= steps_limit) {
                        //log(`Benchmark Episode ${this.episode} ended. Length: ${this.snake.len()}, Steps: ${this.snake.steps}`);
                        break;
                    }
                }
                totalLen += this.snake.len();
                totalSteps += this.snake.steps;
                episodes_completed++;
            }

            if (episodes_completed > 0) {
                log(`Benchmark Summary (${this.conf.solver_name}): 
                    Avg Length: ${(totalLen / episodes_completed).toFixed(2)}, 
                    Avg Steps: ${(totalSteps / episodes_completed).toFixed(2)} 
                    (${episodes_completed} episodes)`);
            } else {
                log("Benchmark: No episodes completed.");
            }
            this.episode = 1; // Reset global episode counter
            this._reset(true); // Reset game to initial state
            if (this.gui) this.gui.stopGameLoop(); // Stop if GUI was running
            alert("Benchmark finished. Check console for results.");
        }

        _run_dqn_train_js() {
            log("Simulating DQN training in console (simplified)...");
            let learn_end = false;
            let current_step = 0;
            const max_sim_steps = 10000; // Limit simulation for console

            try {
                while (!learn_end && current_step < max_sim_steps) {
                    if (this.solver && typeof this.solver.train === 'function') {
                        const result = this.solver.train(); // DQNSolver's train
                        learn_end = result.learn_end;
                        if (result.episode_end) {
                            log(`DQN (sim) Episode ${this.episode} ended for training. Score: ${this.snake.len()}`);
                            this._reset(); // Resets snake for new training episode
                        }
                    } else {
                        log("Error: DQN solver not configured or 'train' method missing.");
                        break;
                    }
                    current_step++;
                    if (current_step % 1000 === 0) log(`DQN (sim) training step: ${current_step}`);
                }
            } catch (e) {
                log("Error during DQN training simulation:", e);
            } finally {
                log("DQN training simulation finished.");
                if (this.solver.plot) this.solver.plot();
                this._on_exit();
                if (this.gui) this.gui.stopGameLoop(); // Stop if GUI was running
                alert("DQN Training simulation finished. Check console.");
            }
        }

        _update_direc(new_direc) {
            this.snake.direc_next = new_direc;
            if (this.paused) { // If paused, move one step and redraw (if GUI)
                this.snake.move();
            }
        }
        _toggle_pause() {
            this.paused = !this.paused;
            log(this.paused ? "Game Paused" : "Game Resumed");
        }
        _is_episode_end() { return this.snake.dead || this.map.is_full(); }

        _reset(incrementEpisode = true) { // Pass true to increment episode from UI R key
            this.snake.reset(true); // reset_map=true to clear food, snake sets its own bodies

            // Re-apply initial snake state to the map because snake.reset(true) calls map.reset()
            // which clears everything.
            const init_bodies_pos = this.conf.init_bodies_coords.map(p => new Pos(p.x, p.y));
            for (let i = 0; i < init_bodies_pos.length; i++) {
                this.map.point(init_bodies_pos[i]).type = this.conf.init_types[i];
            }

            if (incrementEpisode) {
                this.episode++;
            }
            log(`Game reset. Starting episode ${this.episode}.`);
        }

        _on_exit() {
            log("Game exiting/cleaning up.");
            if (this.solver && typeof this.solver.close === 'function') {
                this.solver.close();
            }
            if (this.gui) this.gui.stopGameLoop();
            currentGameInstance = null;
        }
    }

    // --- Entry Point and UI Setup ---
    document.addEventListener('DOMContentLoaded', () => {
        const conf = new GameConf(); // Load default config

        const solverSelect = document.getElementById('solverSelect');
        const modeSelect = document.getElementById('modeSelect');
        const startGameBtn = document.getElementById('startGameBtn');

        // Set initial UI values from default config
        // Solver name in conf is class name like "HamiltonSolver"
        // We need to map it back to key like "hamilton"
        const solverKeyMap = { "GreedySolver": "greedy", "HamiltonSolver": "hamilton", "DQNSolver": "dqn" };
        solverSelect.value = solverKeyMap[conf.solver_name] || "hamilton";

        const modeKeyMap = {
            [GameMode.NORMAL]: "normal", [GameMode.BENCHMARK]: "bcmk",
            [GameMode.TRAIN_DQN]: "train_dqn", [GameMode.TRAIN_DQN_GUI]: "train_dqn_gui"
        };
        modeSelect.value = modeKeyMap[conf.mode] || "normal";


        function setupAndRunGame() {
            if (currentGameInstance) {
                currentGameInstance._on_exit(); // Clean up old game
            }

            const selectedSolverKey = solverSelect.value;
            const selectedModeKey = modeSelect.value;

            const dict_solver = {
                "greedy": "GreedySolver",
                "hamilton": "HamiltonSolver",
                "dqn": "DQNSolver"
            };
            const dict_mode = {
                "normal": GameMode.NORMAL,
                "bcmk": GameMode.BENCHMARK,
                "train_dqn": GameMode.TRAIN_DQN,
                "train_dqn_gui": GameMode.TRAIN_DQN_GUI
            };

            conf.solver_name = dict_solver[selectedSolverKey];
            conf.mode = dict_mode[selectedModeKey];

            // Reset global episode counter for new game setup.
            // Game constructor will initialize its own episode to 1.
            // If we want to persist episode count across full game restarts, 
            // this needs different logic. For now, each "Start Game" is fresh.
            // conf.episode = 1; // Game constructor handles this.

            new Game(conf).run();
        }

        startGameBtn.addEventListener('click', setupAndRunGame);

        // Optionally start a default game on load
        setupAndRunGame();
    });

})();