import { PointType, Direc } from '../common/constants.js';
import { Deque } from '../common/deque.js';
import { Pos } from '../common/pos.js';
import { BaseSolver } from './baseSolver.js';
// Implicitly uses Snake and Map through BaseSolver and this.snake / this.map

class _TableCellPath {
    constructor() { this.reset(); }
    reset() {
        this.parent = null;
        this.dist = Number.MAX_SAFE_INTEGER;
        this.visit = false; // For longest path
    }
}

export class PathSolver extends BaseSolver {
    constructor(snake) {
        super(snake);
        this._table = Array.from({ length: snake.map.num_rows }, () =>
            Array.from({ length: snake.map.num_cols }, () => new _TableCellPath())
        );
    }

    get table() { return this._table; }

    shortest_path_to_food() {
        if (!this.map.food) return new Deque();
        return this.path_to(this.map.food, "shortest");
    }
    longest_path_to_tail() {
        return this.path_to(this.snake.tail(), "longest");
    }

    path_to(des_pos, path_type) {
        if (!des_pos) return new Deque();
        const original_type = this.map.point(des_pos).type;
        this.map.point(des_pos).type = PointType.EMPTY; // Temporarily mark as empty for path finding

        let path;
        if (path_type === "shortest") {
            path = this.shortest_path_to(des_pos);
        } else if (path_type === "longest") {
            path = this.longest_path_to(des_pos);
        } else {
            path = new Deque();
        }

        this.map.point(des_pos).type = original_type; // Restore original type
        return path;
    }

    shortest_path_to(des_pos) {
        this._reset_table();
        const head = this.snake.head();
        if (!head || !des_pos) return new Deque();

        this._table[head.x][head.y].dist = 0;
        const queue = new Deque([head]);

        while (queue.length > 0) {
            const cur = queue.popleft();
            if (cur.equals(des_pos)) {
                return this._build_path(head, des_pos);
            }

            let first_direc;
            if (cur.equals(head)) {
                first_direc = this.snake.direc;
            } else {
                first_direc = this._table[cur.x][cur.y].parent.direc_to(cur);
            }

            let adjs = cur.all_adj();
            // Shuffle for randomness then prioritize straight path
            for (let i = adjs.length - 1; i > 0; i--) { // Fisher-Yates shuffle
                const j = Math.floor(Math.random() * (i + 1));
                [adjs[i], adjs[j]] = [adjs[j], adjs[i]];
            }
            for (let i = 0; i < adjs.length; i++) {
                if (cur.direc_to(adjs[i]) === first_direc) {
                    [adjs[0], adjs[i]] = [adjs[i], adjs[0]];
                    break;
                }
            }

            for (const pos of adjs) {
                if (this._is_valid_for_shortest(pos)) { // Custom validation for shortest path
                    const adj_cell = this._table[pos.x][pos.y];
                    if (adj_cell.dist === Number.MAX_SAFE_INTEGER) { // Not visited
                        adj_cell.parent = cur;
                        adj_cell.dist = this._table[cur.x][cur.y].dist + 1;
                        queue.append(pos);
                    }
                }
            }
        }
        return new Deque();
    }

    _is_valid_for_shortest(pos) {
        // For shortest path, only consider empty/food, and not yet visited in current search
        return this.map.is_safe(pos) && this._table[pos.x][pos.y].dist === Number.MAX_SAFE_INTEGER;
    }

    longest_path_to(des_pos) {
        let path = this.shortest_path_to(des_pos);
        if (path.length === 0) return new Deque();

        this._reset_table(); // Reset visit flags etc.
        let cur = this.snake.head();

        // Mark shortest path as visited
        this._table[cur.x][cur.y].visit = true;
        // let temp_path_nodes = [cur.clone()]; // Not directly used in JS logic further
        for (const direc of path) {
            cur = cur.adj(direc);
            this._table[cur.x][cur.y].visit = true;
            // temp_path_nodes.push(cur.clone());
        }

        let currentPathDirecs = path.toArray();
        let idx = 0;
        // cur = this.snake.head(); // Reset cur to head to iterate along the path for extension

        while (true) {
            if (idx >= currentPathDirecs.length) break;

            let cur_node_in_path = this.snake.head();
            for (let k = 0; k < idx; ++k) {
                cur_node_in_path = cur_node_in_path.adj(currentPathDirecs[k]);
            }

            const cur_direc = currentPathDirecs[idx];
            const nxt_node_in_path = cur_node_in_path.adj(cur_direc);

            let tests = [];
            if (cur_direc === Direc.LEFT || cur_direc === Direc.RIGHT) {
                tests = [Direc.UP, Direc.DOWN];
            } else if (cur_direc === Direc.UP || cur_direc === Direc.DOWN) {
                tests = [Direc.LEFT, Direc.RIGHT];
            }

            let extended = false;
            for (const test_direc of tests) {
                const cur_test = cur_node_in_path.adj(test_direc);
                const nxt_test = nxt_node_in_path.adj(test_direc);
                if (this._is_valid_for_longest(cur_test) && this._is_valid_for_longest(nxt_test)) {
                    this._table[cur_test.x][cur_test.y].visit = true;
                    this._table[nxt_test.x][nxt_test.y].visit = true;
                    currentPathDirecs.splice(idx, 1, test_direc, cur_direc, Direc.opposite(test_direc));
                    extended = true;
                    break; 
                }
            }

            if (!extended) {
                idx++;
            }
        }
        return new Deque(currentPathDirecs);
    }

    _is_valid_for_longest(pos) {
        return this.map.is_safe(pos) && !this._table[pos.x][pos.y].visit;
    }

    _reset_table() {
        for (const row of this._table) {
            for (const cell of row) {
                cell.reset();
            }
        }
    }
    _build_path(src_pos, des_pos) {
        const path = new Deque();
        let tmp = des_pos.clone();
        while (!tmp.equals(src_pos)) {
            const parent_pos = this._table[tmp.x][tmp.y].parent;
            if (!parent_pos) break; 
            path.appendleft(parent_pos.direc_to(tmp));
            tmp = parent_pos;
        }
        return path;
    }
}
