import { Deque } from '../deque.js';

describe('Deque', () => {
  let deque;

  beforeEach(() => {
    deque = new Deque();
  });

  it('should initialize empty or with values', () => {
    expect(new Deque().length).toBe(0);
    expect(new Deque([1, 2, 3]).length).toBe(3);
    expect(new Deque([1, 2, 3]).toArray()).toEqual([1, 2, 3]);
  });

  it('should append and pop items correctly', () => {
    deque.append(1);
    deque.append(2);
    expect(deque.length).toBe(2);
    expect(deque.pop()).toBe(2);
    expect(deque.length).toBe(1);
    expect(deque.pop()).toBe(1);
    expect(deque.length).toBe(0);
    expect(deque.pop()).toBeUndefined(); // Pop from empty deque
  });

  it('should appendleft and popleft items correctly', () => {
    deque.appendleft(1);
    deque.appendleft(2);
    expect(deque.length).toBe(2);
    expect(deque.popleft()).toBe(2);
    expect(deque.length).toBe(1);
    expect(deque.popleft()).toBe(1);
    expect(deque.length).toBe(0);
    expect(deque.popleft()).toBeUndefined(); // Popleft from empty deque
  });
  
  it('should handle front and back access', () => {
    expect(deque.front).toBeUndefined(); // Front of empty deque
    expect(deque.back).toBeUndefined();  // Back of empty deque

    deque.append(10); // [10]
    expect(deque.front).toBe(10);
    expect(deque.back).toBe(10);

    deque.append(20); // [10, 20]
    expect(deque.front).toBe(10);
    expect(deque.back).toBe(20);

    deque.appendleft(5); // Deque: [5, 10, 20]
    expect(deque.front).toBe(5);
    expect(deque.back).toBe(20);
    expect(deque.length).toBe(3);
  });

  it('should clear the deque', () => {
    deque.append(1);
    deque.append(2);
    deque.clear();
    expect(deque.length).toBe(0);
    expect(deque.toArray()).toEqual([]);
    expect(deque.front).toBeUndefined();
    expect(deque.back).toBeUndefined();
  });

  it('should allow mixed operations', () => {
    deque.append(1); // [1]
    deque.appendleft(2); // [2, 1]
    deque.append(3); // [2, 1, 3]
    expect(deque.popleft()).toBe(2); // [1, 3]
    expect(deque.length).toBe(2);
    expect(deque.front).toBe(1);
    expect(deque.back).toBe(3);
    expect(deque.pop()).toBe(3); // [1]
    expect(deque.length).toBe(1);
    expect(deque.front).toBe(1);
    expect(deque.back).toBe(1);
    deque.appendleft(4); // [4, 1]
    expect(deque.toArray()).toEqual([4, 1]);
  });

  it('should iterate correctly', () => {
    const items = [1, 2, 3, 4, 5];
    deque = new Deque(items);
    const iteratedItems = [];
    for (const item of deque) {
      iteratedItems.push(item);
    }
    expect(iteratedItems).toEqual(items);

    // Test iteration on empty deque
    const emptyDeque = new Deque();
    const iteratedEmpty = [];
    for (const item of emptyDeque) {
      iteratedEmpty.push(item); // Should not run
    }
    expect(iteratedEmpty).toEqual([]);
  });

  it('should get and set values at specific indices', () => {
    deque.append(10);
    deque.append(20);
    deque.append(30); // [10, 20, 30]
    expect(deque.get(0)).toBe(10);
    expect(deque.get(1)).toBe(20);
    expect(deque.get(2)).toBe(30);
    expect(deque.get(3)).toBeUndefined(); // Out of bounds

    deque.set(1, 25); // [10, 25, 30]
    expect(deque.get(1)).toBe(25);
    expect(deque.toArray()).toEqual([10, 25, 30]);

    // Set on out of bounds index (should ideally not throw but also not extend, current array behavior)
    // Note: Deque._arr is an array, so direct set might behave like array.
    // Depending on strictness, this might be desired or not. Current behavior is it extends with empty slots.
    // For a robust Deque, set might be restricted to existing indices or throw error.
    // For now, testing existing behavior.
    deque.set(5, 50); 
    expect(deque.get(5)).toBe(50); // Array will have empty slots
    expect(deque.length).toBe(6); // Length changes due to sparse array behavior
  });
});
