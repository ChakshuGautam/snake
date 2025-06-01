import { Direc, GameMode, PointType } from './common/constants.js'; // Added PointType
import { log } from './common/utils.js'; // Removed unused randomInt, randomChoice
import { Map } from './core/map.js';
import { Snake } from './core/snake.js';
import { Pos } from './common/pos.js';
import { GreedySolver } from './solvers/greedySolver.js';
import { HamiltonSolver } from './solvers/hamiltonSolver.js';
import { DQNSolver } from './solvers/dqnSolver.js';
import { GameGUI } from './ui/gameGui.js';
import { GameConf } from './config/gameConf.js'; // GameConf is used if new Game(new GameConf())

// This global variable is used to manage the currently active game instance,
// especially for event handlers like keydown.
export let currentGameInstance = null;

export class Game {
    constructor(conf) {
        this.conf = conf;
        this.map = new Map(conf.map_rows + 2, conf.map_cols + 2);

        const init_bodies_pos = conf.init_bodies_coords.map(p => new Pos(p.x, p.y));
        this.snake = new Snake(this.map, conf.init_direc, init_bodies_pos, conf.init_types);

        this.paused = false;
        // Ensure solver names in config match these class names.
        const solverClasses = {
            GreedySolver,
            HamiltonSolver,
            DQNSolver
        };

        if (solverClasses[conf.solver_name]) {
            this.solver = new solverClasses[conf.solver_name](this.snake);
        } else {
            log(`Error: Unknown solver name '${conf.solver_name}'. Defaulting to GreedySolver.`);
            this.solver = new GreedySolver(this.snake);
            this.conf.solver_name = "GreedySolver";
        }
        this.episode = 1;
        this.gui = null;
        log(`Game initialized. Solver: ${this.conf.solver_name}, Mode: ${this.conf.mode}`);
        this._bindKeyEvents();
    }

    _bindKeyEvents() {
        document.addEventListener('keydown', (e) => {
            // Important: Only the currentGameInstance should respond to key events.
            if (!currentGameInstance || currentGameInstance !== this) return;

            let key = e.key.toLowerCase();
            if (e.code === 'Space') key = 'space';

            switch (key) {
                case 'w': case 'arrowup': this._update_direc(Direc.UP); break;
                case 'a': case 'arrowleft': this._update_direc(Direc.LEFT); break;
                case 's': case 'arrowdown': this._update_direc(Direc.DOWN); break;
                case 'd': case 'arrowright': this._update_direc(Direc.RIGHT); break;
                case 'r': this._reset(); break;
                case ' ': this._toggle_pause(); break;
            }
            if (['w', 'a', 's', 'd', 'r', ' ', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'].includes(key)) {
                e.preventDefault();
            }
        });
    }

    run() {
        currentGameInstance = this; // Set this instance as the globally active one.

        if (this.gui) {
            this.gui.stopGameLoop();
        }

        if (this.conf.mode === GameMode.NORMAL || this.conf.mode === GameMode.TRAIN_DQN_GUI) {
            this.gui = new GameGUI("Snake JS", this.conf, this.map, this);
            let gameLogicTickFn;
            if (this.conf.mode === GameMode.NORMAL) {
                gameLogicTickFn = () => this._game_main_normal();
            } else {
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
        }
    }

    _game_main_dqn_train_gui() {
        if (this.paused) return;
        if (!this.map.has_food()) {
            this.map.create_rand_food();
        }

        if (this.solver && typeof this.solver.train === 'function') {
            const { episode_end, learn_end } = this.solver.train();
            if (episode_end) {
                log(`DQN (sim) Episode ${this.episode} ended. Score: ${this.snake.len()}, Steps: ${this.snake.steps}`);
                this._reset();
            }
            if (learn_end) {
                log("DQN (sim) Learning Ended.");
                this.paused = true;
                if (this.gui) this.gui.stopGameLoop();
                if (this.solver.plot) this.solver.plot();
            }
        } else {
            this._game_main_normal();
            if (this._is_episode_end()) this._reset();
        }
    }

    _run_benchmarks_js() {
        const steps_limit = this.map.capacity * 100;
        const num_episodes = parseInt(prompt("Enter number of episodes for benchmark:", "10"), 10) || 10;
        log(`Benchmarking ${this.conf.solver_name} for ${num_episodes} episodes.`);

        let totalLen = 0, totalSteps = 0, episodes_completed = 0;

        for (let i = 0; i < num_episodes; i++) {
            this._reset(false);
            this.episode = i + 1;

            while (true) {
                this._game_main_normal();
                if (this._is_episode_end() || this.snake.steps >= steps_limit) {
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
        this.episode = 1;
        this._reset(true);
        if (this.gui) this.gui.stopGameLoop();
        alert("Benchmark finished. Check console for results.");
    }

    _run_dqn_train_js() {
        log("Simulating DQN training in console (simplified)...");
        let learn_end = false;
        let current_step = 0;
        const max_sim_steps = 10000;

        try {
            while (!learn_end && current_step < max_sim_steps) {
                if (this.solver && typeof this.solver.train === 'function') {
                    const result = this.solver.train();
                    learn_end = result.learn_end;
                    if (result.episode_end) {
                        log(`DQN (sim) Episode ${this.episode} ended for training. Score: ${this.snake.len()}`);
                        this._reset();
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
            if (this.gui) this.gui.stopGameLoop();
            alert("DQN Training simulation finished. Check console.");
        }
    }

    _update_direc(new_direc) {
        this.snake.direc_next = new_direc;
        if (this.paused) {
            this.snake.move();
        }
    }
    _toggle_pause() {
        this.paused = !this.paused;
        log(this.paused ? "Game Paused" : "Game Resumed");
    }
    _is_episode_end() { return this.snake.dead || this.map.is_full(); }

    _reset(incrementEpisode = true) {
        this.snake.reset(true);

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
        if (currentGameInstance === this) { // Only nullify if this is the active instance
            currentGameInstance = null;
        }
    }
}
