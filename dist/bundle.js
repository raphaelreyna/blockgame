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
    const colorNumber = Math.floor(Math.random() * 16777215);
    const paddedHex = ("000000" + colorNumber.toString(16)).slice(-6);
    return `#${paddedHex}`;
}
/// <reference path="cell.ts" />
class EffectsLayer {
    constructor(parent) {
        this.particles = [];
        this.animationFrame = null;
        this.lastTimestamp = 0;
        this.resizeObserver = null;
        this.loop = (timestamp) => {
            if (this.animationFrame === null) {
                return;
            }
            if (this.lastTimestamp === 0) {
                this.lastTimestamp = timestamp;
            }
            const delta = (timestamp - this.lastTimestamp) / 1000;
            this.lastTimestamp = timestamp;
            this.resizeCanvas();
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            const alive = [];
            for (let particle of this.particles) {
                particle.life -= delta;
                if (particle.life <= 0) {
                    continue;
                }
                particle.vy += 120 * delta;
                particle.x += particle.vx * delta;
                particle.y += particle.vy * delta;
                particle.rotation += particle.spin * delta;
                alive.push(particle);
                const alpha = Math.max(0, particle.life / particle.maxLife);
                const size = particle.size * alpha;
                if (size <= 0) {
                    continue;
                }
                this.ctx.save();
                this.ctx.translate(particle.x, particle.y);
                this.ctx.rotate(particle.rotation);
                this.ctx.fillStyle = `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${alpha})`;
                this.drawSparkle(size);
                this.ctx.restore();
            }
            this.particles = alive;
            if (this.particles.length === 0) {
                this.animationFrame = null;
                this.lastTimestamp = 0;
                return;
            }
            this.animationFrame = requestAnimationFrame(this.loop);
        };
        this.parent = parent;
        this.canvas = document.createElement("canvas");
        this.canvas.classList.add("effects-canvas");
        this.canvas.style.position = "absolute";
        this.canvas.style.left = "0";
        this.canvas.style.top = "0";
        this.canvas.style.pointerEvents = "none";
        this.canvas.style.zIndex = "5";
        const context = this.canvas.getContext("2d");
        if (!context) {
            throw new Error("Failed to initialize effects overlay");
        }
        this.ctx = context;
        this.parent.appendChild(this.canvas);
        this.resizeCanvas();
        if (typeof ResizeObserver !== "undefined") {
            this.resizeObserver = new ResizeObserver(() => this.resizeCanvas());
            this.resizeObserver.observe(this.parent);
        }
    }
    refreshSize() {
        this.resizeCanvas();
    }
    dispose() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        if (this.animationFrame !== null) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        this.particles = [];
        this.canvas.remove();
    }
    emitSparkles(cells) {
        if (cells.length === 0) {
            return;
        }
        const containerRect = this.parent.getBoundingClientRect();
        for (let cell of cells) {
            if (!cell.element)
                continue;
            const rect = cell.element.getBoundingClientRect();
            const centerX = rect.left - containerRect.left + rect.width / 2;
            const centerY = rect.top - containerRect.top + rect.height / 2;
            const rgb = this.parseColor(cell.element.style.backgroundColor);
            this.spawnBurst(centerX, centerY, rgb);
        }
        this.startLoop();
    }
    resizeCanvas() {
        const rect = this.parent.getBoundingClientRect();
        const width = Math.max(1, Math.floor(rect.width));
        const height = Math.max(1, Math.floor(rect.height));
        if (this.canvas.width === width && this.canvas.height === height) {
            return;
        }
        this.canvas.width = width;
        this.canvas.height = height;
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
    }
    startLoop() {
        if (this.animationFrame !== null) {
            return;
        }
        this.animationFrame = requestAnimationFrame(this.loop);
    }
    drawSparkle(size) {
        this.ctx.beginPath();
        this.ctx.moveTo(0, -size);
        this.ctx.lineTo(size * 0.4, 0);
        this.ctx.lineTo(0, size);
        this.ctx.lineTo(-size * 0.4, 0);
        this.ctx.closePath();
        this.ctx.fill();
    }
    spawnBurst(x, y, color) {
        const particleCount = 12;
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 80 + Math.random() * 120;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            const life = 0.5 + Math.random() * 0.4;
            const particle = {
                x,
                y,
                vx,
                vy,
                life,
                maxLife: life,
                size: 6 + Math.random() * 6,
                rotation: Math.random() * Math.PI,
                spin: (Math.random() - 0.5) * 6,
                color: color,
            };
            this.particles.push(particle);
        }
    }
    parseColor(value) {
        if (!value) {
            return { r: 255, g: 255, b: 255 };
        }
        if (value.startsWith("#")) {
            const hex = value.substring(1);
            if (hex.length === 3) {
                const r = parseInt(hex[0] + hex[0], 16);
                const g = parseInt(hex[1] + hex[1], 16);
                const b = parseInt(hex[2] + hex[2], 16);
                return { r, g, b };
            }
            if (hex.length === 6) {
                const r = parseInt(hex.substring(0, 2), 16);
                const g = parseInt(hex.substring(2, 4), 16);
                const b = parseInt(hex.substring(4, 6), 16);
                return { r, g, b };
            }
        }
        const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
        if (match) {
            return {
                r: parseInt(match[1], 10),
                g: parseInt(match[2], 10),
                b: parseInt(match[3], 10)
            };
        }
        return { r: 255, g: 255, b: 255 };
    }
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
        this.element.style.touchAction = "none";
        this.element.style.userSelect = "none";
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
/// <reference path="effects.ts" />
class RootScene {
    constructor(rootElement, n) {
        let width = rootElement.clientWidth;
        let height = rootElement.clientHeight;
        let gridSize = Math.min(width, height);
        this.grid = new Grid(n, gridSize);
        this.element = rootElement;
        this.element.appendChild(this.grid.element);
        this.effectsLayer = new EffectsLayer(this.element);
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
        this.activePointerId = null;
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
    onPointerDown(event) {
        event.preventDefault();
        if (!this.element || this.activePointerId !== null)
            return;
        this.activePointerId = event.pointerId;
        let rect = this.element.getBoundingClientRect();
        this.offsetX = event.clientX - rect.left;
        this.offsetY = event.clientY - rect.top;
        try {
            this.element.setPointerCapture(this.activePointerId);
        }
        catch (err) {
            // no-op: capture may fail on older browsers
        }
    }
    onPointerUp(event) {
        if (this.activePointerId !== event.pointerId)
            return;
        event.preventDefault();
        this.releasePointerCapture();
        this.finishDrop();
    }
    onPointerCancel(event) {
        if (this.activePointerId !== event.pointerId)
            return;
        this.clearCurrentHighlight();
        this.releasePointerCapture();
        this.dropCallback(this, []);
    }
    onPointerMove(event) {
        if (this.activePointerId !== event.pointerId)
            return;
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
    releasePointerCapture() {
        if (this.activePointerId === null || !this.element) {
            return;
        }
        try {
            this.element.releasePointerCapture(this.activePointerId);
        }
        catch (err) {
            // no-op: release may fail if capture was never set
        }
        this.activePointerId = null;
    }
    finishDrop() {
        if (!this.element || !this.rootScene.grid)
            return;
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
        if (!this.element)
            return;
        let { row, col } = this.rootScene.grid.toGridCoordinates(this.element.offsetTop, this.element.offsetLeft);
        let cells = this.findCells(row, col);
        if (!cells) {
            return;
        }
        for (let cell of cells) {
            cell.setDropHighlighted(false);
        }
    }
    beginDragFromPointer(event) {
        this.onPointerDown(event);
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
    handlePointerDown(event) {
        event.preventDefault();
        this.callback(this, event);
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
/// <reference path="effects.ts" />
class Game {
    constructor(rootElement) {
        this.n = 10;
        this.blockSlotStart = 0;
        this.blockSlotWidth = 0; // slot area width
        this.blockSlotGap = 0;
        this.blockHeight = 0;
        this.blockTrayHeight = 0;
        this.cellSize = 0;
        this.shapesInPlay = [];
        this.scoreLabel = document.getElementById("scoreLabel");
        this.handleSmallShapeClick = this.handleSmallShapeClick.bind(this);
        this.shapeDropped = this.shapeDropped.bind(this);
        this.rootScene = new RootScene(rootElement, this.n);
        this.configureLayout(rootElement);
        this.addShapes();
    }
    addShapes() {
        for (let i = 0; i < 3; i++) {
            let smallShape = this.addShape(getRandomUnconstrainedColor(), i);
            this.shapesInPlay.push(smallShape);
        }
    }
    addShape(color, slot, positions = randomShape()) {
        const figure = new Figure(positions);
        const slotX = this.blockSlotStart + slot * (this.blockSlotWidth + this.blockSlotGap);
        const shapeWidth = this.cellSize * figure.width;
        const shapeHeight = this.cellSize * figure.height;
        const centeredX = slotX + (this.blockSlotWidth - shapeWidth) / 2;
        const centeredY = this.blockHeight + (this.blockTrayHeight - shapeHeight) / 2;
        let shapePosition = new CoordinatePair(centeredX, centeredY);
        let smallShapeConfig = {
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
    configureLayout(rootElement) {
        const gridSize = this.rootScene.grid.size;
        const baseCell = Math.min(64, Math.max(34, Math.round(this.rootScene.grid.cellSize * 0.9)));
        const availableWidth = rootElement.clientWidth || gridSize;
        const gapRatio = 0.5;
        const preferredMinCellSize = 18;
        const hardMinCellSize = 12;
        const computeSideMargin = (width) => Math.max(12, Math.round(Math.min(24, width * 0.05)));
        const sideMargin = computeSideMargin(availableWidth);
        const maxRowWidth = Math.min(availableWidth, Math.max(120, availableWidth - sideMargin * 2));
        const widthForSlots = Math.max(maxRowWidth, 120);
        const widthLimitedCell = Math.floor(widthForSlots / (12 + 2 * gapRatio));
        let initialCellSize = Math.min(baseCell, widthLimitedCell);
        if (initialCellSize < hardMinCellSize) {
            initialCellSize = hardMinCellSize;
        }
        const getGap = (size) => Math.max(6, Math.round(size * gapRatio));
        const getRowWidth = (size) => {
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
    handleSmallShapeClick(smallShape, sourceEvent) {
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
        shape.beginDragFromPointer(sourceEvent);
    }
    shapeDropped(shape, cells) {
        if (cells.length == 0) {
            this.addShape(shape.color, shape.index, shape.figure.data);
            shape.remove();
            return;
        }
        this.shapesInPlay = this.shapesInPlay.filter(s => s.index !== shape.index);
        for (let cell of cells) {
            cell.setOccupied(true, shape.color);
        }
        this.scoreLabel.textContent = (parseInt(this.scoreLabel.textContent) + 10).toString();
        const grid = this.rootScene.grid;
        shape.remove();
        let cellsToClear = [];
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
class ShaderBackgroundStore {
    getAll() {
        const raw = localStorage.getItem(ShaderBackgroundStore.STORAGE_KEY);
        if (!raw) {
            return [];
        }
        try {
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) {
                return [];
            }
            return parsed.filter(entry => typeof entry.id === "string" && typeof entry.name === "string" && typeof entry.fragmentSource === "string" && typeof entry.updatedAt === "number");
        }
        catch (_error) {
            return [];
        }
    }
    save(entry) {
        const existing = this.getAll();
        const index = existing.findIndex(item => item.id === entry.id);
        if (index >= 0) {
            existing[index] = entry;
        }
        else {
            existing.push(entry);
        }
        localStorage.setItem(ShaderBackgroundStore.STORAGE_KEY, JSON.stringify(existing));
        return existing;
    }
    delete(id) {
        const remaining = this.getAll().filter(entry => entry.id !== id);
        localStorage.setItem(ShaderBackgroundStore.STORAGE_KEY, JSON.stringify(remaining));
        const activeId = this.getActiveId();
        if (activeId === id) {
            this.setActiveId(null);
        }
        return remaining;
    }
    getById(id) {
        return this.getAll().find(entry => entry.id === id);
    }
    getActiveId() {
        return localStorage.getItem(ShaderBackgroundStore.ACTIVE_KEY);
    }
    setActiveId(id) {
        if (id) {
            localStorage.setItem(ShaderBackgroundStore.ACTIVE_KEY, id);
        }
        else {
            localStorage.removeItem(ShaderBackgroundStore.ACTIVE_KEY);
        }
    }
}
ShaderBackgroundStore.STORAGE_KEY = "blockgame.shaderBackgrounds";
ShaderBackgroundStore.ACTIVE_KEY = "blockgame.activeShaderBackground";
class ShaderBackgroundRenderer {
    constructor(canvasId = "shader-bg-canvas") {
        this.program = null;
        this.vertexBuffer = null;
        this.timeUniform = null;
        this.resolutionUniform = null;
        this.iResolutionUniform = null;
        this.iTimeUniform = null;
        this.iTimeDeltaUniform = null;
        this.iFrameUniform = null;
        this.iFrameRateUniform = null;
        this.iMouseUniform = null;
        this.iDateUniform = null;
        this.iChannelTimeUniforms = [];
        this.iChannelResolutionUniforms = [];
        this.startTime = 0;
        this.lastFrameTime = 0;
        this.frameCount = 0;
        this.rafId = null;
        this.supported = true;
        this.lastError = null;
        this.channelCount = 4;
        this.placeholderTextures = [];
        this.vertexSource = `attribute vec2 a_position;
varying vec2 v_uv;
void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
}`;
        const existingCanvas = document.getElementById(canvasId);
        if (existingCanvas instanceof HTMLCanvasElement) {
            this.canvas = existingCanvas;
        }
        else {
            this.canvas = document.createElement("canvas");
            this.canvas.id = canvasId;
            document.body.prepend(this.canvas);
        }
        this.gl = this.canvas.getContext("webgl");
        if (!this.gl) {
            this.supported = false;
            return;
        }
        this.vertexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        const vertices = new Float32Array([
            -1, -1,
            1, -1,
            -1, 1,
            -1, 1,
            1, -1,
            1, 1
        ]);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
        this.createPlaceholderTextures();
        window.addEventListener("resize", () => this.resizeCanvas());
        this.resizeCanvas();
    }
    isSupported() {
        return this.supported;
    }
    clearShader() {
        if (!this.gl) {
            return;
        }
        this.stopLoop();
        this.disposeProgram();
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.lastError = null;
    }
    setShader(fragmentSource) {
        var _a;
        if (!this.gl) {
            return { success: false, error: "WebGL not supported in this browser." };
        }
        this.stopLoop();
        const normalizedSource = this.normalizeFragmentSource(fragmentSource);
        const program = this.buildProgram(normalizedSource);
        if (!program) {
            return { success: false, error: (_a = this.lastError) !== null && _a !== void 0 ? _a : "Failed to compile shader." };
        }
        this.disposeProgram();
        this.program = program;
        this.gl.useProgram(program);
        const positionLocation = this.gl.getAttribLocation(program, "a_position");
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        this.gl.enableVertexAttribArray(positionLocation);
        this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);
        this.captureUniformLocations(program);
        this.startTime = performance.now();
        this.lastFrameTime = this.startTime;
        this.frameCount = 0;
        this.lastError = null;
        this.animate();
        return { success: true };
    }
    animate() {
        if (!this.gl || !this.program) {
            return;
        }
        this.resizeCanvas();
        this.rafId = requestAnimationFrame(() => this.animate());
        const frameIndex = this.frameCount;
        const now = performance.now();
        const elapsedSeconds = (now - this.startTime) / 1000;
        const deltaSeconds = frameIndex === 0 ? 0 : (now - this.lastFrameTime) / 1000;
        this.lastFrameTime = now;
        this.applyBuiltInUniforms(elapsedSeconds, deltaSeconds, frameIndex);
        this.frameCount = frameIndex + 1;
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }
    stopLoop() {
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }
    resizeCanvas() {
        if (!this.gl) {
            return;
        }
        const devicePixelRatio = window.devicePixelRatio || 1;
        const displayWidth = Math.floor(window.innerWidth * devicePixelRatio);
        const displayHeight = Math.floor(window.innerHeight * devicePixelRatio);
        if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
            this.canvas.width = displayWidth;
            this.canvas.height = displayHeight;
            this.canvas.style.width = `${window.innerWidth}px`;
            this.canvas.style.height = `${window.innerHeight}px`;
        }
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }
    buildProgram(fragmentSource) {
        var _a;
        if (!this.gl) {
            return null;
        }
        const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, this.vertexSource);
        if (!vertexShader) {
            return null;
        }
        const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, fragmentSource);
        if (!fragmentShader) {
            this.gl.deleteShader(vertexShader);
            return null;
        }
        const program = this.gl.createProgram();
        if (!program) {
            this.lastError = "Failed to create WebGL program.";
            return null;
        }
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);
        const linked = this.gl.getProgramParameter(program, this.gl.LINK_STATUS);
        if (!linked) {
            this.lastError = (_a = this.gl.getProgramInfoLog(program)) !== null && _a !== void 0 ? _a : "Failed to link shader program.";
            this.gl.deleteProgram(program);
            this.gl.deleteShader(vertexShader);
            this.gl.deleteShader(fragmentShader);
            return null;
        }
        this.gl.deleteShader(vertexShader);
        this.gl.deleteShader(fragmentShader);
        return program;
    }
    compileShader(type, source) {
        var _a;
        if (!this.gl) {
            return null;
        }
        const shader = this.gl.createShader(type);
        if (!shader) {
            this.lastError = "Unable to create WebGL shader.";
            return null;
        }
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        const compiled = this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS);
        if (!compiled) {
            this.lastError = (_a = this.gl.getShaderInfoLog(shader)) !== null && _a !== void 0 ? _a : "Shader compilation failed.";
            this.gl.deleteShader(shader);
            return null;
        }
        return shader;
    }
    normalizeFragmentSource(source) {
        let body = source.trim();
        const header = this.buildPrecisionHeader(body);
        body = this.ensureMainWrapper(body);
        const uniformPrelude = this.buildUniformPrelude(body);
        return [header, uniformPrelude, body].filter(section => section.length > 0).join("\n");
    }
    buildPrecisionHeader(source) {
        if (/precision\s+(lowp|mediump|highp)\s+float/.test(source)) {
            return "";
        }
        return `#ifdef GL_ES
precision mediump float;
precision highp int;
#endif`;
    }
    buildUniformPrelude(source) {
        const declarations = [
            { name: "iResolution", pattern: /uniform\s+vec\d\s+iResolution\b/, snippet: "uniform vec3 iResolution;" },
            { name: "iTime", pattern: /uniform\s+float\s+iTime\b/, snippet: "uniform float iTime;" },
            { name: "iTimeDelta", pattern: /uniform\s+float\s+iTimeDelta\b/, snippet: "uniform float iTimeDelta;" },
            { name: "iFrame", pattern: /uniform\s+(float|int)\s+iFrame\b/, snippet: "uniform float iFrame;" },
            { name: "iFrameRate", pattern: /uniform\s+float\s+iFrameRate\b/, snippet: "uniform float iFrameRate;" },
            { name: "iMouse", pattern: /uniform\s+vec4\s+iMouse\b/, snippet: "uniform vec4 iMouse;" },
            { name: "iDate", pattern: /uniform\s+vec4\s+iDate\b/, snippet: "uniform vec4 iDate;" },
            { name: "iChannelTime", pattern: /uniform\s+float\s+iChannelTime\s*\[/, snippet: "uniform float iChannelTime[4];" },
            { name: "iChannelResolution", pattern: /uniform\s+vec3\s+iChannelResolution\s*\[/, snippet: "uniform vec3 iChannelResolution[4];" },
            { name: "iChannel0", pattern: /uniform\s+sampler2D\s+iChannel0\b/, snippet: "uniform sampler2D iChannel0;" },
            { name: "iChannel1", pattern: /uniform\s+sampler2D\s+iChannel1\b/, snippet: "uniform sampler2D iChannel1;" },
            { name: "iChannel2", pattern: /uniform\s+sampler2D\s+iChannel2\b/, snippet: "uniform sampler2D iChannel2;" },
            { name: "iChannel3", pattern: /uniform\s+sampler2D\s+iChannel3\b/, snippet: "uniform sampler2D iChannel3;" }
        ];
        const missingSnippets = [];
        for (const declaration of declarations) {
            if (!declaration.pattern.test(source)) {
                missingSnippets.push(declaration.snippet);
            }
        }
        if (missingSnippets.length === 0) {
            return "";
        }
        return missingSnippets.join("\n");
    }
    ensureMainWrapper(source) {
        const hasMainImage = /void\s+mainImage\s*\(/.test(source);
        const hasMain = /void\s+main\s*\(/.test(source);
        if (!hasMainImage || hasMain) {
            return source;
        }
        const wrapper = `
void main() {
    vec4 color = vec4(0.0);
    mainImage(color, gl_FragCoord.xy);
    gl_FragColor = color;
}`;
        return `${source}${wrapper}`;
    }
    applyBuiltInUniforms(elapsedSeconds, deltaSeconds, frameIndex) {
        if (!this.gl) {
            return;
        }
        const width = this.canvas.width;
        const height = this.canvas.height;
        const pixelRatio = window.devicePixelRatio || 1;
        if (this.timeUniform) {
            this.gl.uniform1f(this.timeUniform, elapsedSeconds);
        }
        if (this.resolutionUniform) {
            this.gl.uniform2f(this.resolutionUniform, width, height);
        }
        if (this.iResolutionUniform) {
            this.gl.uniform3f(this.iResolutionUniform, width, height, pixelRatio);
        }
        if (this.iTimeUniform) {
            this.gl.uniform1f(this.iTimeUniform, elapsedSeconds);
        }
        if (this.iTimeDeltaUniform) {
            this.gl.uniform1f(this.iTimeDeltaUniform, deltaSeconds);
        }
        if (this.iFrameUniform) {
            this.gl.uniform1i(this.iFrameUniform, frameIndex);
        }
        if (this.iFrameRateUniform) {
            const fps = deltaSeconds > 0 ? 1 / deltaSeconds : 0;
            this.gl.uniform1f(this.iFrameRateUniform, fps);
        }
        if (this.iMouseUniform) {
            this.gl.uniform4f(this.iMouseUniform, 0, 0, 0, 0);
        }
        if (this.iDateUniform) {
            const nowDate = new Date();
            const seconds = nowDate.getSeconds() + nowDate.getMilliseconds() / 1000;
            const secondsToday = seconds + nowDate.getMinutes() * 60 + nowDate.getHours() * 3600;
            this.gl.uniform4f(this.iDateUniform, nowDate.getFullYear(), nowDate.getMonth() + 1, nowDate.getDate(), secondsToday);
        }
        for (let i = 0; i < this.channelCount; i++) {
            const timeLocation = this.iChannelTimeUniforms[i];
            if (timeLocation) {
                this.gl.uniform1f(timeLocation, 0);
            }
            const resolutionLocation = this.iChannelResolutionUniforms[i];
            if (resolutionLocation) {
                this.gl.uniform3f(resolutionLocation, 1, 1, 1);
            }
        }
    }
    captureUniformLocations(program) {
        if (!this.gl) {
            return;
        }
        this.timeUniform = this.gl.getUniformLocation(program, "u_time");
        this.resolutionUniform = this.gl.getUniformLocation(program, "u_resolution");
        this.iResolutionUniform = this.gl.getUniformLocation(program, "iResolution");
        this.iTimeUniform = this.gl.getUniformLocation(program, "iTime");
        this.iTimeDeltaUniform = this.gl.getUniformLocation(program, "iTimeDelta");
        this.iFrameUniform = this.gl.getUniformLocation(program, "iFrame");
        this.iFrameRateUniform = this.gl.getUniformLocation(program, "iFrameRate");
        this.iMouseUniform = this.gl.getUniformLocation(program, "iMouse");
        this.iDateUniform = this.gl.getUniformLocation(program, "iDate");
        this.iChannelTimeUniforms = [];
        this.iChannelResolutionUniforms = [];
        for (let i = 0; i < this.channelCount; i++) {
            this.iChannelTimeUniforms[i] = this.gl.getUniformLocation(program, `iChannelTime[${i}]`);
            this.iChannelResolutionUniforms[i] = this.gl.getUniformLocation(program, `iChannelResolution[${i}]`);
            const samplerLocation = this.gl.getUniformLocation(program, `iChannel${i}`);
            const texture = this.placeholderTextures[i];
            if (samplerLocation && texture) {
                this.gl.activeTexture(this.gl.TEXTURE0 + i);
                this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
                this.gl.uniform1i(samplerLocation, i);
            }
        }
        this.gl.activeTexture(this.gl.TEXTURE0);
    }
    disposeProgram() {
        if (this.program && this.gl) {
            this.gl.deleteProgram(this.program);
        }
        this.program = null;
    }
    createPlaceholderTextures() {
        if (!this.gl) {
            return;
        }
        const pixel = new Uint8Array([0, 0, 0, 255]);
        for (let i = 0; i < this.channelCount; i++) {
            const texture = this.gl.createTexture();
            if (!texture) {
                continue;
            }
            this.placeholderTextures[i] = texture;
            this.gl.activeTexture(this.gl.TEXTURE0 + i);
            this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, 1, 1, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixel);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        }
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
        this.gl.activeTexture(this.gl.TEXTURE0);
    }
}
class ShaderBackgroundController {
    constructor(panelElement) {
        this.renderer = null;
        this.backgrounds = [];
        this.currentId = null;
        this.statusTimer = null;
        this.panel = panelElement;
        this.listEl = this.panel.querySelector('#shader-background-list');
        this.nameEl = this.panel.querySelector('#shader-background-name');
        this.sourceEl = this.panel.querySelector('#shader-background-source');
        this.statusEl = this.panel.querySelector('#shader-background-status');
        this.saveBtn = this.panel.querySelector('#shader-background-save');
        this.deleteBtn = this.panel.querySelector('#shader-background-delete');
        this.applyBtn = this.panel.querySelector('#shader-background-apply');
        this.newBtn = this.panel.querySelector('#shader-background-new');
        this.disableBtn = this.panel.querySelector('#shader-background-disable');
        this.store = new ShaderBackgroundStore();
        this.renderer = new ShaderBackgroundRenderer();
        if (!this.renderer.isSupported()) {
            this.applyBtn.disabled = true;
            this.disableBtn.disabled = true;
            this.setStatus('WebGL is not supported in this browser. Custom shaders will not render but can still be saved.', true);
        }
        this.seedDefaultShader();
        this.refreshList();
        this.restoreActiveOrDraft();
        this.registerEvents();
    }
    registerEvents() {
        this.listEl.addEventListener('change', () => this.handleSelectionChange());
        this.saveBtn.addEventListener('click', (event) => {
            event.preventDefault();
            this.handleSave();
        });
        this.newBtn.addEventListener('click', (event) => {
            event.preventDefault();
            this.prepareNewBackground();
        });
        this.applyBtn.addEventListener('click', (event) => {
            event.preventDefault();
            this.handleApply();
        });
        this.deleteBtn.addEventListener('click', (event) => {
            event.preventDefault();
            this.handleDelete();
        });
        this.disableBtn.addEventListener('click', (event) => {
            event.preventDefault();
            this.disableShader();
        });
    }
    seedDefaultShader() {
        const existing = this.store.getAll();
        if (existing.length > 0) {
            return;
        }
        const demo = {
            id: ShaderBackgroundController.createId(),
            name: 'Aurora Drift',
            fragmentSource: ShaderBackgroundController.getSampleFragment(),
            updatedAt: Date.now()
        };
        this.store.save(demo);
    }
    refreshList(selectedId) {
        var _a;
        this.backgrounds = this.store.getAll().sort((a, b) => b.updatedAt - a.updatedAt);
        this.listEl.innerHTML = '';
        const newOption = document.createElement('option');
        newOption.value = ShaderBackgroundController.NEW_OPTION_VALUE;
        newOption.textContent = '+ New Shader';
        this.listEl.appendChild(newOption);
        for (const background of this.backgrounds) {
            const option = document.createElement('option');
            option.value = background.id;
            option.textContent = `${background.name}`;
            this.listEl.appendChild(option);
        }
        const valueToSelect = (_a = selectedId !== null && selectedId !== void 0 ? selectedId : this.currentId) !== null && _a !== void 0 ? _a : ShaderBackgroundController.NEW_OPTION_VALUE;
        this.listEl.value = valueToSelect;
        this.deleteBtn.disabled = this.currentId === null;
    }
    restoreActiveOrDraft() {
        var _a;
        const activeId = this.store.getActiveId();
        if (activeId) {
            const active = this.backgrounds.find(entry => entry.id === activeId);
            if (active) {
                this.loadBackground(active);
                if (this.renderer && this.renderer.isSupported()) {
                    const result = this.renderer.setShader(active.fragmentSource);
                    if (result.success) {
                        document.body.classList.add('shader-bg-active');
                        return;
                    }
                    this.setStatus((_a = result.error) !== null && _a !== void 0 ? _a : 'Failed to load saved shader. Please update it.', true);
                    this.store.setActiveId(null);
                }
            }
        }
        if (this.backgrounds.length > 0) {
            this.loadBackground(this.backgrounds[0]);
        }
        else {
            this.prepareNewBackground();
        }
    }
    handleSelectionChange() {
        if (this.listEl.value === ShaderBackgroundController.NEW_OPTION_VALUE) {
            this.prepareNewBackground();
            return;
        }
        const selected = this.backgrounds.find(entry => entry.id === this.listEl.value);
        if (selected) {
            this.loadBackground(selected);
        }
    }
    loadBackground(background) {
        this.currentId = background.id;
        this.nameEl.value = background.name;
        this.sourceEl.value = background.fragmentSource;
        this.deleteBtn.disabled = false;
        this.listEl.value = background.id;
    }
    prepareNewBackground() {
        this.currentId = null;
        this.nameEl.value = 'New Shader';
        this.sourceEl.value = ShaderBackgroundController.getSampleFragment();
        this.listEl.value = ShaderBackgroundController.NEW_OPTION_VALUE;
        this.deleteBtn.disabled = true;
    }
    handleSave() {
        const entry = this.persistCurrentBackground();
        if (entry) {
            this.setStatus(`Saved "${entry.name}".`);
        }
    }
    handleApply() {
        var _a;
        if (!this.renderer || !this.renderer.isSupported()) {
            this.setStatus('WebGL is not available in this browser.', true);
            return;
        }
        const entry = this.persistCurrentBackground();
        if (!entry) {
            return;
        }
        const result = this.renderer.setShader(entry.fragmentSource);
        if (!result.success) {
            document.body.classList.remove('shader-bg-active');
            this.store.setActiveId(null);
            this.setStatus((_a = result.error) !== null && _a !== void 0 ? _a : 'Shader failed to compile.', true);
            return;
        }
        document.body.classList.add('shader-bg-active');
        this.store.setActiveId(entry.id);
        this.setStatus(`Activated "${entry.name}".`);
    }
    handleDelete() {
        var _a;
        if (!this.currentId) {
            this.setStatus('No saved background selected.', true);
            return;
        }
        if (!confirm('Delete this background? This cannot be undone.')) {
            return;
        }
        const deletedId = this.currentId;
        const wasActive = this.store.getActiveId() === deletedId;
        this.store.delete(deletedId);
        if (wasActive) {
            document.body.classList.remove('shader-bg-active');
            (_a = this.renderer) === null || _a === void 0 ? void 0 : _a.clearShader();
            this.store.setActiveId(null);
        }
        this.currentId = null;
        this.refreshList();
        this.prepareNewBackground();
        this.setStatus('Background deleted.');
    }
    disableShader() {
        var _a;
        document.body.classList.remove('shader-bg-active');
        (_a = this.renderer) === null || _a === void 0 ? void 0 : _a.clearShader();
        this.store.setActiveId(null);
        this.setStatus('Custom shader disabled.');
    }
    persistCurrentBackground() {
        var _a;
        const fragmentSource = this.sourceEl.value.trim();
        if (!fragmentSource) {
            this.setStatus('Shader source cannot be empty.', true);
            return null;
        }
        const name = this.nameEl.value.trim() || 'Untitled Shader';
        const entry = {
            id: (_a = this.currentId) !== null && _a !== void 0 ? _a : ShaderBackgroundController.createId(),
            name,
            fragmentSource,
            updatedAt: Date.now()
        };
        this.store.save(entry);
        this.currentId = entry.id;
        this.refreshList(entry.id);
        this.deleteBtn.disabled = false;
        return entry;
    }
    setStatus(message, isError = false) {
        this.statusEl.textContent = message;
        this.statusEl.classList.toggle('is-error', isError);
        if (this.statusTimer !== null) {
            window.clearTimeout(this.statusTimer);
        }
        this.statusTimer = window.setTimeout(() => {
            this.statusEl.textContent = '';
            this.statusTimer = null;
        }, isError ? 6000 : 3500);
    }
    static createId() {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }
        return `shader-${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 8)}`;
    }
    static getSampleFragment() {
        return `precision mediump float;
            uniform vec3 iResolution;
            uniform float iTime;
            varying vec2 v_uv;

            vec3 palette(float t) {
                return vec3(0.5 + 0.5 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + t)));
            }

            void main() {
                vec2 uv = (gl_FragCoord.xy / iResolution.xy) - 0.5;
                float len = length(uv);
                float waves = sin(uv.x * 4.0 + iTime * 0.6) + cos(uv.y * 4.0 - iTime * 0.4);
                float glow = exp(-6.0 * len) * 0.85;
                vec3 color = palette(waves * 0.15 + glow);
                gl_FragColor = vec4(color, 1.0);
            }`;
    }
}
ShaderBackgroundController.NEW_OPTION_VALUE = "__new";
/// <reference path="util.ts" />
/// <reference path="cell.ts" />
/// <reference path="grid.ts" />
/// <reference path="rootScene.ts" />
/// <reference path="shape.ts" />
/// <reference path="shapes.ts" />
/// <reference path="game.ts" />
/// <reference path="shaderBackground.ts" />
const rootElement = document.getElementById("game-container");
if (!(rootElement instanceof HTMLElement)) {
    throw new Error("Failed to find the game container element");
}
let game = new Game(rootElement);
const shaderPanel = document.getElementById("shader-panel");
if (shaderPanel instanceof HTMLElement) {
    new ShaderBackgroundController(shaderPanel);
}
const settingsDrawer = document.getElementById("settings-drawer");
const settingsOverlay = document.getElementById("settings-overlay");
const openSettingsButton = document.getElementById("open-settings");
const closeSettingsButton = document.getElementById("close-settings");
let lastFocusedElement = null;
let isScrollLocked = false;
let lockedScrollY = 0;
let layoutRefreshTimer = null;
const refreshGameLayout = () => {
    game.configureLayout(rootElement);
};
const scheduleLayoutRefresh = (delay = 120) => {
    if (layoutRefreshTimer !== null) {
        window.clearTimeout(layoutRefreshTimer);
    }
    layoutRefreshTimer = window.setTimeout(() => {
        refreshGameLayout();
        layoutRefreshTimer = null;
    }, delay);
};
const lockBodyScroll = () => {
    if (isScrollLocked) {
        return;
    }
    lockedScrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${lockedScrollY}px`;
    document.body.style.width = "100%";
    isScrollLocked = true;
};
const unlockBodyScroll = () => {
    if (!isScrollLocked) {
        return;
    }
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.width = "";
    window.scrollTo(0, lockedScrollY);
    isScrollLocked = false;
};
const setSettingsDrawerState = (shouldOpen) => {
    if (!settingsDrawer || !settingsOverlay) {
        return;
    }
    const body = document.body;
    const isOpen = body.classList.contains("settings-open");
    if (shouldOpen && isOpen) {
        return;
    }
    if (!shouldOpen && !isOpen) {
        return;
    }
    if (shouldOpen) {
        lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        body.classList.add("settings-open");
        lockBodyScroll();
        settingsDrawer.setAttribute("aria-hidden", "false");
        settingsOverlay.setAttribute("aria-hidden", "false");
        const targetFocus = closeSettingsButton !== null && closeSettingsButton !== void 0 ? closeSettingsButton : settingsDrawer.querySelector("button");
        targetFocus === null || targetFocus === void 0 ? void 0 : targetFocus.focus();
        scheduleLayoutRefresh(240);
        return;
    }
    body.classList.remove("settings-open");
    unlockBodyScroll();
    settingsDrawer.setAttribute("aria-hidden", "true");
    settingsOverlay.setAttribute("aria-hidden", "true");
    lastFocusedElement === null || lastFocusedElement === void 0 ? void 0 : lastFocusedElement.focus();
    scheduleLayoutRefresh(320);
};
openSettingsButton === null || openSettingsButton === void 0 ? void 0 : openSettingsButton.addEventListener("click", () => setSettingsDrawerState(true));
closeSettingsButton === null || closeSettingsButton === void 0 ? void 0 : closeSettingsButton.addEventListener("click", () => setSettingsDrawerState(false));
settingsOverlay === null || settingsOverlay === void 0 ? void 0 : settingsOverlay.addEventListener("click", () => setSettingsDrawerState(false));
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        setSettingsDrawerState(false);
    }
});
window.addEventListener("resize", () => scheduleLayoutRefresh());
