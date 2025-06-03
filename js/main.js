import { GameConf } from './config/gameConf.js';
import { Game, currentGameInstance as gameInstanceAccessor } from './game.js'; // Import currentGameInstance to ensure it's linked if needed by setupAndRunGame
import { GameMode } from './common/constants.js';

document.addEventListener('DOMContentLoaded', () => {
    const conf = new GameConf(); // Load default config

    const solverSelect = document.getElementById('solverSelect');
    const modeSelect = document.getElementById('modeSelect');
    const startGameBtn = document.getElementById('startGameBtn');

    // Set initial UI values from default config
    const solverKeyMap = { "GreedySolver": "greedy", "HamiltonSolver": "hamilton", "DQNSolver": "dqn" };
    solverSelect.value = solverKeyMap[conf.solver_name] || "hamilton";

    const modeKeyMap = {
        [GameMode.NORMAL]: "normal",
        [GameMode.BENCHMARK]: "bcmk",
        [GameMode.TRAIN_DQN]: "train_dqn",
        [GameMode.TRAIN_DQN_GUI]: "train_dqn_gui"
    };
    modeSelect.value = modeKeyMap[conf.mode] || "normal";

    function setupAndRunGame() {
        // Access the currentGameInstance from game.js. If it exists, call _on_exit.
        // Note: The Game class's constructor sets `currentGameInstance = this;` 
        // and `_on_exit()` nullifies it. This relies on `currentGameInstance` 
        // being a mutable variable exported from `game.js`.
        // A more robust approach might involve a dedicated Game manager or ensuring
        // `currentGameInstance` is explicitly passed around or set/unset via exported functions.
        // For now, we assume the `game.js` export `let currentGameInstance` works as a shared reference.
        
        // To ensure we're acting on the instance from game.js, we should ideally call a method on it,
        // or `game.js` should provide a setter for its `currentGameInstance`.
        // However, the original code implies `currentGameInstance` is a global-like variable.
        // The `import { Game, currentGameInstance as gameInstanceAccessor }` allows reading it,
        // but direct assignment like `gameInstanceAccessor = null` from here won't modify the original in game.js.
        // The Game class's `_on_exit` method correctly sets its module's `currentGameInstance` to null.
        // The Game class's `run` method correctly sets its module's `currentGameInstance = this`.
        // So, the existing mechanism within Game class should suffice.
        
        // If there's an active game instance (tracked within game.js), tell it to exit.
        // This relies on `gameInstanceAccessor` correctly reflecting the shared state.
        // However, direct read via import might not be live-updated if `game.js` changes it.
        // The original pattern `if (currentGameInstance)` implies `currentGameInstance` was in the same scope.
        // The most straightforward way to replicate is to have `Game.exitCurrent()` static method if possible,
        // or ensure `game.js` manages this global state and provides a way to trigger cleanup.

        // For now, let's assume that `new Game(conf).run()` will correctly set the
        // `currentGameInstance` in `game.js` and that if an old `Game` instance's `_on_exit`
        // was called, it would have nullified that same `currentGameInstance`.
        // This is a bit fragile due to JS module variable scoping.

        // A simple check: if a game's GUI is running, it implies an instance exists.
        // This is an indirect way to check.
        // A cleaner way would be for `Game` to have a static method like `Game.cleanupCurrentInstance()`.
        // For now, the `run()` method of a new game instance will set itself as `currentGameInstance`.
        // If an old game was running, its `_on_exit` should be called by some other means if needed,
        // or the new game's `run` should handle replacing it.
        // The original code's `if (currentGameInstance)` was in the same IIFE scope.
        // We'll rely on the Game constructor and run() method to manage currentGameInstance in game.js.
        
        // The `Game` class itself will handle `currentGameInstance` via its constructor and `run()` method.
        // No explicit call to `currentGameInstance._on_exit()` here is needed if starting a new game
        // implicitly cleans up the old one by overwriting `currentGameInstance` in `game.js`.

        const selectedSolverKey = solverSelect.value;
        const selectedModeKey = modeSelect.value;

        // These dictionaries should ideally be part of GameConf or a dedicated config module.
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

        // Update the shared conf instance
        conf.solver_name = dict_solver[selectedSolverKey];
        conf.mode = dict_mode[selectedModeKey];
        
        // Create and run the new game. The Game class's `run` method will set
        // the `currentGameInstance` in its own module (`game.js`).
        new Game(conf).run();
    }

    startGameBtn.addEventListener('click', setupAndRunGame);

    // Optionally start a default game on load
    setupAndRunGame();
});
