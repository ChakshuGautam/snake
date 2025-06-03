export class Deque {
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
