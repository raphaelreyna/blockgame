/// <reference path="util.ts" />
/// <reference path="cell.ts" />
/// <reference path="grid.ts" />
/// <reference path="rootScene.ts" />
/// <reference path="shape.ts" />
/// <reference path="shapes.ts" />

class Game {
    rootScene: RootScene;
    n: number = 10;
    blockSlotStart: number = 10;
    blockSlotWidth: number = 30;
    blockSlotGap: number = 10;
    blockHeight: number = 310;
    constructor(rootElement: HTMLElement) {
        this.shapeDropped = this.shapeDropped.bind(this);
        this.rootScene = new RootScene(rootElement, this.n);
        this.addShape("#FF0000", 0); // Red block in slot 0
    }

    addShape(color: string, slot: number) {
        let x = this.blockSlotStart + slot * (this.blockSlotWidth + this.blockSlotGap);
        let shapePosition = new CoordinatePair(x, this.blockHeight);
        let positions = randomShape();
        let shape = new Shape(this.rootScene, shapePosition, positions, color, this.shapeDropped);
    }

    shapeDropped(shape: Shape) {
        this.addShape("#FF0000", 0); // Add another shape after one is dropped
        let cellsToClear: Cell[] = [];
        cellsToClear = this.getCompleteRowCells();
        cellsToClear = cellsToClear.concat(this.getCompleteColumnCells());
        this.clearCells(cellsToClear);
    }

    getRowCellsIfComplete(row: number): Cell[] {
        let cells: Cell[] = [];
        for (let c = 0; c < this.n; c++) {
            let cell = this.rootScene.grid.getCell(row, c);
            if (cell && !cell.occupied) {
                return [];
            }
            cells.push(cell!);
        }
        return cells;
    }

    getCompleteRowCells(): Cell[] {
        let cells: Cell[] = [];
        for (let r = 0; r < this.n; r++) {
            let x = this.getRowCellsIfComplete(r);
            if (x.length > 0) {
                cells = cells.concat(x);
            }
        }
        return cells;
    }

    getColumnCellsIfComplete(col: number): Cell[] {
        let cells: Cell[] = [];
        for (let r = 0; r < this.n; r++) {
            let cell = this.rootScene.grid.getCell(r, col);
            if (cell && !cell.occupied) {
                return [];
            }
            cells.push(cell!);
        }
        return cells;
    }
    
    getCompleteColumnCells(): Cell[] {
        let cells: Cell[] = [];
        for (let c = 0; c < this.n; c++) {
            let x = this.getColumnCellsIfComplete(c);
            if (x.length > 0) {
                cells = cells.concat(x);
            }
        }
        return cells;
    }

    clearCells(cells: Cell[]) {
        for (let cell of cells) {
            if (cell && cell.element) {
                cell.occupied = false;
                cell.element.style.backgroundColor = "lightgrey";
            }
        }
    }
}