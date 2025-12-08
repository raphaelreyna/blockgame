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
    scoreLabel: HTMLSpanElement;
    shapesInPlay: SmallShape[] = [];
    constructor(rootElement: HTMLElement) {
        this.scoreLabel = document.getElementById("scoreLabel")!;
        this.handleSmallShapeClick = this.handleSmallShapeClick.bind(this);
        this.shapeDropped = this.shapeDropped.bind(this);
        this.rootScene = new RootScene(rootElement, this.n);
        this.addShapes();
    }

    addShapes() {
        for (let i = 0; i < 3; i++) {
            let smallShape = this.addShape(getRandomUnconstrainedColor(), i);
            this.shapesInPlay.push(smallShape);
        }
    }

    addShape(color: string, slot: number, positions: CoordinatePair[] = randomShape()): SmallShape {
        let x = this.blockSlotStart + slot * (this.blockSlotWidth + this.blockSlotGap);
        let shapePosition = new CoordinatePair(x, this.blockHeight);
        let smallShapeConfig: SmallShapeConfig = {
            index: slot,
            color: color,
            figure: new Figure(positions),
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
        let figure = smallShape.figure;
        let color = smallShape.color;
        this.rootScene.element.removeChild(smallShape.element);
        let shapeConfig: ShapeConfig = {
            index: smallShape.index,
            rootScene: this.rootScene,
            position: position,
            figure: figure,
            color: color,
            dropCallback: this.shapeDropped
        };
        let shape = new Shape(shapeConfig);
    }

    shapeDropped(shape: Shape, cells: Cell[]) {
        if (cells.length == 0) {
            this.addShape(shape.color, shape.index, shape.figure.data);
            shape.remove();
            return;
        }

        this.shapesInPlay = this.shapesInPlay.filter(s => s.index !== shape.index);

        for (let cell of cells) {
            cell.setOccupied(true, shape.color);
        }

        this.scoreLabel.textContent = (parseInt(this.scoreLabel.textContent!) + 10).toString();

        const grid = this.rootScene.grid;
        shape.remove();
        let cellsToClear: Cell[] = [];
        cellsToClear = grid.getCompleteRowCells();
        cellsToClear = cellsToClear.concat(grid.getCompleteColumnCells());
        grid.clearCells(cellsToClear);
        if (this.shapesInPlay.length == 0) {
            this.addShapes();
        }

        let canPlay = false;
        for (let shape of this.shapesInPlay) {
            let fitPositions = this.checkForFitCoordinates(shape);
            if (fitPositions.length > 0) {
                canPlay = true;
                break;
            }
        }
        if (!canPlay) {
            setTimeout(() => {
                alert("Game Over!");
            }, 1000);
        }

    }

    checkForFitCoordinates(shape: SmallShape): Cell[][] {
        let validPositions: Cell[][] = [];
        let grid = this.rootScene.grid;
        for (let r = 0; r < this.n; r++) {
            for (let c = 0; c < this.n; c++) {
                let cells = grid.findFigureIntersection(shape.figure, new CoordinatePair(c, r));
                if (cells) {
                    validPositions.push(cells);
                }
            }
        }
        return validPositions;
    }
}