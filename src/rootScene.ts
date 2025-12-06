/// <reference path="util.ts" />
/// <reference path="cell.ts" />
/// <reference path="grid.ts" />

class RootScene {
    grid: Grid;
    element: HTMLElement;
    constructor(rootElement: HTMLElement, n: number) {
        let width = rootElement.clientWidth;
        let height = rootElement.clientHeight;
        let gridSize = Math.min(width, height);
        this.grid = new Grid(n, gridSize);
        this.element = rootElement;
        this.element.appendChild(this.grid.element);
    }
}