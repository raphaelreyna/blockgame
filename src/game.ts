/// <reference path="util.ts" />
/// <reference path="cell.ts" />
/// <reference path="grid.ts" />
/// <reference path="rootScene.ts" />
/// <reference path="shape.ts" />
/// <reference path="shapes.ts" />
/// <reference path="colors.ts" />
/// <reference path="smallShape.ts" />
/// <reference path="effects.ts" />
/// <reference path="highScore.ts" />

class Game {
    rootScene: RootScene;
    n: number = 10;
    blockSlotStart: number = 0;
    blockSlotWidth: number = 0; // slot area width
    blockSlotGap: number = 0;
    blockHeight: number = 0;
    blockTrayHeight: number = 0;
    cellSize: number = 0;
    scoreLabel: HTMLSpanElement;
    highScoreLabel: HTMLSpanElement;
    highScoreStore: HighScoreStore;
    score: number = 0;
    highScore: number = 0;
    shapesInPlay: SmallShape[] = [];
    constructor(rootElement: HTMLElement) {
        this.scoreLabel = document.getElementById("scoreLabel")!;
        this.highScoreLabel = document.getElementById("highScoreLabel")!;
        this.highScoreStore = new HighScoreStore();
        this.highScore = this.highScoreStore.get();
        this.updateScoreLabels();
        this.handleSmallShapeClick = this.handleSmallShapeClick.bind(this);
        this.shapeDropped = this.shapeDropped.bind(this);
        this.rootScene = new RootScene(rootElement, this.n);
        this.configureLayout(rootElement);
        this.resetGame();
    }

    addShapes() {
        for (let i = 0; i < 3; i++) {
            let smallShape = this.addShape(getRandomUnconstrainedColor(), i);
            this.shapesInPlay.push(smallShape);
        }
    }

    addShape(color: string, slot: number, positions: CoordinatePair[] = randomShape()): SmallShape {
        const figure = new Figure(positions);
        const slotX = this.blockSlotStart + slot * (this.blockSlotWidth + this.blockSlotGap);
        const shapeWidth = this.cellSize * figure.width;
        const shapeHeight = this.cellSize * figure.height;
        const centeredX = slotX + (this.blockSlotWidth - shapeWidth) / 2;
        const centeredY = this.blockHeight + (this.blockTrayHeight - shapeHeight) / 2;
        let shapePosition = new CoordinatePair(centeredX, centeredY);
        let smallShapeConfig: SmallShapeConfig = {
            index: slot,
            color: color,
            figure: figure,
            parentElement: this.rootScene.element,
            position: shapePosition,
            n: this.n,
            cellSize: this.cellSize,
            callback: this.handleSmallShapeClick
        };
        let shape = new SmallShape(smallShapeConfig);
        return shape;
    }

    configureLayout(rootElement: HTMLElement) {
        const gridSize = this.rootScene.grid.size;
        const baseCell = Math.min(64, Math.max(34, Math.round(this.rootScene.grid.cellSize * 0.9)));
        const availableWidth = rootElement.clientWidth || gridSize;
        const gapRatio = 0.5;
        const preferredMinCellSize = 18;
        const hardMinCellSize = 12;
        const computeSideMargin = (width: number) => Math.max(12, Math.round(Math.min(24, width * 0.05)));
        const sideMargin = computeSideMargin(availableWidth);
        const maxRowWidth = Math.min(availableWidth, Math.max(120, availableWidth - sideMargin * 2));
        const widthForSlots = Math.max(maxRowWidth, 120);
        const widthLimitedCell = Math.floor(widthForSlots / (12 + 2 * gapRatio));
        let initialCellSize = Math.min(baseCell, widthLimitedCell);
        if (initialCellSize < hardMinCellSize) {
            initialCellSize = hardMinCellSize;
        }
        const getGap = (size: number) => Math.max(6, Math.round(size * gapRatio));
        const getRowWidth = (size: number) => {
            const gap = getGap(size);
            return { rowWidth: size * 12 + gap * 2, gap };
        };

        this.cellSize = initialCellSize;
        let slotMetrics = getRowWidth(this.cellSize);

        while (slotMetrics.rowWidth > maxRowWidth && this.cellSize > hardMinCellSize) {
            this.cellSize -= 1;
            slotMetrics = getRowWidth(this.cellSize);
        }

        if (this.cellSize < preferredMinCellSize) {
            const preferredMetrics = getRowWidth(preferredMinCellSize);
            if (preferredMetrics.rowWidth <= maxRowWidth) {
                this.cellSize = preferredMinCellSize;
                slotMetrics = preferredMetrics;
            }
        }

        this.blockSlotWidth = this.cellSize * 4;
        this.blockSlotGap = slotMetrics.gap;
        const slotRowWidth = slotMetrics.rowWidth;
        this.blockSlotStart = Math.max(8, Math.round((availableWidth - slotRowWidth) / 2));
        this.blockTrayHeight = this.cellSize * 4;
        this.blockHeight = gridSize + Math.round(this.cellSize * 0.5);
        const trayMargin = Math.round(this.cellSize * 0.8);
        const containerHeight = this.blockHeight + this.blockTrayHeight + trayMargin;
        rootElement.style.height = `${containerHeight}px`;
        this.rootScene.effectsLayer.refreshSize();
    }

    handleSmallShapeClick(smallShape: SmallShape, sourceEvent: PointerEvent) {
        let position = smallShape.position;
        let figure = smallShape.figure;
        let color = smallShape.color;
        smallShape.destroy();
        let shapeConfig: ShapeConfig = {
            index: smallShape.index,
            rootScene: this.rootScene,
            position: position,
            figure: figure,
            color: color,
            dropCallback: this.shapeDropped
        };
        let shape = new Shape(shapeConfig);
        shape.beginDragFromPointer(sourceEvent);
    }

    shapeDropped(shape: Shape, cells: Cell[]) {
        if (cells.length == 0) {
            const replacement = this.addShape(shape.color, shape.index, shape.figure.data);
            this.shapesInPlay = this.shapesInPlay.map(existing => existing.index === shape.index ? replacement : existing);
            shape.remove();
            return;
        }

        this.shapesInPlay = this.shapesInPlay.filter(s => s.index !== shape.index);

        for (let cell of cells) {
            cell.setOccupied(true, shape.color);
        }

        this.incrementScore(10);

        const grid = this.rootScene.grid;
        shape.remove();
        let cellsToClear: Cell[] = [];
        cellsToClear = grid.getCompleteRowCells();
        cellsToClear = cellsToClear.concat(grid.getCompleteColumnCells());
        if (cellsToClear.length > 0) {
            this.rootScene.effectsLayer.emitSparkles(cellsToClear);
        }
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
                this.resetGame();
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

    private resetGame(): void {
        for (const shape of this.shapesInPlay) {
            shape.destroy();
        }
        this.shapesInPlay = [];
        this.rootScene.grid.clearCells(this.rootScene.grid.cells);
        this.score = 0;
        this.updateScoreLabels();
        this.addShapes();
    }

    private incrementScore(amount: number): void {
        if (amount <= 0) {
            return;
        }
        this.score += amount;
        if (this.score > this.highScore) {
            this.highScore = this.highScoreStore.set(this.score);
        }
        this.updateScoreLabels();
    }

    private updateScoreLabels(): void {
        this.scoreLabel.textContent = this.score.toString();
        this.highScoreLabel.textContent = this.highScore.toString();
    }
}