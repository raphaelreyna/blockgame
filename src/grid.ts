/// <reference path="util.ts" />
/// <reference path="cell.ts" />

class Grid {
    element: HTMLDivElement = document.createElement("div");
    cells: Cell[];
    cellSize: number;
    constructor(public n: number, public size: number) {
        this.cellSize = size / n;
        this.element.classList.add("grid");
        this.element.style.width = `${size}px`;
        this.element.style.height = `${size}px`;

        this.cells = [];
        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                const cellConfig: CellConfig = {
                    row: r,
                    col: c,
                    size: this.cellSize,
                }
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

    getRowCellsIfComplete(row: number): Cell[] {
        let cells: Cell[] = [];
        for (let c = 0; c < this.n; c++) {
            let cell = this.getCell(row, c);
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
            let cell = this.getCell(r, col);
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
                cell.setOccupied(false);
            }
        }
    }

    findFigureIntersection(figure: Figure, position: CoordinatePair): Cell[] | null {
        let cells: Cell[] = [];
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