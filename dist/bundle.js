"use strict";
class Cell {
    constructor(config) {
        this.neighbors = new Map();
        this.occupied = false;
        this.row = config.row;
        this.col = config.col;
        this.element = document.createElement("div");
        this.element.classList.add("grid-cell");
        this.element.style.position = "absolute";
        this.element.style.width = `${config.size}px`;
        this.element.style.height = `${config.size}px`;
        this.element.style.left = `${config.col * config.size}px`;
        this.element.style.top = `${config.row * config.size}px`;
    }
    addNeighbor(direction, cell) {
        this.neighbors.set(direction, cell);
        let neighbotDirection;
        switch (direction) {
            case "up":
                neighbotDirection = "down";
                break;
            case "down":
                neighbotDirection = "up";
                break;
            case "left":
                neighbotDirection = "right";
                break;
            case "right":
                neighbotDirection = "left";
                break;
            default:
                throw new Error(`Invalid direction: ${direction}`);
        }
        cell.neighbors.set(neighbotDirection, this);
    }
    setOccupied(occupied, color = "") {
        var _a, _b;
        this.occupied = occupied;
        if (occupied) {
            (_a = this.element) === null || _a === void 0 ? void 0 : _a.classList.add("occupied-grid-cell");
            if (color) {
                this.element.style.backgroundColor = color;
            }
        }
        else {
            (_b = this.element) === null || _b === void 0 ? void 0 : _b.classList.remove("occupied-grid-cell");
            this.element.style.backgroundColor = "";
        }
    }
    setDropHighlighted(highlighted) {
        var _a, _b;
        if (highlighted) {
            (_a = this.element) === null || _a === void 0 ? void 0 : _a.classList.add("drop-highlighted-grid-cell");
        }
        else {
            (_b = this.element) === null || _b === void 0 ? void 0 : _b.classList.remove("drop-highlighted-grid-cell");
        }
    }
}
const COLORS = {
    red: '#FF0000',
    blue: '#0000FF',
    green: '#008000',
    yellow: '#FFFF00',
};
function getColor(colorName) {
    if (COLORS[colorName]) {
        return COLORS[colorName];
    }
    else {
        throw new Error(`Color "${colorName}" not found`);
    }
}
function getRandomColor() {
    const colorNames = Object.keys(COLORS);
    const randomIndex = Math.floor(Math.random() * colorNames.length);
    return COLORS[colorNames[randomIndex]];
}
function getRandomUnconstrainedColor() {
    const randomColor = `#${Math.floor(Math.random() * 16777215).toString(16)}`;
    return randomColor;
}
class CoordinatePair {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.x = x;
        this.y = y;
    }
}
class Figure {
    constructor(data) {
        this.width = 0;
        this.height = 0;
        this.maxX = 0;
        this.maxY = 0;
        this.minX = 0;
        this.minY = 0;
        this.data = data;
        let minX = 1000000;
        let minY = 1000000;
        let maxX = -1;
        let maxY = -1;
        for (let p of this.data) {
            if (p.x > maxX)
                maxX = p.x;
            if (p.y < minY)
                minY = p.y;
            if (p.x < minX)
                minX = p.x;
            if (p.y > maxY)
                maxY = p.y;
        }
        if (minX != 0 || minY != 0) {
            throw new Error("invalid figure");
        }
        this.width = maxX - minX + 1;
        this.height = maxY - minY + 1;
        this.minX = minX;
        this.minY = minY;
        this.maxX = maxX;
        this.maxY = maxY;
    }
    toGameNodes(size, n, cellSize, offset = new CoordinatePair(0, 0), modifier = (node) => { }) {
        let nodes = [];
        for (let p of this.data) {
            let yy = p.y + offset.y;
            let xx = p.x + offset.x;
            if (yy >= size || xx >= size) {
                throw new Error("invalid figure and offset combination");
            }
            let worldCoords = gridToWorldCoordinates(n, size, yy, xx);
            let rect = { x: worldCoords.x, y: worldCoords.y, width: cellSize, height: cellSize };
            let gameNode = new GameNode(rect);
            if (modifier)
                modifier(gameNode);
            nodes.push(gameNode);
        }
        return nodes;
    }
}
function gridToWorldCoordinates(n, size, row, col) {
    let x = col / n;
    x = x * size;
    let y = row / n;
    y = y * size;
    return new CoordinatePair(x, y);
}
class GameNode {
    constructor(rect) {
        this.position = new CoordinatePair(rect.x, rect.y);
        this.width = rect.width;
        this.height = rect.height;
        this.element = document.createElement("div");
        this.element.classList.add("game-node");
        this.element.style.position = "absolute";
        this.element.style.left = rect.x + "px";
        this.element.style.top = rect.y + "px";
        this.element.style.width = rect.width + "px";
        this.element.style.height = rect.height + "px";
    }
    appendChild(child) {
        this.element.appendChild(child);
    }
    removeChild(child) {
        this.element.removeChild(child);
    }
    addToParent(parent) {
        parent.appendChild(this.element);
    }
    remove() {
        this.element.remove();
    }
}
/// <reference path="util.ts" />
/// <reference path="cell.ts" />
class Grid {
    constructor(n, size) {
        this.n = n;
        this.size = size;
        this.element = document.createElement("div");
        this.cellSize = size / n;
        this.element.classList.add("grid");
        this.element.style.width = `${size}px`;
        this.element.style.height = `${size}px`;
        this.cells = [];
        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                const cellConfig = {
                    row: r,
                    col: c,
                    size: this.cellSize,
                };
                let cellObj = new Cell(cellConfig);
                this.cells.push(cellObj);
                this.element.appendChild(cellObj.element);
            }
        }
        // Connect neighbors
        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                let index = r * n + c;
                let cell = this.cells[index];
                if (c != n - 1) {
                    cell.addNeighbor("right", this.cells[index + 1]);
                }
                if (r != n - 1) {
                    cell.addNeighbor("down", this.cells[index + n]);
                }
            }
        }
    }
    toGridCoordinates(x, y) {
        let col = x / this.size;
        col = col * this.n;
        col = Math.round(col);
        let row = y / this.size;
        row = row * this.n;
        row = Math.round(row);
        return { row, col };
    }
    toWorldCoordinates(row, col) {
        let x = (col / this.n);
        x = x * this.size;
        let y = (row / this.n);
        y = y * this.size;
        return { x, y };
    }
    getCell(row, col) {
        if (row < 0 || row >= this.n || col < 0 || col >= this.n) {
            return null;
        }
        return this.cells[row * this.n + col];
    }
    getRowCellsIfComplete(row) {
        let cells = [];
        for (let c = 0; c < this.n; c++) {
            let cell = this.getCell(row, c);
            if (cell && !cell.occupied) {
                return [];
            }
            cells.push(cell);
        }
        return cells;
    }
    getCompleteRowCells() {
        let cells = [];
        for (let r = 0; r < this.n; r++) {
            let x = this.getRowCellsIfComplete(r);
            if (x.length > 0) {
                cells = cells.concat(x);
            }
        }
        return cells;
    }
    getColumnCellsIfComplete(col) {
        let cells = [];
        for (let r = 0; r < this.n; r++) {
            let cell = this.getCell(r, col);
            if (cell && !cell.occupied) {
                return [];
            }
            cells.push(cell);
        }
        return cells;
    }
    getCompleteColumnCells() {
        let cells = [];
        for (let c = 0; c < this.n; c++) {
            let x = this.getColumnCellsIfComplete(c);
            if (x.length > 0) {
                cells = cells.concat(x);
            }
        }
        return cells;
    }
    clearCells(cells) {
        for (let cell of cells) {
            if (cell && cell.element) {
                cell.setOccupied(false);
            }
        }
    }
    findFigureIntersection(figure, position) {
        let cells = [];
        for (let sectionPosition of figure.data) {
            let x = position.x + sectionPosition.x;
            let y = position.y + sectionPosition.y;
            let cell = this.getCell(y, x);
            if (!cell || !cell.element || cell.occupied) {
                return null;
            }
            cells = cells.concat(cell);
        }
        return cells;
    }
}
/// <reference path="util.ts" />
/// <reference path="cell.ts" />
/// <reference path="grid.ts" />
class RootScene {
    constructor(rootElement, n) {
        let width = rootElement.clientWidth;
        let height = rootElement.clientHeight;
        let gridSize = Math.min(width, height);
        this.grid = new Grid(n, gridSize);
        this.element = rootElement;
        this.element.appendChild(this.grid.element);
    }
}
/// <reference path="util.ts" />
/// <reference path="cell.ts" />
/// <reference path="grid.ts" />
/// <reference path="rootScene.ts" />
class Shape extends GameNode {
    constructor(config) {
        let width = config.rootScene.grid.size;
        let height = width;
        super({ x: config.position.x, y: config.position.y, width: width, height: height });
        this.offsetX = 0;
        this.offsetY = 0;
        this.index = 0;
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
    onMouseDown(event) {
        document.removeEventListener("mousemove", this.onMouseMove);
        event.preventDefault();
        if (!this.element)
            return;
        let rect = this.element.getBoundingClientRect();
        this.offsetX = event.clientX - rect.left;
        this.offsetY = event.clientY - rect.top;
        document.addEventListener("mousemove", this.onMouseMove);
    }
    onMouseUp(event) {
        document.removeEventListener("mousemove", this.onMouseMove);
        event === null || event === void 0 ? void 0 : event.preventDefault();
        if (!this.element || !this.rootScene.grid)
            return;
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
    onMouseMove(event) {
        event.preventDefault();
        if (!this.element)
            return;
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
    findCells(x, y) {
        return this.rootScene.grid.findFigureIntersection(this.figure, new CoordinatePair(x, y));
    }
}
/// <reference path="util.ts" />
const SHAPES = {
    "SINGLE": [
        new CoordinatePair(0, 0)
    ],
    "DOUBLE_LINE_V": [
        new CoordinatePair(0, 0),
        new CoordinatePair(0, 1)
    ],
    "DOUBLE_LINE_H": [
        new CoordinatePair(0, 0),
        new CoordinatePair(1, 0)
    ],
    "TRIPLE_LINE_V": [
        new CoordinatePair(0, 0),
        new CoordinatePair(0, 1),
        new CoordinatePair(0, 2)
    ],
    "TRIPLE_LINE_H": [
        new CoordinatePair(0, 0),
        new CoordinatePair(1, 0),
        new CoordinatePair(2, 0)
    ],
    "QUAD_LINE_V": [
        new CoordinatePair(0, 0),
        new CoordinatePair(0, 1),
        new CoordinatePair(0, 2),
        new CoordinatePair(0, 3)
    ],
    "QUAD_LINE_H": [
        new CoordinatePair(0, 0),
        new CoordinatePair(1, 0),
        new CoordinatePair(2, 0),
        new CoordinatePair(3, 0)
    ],
    "SQUARE": [
        new CoordinatePair(0, 0),
        new CoordinatePair(0, 1),
        new CoordinatePair(1, 0),
        new CoordinatePair(1, 1)
    ],
    "RIGHT_ANGLE_1": [
        new CoordinatePair(0, 0),
        new CoordinatePair(0, 1),
        new CoordinatePair(1, 1),
    ],
    "RIGHT_ANGLE_2": [
        new CoordinatePair(0, 1),
        new CoordinatePair(1, 0),
        new CoordinatePair(1, 1)
    ],
    "RIGHT_ANGLE_3": [
        new CoordinatePair(0, 0),
        new CoordinatePair(1, 0),
        new CoordinatePair(1, 1)
    ],
    "RIGHT_ANGLE_4": [
        new CoordinatePair(0, 0),
        new CoordinatePair(0, 1),
        new CoordinatePair(1, 0)
    ],
    "RIGHT_ANGLE_LONG_1_H": [
        new CoordinatePair(0, 0),
        new CoordinatePair(0, 1),
        new CoordinatePair(1, 1),
        new CoordinatePair(2, 1),
    ],
    "RIGHT_ANGLE_LONG_1_V": [
        new CoordinatePair(0, 0),
        new CoordinatePair(0, 1),
        new CoordinatePair(0, 2),
        new CoordinatePair(1, 2),
    ],
    "RIGHT_ANGLE_LONG_2_H": [
        new CoordinatePair(0, 1),
        new CoordinatePair(1, 1),
        new CoordinatePair(2, 1),
        new CoordinatePair(2, 0),
    ],
    "RIGHT_ANGLE_LONG_2_V": [
        new CoordinatePair(1, 0),
        new CoordinatePair(1, 1),
        new CoordinatePair(1, 2),
        new CoordinatePair(0, 2),
    ],
    "RIGHT_ANGLE_LONG_3_H": [
        new CoordinatePair(0, 0),
        new CoordinatePair(1, 0),
        new CoordinatePair(2, 0),
        new CoordinatePair(2, 1)
    ],
    "RIGHT_ANGLE_LONG_3_V": [
        new CoordinatePair(0, 0),
        new CoordinatePair(1, 0),
        new CoordinatePair(1, 1),
        new CoordinatePair(1, 2)
    ],
    "RIGHT_ANGLE_LONG_4_H": [
        new CoordinatePair(0, 0),
        new CoordinatePair(1, 0),
        new CoordinatePair(2, 0),
        new CoordinatePair(0, 1)
    ],
    "RIGHT_ANGLE_LONG_4_V": [
        new CoordinatePair(0, 0),
        new CoordinatePair(1, 0),
        new CoordinatePair(0, 1),
        new CoordinatePair(0, 2)
    ],
    "T_SHAPE_UP": [
        new CoordinatePair(0, 1),
        new CoordinatePair(1, 1),
        new CoordinatePair(2, 1),
        new CoordinatePair(1, 0)
    ],
    "T_SHAPE_DOWN": [
        new CoordinatePair(0, 0),
        new CoordinatePair(1, 0),
        new CoordinatePair(2, 0),
        new CoordinatePair(1, 1)
    ],
    "T_SHAPE_CW": [
        new CoordinatePair(1, 0),
        new CoordinatePair(1, 1),
        new CoordinatePair(1, 2),
        new CoordinatePair(0, 1)
    ],
    "T_SHAPE_CCW": [
        new CoordinatePair(0, 0),
        new CoordinatePair(0, 1),
        new CoordinatePair(0, 2),
        new CoordinatePair(1, 1)
    ],
};
function randomShape() {
    const shapeKeys = Object.keys(SHAPES);
    const randomIndex = Math.floor(Math.random() * shapeKeys.length);
    const randomKey = shapeKeys[randomIndex];
    return SHAPES[randomKey];
}
/// <reference path="util.ts" />
/// <reference path="grid.ts" />
class SmallShape extends GameNode {
    constructor(config) {
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
    handleMouseDown(event) {
        this.callback(this);
    }
}
/// <reference path="util.ts" />
/// <reference path="cell.ts" />
/// <reference path="grid.ts" />
/// <reference path="rootScene.ts" />
/// <reference path="shape.ts" />
/// <reference path="shapes.ts" />
/// <reference path="colors.ts" />
/// <reference path="smallShape.ts" />
class Game {
    constructor(rootElement) {
        this.n = 10;
        this.blockSlotStart = 10;
        this.blockSlotWidth = 50;
        this.blockSlotGap = 50;
        this.blockHeight = 310;
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
    addShape(color, slot, positions = randomShape()) {
        let x = this.blockSlotStart + slot * (this.blockSlotWidth + this.blockSlotGap);
        let shapePosition = new CoordinatePair(x, this.blockHeight);
        let smallShapeConfig = {
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
    handleSmallShapeClick(smallShape) {
        let position = smallShape.position;
        let figure = smallShape.figure;
        let color = smallShape.color;
        this.rootScene.element.removeChild(smallShape.element);
        let shapeConfig = {
            index: smallShape.index,
            rootScene: this.rootScene,
            position: position,
            figure: figure,
            color: color,
            dropCallback: this.shapeDropped
        };
        let shape = new Shape(shapeConfig);
    }
    shapeDropped(shape, cells) {
        if (cells.length == 0) {
            this.addShape(shape.color, shape.index, shape.figure.data);
            shape.remove();
            return;
        }
        // Change color of occupied cells to brown
        for (let cell of cells) {
            cell.setOccupied(true, shape.color);
        }
        const grid = this.rootScene.grid;
        let newShape = this.addShape(getRandomUnconstrainedColor(), shape.index); // Add another shape after one is dropped
        shape.remove();
        let cellsToClear = [];
        cellsToClear = grid.getCompleteRowCells();
        cellsToClear = cellsToClear.concat(grid.getCompleteColumnCells());
        grid.clearCells(cellsToClear);
        let fitPositions = this.checkForFitCoordinates(newShape);
        if (fitPositions.length == 0) {
            setTimeout(() => {
                alert("Game Over!");
            }, 1000);
        }
    }
    checkForFitCoordinates(shape) {
        let validPositions = [];
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
/// <reference path="util.ts" />
/// <reference path="cell.ts" />
/// <reference path="grid.ts" />
/// <reference path="rootScene.ts" />
/// <reference path="shape.ts" />
/// <reference path="shapes.ts" />
/// <reference path="game.ts" />
let rootElement = document.getElementById("game-container");
if (!rootElement) {
    throw new Error("Failed to find the game container element");
}
let game = new Game(rootElement);
