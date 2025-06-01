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
    // Definition moved to js/ui/gameGui.js

    // --- Main Game Class ---
    // Definition moved to js/game.js

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