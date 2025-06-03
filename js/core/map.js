import { PointType } from '../common/constants.js';
import { Point } from '../common/point.js';
import { Pos } from '../common/pos.js';
import { randomChoice } from '../common/utils.js';

export class Map {
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
