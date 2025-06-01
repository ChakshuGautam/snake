import { Direc, PointType } from '../common/constants.js'; // Added PointType
import { log, randomChoice } from '../common/utils.js';
import { BaseSolver } from './baseSolver.js';
import { PathSolver } from './pathSolver.js';
// Implicitly uses Snake, Map, Pos through BaseSolver and PathSolver

class _TableCellHamilton {
    constructor() { this.reset(); }
    reset() {
        this.idx = null;
        this.direc = Direc.NONE;
    }
}

export class HamiltonSolver extends BaseSolver {
    constructor(snake, shortcuts = true) {
        if (snake.map.num_rows % 2 !== 0 || snake.map.num_cols % 2 !== 0) {
            log("Warning: HamiltonSolver prefers even dimensions for standard cycle construction.");
            // Original Python raises ValueError, here we just warn and proceed.
        }
        super(snake);
        this._shortcuts = shortcuts;
        this._path_solver = new PathSolver(snake);
        this._table = Array.from({ length: snake.map.num_rows }, () =>
            Array.from({ length: snake.map.num_cols }, () => new _TableCellHamilton())
        );
        try {
            this._build_cycle();
        } catch (e) {
            log("Error building Hamiltonian cycle:", e);
            this._cycle_built = false; // Flag if cycle construction failed
        }
    }

    _build_cycle() {
        this._path_solver.snake = this.snake;

        const { snake: temp_snake, map: temp_map } = this.snake.copy(); // map copy not strictly needed here if not modified by pathsolver
        this._path_solver.snake = temp_snake;

        const path_to_tail = this._path_solver.longest_path_to_tail();
        if (path_to_tail.length === 0 && this.map.capacity > this.snake.len()) {
            log("Hamiltonian cycle construction might fail: initial longest_path_to_tail is empty.");
        }

        let cur = temp_snake.head().clone();
        let cnt = 0;

        for (const direc of path_to_tail) {
            if (!this.map.is_inside(cur) || this._table[cur.x][cur.y].idx !== null) break;
            this._table[cur.x][cur.y].idx = cnt;
            this._table[cur.x][cur.y].direc = direc;
            cur = cur.adj(direc);
            cnt++;
        }

        const snake_bodies = temp_snake.bodies.toArray().reverse();
        for (let i = 0; i < snake_bodies.length - 1; ++i) {
            const body_part_pos = snake_bodies[i];
            const next_body_part_pos = snake_bodies[i + 1];
            // Check if already processed by path_to_tail or if not inside map (should not happen for body)
            if (!this.map.is_inside(body_part_pos) || this._table[body_part_pos.x][body_part_pos.y].idx !== null) {
                 if (this._table[body_part_pos.x][body_part_pos.y].idx === null && this.map.is_inside(body_part_pos)) {
                    // This case means it's a body part not covered by the path_to_tail and not yet in table.
                    // This can happen if path_to_tail is shorter than (capacity - snake.len() + 1)
                 } else {
                    continue; // Skip if already processed or outside (latter is error condition)
                 }
            }
            this._table[body_part_pos.x][body_part_pos.y].idx = cnt;
            this._table[body_part_pos.x][body_part_pos.y].direc = body_part_pos.direc_to(next_body_part_pos);
            cnt++;
        }

        if (cnt !== this.map.capacity && this.map.capacity > 0) {
            log(`Hamiltonian cycle may be incomplete. Expected ${this.map.capacity} cells, got ${cnt}. Solver might not work well.`);
        }
        this._cycle_built = (cnt === this.map.capacity || (this.map.capacity === 0 && cnt === 0) ); // Also handle zero capacity maps
    }


    _relative_dist(ori_idx, x_idx, size) {
        if (size === 0) return 0; // Avoid modulo by zero if map capacity is 0
        if (ori_idx === null || x_idx === null) return size; // Treat null idx as maximally distant

        let dist = x_idx - ori_idx;
        if (dist < 0) {
            dist += size;
        }
        return dist;
    }

    next_direc() {
        if (!this._cycle_built && this.map.capacity > 0) {
            log("Hamilton cycle not built, using fallback direction (random safe or current).");
            const head = this.snake.head();
            let safe_direcs = [];
            for (const adj_pos of head.all_adj()) {
                 // Check if adj_pos is valid and not opposite to current direction
                if (adj_pos && this.map.is_safe(adj_pos) && (this.snake.direc === Direc.NONE || Direc.opposite(this.snake.direc) !== head.direc_to(adj_pos))) {
                    safe_direcs.push(head.direc_to(adj_pos));
                }
            }
            return randomChoice(safe_direcs) || this.snake.direc;
        }

        const head = this.snake.head();
        if (!this.map.is_inside(head) || this._table[head.x][head.y].idx === null) {
            log("HamiltonSolver: Snake head out of bounds or not in cycle table. Fallback.");
            return this.snake.direc;
        }
        let nxt_direc = this._table[head.x][head.y].direc;

        if (this._shortcuts && this.snake.len() < 0.5 * this.map.capacity && this.map.food) {
            this._path_solver.snake = this.snake;
            const path_to_food = this._path_solver.shortest_path_to_food();
            if (path_to_food.length > 0) {
                const tail = this.snake.tail();
                const nxt_pos_on_shortest_path = head.adj(path_to_food.front);
                const food_pos = this.map.food;

                if (!this.map.is_inside(tail) || this._table[tail.x][tail.y].idx === null ||
                    !this.map.is_inside(nxt_pos_on_shortest_path) || this._table[nxt_pos_on_shortest_path.x][nxt_pos_on_shortest_path.y].idx === null ||
                    !this.map.is_inside(food_pos) || this._table[food_pos.x][food_pos.y].idx === null) {
                    return nxt_direc;
                }

                const tail_idx = this._table[tail.x][tail.y].idx;
                const head_idx = this._table[head.x][head.y].idx; // Already checked head is in table
                const nxt_idx = this._table[nxt_pos_on_shortest_path.x][nxt_pos_on_shortest_path.y].idx;
                const food_idx = this._table[food_pos.x][food_pos.y].idx;

                const map_cap = this.map.capacity;
                if (map_cap === 0) return nxt_direc;

                const cond1 = (path_to_food.length === 1 && (Math.abs(food_idx - tail_idx) % map_cap === 1 || Math.abs(food_idx - tail_idx) % map_cap === map_cap -1) );


                if (!cond1) {
                    const head_idx_rel = this._relative_dist(tail_idx, head_idx, map_cap);
                    const nxt_idx_rel = this._relative_dist(tail_idx, nxt_idx, map_cap);
                    const food_idx_rel = this._relative_dist(tail_idx, food_idx, map_cap);
                    if (nxt_idx_rel > head_idx_rel && nxt_idx_rel <= food_idx_rel) {
                        const { snake: s_virtual } = this.snake.copy();
                        s_virtual.map = this.snake.map.copy();
                        s_virtual.move(path_to_food.front);

                        if (!s_virtual.dead) {
                            this._path_solver.snake = s_virtual;
                            const path_to_virtual_tail = this._path_solver.longest_path_to_tail();
                            if (path_to_virtual_tail.length > 0 || s_virtual.len() === s_virtual.map.capacity) {
                                nxt_direc = path_to_food.front;
                            }
                        }
                    }
                }
            }
        }
        return nxt_direc;
    }
}
