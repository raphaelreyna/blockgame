/// <reference path="util.ts" />
/// <reference path="cell.ts" />

class Grid {
    element: HTMLDivElement = document.createElement("div");
    cells: Cell[];
    cellSize: number;
    constructor(public n: number, public size: number) {
        this.cellSize = size / n;
        console.log(`Cell size: ${this.cellSize}`);
        this.element.style.backgroundColor = "lightgrey";
        this.element.style.width = `${size}px`;
        this.element.style.height = `${size}px`;

        this.cells = [];
        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                let cell = document.createElement("div");
                cell.style.position = "absolute";
                cell.style.width = `${this.cellSize}px`;
                cell.style.height = `${this.cellSize}px`;
                cell.style.left = `${(c * this.cellSize)}px`;
                cell.style.top = `${(r * this.cellSize)}px`;
                cell.style.border = "1px solid rgba(0,0,0,0.1)";
                let cellObj = new Cell(r, c);
                cellObj.element = cell;
                this.cells.push(cellObj);
                this.element.appendChild(cell);
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

    toGridCoordinates(x: number, y: number): { row: number; col: number } {
        let col = x / this.size;
        col = col * this.n;
        col = Math.round(col);
        let row = y / this.size;
        row = row * this.n;
        row = Math.round(row);
        return { row, col };
    }

    toWorldCoordinates(row: number, col: number): { x: number; y: number } {
        let x = (col / this.n);
        x = x * this.size;
        let y = (row / this.n);
        y = y * this.size;
        return { x, y };
    }

    getCell(row: number, col: number): Cell | null {
        if (row < 0 || row >= this.n || col < 0 || col >= this.n) {
            return null;
        }
        return this.cells[row * this.n + col];
    }
}