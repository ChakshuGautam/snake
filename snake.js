(function () {
    // --- Constants and Enums ---
    const Direc = {
        NONE: 0,
        LEFT: 1,
        UP: 2,
        RIGHT: 3,
        DOWN: 4,
        opposite: function (direc) {
            if (direc === Direc.LEFT) return Direc.RIGHT;
            if (direc === Direc.RIGHT) return Direc.LEFT;
            if (direc === Direc.UP) return Direc.DOWN;
            if (direc === Direc.DOWN) return Direc.UP;
            return Direc.NONE;
        }
    };

    const PointType = {
        EMPTY: 0,
        WALL: 1,
        FOOD: 2,
        HEAD_L: 100,
        HEAD_U: 101,
        HEAD_R: 102,
        HEAD_D: 103,
        BODY_LU: 104,
        BODY_UR: 105,
        BODY_RD: 106,
        BODY_DL: 107,
        BODY_HOR: 108,
        BODY_VER: 109
    };

    const GameMode = {
        NORMAL: 0,
        BENCHMARK: 1,
        TRAIN_DQN: 2, // Will be heavily simplified
        TRAIN_DQN_GUI: 3 // Will be heavily simplified
    };

    const SnakeAction = { // For DQN, simplified
        LEFT: 0,
        FORWARD: 1,
        RIGHT: 2,
        to_direc: function (action, cur_direc) {
            if (action === SnakeAction.FORWARD) return cur_direc;
            if (action === SnakeAction.LEFT) {
                if (cur_direc === Direc.LEFT) return Direc.DOWN;
                if (cur_direc === Direc.UP) return Direc.LEFT;
                if (cur_direc === Direc.RIGHT) return Direc.UP;
                if (cur_direc === Direc.DOWN) return Direc.RIGHT;
            }
            if (action === SnakeAction.RIGHT) {
                if (cur_direc === Direc.LEFT) return Direc.UP;
                if (cur_direc === Direc.UP) return Direc.RIGHT;
                if (cur_direc === Direc.RIGHT) return Direc.DOWN;
                if (cur_direc === Direc.DOWN) return Direc.LEFT;
            }
            return Direc.NONE;
        }
    };

    // --- Utility Functions ---
    function randomInt(min, max) { // max is exclusive
        return Math.floor(Math.random() * (max - min)) + min;
    }

    function randomChoice(arr) {
        if (!arr || arr.length === 0) return undefined;
        return arr[Math.floor(Math.random() * arr.length)];
    }

    function log(...msgs) {
        console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...msgs);
    }

    // --- Custom Deque ---
    class Deque {
        constructor(iterable = []) {
            this._arr = Array.from(iterable);
        }
        append(item) { this._arr.push(item); }
        push_back(item) { this.append(item); } // alias
        appendleft(item) { this._arr.unshift(item); }
        push_front(item) { this.appendleft(item); } // alias
        pop() { return this._arr.pop(); }
        popleft() { return this._arr.shift(); }
        get length() { return this._arr.length; }
        get(index) { return this._arr[index]; }
        set(index, value) { this._arr[index] = value; }
        clear() { this._arr = []; }
        toArray() { return [...this._arr]; }
        get front() { return this._arr.length > 0 ? this._arr[0] : undefined; }
        get back() { return this._arr.length > 0 ? this._arr[this._arr.length - 1] : undefined; }

        // For Python-like direct access and iteration
        get 0() { return this.front; }
        get last() { return this.back; } // Python uses -1 index

        [Symbol.iterator]() {
            let index = 0;
            const data = this._arr;
            return {
                next: () => ({
                    value: data[index],
                    done: index++ >= data.length
                })
            };
        }
    }

    // --- Core Game Classes ---
    class Point {
        constructor() {
            this._type = PointType.EMPTY;
        }
        get type() { return this._type; }
        set type(val) { this._type = val; }
    }

    class Pos {
        constructor(x = 0, y = 0) {
            this._x = x;
            this._y = y;
        }
        get x() { return this._x; }
        set x(val) { this._x = val; }
        get y() { return this._y; }
        set y(val) { this._y = val; }

        toString() { return `Pos(${this._x},${this._y})`; }
        equals(other) {
            return other instanceof Pos && this._x === other.x && this._y === other.y;
        }
        clone() { return new Pos(this._x, this._y); }
        add(other) { return new Pos(this._x + other.x, this._y + other.y); }
        sub(other) { return new Pos(this._x - other.x, this._y - other.y); }
        static manhattan_dist(p1, p2) {
            return Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);
        }
        direc_to(adj_pos) {
            if (this._x === adj_pos.x) {
                const diff = this._y - adj_pos.y;
                if (diff === 1) return Direc.LEFT;
                if (diff === -1) return Direc.RIGHT;
            } else if (this._y === adj_pos.y) {
                const diff = this._x - adj_pos.x;
                if (diff === 1) return Direc.UP;
                if (diff === -1) return Direc.DOWN;
            }
            return Direc.NONE;
        }
        adj(direc) {
            if (direc === Direc.LEFT) return new Pos(this._x, this._y - 1);
            if (direc === Direc.RIGHT) return new Pos(this._x, this._y + 1);
            if (direc === Direc.UP) return new Pos(this._x - 1, this._y);
            if (direc === Direc.DOWN) return new Pos(this._x + 1, this._y);
            return null;
        }
        all_adj() {
            const adjs = [];
            for (const direcKey in Direc) {
                const direc = Direc[direcKey];
                if (typeof direc === 'number' && direc !== Direc.NONE) {
                    adjs.push(this.adj(direc));
                }
            }
            return adjs;
        }
    }

    class Map {
        constructor(num_rows, num_cols) {
            if (num_rows < 5 || num_cols < 5) {
                throw new Error("'num_rows' and 'num_cols' must be >= 5");
            }
            this._num_rows = num_rows;
            this._num_cols = num_cols;
            this._capacity = (num_rows - 2) * (num_cols - 2);
            this._content = Array.from({ length: num_rows }, () =>
                Array.from({ length: num_cols }, () => new Point())
            );
            this.reset();
        }

        reset() {
            this._food = null;
            for (let i = 0; i < this._num_rows; i++) {
                for (let j = 0; j < this._num_cols; j++) {
                    if (i === 0 || i === this._num_rows - 1 || j === 0 || j === this._num_cols - 1) {
                        this._content[i][j].type = PointType.WALL;
                    } else {
                        this._content[i][j].type = PointType.EMPTY;
                    }
                }
            }
        }

        copy() {
            const m_copy = new Map(this._num_rows, this._num_cols);
            for (let i = 0; i < this._num_rows; i++) {
                for (let j = 0; j < this._num_cols; j++) {
                    m_copy._content[i][j].type = this._content[i][j].type;
                }
            }
            if (this._food) {
                m_copy._food = this._food.clone();
            }
            return m_copy;
        }

        get num_rows() { return this._num_rows; }
        get num_cols() { return this._num_cols; }
        get capacity() { return this._capacity; }
        get food() { return this._food; }

        point(pos) { return this._content[pos.x][pos.y]; }

        is_inside(pos) {
            return pos.x > 0 && pos.x < this.num_rows - 1 &&
                pos.y > 0 && pos.y < this.num_cols - 1;
        }
        is_empty(pos) {
            return this.is_inside(pos) && this.point(pos).type === PointType.EMPTY;
        }
        is_safe(pos) {
            return this.is_inside(pos) &&
                (this.point(pos).type === PointType.EMPTY || this.point(pos).type === PointType.FOOD);
        }
        is_full() {
            for (let i = 1; i < this.num_rows - 1; i++) {
                for (let j = 1; j < this.num_cols - 1; j++) {
                    if (this._content[i][j].type < PointType.HEAD_L) { // EMPTY, WALL, FOOD
                        return false;
                    }
                }
            }
            return true;
        }
        has_food() { return this._food !== null; }
        rm_food() {
            if (this.has_food()) {
                this.point(this._food).type = PointType.EMPTY;
                this._food = null;
            }
        }
        create_food(pos) {
            this.point(pos).type = PointType.FOOD;
            this._food = pos.clone();
            return this._food;
        }
        create_rand_food() {
            const empty_pos = [];
            for (let i = 1; i < this._num_rows - 1; i++) {
                for (let j = 1; j < this._num_cols - 1; j++) {
                    const type = this._content[i][j].type;
                    if (type === PointType.EMPTY) {
                        empty_pos.push(new Pos(i, j));
                    } else if (type === PointType.FOOD) {
                        return null; // Food exists
                    }
                }
            }
            if (empty_pos.length > 0) {
                return this.create_food(randomChoice(empty_pos));
            }
            return null;
        }
    }

    class Snake {
        constructor(game_map, init_direc = null, init_bodies_coords = null, init_types = null) {
            this._map = game_map;
            // Store raw coords and types for reset
            this._raw_init_direc = init_direc;
            this._raw_init_bodies_coords = init_bodies_coords ? init_bodies_coords.map(p => ({ x: p.x, y: p.y })) : null;
            this._raw_init_types = init_types ? [...init_types] : null;

            this.reset(false);
        }

        reset(reset_map = true) {
            let rand_init = false;
            let effective_init_direc = this._raw_init_direc;
            let effective_init_bodies_pos = this._raw_init_bodies_coords ? this._raw_init_bodies_coords.map(p => new Pos(p.x, p.y)) : null;
            let effective_init_types = this._raw_init_types ? [...this._raw_init_types] : null;

            if (effective_init_direc === null) {
                rand_init = true;
                const head_row = randomInt(2, this._map.num_rows - 2);
                const head_col = randomInt(2, this._map.num_cols - 2);
                const head = new Pos(head_row, head_col);

                effective_init_direc = randomChoice([Direc.LEFT, Direc.UP, Direc.RIGHT, Direc.DOWN]);
                effective_init_bodies_pos = [head, head.adj(Direc.opposite(effective_init_direc))];

                effective_init_types = [];
                if (effective_init_direc === Direc.LEFT) effective_init_types.push(PointType.HEAD_L);
                else if (effective_init_direc === Direc.UP) effective_init_types.push(PointType.HEAD_U);
                else if (effective_init_direc === Direc.RIGHT) effective_init_types.push(PointType.HEAD_R);
                else if (effective_init_direc === Direc.DOWN) effective_init_types.push(PointType.HEAD_D);

                if (effective_init_direc === Direc.LEFT || effective_init_direc === Direc.RIGHT) {
                    effective_init_types.push(PointType.BODY_HOR);
                } else {
                    effective_init_types.push(PointType.BODY_VER);
                }
            }

            this._steps = 0;
            this._dead = false;
            this._direc = effective_init_direc;
            this._direc_next = Direc.NONE;
            this._bodies = new Deque(effective_init_bodies_pos);

            if (reset_map) {
                this._map.reset();
            }
            for (let i = 0; i < effective_init_bodies_pos.length; i++) {
                this._map.point(effective_init_bodies_pos[i]).type = effective_init_types[i];
            }
        }

        copy() {
            const m_copy = this._map.copy();
            // Create a snake with dummy initial values, then overwrite
            const s_copy = new Snake(m_copy, Direc.NONE, [new Pos(0, 0)], [PointType.EMPTY]);
            s_copy._steps = this._steps;
            s_copy._dead = this._dead;
            s_copy._direc = this._direc;
            s_copy._direc_next = this._direc_next;
            s_copy._bodies = new Deque(this._bodies.toArray().map(p => p.clone())); // Deep copy of Pos objects
            // Raw init params should also be copied if strict copying of initial state is needed for multiple resets
            s_copy._raw_init_direc = this._raw_init_direc;
            s_copy._raw_init_bodies_coords = this._raw_init_bodies_coords ? this._raw_init_bodies_coords.map(p => ({ x: p.x, y: p.y })) : null;
            s_copy._raw_init_types = this._raw_init_types ? [...this._raw_init_types] : null;

            return { snake: s_copy, map: m_copy };
        }

        get map() { return this._map; }
        set map(newMap) { this._map = newMap; } // For resetting game state
        get steps() { return this._steps; }
        get dead() { return this._dead; }
        set dead(val) { this._dead = val; }
        get direc() { return this._direc; }
        get direc_next() { return this._direc_next; }
        set direc_next(val) { this._direc_next = val; }
        get bodies() { return this._bodies; }
        len() { return this._bodies.length; }
        head() { return this._bodies.length > 0 ? this._bodies.front.clone() : null; }
        tail() { return this._bodies.length > 0 ? this._bodies.back.clone() : null; }

        move_path(path_direcs) {
            for (const direc of path_direcs) {
                this.move(direc);
            }
        }

        move(new_direc = null) {
            if (new_direc !== null) {
                this._direc_next = new_direc;
            }
            if (this._dead || this._direc_next === Direc.NONE || this._map.is_full() ||
                this._direc_next === Direc.opposite(this._direc)) {
                return;
            }

            const { old_head_type, new_head_type } = this._new_types();
            this._map.point(this.head()).type = old_head_type;
            const new_head = this.head().adj(this._direc_next);
            this._bodies.appendleft(new_head);

            if (!this._map.is_safe(new_head)) {
                this._dead = true;
            }
            if (this._map.point(new_head).type === PointType.FOOD) {
                this._map.rm_food();
            } else {
                this._rm_tail();
            }

            this._map.point(new_head).type = new_head_type;
            this._direc = this._direc_next;
            this._steps += 1;
        }

        _rm_tail() {
            this._map.point(this.tail()).type = PointType.EMPTY;
            this._bodies.pop();
        }

        _new_types() {
            let old_head_type, new_head_type;
            if (this._direc_next === Direc.LEFT) new_head_type = PointType.HEAD_L;
            else if (this._direc_next === Direc.UP) new_head_type = PointType.HEAD_U;
            else if (this._direc_next === Direc.RIGHT) new_head_type = PointType.HEAD_R;
            else if (this._direc_next === Direc.DOWN) new_head_type = PointType.HEAD_D;

            const d1 = this._direc, d2 = this._direc_next;
            if ((d1 === Direc.LEFT && d2 === Direc.LEFT) || (d1 === Direc.RIGHT && d2 === Direc.RIGHT)) {
                old_head_type = PointType.BODY_HOR;
            } else if ((d1 === Direc.UP && d2 === Direc.UP) || (d1 === Direc.DOWN && d2 === Direc.DOWN)) {
                old_head_type = PointType.BODY_VER;
            } else if ((d1 === Direc.RIGHT && d2 === Direc.UP) || (d1 === Direc.DOWN && d2 === Direc.LEFT)) {
                old_head_type = PointType.BODY_LU;
            } else if ((d1 === Direc.LEFT && d2 === Direc.UP) || (d1 === Direc.DOWN && d2 === Direc.RIGHT)) {
                old_head_type = PointType.BODY_UR;
            } else if ((d1 === Direc.LEFT && d2 === Direc.DOWN) || (d1 === Direc.UP && d2 === Direc.RIGHT)) {
                old_head_type = PointType.BODY_RD;
            } else if ((d1 === Direc.RIGHT && d2 === Direc.DOWN) || (d1 === Direc.UP && d2 === Direc.LEFT)) {
                old_head_type = PointType.BODY_DL;
            }
            return { old_head_type, new_head_type };
        }
    }

    // --- Solver Base Class ---
    class BaseSolver {
        constructor(snake) {
            this._snake = snake;
            this._map = snake.map;
        }
        get map() { return this._map; }
        get snake() { return this._snake; }
        set snake(val) {
            this._snake = val;
            this._map = val.map;
        }
        next_direc() { throw new Error("NotImplementedError: next_direc"); }
        close() { /* Release resources if any */ }
    }

    // --- Path Solver ---
    class _TableCellPath {
        constructor() { this.reset(); }
        reset() {
            this.parent = null;
            this.dist = Number.MAX_SAFE_INTEGER;
            this.visit = false; // For longest path
        }
    }

    class PathSolver extends BaseSolver {
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
            let temp_path_nodes = [cur.clone()];
            for (const direc of path) {
                cur = cur.adj(direc);
                this._table[cur.x][cur.y].visit = true;
                temp_path_nodes.push(cur.clone());
            }

            // Extend path (heuristic)
            let idx = 0;
            cur = this.snake.head(); // Start from snake's head again for path modification

            // This loop needs to modify the `path` (Deque of Direc)
            // The Python version iterates and inserts into the path Deque.
            // JS arrays with splice can emulate this.
            let currentPathDirecs = path.toArray();

            while (true) {
                if (idx >= currentPathDirecs.length) break;

                let cur_node_in_path = this.snake.head();
                for (let k = 0; k < idx; ++k) cur_node_in_path = cur_node_in_path.adj(currentPathDirecs[k]);

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

                        // Insert into currentPathDirecs: test_direc, original_direc, opposite(test_direc)
                        // original_direc is currentPathDirecs[idx]
                        currentPathDirecs.splice(idx, 1, test_direc, cur_direc, Direc.opposite(test_direc));
                        extended = true;
                        break; // Found an extension for this segment
                    }
                }

                if (!extended) {
                    idx++;
                }
                // If extended, idx remains the same to re-evaluate the newly prepended test_direc segment
                // or rather, idx should advance by 1 to evaluate the original direc (now at idx+1)
                // The Python logic of `cur = nxt; idx += 1;` inside `if not extended` is simpler.
                // Let's re-think the loop structure if direct Deque modification is complex.
                // Python's PathSolver's longest path extension logic is tricky to port with array splice.
                // The key is that it inserts into the path Deque.
                // `path.insert(idx, test_direc)`
                // `path.insert(idx + 2, Direc.opposite(test_direc))`
                // This means current path is [..., A, B, ...] -> [..., test, A, original_B, opp(test), B, ...]
                // A more robust way for JS: rebuild path at each step or use a linked list for path segments.
                // For now, let's stick to the simpler shortest path for "longest_path_to_tail" if this becomes too complex.
                // The provided screenshot `img-build-longest` implies a simpler expansion, let's try that.
                // The description says "extends each PAIR of path pieces"
                // This is complex. Given the scope, a simple (possibly less optimal) longest path might be needed.
                // The current Python code's `longest_path_to` is already a heuristic.
                // Sticking to a direct translation attempt:
                // If extended is true, the path grew, idx effectively points to the 'test_direc'.
                // The next iteration should process this 'test_direc' segment, so idx shouldn't change.
                // If not extended, idx moves to the next original segment.
            }
            return new Deque(currentPathDirecs); // return the modified path
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
                if (!parent_pos) break; // Should not happen if path exists
                path.appendleft(parent_pos.direc_to(tmp));
                tmp = parent_pos;
            }
            return path;
        }
    }

    // --- Greedy Solver ---
    class GreedySolver extends BaseSolver {
        constructor(snake) {
            super(snake);
            this._path_solver = new PathSolver(snake); // Each solver gets its own PathSolver instance
        }
        next_direc() {
            const { snake: s_copy, map: m_copy } = this.snake.copy(); // Get copies
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

    // --- Hamilton Solver ---
    class _TableCellHamilton {
        constructor() { this.reset(); }
        reset() {
            this.idx = null;
            this.direc = Direc.NONE;
        }
    }
    class HamiltonSolver extends BaseSolver {
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
            // This relies on a specific initial snake state (len 2, specific positions)
            // for the described `longest_path_to_tail` based cycle generation.
            // If initial state is different, this cycle might not be Hamiltonian or complete.
            this._path_solver.snake = this.snake; // Ensure path solver uses current snake

            // Create a temporary snake state that matches the algo's assumptions if needed
            // For the algorithm described: "fix point 0, 1, 2... make point 1 unreachable... longest path from 2 to 0"
            // This seems to assume snake of length 3, with head=2, body1=1, tail=0.
            // The python code uses `longest_path_to_tail()` on the *current* snake.
            // Let's try to match the Python code's behavior more directly:

            // A temporary snake copy is good practice here.
            const { snake: temp_snake, map: temp_map } = this.snake.copy();
            this._path_solver.snake = temp_snake; // Path solver operates on this temp snake

            // The Python code has specific setup for path_solver for cycle building not shown in markdown.
            // Snake initial bodies are [Pos(1,2), Pos(1,1)] for 6x6 map in test_hamilton.
            // Head is (1,2), Tail is (1,1). Longest path from head to tail.
            // The crucial part is `self.map.point(self.snake.bodies[1]).type = PointType.WALL`
            // which is NOT in the provided `hamilton.py`. This is from typical cycle construction.
            // The `algorithms.md` says: "make point 1 unreachable and generate the longest path from point 2 to point 0"
            // This suggests specific node manipulation not directly in `hamilton.py` general call.
            // For now, we follow `hamilton.py` provided:

            const path_to_tail = this._path_solver.longest_path_to_tail();
            if (path_to_tail.length === 0 && this.map.capacity > this.snake.len()) {
                log("Hamiltonian cycle construction might fail: initial longest_path_to_tail is empty.");
                // Attempt a simpler cycle for robustness if the main one fails:
                // e.g. serpentine pattern if standard method fails.
                // For now, just proceed, might result in incomplete table.
            }

            let cur = temp_snake.head().clone();
            let cnt = 0;

            // Path from head to tail (exclusive of tail, which is handled by snake bodies part)
            for (const direc of path_to_tail) {
                if (!this.map.is_inside(cur) || this._table[cur.x][cur.y].idx !== null) break; // Avoid overwrite or out of bounds
                this._table[cur.x][cur.y].idx = cnt;
                this._table[cur.x][cur.y].direc = direc;
                cur = cur.adj(direc);
                cnt++;
            }

            // Process snake bodies (from tail up to head, exclusive of head)
            // The Python version's loop for snake bodies in _build_cycle is a bit confusing.
            // "cur = self.snake.tail() ... self._table[cur.x][cur.y].direc = self.snake.direc"
            // This seems to assign current snake direction, not path direction.
            // A Hamiltonian cycle needs consistent forward directions.
            // Let's assume the path_to_tail correctly leads to the tail, and now we connect tail back to head.
            // The `algorithms.md` image `img-build-hamilton` shows path 2->0, then join 0 to 2.
            // This means the last point of path_to_tail (which is `cur` now, one step before tail)
            // should point towards the tail.

            // If `cur` is now at the tail's position due to path_to_tail.
            // The original snake's tail needs to be connected.
            // It seems the path_to_tail gives directions for the "empty" part of the cycle.
            // The snake's body itself forms the other part.
            // Let's re-evaluate the Python logic for `_build_cycle`:
            // 1. `path = self._path_solver.longest_path_to_tail()`: This path is from current head to current tail.
            // 2. It iterates `path`, assigning `idx` and `direc` for each step. `cur` becomes the position of the tail.
            // 3. Then "Process snake bodies": `cur = self.snake.tail()`. This `cur` is the actual tail.
            //    `for _ in range(self.snake.len() - 1):`
            //        `self._table[cur.x][cur.y].idx = cnt`
            //        `self._table[cur.x][cur.y].direc = self.snake.direc` (This is fishy, should be direction to next body segment)
            //        `cur = cur.adj(self.snake.direc)` (Also fishy)
            // Let's assume the snake body part of the cycle needs to be filled based on snake's actual segments.

            // The current `cur` is at the destination of `path_to_tail`, which should be the snake's tail.
            // So, `_table[cur.x][cur.y]` is the tail. It needs a direction.
            // This direction should lead to the original snake head to complete the cycle.
            // The Python code from `hamilton.py` seems to build the cycle based on the current snake's state.
            // The head of the snake follows the `path_to_tail`. The points on this path get their `direc` set.
            // When `cur` reaches the tail position, `cnt` is `len(path_to_tail)`.
            // Then, for the snake's actual body segments (from tail towards head):

            // Let's trace the snake's body from tail towards (but not including) head
            const snake_bodies = temp_snake.bodies.toArray().reverse(); // tail first
            for (let i = 0; i < snake_bodies.length - 1; ++i) {
                const body_part_pos = snake_bodies[i]; // current body part (e.g. tail)
                const next_body_part_pos = snake_bodies[i + 1]; // next body part towards head
                if (!this.map.is_inside(body_part_pos) || this._table[body_part_pos.x][body_part_pos.y].idx !== null) {
                    // This part might already be set by path_to_tail if snake is short
                    // Or this indicates an issue with cycle construction for current snake config.
                    continue;
                }
                this._table[body_part_pos.x][body_part_pos.y].idx = cnt;
                this._table[body_part_pos.x][body_part_pos.y].direc = body_part_pos.direc_to(next_body_part_pos);
                cnt++;
            }

            // Final connection: from last point of `path_to_tail` (which is the tail cell)
            // to the snake's head. This should be implicitly handled if path_to_tail leads to tail,
            // and snake body loop leads from tail to (segment before head).
            // The head segment itself (snake_bodies[snake_bodies.length-1]) needs its direction from the table,
            // which should have been set by the first segment of path_to_tail.

            // The key is that all N cells in the grid should have a unique idx from 0 to N-1
            // and a valid `direc` pointing to the cell with `idx+1 % N`.
            // The initial `path_to_tail` gives a sequence of directions.
            // If the cycle is not complete, this solver will fail.
            if (cnt !== this.map.capacity && this.map.capacity > 0) {
                log(`Hamiltonian cycle may be incomplete. Expected ${this.map.capacity} cells, got ${cnt}. Solver might not work well.`);
            }
            this._cycle_built = (cnt === this.map.capacity); // Check if cycle is complete
        }


        _relative_dist(ori_idx, x_idx, size) {
            if (ori_idx > x_idx) {
                x_idx += size;
            }
            return x_idx - ori_idx;
        }

        next_direc() {
            if (!this._cycle_built && this.map.capacity > 0) { // If cycle failed, fallback (e.g. greedy)
                log("Hamilton cycle not built, using fallback direction (random safe or current).");
                // Basic fallback: try to move safely, or keep current direction
                const head = this.snake.head();
                let safe_direcs = [];
                for (const adj_pos of head.all_adj()) {
                    if (this.map.is_safe(adj_pos) && Direc.opposite(this.snake.direc) !== head.direc_to(adj_pos)) {
                        safe_direcs.push(head.direc_to(adj_pos));
                    }
                }
                return randomChoice(safe_direcs) || this.snake.direc;
            }

            const head = this.snake.head();
            if (!this.map.is_inside(head) || this._table[head.x][head.y].idx === null) {
                log("HamiltonSolver: Snake head out of bounds or not in cycle table. Fallback.");
                return this.snake.direc; // Fallback
            }
            let nxt_direc = this._table[head.x][head.y].direc;

            if (this._shortcuts && this.snake.len() < 0.5 * this.map.capacity && this.map.food) {
                this._path_solver.snake = this.snake; // Ensure path solver is up-to-date
                const path_to_food = this._path_solver.shortest_path_to_food();
                if (path_to_food.length > 0) {
                    const tail = this.snake.tail();
                    const nxt_pos_on_shortest_path = head.adj(path_to_food.front);
                    const food_pos = this.map.food;

                    if (!this.map.is_inside(tail) || this._table[tail.x][tail.y].idx === null ||
                        !this.map.is_inside(head) || this._table[head.x][head.y].idx === null ||
                        !this.map.is_inside(nxt_pos_on_shortest_path) || this._table[nxt_pos_on_shortest_path.x][nxt_pos_on_shortest_path.y].idx === null ||
                        !this.map.is_inside(food_pos) || this._table[food_pos.x][food_pos.y].idx === null) {
                        // Some point is not in the cycle table, shortcut cannot be reliably determined
                        return nxt_direc;
                    }

                    const tail_idx = this._table[tail.x][tail.y].idx;
                    const head_idx = this._table[head.x][head.y].idx;
                    const nxt_idx = this._table[nxt_pos_on_shortest_path.x][nxt_pos_on_shortest_path.y].idx;
                    const food_idx = this._table[food_pos.x][food_pos.y].idx;

                    const map_cap = this.map.capacity;
                    if (map_cap === 0) return nxt_direc; // Avoid division by zero if map is tiny (not typical for snake)

                    // Exclude one exception (from Python code)
                    if (!(path_to_food.length === 1 && Math.abs(food_idx - tail_idx) % map_cap === 1)) { // cycle wrap
                        const head_idx_rel = this._relative_dist(tail_idx, head_idx, map_cap);
                        const nxt_idx_rel = this._relative_dist(tail_idx, nxt_idx, map_cap);
                        const food_idx_rel = this._relative_dist(tail_idx, food_idx, map_cap);
                        if (nxt_idx_rel > head_idx_rel && nxt_idx_rel <= food_idx_rel) {
                            // Check if shortcut is safe (doesn't cut off tail)
                            // Create a virtual snake and see if path to its new tail exists
                            const { snake: s_virtual } = this.snake.copy();
                            s_virtual.map = this.snake.map.copy(); // virtual snake needs its own map copy
                            s_virtual.move(path_to_food.front); // Take the shortcut step

                            if (!s_virtual.dead) {
                                this._path_solver.snake = s_virtual;
                                const path_to_virtual_tail = this._path_solver.longest_path_to_tail();
                                if (path_to_virtual_tail.length > 0) { // Check if tail is reachable
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


    // --- DQN Solver (Simplified Placeholder) ---
    class DQNSolver extends BaseSolver {
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

            const current_state = this._state(); // Get current state (simplified)
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
            const next_type = this.map.point(next_pos) ? this.map.point(next_pos).type : PointType.WALL; // Handle out of bounds access for next_type

            this.snake.move(chosen_direc); // Actually move the snake

            let reward = 0; // Simplified reward
            if (next_type === PointType.FOOD) reward = 1.0; // self._rwd_food
            else if (this.snake.dead) reward = -0.5; // self._rwd_dead
            else reward = -0.005; // self._rwd_empty

            const next_s = this._state(); // Get new state
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

    // --- Game Configuration (mirrors Python GameConf) ---
    class GameConf {
        constructor() {
            this.mode = GameMode.NORMAL;
            this.solver_name = "HamiltonSolver"; // Class name
            this.map_rows = 8;
            this.map_cols = this.map_rows;
            this.map_width = 240; // pixels, increased for better visibility
            this.map_height = this.map_width;
            this.info_panel_width = 160;
            this.window_width = this.map_width + this.info_panel_width; // Used if panel part of canvas
            this.window_height = this.map_height;
            this.grid_pad_ratio = 0.25;
            this.show_grid_line = false;
            this.show_info_panel = true; // Controls whether #infoPanel div is updated
            this.interval_draw = 100; // ms (frame rate for game logic, not canvas drawing)
            this.interval_draw_max = 200;
            this.color_bg = "#000000";
            this.color_txt = "#F5F5F5"; // For info panel text
            this.color_line = "#424242";
            this.color_wall = "#202020"; // Darker walls
            this.color_food = "#FFF59D";
            this.color_head = "#81C784"; // Greenish head
            this.color_body = "#AED581"; // Lighter green body
            this.init_direc = Direc.RIGHT;
            // Ensure these are plain objects for easy reset, Pos objects created in Snake/Game
            this.init_bodies_coords = [{ x: 1, y: 4 }, { x: 1, y: 3 }, { x: 1, y: 2 }, { x: 1, y: 1 }];
            this.init_types = [PointType.HEAD_R, PointType.BODY_HOR, PointType.BODY_HOR, PointType.BODY_HOR];
            this.font_info = "13px Arial"; // For info panel
            this.info_str_template = // Using template literal for easier JS formatting
                `Status: {status}
                Episode: {episode} | Step: {step}
                Length: {length}/{capacity} ({map_rows}x{map_cols})
                -----------------------------------`;
            this.info_status = ["Playing", "Game Over", "Map Full"];
        }
    }


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