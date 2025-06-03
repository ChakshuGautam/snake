import { Direc, SnakeAction, PointType } from '../common/constants.js';
import { log, randomChoice } from '../common/utils.js';
import { BaseSolver } from './baseSolver.js';
// Implicitly uses Snake and Map through BaseSolver

export class DQNSolver extends BaseSolver {
    constructor(snake) {
        super(snake);
        log("DQNSolver initialized (Simplified JS version). Full TF.js features not implemented.");
        this._use_relative = true; // Default from Python
        // Other DQN params from Python (many related to training, omitted here)
        // _rwd_empty, _rwd_dead, _rwd_food for potential reward calculation if we simulate steps

        if (this._use_relative) {
            this._snake_actions = [SnakeAction.LEFT, SnakeAction.FORWARD, SnakeAction.RIGHT];
        } else {
            this._snake_actions = [Direc.LEFT, Direc.UP, Direc.RIGHT, Direc.DOWN];
        }
        this._num_actions = this._snake_actions.length;
    }

    _state() {
        // Highly simplified state. A full DQN would need careful porting of state representation.
        // For now, just returns a small array representing if adjacent cells are dangerous.
        const head = this.snake.head();
        let important_state = new Array(this._num_actions).fill(0);

        if (this._use_relative) {
            [SnakeAction.LEFT, SnakeAction.FORWARD, SnakeAction.RIGHT].forEach((action, i) => {
                const direc = SnakeAction.to_direc(action, this.snake.direc);
                if (!this.map.is_safe(head.adj(direc))) {
                    important_state[i] = 1;
                }
            });
        } else {
            [Direc.LEFT, Direc.UP, Direc.RIGHT, Direc.DOWN].forEach((direc, i) => {
                if (!this.map.is_safe(head.adj(direc))) {
                    important_state[i] = 1;
                }
            });
        }
        return important_state; // This is just the "local/important state" part
    }

    _choose_action(e_greedy = true) {
        // Simplified: choose a random valid action.
        // Python version has epsilon-greedy and Q-value prediction.
        let available_actions_indices = [];
        for (let i = 0; i < this._num_actions; ++i) {
            let action_direc;
            if (this._use_relative) {
                action_direc = SnakeAction.to_direc(this._snake_actions[i], this.snake.direc);
            } else {
                action_direc = this._snake_actions[i];
            }
            if (action_direc !== Direc.opposite(this.snake.direc)) {
                available_actions_indices.push(i);
            }
        }
        if (available_actions_indices.length === 0) { // Should not happen if snake not trapped
            return Math.floor(Math.random() * this._num_actions); // fallback
        }
        return randomChoice(available_actions_indices);
    }

    next_direc() {
        const action_idx = this._choose_action(false);
        let direc;
        if (this._use_relative) {
            direc = SnakeAction.to_direc(this._snake_actions[action_idx], this.snake.direc);
        } else {
            direc = this._snake_actions[action_idx];
        }
        return direc;
    }

    train() {
        // This is where the complex DQN training loop would go.
        // In this simplified version, we just simulate one game step and decide if episode ends.
        log("DQN train() called (simplified).");

        // const current_state = this._state(); // Get current state (simplified) // Not used in this simplified version
        const action_idx = this._choose_action(true); // Epsilon-greedy for training

        let chosen_direc;
        if (this._use_relative) {
            chosen_direc = SnakeAction.to_direc(this._snake_actions[action_idx], this.snake.direc);
        } else {
            chosen_direc = this._snake_actions[action_idx];
        }

        // Simulate step
        const head = this.snake.head();
        const next_pos = head.adj(chosen_direc);
        // Handle out of bounds access for next_type: if next_pos is null or point is null, consider it WALL
        const next_point = next_pos ? this.map.point(next_pos) : null;
        const next_type = next_point ? next_point.type : PointType.WALL;


        this.snake.move(chosen_direc); // Actually move the snake

        // let reward = 0; // Simplified reward // Not used in this simplified version
        if (next_type === PointType.FOOD) { /* reward = 1.0; */ } // self._rwd_food
        else if (this.snake.dead) { /* reward = -0.5; */ } // self._rwd_dead
        else { /* reward = -0.005; */ } // self._rwd_empty

        // const next_s = this._state(); // Get new state // Not used
        const done = this.snake.dead || this.map.is_full();

        // Normally, would store (current_state, action_idx, reward, next_s, done) in memory
        // and call learning step. Here, we just log.
        // log(`DQN Step: reward=${reward.toFixed(3)}, done=${done}`);

        // Simulate learning frequency, etc. - for this port, just return episode status
        const episode_end = done;
        const learn_end = this.snake.steps > 2000000; // Arbitrary end condition for "training" sim

        return { episode_end, learn_end };
    }

    plot() { log("DQN plot() called - plotting not implemented in JS GUI."); }
    close() { log("DQNSolver closed."); }
}
