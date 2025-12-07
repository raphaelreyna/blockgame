type CellConfig = {
    row: number;
    col: number;
    size: number;
};

class Cell {
    neighbors: Map<string, Cell> = new Map();
    occupied: boolean = false;
    element: HTMLDivElement;
    row: number;
    col: number;
    constructor(config: CellConfig) {
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

    addNeighbor(direction: string, cell: Cell) {
        this.neighbors.set(direction, cell);
        let neighbotDirection: string;
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

    setOccupied(occupied: boolean, color: string = "") {
        this.occupied = occupied;
        if (occupied) {
            this.element?.classList.add("occupied-grid-cell");
            if (color) {
                this.element.style.backgroundColor = color;
            }
        } else {
            this.element?.classList.remove("occupied-grid-cell");
            this.element.style.backgroundColor = "";
        }
    }

    setDropHighlighted(highlighted: boolean) {
        if (highlighted) {
            this.element?.classList.add("drop-highlighted-grid-cell");
        } else {
            this.element?.classList.remove("drop-highlighted-grid-cell");
        }
    }
}