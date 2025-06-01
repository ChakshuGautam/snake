import { Pos } from '../common/pos.js';
import { randomChoice } from '../common/utils.js';
import { BaseSolver } from './baseSolver.js';
import { PathSolver } from './pathSolver.js';
// Implicitly uses Snake and Map through BaseSolver and PathSolver

export class GreedySolver extends BaseSolver {
    constructor(snake) {
        super(snake);
        this._path_solver = new PathSolver(snake); // Each solver gets its own PathSolver instance
    }
    next_direc() {
        // const { snake: s_copy, map: m_copy } = this.snake.copy(); // Get copies // Not used
        this._path_solver.snake = this.snake; // Use original snake for initial path finding

        const path_to_food = this._path_solver.shortest_path_to_food();

        if (path_to_food.length > 0) {
            // Simulate move to food
            const s_virtual = this.snake.copy().snake; // new copy for virtual move
            s_virtual.map = this.snake.map.copy(); // virtual snake needs its own map copy

            // Apply path_to_food to s_virtual on its own map copy
            for (const direc of path_to_food) {
                s_virtual.move(direc);
                if (s_virtual.dead) break; // Stop if virtual snake dies
            }

            if (!s_virtual.dead) { // If virtual snake reached food safely
                if (s_virtual.map.is_full()) {
                    return path_to_food.front; // If map full after eating, take the path
                }
                // Check path to virtual tail
                this._path_solver.snake = s_virtual; // PathSolver now operates on virtual snake
                const path_to_virtual_tail = this._path_solver.longest_path_to_tail();
                if (path_to_virtual_tail.length > 1) { // Python checks `len > 1`
                    return path_to_food.front; // Safe to go for food
                }
            }
        }

        // If food path not safe or doesn't exist, try to follow tail
        this._path_solver.snake = this.snake; // Back to original snake
        const path_to_tail = this._path_solver.longest_path_to_tail();
        if (path_to_tail.length > 1) {
            return path_to_tail.front;
        }

        // Last resort: move farthest from food (or a safe random move)
        const head = this.snake.head();
        let best_direc = this.snake.direc; // Default to current direction
        let max_dist = -1;
        let safe_moves = [];

        for (const adj of head.all_adj()) {
            if (this.map.is_safe(adj)) {
                safe_moves.push(head.direc_to(adj));
                if (this.map.food) {
                    const dist = Pos.manhattan_dist(adj, this.map.food);
                    if (dist > max_dist) {
                        max_dist = dist;
                        best_direc = head.direc_to(adj);
                    }
                }
            }
        }
        if (safe_moves.length > 0) {
            return this.map.food ? best_direc : randomChoice(safe_moves); // If no food, random safe move
        }

        // No safe moves, will die, but return current direction as a fallback
        return this.snake.direc;
    }
}
