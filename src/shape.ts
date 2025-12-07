/// <reference path="util.ts" />
/// <reference path="cell.ts" />
/// <reference path="grid.ts" />
/// <reference path="rootScene.ts" />

type ShapeConfig = {
    index: number;
    rootScene: RootScene;
    position: CoordinatePair;
    figure: Figure;
    color: string;
    dropCallback: (shape: Shape, cells: Cell[]) => void;
}

class Shape extends GameNode {
    elements: GameNode[];
    offsetX: number = 0;
    offsetY: number = 0;
    index: number = 0;
    originalPosition: CoordinatePair;
    rootScene: RootScene;
    figure: Figure;
    color: string;
    dropCallback: (shape: Shape, cells: Cell[]) => void;
    constructor(config : ShapeConfig) {
        let width = config.rootScene.grid.size;
        let height = width;
        super({ x: config.position.x, y: config.position.y, width: width, height: height });
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        document.addEventListener("mousemove", this.onMouseMove);
        document.addEventListener("mousedown", this.onMouseDown);
        document.addEventListener("mouseup", this.onMouseUp);

        this.index = config.index;
        this.dropCallback = config.dropCallback;
        this.rootScene = config.rootScene;
        this.figure = config.figure;
        this.color = config.color;
        this.originalPosition = { x: config.position.x, y: config.position.y };
        this.element.classList.add("shapeContainer");
        this.addToParent(this.rootScene.element);
        this.elements = [];

        const grid = this.rootScene.grid;
        let sectionsNodes = this.figure.toGameNodes(grid.size, grid.n, grid.cellSize);
        sectionsNodes.forEach(node => {
            node.element.classList.add("shape-section");
            node.element.style.backgroundColor = this.color;
            this.elements.push(node);
            node.addToParent(this.element);
        });

        let { x: maxXWorld, y: maxYWorld } = gridToWorldCoordinates(grid.n, grid.size, this.figure.height, this.figure.width);
        this.element.style.width = `${maxXWorld}px`;
        this.element.style.height = `${maxYWorld}px`;
    }

    remove() {
        document.removeEventListener("mousedown", this.onMouseDown);
        document.removeEventListener("mouseup", this.onMouseUp);
        document.removeEventListener("mousemove", this.onMouseMove);
        if (this.element) {
            this.rootScene.element.removeChild(this.element);
        }
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
            this.dropCallback(this, []);
            return;
        }
        for (let cell of cells) {
            cell.setDropHighlighted(false);
        }
        this.dropCallback(this, cells);
    }
    onMouseMove(event: MouseEvent) {
        event.preventDefault();
        if (!this.element) return;

        let x = this.element.offsetLeft;
        let y = this.element.offsetTop;
        
        // undo previous drop-highlight
        let { row, col } = this.rootScene.grid.toGridCoordinates(y, x);
        let cells = this.findCells(row, col);
        if (cells) {
            for (let cell of cells) {
                if (cell.element) {
                    cell.setDropHighlighted(false);
                }
            }
        }

        // move shape
        this.element.style.left = `${event.clientX - this.offsetX}px`;
        this.element.style.top = `${event.clientY - this.offsetY}px`;

        // highlight new drop area
        x = this.element.offsetLeft;
        y = this.element.offsetTop;
        let { row: newRow, col: newCol } = this.rootScene.grid.toGridCoordinates(y, x);
        cells = this.findCells(newRow, newCol);
        if (!cells) {
            return;
        }
        for (let cell of cells) {
            if (cell.element) {
                cell.setDropHighlighted(true);
            }
        }
    }

    findCells(x: number, y: number): Cell[] | null {
        return this.rootScene.grid.findFigureIntersection(this.figure, new CoordinatePair(x, y));
    }
}
