import { Direc } from './constants.js';

export class Pos {
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
