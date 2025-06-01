import { Direc, PointType } from '../common/constants.js';
import { Deque } from '../common/deque.js';
import { Pos } from '../common/pos.js';
import { randomInt, randomChoice } from '../common/utils.js';
import { Map } from './map.js';

export class Snake {
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
