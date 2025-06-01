export const Direc = {
    NONE: 0,
    LEFT: 1,
    UP: 2,
    RIGHT: 3,
    DOWN: 4,
    opposite: function (direc) {
        if (direc === Direc.LEFT) return Direc.RIGHT;
        if (direc === Direc.RIGHT) return Direc.LEFT;
        if (direc === Direc.UP) return Direc.DOWN;
        if (direc === Direc.DOWN) return Direc.UP;
        return Direc.NONE;
    }
};

export const PointType = {
    EMPTY: 0,
    WALL: 1,
    FOOD: 2,
    HEAD_L: 100,
    HEAD_U: 101,
    HEAD_R: 102,
    HEAD_D: 103,
    BODY_LU: 104,
    BODY_UR: 105,
    BODY_RD: 106,
    BODY_DL: 107,
    BODY_HOR: 108,
    BODY_VER: 109
};

export const GameMode = {
    NORMAL: 0,
    BENCHMARK: 1,
    TRAIN_DQN: 2, // Will be heavily simplified
    TRAIN_DQN_GUI: 3 // Will be heavily simplified
};

export const SnakeAction = { // For DQN, simplified
    LEFT: 0,
    FORWARD: 1,
    RIGHT: 2,
    to_direc: function (action, cur_direc) {
        if (action === SnakeAction.FORWARD) return cur_direc;
        if (action === SnakeAction.LEFT) {
            if (cur_direc === Direc.LEFT) return Direc.DOWN;
            if (cur_direc === Direc.UP) return Direc.LEFT;
            if (cur_direc === Direc.RIGHT) return Direc.UP;
            if (cur_direc === Direc.DOWN) return Direc.RIGHT;
        }
        if (action === SnakeAction.RIGHT) {
            if (cur_direc === Direc.LEFT) return Direc.UP;
            if (cur_direc === Direc.UP) return Direc.RIGHT;
            if (cur_direc === Direc.RIGHT) return Direc.DOWN;
            if (cur_direc === Direc.DOWN) return Direc.LEFT;
        }
        return Direc.NONE;
    }
};
