class Cell {
    neighbors: Map<string, Cell> = new Map();
    occupied: boolean = false;
    element: HTMLDivElement | null = null;
    constructor(public row: number, public col: number) {
        this.row = row;
        this.col = col;
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
}