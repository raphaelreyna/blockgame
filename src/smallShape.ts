/// <reference path="util.ts" />
/// <reference path="grid.ts" />

type SmallShapeConfig = {
    index: number;
    parentElement: HTMLElement;
    position: CoordinatePair;
    n: number;
    size: number;
    figure: Figure;
    color: string;
    callback: (smallShape: SmallShape) => void;
}

class SmallShape extends GameNode {
    n: number;
    parentElement: HTMLElement;
    figure: Figure;
    color: string;
    index: number;
    callback: (smallShape: SmallShape) => void;
    constructor(config: SmallShapeConfig) {
        super({ x: config.position.x, y: config.position.y, width: config.size, height: config.size });
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.index = config.index;
        this.n = config.n;
        this.callback = config.callback;
        this.parentElement = config.parentElement;
        this.figure = config.figure;
        this.color = config.color;
        this.element.addEventListener("mousedown", this.handleMouseDown);
        this.element.classList.add("shapeContainer");
        this.n = this.figure.width;
        let cellSize = this.width / this.n;
        let offset = new CoordinatePair(-1.0 * this.figure.minX, -1.0 * this.figure.minY);
        let sectionNodes = this.figure.toGameNodes(this.width, this.n, cellSize, offset);
        sectionNodes.forEach((node) => {
            node.element.style.backgroundColor = this.color;
            node.element.classList.add("shape-section");
            node.addToParent(this.element);
        });
        this.addToParent(this.parentElement);
    }
    handleMouseDown(event: MouseEvent) {
        this.callback(this);
    }
}