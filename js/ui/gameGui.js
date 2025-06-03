import { Pos } from '../common/pos.js';
import { PointType } from '../common/constants.js';
// Game and GameMap are passed to constructor, no direct import needed in GameGUI itself for them.
// Conf is also passed to constructor.

export class GameGUI {
    constructor(title, conf, gameMap, gameInstance) {
        document.title = title;
        this.conf = conf;
        this.gameMap = gameMap;
        this.game = gameInstance; // To access game state like snake.dead, episode, etc.
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.infoPanelElement = document.getElementById('infoPanel'); // DOM element for info
        this._setupCanvas();
        this._initDrawParams();
        // Keybindings are typically handled by the Game class or a dedicated input manager
        // this._initKeybindings(); 

        this.gameLoopIntervalId = null;
    }

    _setupCanvas() {
        this.canvas.width = this.conf.map_width;
        this.canvas.height = this.conf.map_height;
    }

    _initDrawParams() {
        this.grid_cell_width = this.conf.map_width / (this.gameMap.num_cols - 2);
        this.grid_cell_height = this.conf.map_height / (this.gameMap.num_rows - 2);
        const pr = this.conf.grid_pad_ratio; 
        const fpr = 0.9 * pr; 

        this.dx1 = pr * this.grid_cell_width;
        this.dx2 = (1 - pr) * this.grid_cell_width; 
        this.dy1 = pr * this.grid_cell_height;
        this.dy2 = (1 - pr) * this.grid_cell_height;

        this.dx1_food = fpr * this.grid_cell_width;
        this.dx2_food = (1 - fpr) * this.grid_cell_width;
        this.dy1_food = fpr * this.grid_cell_height;
        this.dy2_food = (1 - fpr) * this.grid_cell_height;
    }

    // _initKeybindings() { // Usually handled by Game or InputManager
    // }

    runGameLoop(gameLogicTickFn) {
        if (this.gameLoopIntervalId) clearInterval(this.gameLoopIntervalId);

        const logicLoop = () => {
            gameLogicTickFn(); 
        };
        this.gameLoopIntervalId = setInterval(logicLoop, this.conf.interval_draw);

        const renderLoop = () => {
            this._updateContents(); 
            requestAnimationFrame(renderLoop);
        };
        requestAnimationFrame(renderLoop);
    }

    stopGameLoop() {
        if (this.gameLoopIntervalId) {
            clearInterval(this.gameLoopIntervalId);
            this.gameLoopIntervalId = null;
        }
    }

    _updateContents() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this._drawBg();
        if (this.conf.show_grid_line) this._drawGridLine();
        this._drawMapContents();
        if (this.conf.show_info_panel && this.infoPanelElement) this._updateInfoPanelDOM();
    }

    _drawBg() {
        this.ctx.fillStyle = this.conf.color_bg;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    _drawGridLine() {
        this.ctx.strokeStyle = this.conf.color_line;
        this.ctx.lineWidth = 1;
        for (let i = 1; i < this.gameMap.num_cols - 2; i++) {
            const x = i * this.grid_cell_width;
            this.ctx.beginPath(); this.ctx.moveTo(x, 0); this.ctx.lineTo(x, this.conf.map_height); this.ctx.stroke();
        }
        for (let i = 1; i < this.gameMap.num_rows - 2; i++) {
            const y = i * this.grid_cell_height;
            this.ctx.beginPath(); this.ctx.moveTo(0, y); this.ctx.lineTo(this.conf.map_width, y); this.ctx.stroke();
        }
    }

    _updateInfoPanelDOM() {
        let status_str;
        if (this.game.snake.dead) status_str = this.conf.info_status[1];
        else if (this.gameMap.is_full()) status_str = this.conf.info_status[2];
        else status_str = this.conf.info_status[0];

        const infoText = this.conf.info_str_template
            .replace("{status}", status_str)
            .replace("{episode}", this.game.episode)
            .replace("{step}", this.game.snake.steps)
            .replace("{length}", this.game.snake.len())
            .replace("{capacity}", this.gameMap.capacity)
            .replace("{map_rows}", this.conf.map_rows)
            .replace("{map_cols}", this.conf.map_cols);

        this.infoPanelElement.innerHTML = infoText.replace(/\n/g, "<br>");
    }

    _drawMapContents() {
        for (let r = 0; r < this.gameMap.num_rows - 2; r++) { 
            for (let c = 0; c < this.gameMap.num_cols - 2; c++) {
                this._drawGridCell(
                    c * this.grid_cell_width, 
                    r * this.grid_cell_height, 
                    this.gameMap.point(new Pos(r + 1, c + 1)).type 
                );
            }
        }
    }

    _drawGridCell(canvas_x, canvas_y, type) {
        const w = this.grid_cell_width;
        const h = this.grid_cell_height;
        this.ctx.fillStyle = this.conf.color_body;

        switch (type) {
            case PointType.EMPTY: break; 
            case PointType.WALL:
                this.ctx.fillStyle = this.conf.color_wall;
                this.ctx.fillRect(canvas_x, canvas_y, w, h);
                break;
            case PointType.FOOD:
                this.ctx.fillStyle = this.conf.color_food;
                this.ctx.fillRect(canvas_x + this.dx1_food, canvas_y + this.dy1_food,
                    this.dx2_food, this.dy2_food);
                break;
            case PointType.HEAD_L:
                this.ctx.fillStyle = this.conf.color_head;
                this.ctx.fillRect(canvas_x + this.dx1, canvas_y + this.dy1, w - this.dx1, this.dy2);
                break;
            case PointType.HEAD_U:
                this.ctx.fillStyle = this.conf.color_head;
                this.ctx.fillRect(canvas_x + this.dx1, canvas_y + this.dy1, this.dx2, h - this.dy1);
                break;
            case PointType.HEAD_R:
                this.ctx.fillStyle = this.conf.color_head;
                this.ctx.fillRect(canvas_x, canvas_y + this.dy1, this.dx2 + this.dx1, this.dy2); 
                break;
            case PointType.HEAD_D:
                this.ctx.fillStyle = this.conf.color_head;
                this.ctx.fillRect(canvas_x + this.dx1, canvas_y, this.dx2, this.dy2 + this.dy1);
                break;
            case PointType.BODY_LU: 
                this.ctx.fillRect(canvas_x, canvas_y + this.dy1, this.dx1 + this.dx2, this.dy2); 
                this.ctx.fillRect(canvas_x + this.dx1, canvas_y, this.dx2, this.dy1 + this.dy2); 
                break;
            case PointType.BODY_UR: 
                this.ctx.fillRect(canvas_x + this.dx1, canvas_y, this.dx2, this.dy1 + this.dy2);
                this.ctx.fillRect(canvas_x + this.dx1, canvas_y + this.dy1, w - this.dx1, this.dy2);
                break;
            case PointType.BODY_RD: 
                this.ctx.fillRect(canvas_x + this.dx1, canvas_y + this.dy1, w - this.dx1, this.dy2);
                this.ctx.fillRect(canvas_x + this.dx1, canvas_y + this.dy1, this.dx2, h - this.dy1);
                break;
            case PointType.BODY_DL: 
                this.ctx.fillRect(canvas_x + this.dx1, canvas_y + this.dy1, this.dx2, h - this.dy1);
                this.ctx.fillRect(canvas_x, canvas_y + this.dy1, this.dx1 + this.dx2, this.dy2);
                break;
            case PointType.BODY_HOR:
                this.ctx.fillRect(canvas_x, canvas_y + this.dy1, w, this.dy2);
                break;
            case PointType.BODY_VER:
                this.ctx.fillRect(canvas_x + this.dx1, canvas_y, this.dx2, h);
                break;
            default: 
                this.ctx.fillStyle = this.conf.color_body;
                this.ctx.fillRect(canvas_x + this.dx1, canvas_y + this.dy1, this.dx2, this.dy2);
                break;
        }
    }
}
