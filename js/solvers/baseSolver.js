// import { Snake } from '../core/snake.js'; // Expected by subclasses
// import { Map } from '../core/map.js'; // Expected by subclasses

export class BaseSolver {
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
