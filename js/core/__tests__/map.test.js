import { Map } from '../map.js';
import { PointType } from '../../common/constants.js';
import { Pos } from '../../common/pos.js';
// randomChoice is used by map.create_rand_food(), but not directly called by tests here.
// Point is used by map constructor, but not directly called by tests here.

describe('Map', () => {
  let map;
  const testRows = 6; // Playable rows for most tests
  const testCols = 6; // Playable cols for most tests

  beforeEach(() => {
    // Map constructor takes total rows/cols including walls
    map = new Map(testRows + 2, testCols + 2);
  });

  it('should initialize with correct dimensions and walls', () => {
    expect(map.num_rows).toBe(testRows + 2);
    expect(map.num_cols).toBe(testCols + 2);
    expect(map.capacity).toBe(testRows * testCols);

    // Check corners and some edge walls
    expect(map.point(new Pos(0, 0)).type).toBe(PointType.WALL);
    expect(map.point(new Pos(0, testCols + 1)).type).toBe(PointType.WALL);
    expect(map.point(new Pos(testRows + 1, 0)).type).toBe(PointType.WALL);
    expect(map.point(new Pos(testRows + 1, testCols + 1)).type).toBe(PointType.WALL);
    expect(map.point(new Pos(1, 0)).type).toBe(PointType.WALL); // Side wall
    expect(map.point(new Pos(0, 1)).type).toBe(PointType.WALL); // Top wall

    // Check a playable area cell
    expect(map.point(new Pos(1, 1)).type).toBe(PointType.EMPTY);
  });

  it('should correctly identify if a position is inside playable area', () => {
    expect(map.is_inside(new Pos(1, 1))).toBe(true);
    expect(map.is_inside(new Pos(testRows, testCols))).toBe(true);

    expect(map.is_inside(new Pos(0, 0))).toBe(false); // Wall
    expect(map.is_inside(new Pos(testRows + 1, testCols + 1))).toBe(false); // Wall
    expect(map.is_inside(new Pos(1, testCols + 1))).toBe(false); // Outside right wall
    expect(map.is_inside(new Pos(testRows + 1, 1))).toBe(false); // Outside bottom wall
  });

  it('should correctly identify empty and safe positions', () => {
    const emptyPos = new Pos(1, 1);
    const wallPos = new Pos(0, 0);

    // Default state from beforeEach has (1,1) as EMPTY
    expect(map.is_empty(emptyPos)).toBe(true);
    expect(map.is_safe(emptyPos)).toBe(true);

    expect(map.is_empty(wallPos)).toBe(false); // Walls are not empty
    expect(map.is_safe(wallPos)).toBe(false); // Walls are not safe

    const foodPos = new Pos(1, 2);
    map.create_food(foodPos);
    expect(map.is_empty(foodPos)).toBe(false); // Food is not empty
    expect(map.is_safe(foodPos)).toBe(true);  // Food is safe

    const snakeHeadPos = new Pos(2, 1);
    map.point(snakeHeadPos).type = PointType.HEAD_U; // Simulate snake part
    expect(map.is_empty(snakeHeadPos)).toBe(false);
    expect(map.is_safe(snakeHeadPos)).toBe(false); // Snake parts are not safe
  });

  it('should create and remove food', () => {
    const foodPos = new Pos(2,2);
    expect(map.has_food()).toBe(false);
    expect(map.food).toBeNull();

    map.create_food(foodPos);
    expect(map.has_food()).toBe(true);
    expect(map.food.equals(foodPos)).toBe(true);
    expect(map.point(foodPos).type).toBe(PointType.FOOD);

    map.rm_food();
    expect(map.has_food()).toBe(false);
    expect(map.food).toBeNull();
    expect(map.point(foodPos).type).toBe(PointType.EMPTY);
  });

  it('should create random food if space is available and no food exists', () => {
    const initialFood = map.create_rand_food();
    expect(initialFood).not.toBeNull();
    expect(map.has_food()).toBe(true);
    expect(map.point(initialFood).type).toBe(PointType.FOOD);

    // Test that it doesn't create new food if one exists
    const foodAfterSecondCall = map.create_rand_food();
    expect(foodAfterSecondCall).toBeNull(); // Should return null as food already exists
    expect(map.food.equals(initialFood)).toBe(true);
  });

  it('should not create random food if map is full', () => {
    // Fill the map completely
    for (let r = 1; r <= testRows; r++) {
        for (let c = 1; c <= testCols; c++) {
            map.point(new Pos(r, c)).type = PointType.BODY_HOR; // Arbitrary non-empty type
        }
    }
    expect(map.is_full()).toBe(true);
    const food = map.create_rand_food();
    expect(food).toBeNull();
    expect(map.has_food()).toBe(false);
  });

  it('should correctly determine if map is full', () => {
    expect(map.is_full()).toBe(false); // Initially empty

    // Fill most of the map
    let filledCount = 0;
    for (let r = 1; r <= testRows; r++) {
        for (let c = 1; c <= testCols; c++) {
            if (filledCount < map.capacity -1) { // Leave one cell empty
                 map.point(new Pos(r, c)).type = PointType.BODY_HOR;
                 filledCount++;
            }
        }
    }
    expect(map.is_full()).toBe(false);

    // Fill the last cell
    let lastEmptyFound = false;
     for (let r = 1; r <= testRows; r++) {
        for (let c = 1; c <= testCols; c++) {
            if(map.point(new Pos(r,c)).type === PointType.EMPTY) {
                 map.point(new Pos(r, c)).type = PointType.BODY_VER;
                 lastEmptyFound = true;
                 break;
            }
        }
        if(lastEmptyFound) break;
    }
    if(lastEmptyFound) { // Ensure we actually filled the last cell
        expect(map.is_full()).toBe(true);
    } else {
        // This case should not be reached if capacity > 0 and logic is correct
        if (map.capacity > 0) fail("Could not find the last empty cell to fill the map.");
        else expect(map.is_full()).toBe(true); // 0 capacity map is full
    }
  });

  it('copy() should create a deep copy of the map content and food', () => {
    const foodPos = new Pos(3,3);
    map.create_food(foodPos);
    map.point(new Pos(1,1)).type = PointType.HEAD_D; // Some other point

    const mapCopy = map.copy();

    // Check dimensions and capacity
    expect(mapCopy.num_rows).toBe(map.num_rows);
    expect(mapCopy.num_cols).toBe(map.num_cols);
    expect(mapCopy.capacity).toBe(map.capacity);

    // Check food
    expect(mapCopy.has_food()).toBe(true);
    expect(mapCopy.food.equals(foodPos)).toBe(true);
    expect(mapCopy.food).not.toBe(map.food); // Should be a clone, not same instance

    // Check some points
    expect(mapCopy.point(new Pos(0,0)).type).toBe(PointType.WALL);
    expect(mapCopy.point(foodPos).type).toBe(PointType.FOOD);
    expect(mapCopy.point(new Pos(1,1)).type).toBe(PointType.HEAD_D);

    // Modify original map and check if copy is affected
    map.rm_food();
    map.point(new Pos(1,1)).type = PointType.EMPTY;

    expect(mapCopy.has_food()).toBe(true); // Copy should still have food
    expect(mapCopy.point(new Pos(1,1)).type).toBe(PointType.HEAD_D); // Copy should retain old type
  });

  it('reset() should clear food and set inner cells to EMPTY', () => {
    map.create_food(new Pos(2,2));
    map.point(new Pos(1,1)).type = PointType.BODY_HOR;
    map.reset();

    expect(map.has_food()).toBe(false);
    expect(map.food).toBeNull();
    expect(map.point(new Pos(1,1)).type).toBe(PointType.EMPTY);
    expect(map.point(new Pos(0,0)).type).toBe(PointType.WALL); // Walls should remain
  });
});
