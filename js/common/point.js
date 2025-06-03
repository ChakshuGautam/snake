import { PointType } from './constants.js';

export class Point {
    constructor() {
        this._type = PointType.EMPTY;
    }
    get type() { return this._type; }
    set type(val) { this._type = val; }
}
