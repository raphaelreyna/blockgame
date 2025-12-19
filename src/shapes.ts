/// <reference path="util.ts" />

type ShapeDefinition = {
    coordinates: CoordinatePair[];
    rotationOptions?: RotationOptions;
};

type RotationOptions = {
    /**
     * Optional list of clockwise angles (degrees) a shape should expose.
     * Keeping this configurable means user-defined shapes can opt-out of
     * particular orientations in the future without changing the generator.
     */
    angles?: ReadonlyArray<number>;
};

const SHAPE_DEFINITIONS: ShapeDefinition[] = [
    {
        coordinates: [new CoordinatePair(0, 0)]
    },
    {
        coordinates: [
            new CoordinatePair(0, 0),
            new CoordinatePair(0, 1)
        ]
    },
    {
        coordinates: [
            new CoordinatePair(0, 0),
            new CoordinatePair(0, 1),
            new CoordinatePair(0, 2)
        ]
    },
    {
        coordinates: [
            new CoordinatePair(0, 0),
            new CoordinatePair(0, 1),
            new CoordinatePair(0, 2),
            new CoordinatePair(0, 3)
        ]
    },
    {
        coordinates: [
            new CoordinatePair(0, 0),
            new CoordinatePair(0, 1),
            new CoordinatePair(1, 0),
            new CoordinatePair(1, 1)
        ]
    },
    {
        coordinates: [
            new CoordinatePair(0, 0),
            new CoordinatePair(0, 1),
            new CoordinatePair(1, 1)
        ]
    },
    {
        coordinates: [
            new CoordinatePair(0, 0),
            new CoordinatePair(0, 1),
            new CoordinatePair(1, 1),
            new CoordinatePair(2, 1)
        ]
    },
    {
        coordinates: [
            new CoordinatePair(0, 0),
            new CoordinatePair(0, 1),
            new CoordinatePair(0, 2),
            new CoordinatePair(1, 2)
        ]
    },
    {
        coordinates: [
            new CoordinatePair(0, 1),
            new CoordinatePair(1, 1),
            new CoordinatePair(2, 1),
            new CoordinatePair(1, 0)
        ]
    }
];

const SHAPES: CoordinatePair[][] = buildShapeRoster(SHAPE_DEFINITIONS);

function buildShapeRoster(definitions: ShapeDefinition[]): CoordinatePair[][] {
    const roster: CoordinatePair[][] = [];
    for (const definition of definitions) {
        const variants = generateRotations(definition.coordinates, definition.rotationOptions);
        roster.push(...variants.map(cloneShape));
    }
    return roster;
}

function generateRotations(points: CoordinatePair[], options?: RotationOptions): CoordinatePair[][] {
    const normalizedAngles = normalizeAngles(options?.angles);
    const variants: CoordinatePair[][] = [];
    const seen = new Set<string>();
    for (const turns of normalizedAngles) {
        let rotated = normalizeShape(points);
        for (let i = 0; i < turns; i++) {
            rotated = rotateQuarterTurn(rotated);
        }
        rotated = normalizeShape(rotated);
        const key = canonicalKey(rotated);
        if (!seen.has(key)) {
            variants.push(rotated);
            seen.add(key);
        }
    }
    return variants;
}

function normalizeAngles(angles?: ReadonlyArray<number>): number[] {
    const defaultAngles: number[] = [0, 90, 180, 270];
    const source = angles && angles.length > 0 ? angles : defaultAngles;
    const normalized = source
        .map(angle => ((angle % 360) + 360) % 360)
        .filter(angle => angle % 90 === 0)
        .map(angle => (angle / 90) | 0);
    const unique = Array.from(new Set(normalized));
    return unique.length > 0 ? unique : [0];
}

function rotateQuarterTurn(points: CoordinatePair[]): CoordinatePair[] {
    const width = Math.max(...points.map(point => point.x)) + 1;
    return points.map(point => new CoordinatePair(point.y, width - 1 - point.x));
}

function normalizeShape(points: CoordinatePair[]): CoordinatePair[] {
    let minX = Infinity;
    let minY = Infinity;
    for (const point of points) {
        if (point.x < minX) {
            minX = point.x;
        }
        if (point.y < minY) {
            minY = point.y;
        }
    }
    return points.map(point => new CoordinatePair(point.x - minX, point.y - minY));
}

function canonicalKey(points: CoordinatePair[]): string {
    const sorted = [...points].sort((a, b) => (a.y - b.y) || (a.x - b.x));
    return sorted.map(point => `${point.x},${point.y}`).join(";");
}

function cloneShape(points: CoordinatePair[]): CoordinatePair[] {
    return points.map(point => new CoordinatePair(point.x, point.y));
}

function randomShape(): CoordinatePair[] {
    const randomIndex = Math.floor(Math.random() * SHAPES.length);
    return cloneShape(SHAPES[randomIndex]);
}