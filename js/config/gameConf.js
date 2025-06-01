import { GameMode, Direc, PointType } from '../common/constants.js';

export class GameConf {
    constructor() {
        this.mode = GameMode.NORMAL;
        this.solver_name = "HamiltonSolver"; // Class name
        this.map_rows = 8;
        this.map_cols = this.map_rows;
        this.map_width = 240; // pixels, increased for better visibility
        this.map_height = this.map_width;
        this.info_panel_width = 160;
        this.window_width = this.map_width + this.info_panel_width; // Used if panel part of canvas
        this.window_height = this.map_height;
        this.grid_pad_ratio = 0.25;
        this.show_grid_line = false;
        this.show_info_panel = true; // Controls whether #infoPanel div is updated
        this.interval_draw = 100; // ms (frame rate for game logic, not canvas drawing)
        this.interval_draw_max = 200;
        this.color_bg = "#000000";
        this.color_txt = "#F5F5F5"; // For info panel text
        this.color_line = "#424242";
        this.color_wall = "#202020"; // Darker walls
        this.color_food = "#FFF59D";
        this.color_head = "#81C784"; // Greenish head
        this.color_body = "#AED581"; // Lighter green body
        this.init_direc = Direc.RIGHT;
        // Ensure these are plain objects for easy reset, Pos objects created in Snake/Game
        this.init_bodies_coords = [{ x: 1, y: 4 }, { x: 1, y: 3 }, { x: 1, y: 2 }, { x: 1, y: 1 }];
        this.init_types = [PointType.HEAD_R, PointType.BODY_HOR, PointType.BODY_HOR, PointType.BODY_HOR];
        this.font_info = "13px Arial"; // For info panel
        this.info_str_template = // Using template literal for easier JS formatting
            `Status: {status}
            Episode: {episode} | Step: {step}
            Length: {length}/{capacity} ({map_rows}x{map_cols})
            -----------------------------------`;
        this.info_status = ["Playing", "Game Over", "Map Full"];
    }
}
