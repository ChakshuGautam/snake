import { Pos } from '../pos.js';
import { Direc } from '../constants.js';

describe('Pos', () => {
  it('should correctly compare two Pos objects', () => {
    const p1 = new Pos(1, 2);
    const p2 = new Pos(1, 2);
    const p3 = new Pos(2, 1);
    expect(p1.equals(p2)).toBe(true);
    expect(p1.equals(p3)).toBe(false);
  });

  it('should return correct adjacent position', () => {
    const p = new Pos(5, 5);
    expect(p.adj(Direc.UP).equals(new Pos(4, 5))).toBe(true);
    expect(p.adj(Direc.LEFT).equals(new Pos(5, 4))).toBe(true);
    expect(p.adj(Direc.DOWN).equals(new Pos(6, 5))).toBe(true);
    expect(p.adj(Direc.RIGHT).equals(new Pos(5, 6))).toBe(true);
  });
});
