import { GreedySolver } from '../greedySolver.js';
import { Direc, PointType } from '../../common/constants.js';
import { Pos } from '../../common/pos.js';
import { Snake } from '../../core/snake.js';
import { Map } from '../../core/map.js';
import { Deque } from '../../common/deque.js';

describe('GreedySolver', () => {
  let map;
  let snake;
  let solver;

  // Helper to create a snake and place it on the map
  // Note: The Snake constructor itself places the snake on the map.
  const createAndPlaceSnake = (mapInstance, headPos, direc, bodySegmentsCoords = [], headTypeOverride = null) => {
    const bodyPositions = bodySegmentsCoords.map(p => new Pos(p.x, p.y));
    const allBodyPartsPos = [headPos, ...bodyPositions];

    let init_types = [];
    let effectiveHeadType = headTypeOverride;

    if (!effectiveHeadType) {
        if (direc === Direc.RIGHT) effectiveHeadType = PointType.HEAD_R;
        else if (direc === Direc.LEFT) effectiveHeadType = PointType.HEAD_L;
        else if (direc === Direc.UP) effectiveHeadType = PointType.HEAD_U;
        else if (direc === Direc.DOWN) effectiveHeadType = PointType.HEAD_D;
        else effectiveHeadType = PointType.HEAD_R; // Default if Direc.NONE
    }
    init_types.push(effectiveHeadType);

    // Simplified body types for testing; real game has more complex transitions
    for (let i = 0; i < bodySegmentsCoords.length; i++) {
        init_types.push(PointType.BODY_HOR); // Default to HOR for simplicity in tests
    }

    return new Snake(mapInstance, direc, allBodyPartsPos.map(p => p.clone()), init_types);
  };

  beforeEach(() => {
    map = new Map(6 + 2, 6 + 2); // 6x6 playable area
  });

  it('Scenario 1: should move towards food if directly ahead and safe', () => {
    const headPos = new Pos(3, 3);
    const foodPos = new Pos(3, 4); // Food to the RIGHT
    map.create_food(foodPos);

    // Snake: Head at (3,3), tail at (3,2), facing RIGHT
    snake = createAndPlaceSnake(map, headPos, Direc.RIGHT, [new Pos(3,2)]);

    solver = new GreedySolver(snake);
    expect(solver.next_direc()).toBe(Direc.RIGHT);
  });

  it('Scenario 2: should prioritize tail if food path is unsafe for tail path', () => {
    // This scenario is complex because "unsafe for tail path" depends on PathSolver's longest_path_to_tail.
    // We'll simplify: Food is reachable, but eating it leads to a state where tail is not reachable.
    // Snake H(2,2)-R, B(2,1). Food (2,3). Map 4x4.
    // Eating food: H(2,3)-R, B(2,2). Tail is (2,2). Path from (2,3) to (2,2) is LEFT.
    // We need to make this path (LEFT) from (2,3) impossible AFTER eating.
    map = new Map(4+2, 4+2); // 4x4 playable
    const head = new Pos(2,2);
    const body = [new Pos(2,1)];
    snake = createAndPlaceSnake(map, head, Direc.RIGHT, body);

    const food = new Pos(2,3);
    map.create_food(food);

    // Block the path the snake would need to take to its tail *after* eating the food.
    // If snake eats food at (2,3), its new state: Head (2,3), Body (2,2). Tail is (2,2).
    // PathSolver will look for longest_path_to_tail from (2,3) to (2,2).
    // Let's block all cells around (2,3) except (2,2) so it *has* to move to (2,2) if it eats.
    // Then, after it "virtually" moves to (2,3) and then to (2,2) (as part of path_to_tail),
    // ensure no path from (2,2) to its tail (which would be (2,1) if it didn't eat, or (2,2) itself).
    // This is hard to test without mocking PathSolver.
    // Simpler: If snake eats food, it will be trapped.
    // H(2,2)R B(2,1). Food(2,3). Walls (1,3), (3,3), (2,4) [relative to food]
    map.point(new Pos(1,3)).type = PointType.WALL;
    map.point(new Pos(3,3)).type = PointType.WALL;
    map.point(new Pos(2,4)).type = PointType.WALL; // Wall after food if it moves right again

    solver = new GreedySolver(snake);
    const nextMove = solver.next_direc();
    // Expected: It should *not* go for food (RIGHT), because it would be trapped.
    // It should try to follow its current tail (2,1). The direction for this is LEFT.
    expect(nextMove).toBe(Direc.LEFT);
  });


  it('Scenario 3: should choose any single safe move if trapped and no food/tail path', () => {
    map = new Map(3+2, 3+2); // 3x3 playable
    const headPos = new Pos(2,2); // Center

    // Snake: (2,2)H_R, tail (2,1)B_HOR
    snake = createAndPlaceSnake(map, headPos, Direc.RIGHT, [new Pos(2,1)]);

    // Block RIGHT (front), UP (relative left), DOWN (relative right)
    map.point(headPos.adj(Direc.RIGHT)).type = PointType.WALL; // (2,3)
    map.point(headPos.adj(Direc.UP)).type = PointType.WALL;    // (1,2)
    map.point(headPos.adj(Direc.DOWN)).type = PointType.WALL;  // (3,2)
    // The only way is LEFT (to (2,1)), which is its own tail.
    // So no path to food (assume no food or food is unreachable), no path to tail.
    // The only "safe" move is technically not possible as it's the tail.
    // GreedySolver's last resort: if no safe_moves, it returns snake.direc (RIGHT), which is a wall.
    // This highlights that GreedySolver might suggest a suicidal move if no other option.
    // Let's test this expected suicidal move if truly no safe moves.

    solver = new GreedySolver(snake);
    // In this specific setup, PathSolver.longest_path_to_tail for (2,1) will find path [LEFT].
    // So it *should* choose LEFT.
    // Let's make the tail unreachable too by blocking (2,0) if the tail was longer.
    // Current tail is (2,1). Path from (2,2) to (2,1) is LEFT.
    // If LEFT is chosen, it's following tail.
    expect(solver.next_direc()).toBe(Direc.LEFT);


    // Scenario 3b: Truly no option but one random safe opening (not tail)
    map.reset(); // Clear map
    const headS3b = new Pos(1,2);
    snake = createAndPlaceSnake(map, headS3b, Direc.DOWN, [new Pos(0,2)]); // H(1,2)-D, B(0,2)
    // Food far away or non-existent
    map.create_food(new Pos(5,5));


    map.point(headS3b.adj(Direc.DOWN)).type = PointType.WALL;  // (2,2) front - wall
    map.point(headS3b.adj(Direc.LEFT)).type = PointType.WALL;  // (1,1) left-relative - wall
                                                              // (1,3) right-relative - OPEN (this is Direc.RIGHT)
    // Tail is at (0,2), UP from head. Path to tail is UP.
    // If we block UP too, then only RIGHT is open.
    map.point(headS3b.adj(Direc.UP)).type = PointType.WALL;    // (0,2) - block path to tail too.

    solver = new GreedySolver(snake);
    // Food is at (5,5), far. Path to tail (0,2) is blocked by wall.
    // Only safe move is RIGHT.
    expect(solver.next_direc()).toBe(Direc.RIGHT);
  });

  it('should return current direction if no safe moves, no food, no tail path (suicidal)', () => {
    map = new Map(3+2, 3+2); // 3x3
    const headPos = new Pos(1,1);
    snake = createAndPlaceSnake(map, headPos, Direc.RIGHT, []); // Single head segment

    map.point(new Pos(1,2)).type = PointType.WALL; // Block Right
    map.point(new Pos(2,1)).type = PointType.WALL; // Block Down
    map.point(new Pos(0,1)).type = PointType.WALL; // Block Up
    // map.point(new Pos(1,0)).type = PointType.WALL; // Block Left - uncomment to make it fully trapped

    // If we also block left, it's fully trapped.
     map.point(new Pos(1,0)).type = PointType.WALL;

    solver = new GreedySolver(snake);
    // No food, no path to tail (it's length 1), no safe moves.
    // Expected to return current direction as last resort.
    expect(solver.next_direc()).toBe(Direc.RIGHT);
  });

});
