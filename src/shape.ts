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
    activePointerId: number | null = null;
    constructor(config : ShapeConfig) {
        let width = config.rootScene.grid.size;
        let height = width;
        super({ x: config.position.x, y: config.position.y, width: width, height: height });
        this.onPointerDown = this.onPointerDown.bind(this);
        this.onPointerUp = this.onPointerUp.bind(this);
        this.onPointerMove = this.onPointerMove.bind(this);
        this.onPointerCancel = this.onPointerCancel.bind(this);

        this.index = config.index;
        this.dropCallback = config.dropCallback;
        this.rootScene = config.rootScene;
        this.figure = config.figure;
        this.color = config.color;
        this.originalPosition = { x: config.position.x, y: config.position.y };
        this.element.classList.add("shapeContainer");
        this.element.addEventListener("pointerdown", this.onPointerDown);
        this.element.addEventListener("pointerup", this.onPointerUp);
        this.element.addEventListener("pointermove", this.onPointerMove);
        this.element.addEventListener("pointercancel", this.onPointerCancel);
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
        this.element.removeEventListener("pointerdown", this.onPointerDown);
        this.element.removeEventListener("pointerup", this.onPointerUp);
        this.element.removeEventListener("pointermove", this.onPointerMove);
        this.element.removeEventListener("pointercancel", this.onPointerCancel);
        if (this.element) {
            this.rootScene.element.removeChild(this.element);
        }
    }

    onPointerDown(event: PointerEvent) {
        event.preventDefault();
        if (!this.element || this.activePointerId !== null) return;
        this.activePointerId = event.pointerId;
        let rect = this.element.getBoundingClientRect();
        this.offsetX = event.clientX - rect.left;
        this.offsetY = event.clientY - rect.top;
        try {
            this.element.setPointerCapture(this.activePointerId);
        } catch (err) {
            // no-op: capture may fail on older browsers
        }
    }

    onPointerUp(event: PointerEvent) {
        if (this.activePointerId !== event.pointerId) return;
        event.preventDefault();
        this.releasePointerCapture();
        this.finishDrop();
    }

    onPointerCancel(event: PointerEvent) {
        if (this.activePointerId !== event.pointerId) return;
        this.clearCurrentHighlight();
        this.releasePointerCapture();
        this.dropCallback(this, []);
    }

    onPointerMove(event: PointerEvent) {
        if (this.activePointerId !== event.pointerId) return;
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

        // move shape - account for container offset from viewport
        let containerRect = this.rootScene.element.getBoundingClientRect();
        this.element.style.left = `${event.clientX - containerRect.left - this.offsetX}px`;
        this.element.style.top = `${event.clientY - containerRect.top - this.offsetY}px`;

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

    releasePointerCapture() {
        if (this.activePointerId === null || !this.element) {
            return;
        }
        try {
            this.element.releasePointerCapture(this.activePointerId);
        } catch (err) {
            // no-op: release may fail if capture was never set
        }
        this.activePointerId = null;
    }

    finishDrop() {
        if (!this.element || !this.rootScene.grid) return;
        let x = this.element.offsetLeft;
        let y = this.element.offsetTop;
        let { row, col } = this.rootScene.grid.toGridCoordinates(y, x);
        let cells = this.findCells(row, col);
        if (!cells) {
            this.dropCallback(this, []);
            return;
        }
        for (let cell of cells) {
            cell.setDropHighlighted(false);
        }
        this.dropCallback(this, cells);
    }

    clearCurrentHighlight() {
        if (!this.element) return;
        let { row, col } = this.rootScene.grid.toGridCoordinates(this.element.offsetTop, this.element.offsetLeft);
        let cells = this.findCells(row, col);
        if (!cells) {
            return;
        }
        for (let cell of cells) {
            cell.setDropHighlighted(false);
        }
    }

    beginDragFromPointer(event: PointerEvent) {
        this.onPointerDown(event);
    }

    findCells(x: number, y: number): Cell[] | null {
        return this.rootScene.grid.findFigureIntersection(this.figure, new CoordinatePair(x, y));
    }
}
