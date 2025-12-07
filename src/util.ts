class CoordinatePair {
    constructor(public x: number, public y: number) {
        this.x = x;
        this.y = y;
    }
}

class Figure {
    data: CoordinatePair[];
    width: number = 0;
    height: number = 0;
    maxX: number = 0;
    maxY: number = 0;
    minX: number = 0;
    minY: number = 0;
    constructor(data: CoordinatePair[]) {
        this.data = data;

        let minX: number = 1000000;
        let minY: number = 1000000;
        let maxX: number = -1;
        let maxY: number = -1;
        for (let p of this.data) {
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.x < minX) minX = p.x;
            if (p.y > maxY) maxY = p.y;
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
    toGameNodes(
        size: number,
        n: number,
        cellSize: number,
        offset: CoordinatePair = new CoordinatePair(0, 0),
        modifier: (node: GameNode) => void = (node) => { }
    ): GameNode[] {
        let nodes: GameNode[] = [];
        for (let p of this.data) {
            let yy = p.y + offset.y;
            let xx = p.x + offset.x;
            if (yy >= size || xx >= size) {
                throw new Error("invalid figure and offset combination");
            }
            let worldCoords = gridToWorldCoordinates(n, size, yy, xx);
            let rect: Rect = { x: worldCoords.x, y: worldCoords.y, width: cellSize, height: cellSize };
            let gameNode = new GameNode(rect);
            if (modifier) modifier(gameNode);
            nodes.push(gameNode);
        }
        return nodes;
    }
}

function gridToWorldCoordinates(n: number, size: number, row: number, col: number): CoordinatePair {
    let x = col / n;
    x = x * size;
    let y = row / n;
    y = y * size;
    return new CoordinatePair(x, y);
}

type Rect = { x: number, y: number, width: number, height: number };

class GameNode {
    element: HTMLElement;
    position: CoordinatePair;
    width: number;
    height: number;
    constructor(rect: Rect) {
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

    appendChild(child: HTMLElement) {
        this.element.appendChild(child);
    }
    
    removeChild(child: HTMLElement) {
        this.element.removeChild(child);
    }

    addToParent(parent: HTMLElement) {
        parent.appendChild(this.element);
    }
    
    remove() {
        this.element.remove();
    }
}