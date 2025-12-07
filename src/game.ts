/// <reference path="util.ts" />
/// <reference path="cell.ts" />
/// <reference path="grid.ts" />
/// <reference path="rootScene.ts" />
/// <reference path="shape.ts" />
/// <reference path="shapes.ts" />
/// <reference path="colors.ts" />
/// <reference path="smallShape.ts" />

class Game {
    rootScene: RootScene;
    n: number = 10;
    blockSlotStart: number = 10;
    blockSlotWidth: number = 50;
    blockSlotGap: number = 50;
    blockHeight: number = 310;
    constructor(rootElement: HTMLElement) {
        this.handleSmallShapeClick = this.handleSmallShapeClick.bind(this);
        this.shapeDropped = this.shapeDropped.bind(this);
        this.rootScene = new RootScene(rootElement, this.n);
        this.addShapes();
    }

    addShapes() {
        for (let i = 0; i < 3; i++) {
            this.addShape(getRandomUnconstrainedColor(), i);
        }
    }

    addShape(color: string, slot: number, positions: CoordinatePair[] = randomShape()): SmallShape {
        let x = this.blockSlotStart + slot * (this.blockSlotWidth + this.blockSlotGap);
        let shapePosition = new CoordinatePair(x, this.blockHeight);
        let smallShapeConfig: SmallShapeConfig = { 
            index: slot,
            color: color, 
            positions: positions, 
            parentElement: this.rootScene.element,
            position: shapePosition,
            n: this.n,
            size: 50,
            callback: this.handleSmallShapeClick
        };
        let shape = new SmallShape(smallShapeConfig);
        return shape;
    }

    handleSmallShapeClick(smallShape: SmallShape) {
        let position = smallShape.position;
        let positions = smallShape.positions;
        let color = smallShape.color;
        this.rootScene.element.removeChild(smallShape.element);
        let shapeConfig: ShapeConfig = { 
            index: smallShape.index,
            rootScene: this.rootScene,
            position: position,
            positions: positions,
            color: color,
            dropCallback: this.shapeDropped
        };
        let shape = new Shape(shapeConfig);
    }

    shapeDropped(success: boolean, shape: Shape) {
        if (!success) {
            this.addShape(shape.color, shape.index, shape.positions);
            shape.remove();
            return;
        }

        let newShape = this.addShape(getRandomUnconstrainedColor(), shape.index); // Add another shape after one is dropped
        shape.remove();
        let cellsToClear: Cell[] = [];
        cellsToClear = this.getCompleteRowCells();
        cellsToClear = cellsToClear.concat(this.getCompleteColumnCells());
        this.clearCells(cellsToClear);
        let fitPositions = this.checkForFitCoordinates(newShape);
        if (fitPositions.length == 0) {
            setTimeout(() => {
                alert("Game Over!");
            }, 1000);
        }
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

    checkForFitCoordinates(shape: SmallShape): Cell[][] {
        let validPositions: Cell[][] = [];
        let grid = this.rootScene.grid;
        for (let r = 0; r < this.n; r++) {
            for (let c = 0; c < this.n; c++) {
                let cells = shape.findCells(grid, r, c);
                if (cells) {
                    validPositions.push(cells);
                }
            }
        }
        return validPositions;
    }
}