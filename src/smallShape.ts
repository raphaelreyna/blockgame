/// <reference path="util.ts" />
/// <reference path="grid.ts" />

type SmallShapeConfig = {
    index: number;
    parentElement: HTMLElement;
    position: CoordinatePair;
    n: number;
    size: number;
    positions: CoordinatePair[];
    color: string;
    callback: (smallShape: SmallShape) => void;
}

class SmallShape {
    element: HTMLElement;
    n: number;
    size: number;
    parentElement: HTMLElement;
    positions: CoordinatePair[];
    position: CoordinatePair;
    color: string;
    index: number;
    callback: (smallShape: SmallShape) => void;
    constructor(config: SmallShapeConfig) {
        this.handleMouseDown = this.handleMouseDown.bind(this);

        this.index = config.index;
        this.n = config.n;
        this.size = config.size;
        this.callback = config.callback;
        this.parentElement = config.parentElement;
        this.positions = config.positions;
        this.position = config.position;
        this.color = config.color;
        this.element = document.createElement("div");
        this.element.addEventListener("mousedown", this.handleMouseDown);
        this.element.style.position = "absolute";
        this.element.style.width = `${this.size}px`;
        this.element.style.height = this.element.style.width;
        this.element.style.top = `${this.position.y}px`;
        this.element.style.left = `${this.position.x}px`;
        this.element.classList.add("shapeContainer");

        let minX: number = 1000000;
        let minY: number = 1000000;
        let maxX: number = -1;
        let maxY: number = -1;
        for (let p of this.positions) {
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.x < minX) minX = p.x;
            if (p.y > maxY) maxY = p.y;
        }
        if (minX != 0 || minY != 0) {
            throw new Error("invalid shape");
        }
        this.n = maxX - minX + 1;
        let cellSize = this.size / this.n;

        for (let p of this.positions) {
            let element = document.createElement("div");
            element.style.width = `${cellSize}px`;
            element.style.height = `${cellSize}px`;
            element.style.backgroundColor = this.color;
            element.style.position = "absolute";
            let yy = p.y - minY;
            let xx = p.x - minX;
            let {x, y} = this.toWorldCoordinates(yy, xx);
            element.style.top = `${y}px`;
            element.style.left = `${x}px`;
            element.classList.add("shape-section");
            this.element.appendChild(element);
        }
        this.parentElement.appendChild(this.element);
    }

    toWorldCoordinates(row: number, col: number): { x: number; y: number } {
        let x = col / this.n;
        x = x * this.size;
        let y = row / this.n;
        y = y * this.size;
        return { x, y };
    }

    handleMouseDown(event: MouseEvent) {
        this.callback(this);
    }

    findCells(grid: Grid, x: number, y: number): Cell[] | null {
        let cells: Cell[] = [];
        for (let sectionPosition of this.positions) {
            let xx = x + sectionPosition.x;
            let yy = y + sectionPosition.y;
            let cell = grid.getCell(yy, xx);
            if (!cell || !cell.element || cell.occupied) {
                return null;
            }
            cells = cells.concat(cell);
        }
        return cells;
    }
}