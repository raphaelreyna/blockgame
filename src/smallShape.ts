/// <reference path="util.ts" />
/// <reference path="grid.ts" />

type SmallShapeConfig = {
    index: number;
    parentElement: HTMLElement;
    position: CoordinatePair;
    n: number;
    cellSize: number;
    figure: Figure;
    color: string;
    callback: (smallShape: SmallShape, sourceEvent: PointerEvent) => void;
}

class SmallShape extends GameNode {
    n: number;
    parentElement: HTMLElement;
    figure: Figure;
    color: string;
    index: number;
    cellSize: number;
    callback: (smallShape: SmallShape, sourceEvent: PointerEvent) => void;
    constructor(config: SmallShapeConfig) {
        const width = config.cellSize * config.figure.width;
        const height = config.cellSize * config.figure.height;
        super({ x: config.position.x, y: config.position.y, width: width, height: height });
        this.handlePointerDown = this.handlePointerDown.bind(this);
        this.index = config.index;
        this.n = config.n;
        this.callback = config.callback;
        this.parentElement = config.parentElement;
        this.figure = config.figure;
        this.color = config.color;
        this.cellSize = config.cellSize;
        this.element.addEventListener("pointerdown", this.handlePointerDown);
        this.element.classList.add("shapeContainer");
        this.n = this.figure.width;
        let cellSize = this.cellSize;
        let offset = new CoordinatePair(-1.0 * this.figure.minX, -1.0 * this.figure.minY);
        let sectionNodes = this.figure.toGameNodes(this.width, this.n, cellSize, offset);
        sectionNodes.forEach((node) => {
            node.element.style.backgroundColor = this.color;
            node.element.classList.add("shape-section");
            node.addToParent(this.element);
        });
        this.addToParent(this.parentElement);
    }
    handlePointerDown(event: PointerEvent) {
        event.preventDefault();
        this.callback(this, event);
    }

    destroy() {
        this.element.removeEventListener("pointerdown", this.handlePointerDown);
        this.remove();
    }
}