/// <reference path="util.ts" />
/// <reference path="cell.ts" />
/// <reference path="grid.ts" />
/// <reference path="rootScene.ts" />

class Shape {
    element: HTMLDivElement;
    elements: HTMLDivElement[];
    offsetX: number = 0;
    offsetY: number = 0;
    callback: (shape: Shape) => void;
    constructor(public rootScene: RootScene, position: CoordinatePair, public positions: CoordinatePair[], color: string, callback: (shape: Shape) => void) {
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        document.addEventListener("mousemove", this.onMouseMove);
        document.addEventListener("mousedown", this.onMouseDown);

        this.callback = callback;
        this.rootScene = rootScene;
        this.positions = positions;
        this.element = document.createElement("div");
        this.element.style.position = "absolute";
        this.element.style.width = `${rootScene.grid.size}px`;
        this.element.style.height = this.element.style.width;
        this.element.style.top = `${position.y}px`;
        this.element.style.left = `${position.x}px`;
        this.element.classList.add("shapeContainer");
        document.addEventListener("mouseup", this.onMouseUp);
        document.addEventListener("mousedown", this.onMouseDown);
        this.rootScene.element.appendChild(this.element);
        this.elements = [];

        let minX: number = 1000000;
        let minY: number = 1000000;
        let maxX: number = -1;
        let maxY: number = -1;
        for (let p of positions) {
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.x < minX) minX = p.x;
            if (p.y > maxY) maxY = p.y;
            let element = document.createElement("div");
            element.style.width = `${rootScene.grid.cellSize}px`
            element.style.height = `${rootScene.grid.cellSize}px`
            element.style.backgroundColor = color;
            element.style.position = "absolute";
            let {x, y} = this.toWorldCoordinates(p.y, p.x);
            element.style.top = `${y}px`;
            element.style.left = `${x}px`;
            element.classList.add("shape-section");
            this.elements.push(element);
            this.element.appendChild(element);
        }

        if (minX != 0 || minY != 0) {
            throw new Error("invalid shape");
        }

        let { x: maxXWorld, y: maxYWorld } = this.toWorldCoordinates(maxY + 1, maxX + 1);
        this.element.style.width = `${maxXWorld}px`;
        this.element.style.height = `${maxYWorld}px`;
    }

    toWorldCoordinates(row: number, col: number): { x: number; y: number } {
        const n = this.rootScene.grid.n;
        const size = this.rootScene.grid.size;
        let x = col / n;
        x = x * size;
        let y = row / n;
        y = y * size;
        return { x, y };
    }

    onMouseDown(event: MouseEvent) {
        document.removeEventListener("mousemove", this.onMouseMove);
        event.preventDefault();
        if (!this.element) return;
        let rect = this.element.getBoundingClientRect();
        this.offsetX = event.clientX - rect.left;
        this.offsetY = event.clientY - rect.top;
        document.addEventListener("mousemove", this.onMouseMove);
    }
    onMouseUp(event?: MouseEvent) {
        document.removeEventListener("mousemove", this.onMouseMove);
        event?.preventDefault();
        if (!this.element || !this.rootScene.grid) return;
        let x = this.element.offsetLeft;
        let y = this.element.offsetTop;
        let { row, col } = this.rootScene.grid.toGridCoordinates(y, x);
        let cells = this.findCells(row, col);
        if (!cells) {
            console.log("cant place shape");
            return;
        }
        for (let cell of cells) {
            if (cell.element) {
                cell.element.style.backgroundColor = "brown";
                cell.occupied = true;
            }
        }
        document.removeEventListener("mousedown", this.onMouseDown);
        document.removeEventListener("mouseup", this.onMouseUp);
        this.rootScene.element.removeChild(this.element);
        this.callback(this);
    }
    onMouseMove(event: MouseEvent) {
        if (!this.element) return;
        event.preventDefault();
        this.element.style.left = `${event.clientX - this.offsetX}px`;
        this.element.style.top = `${event.clientY - this.offsetY}px`;
    }
    findCells(x: number, y: number): Cell[] | null {
        let cells: Cell[] = [];
        for (let sectionPosition of this.positions) {
            let xx = x + sectionPosition.x;
            let yy = y + sectionPosition.y;
            let cell = this.rootScene.grid.getCell(yy, xx);
            if (!cell || !cell.element || cell.occupied) {
                return null;
            }
            cells = cells.concat(cell);
        }
        return cells;
    }
}
