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

type BlockSetDefinition = {
    id: string;
    name: string;
    description: string;
    shapes: ShapeDefinition[];
};

type BlockSetSummary = {
    id: string;
    name: string;
    description: string;
    shapes: CoordinatePair[][];
    previewShapes: CoordinatePair[][];
};

const DEFAULT_BLOCK_SET_ID = "classic";

const CLASSIC_SHAPE_DEFINITIONS: ShapeDefinition[] = [
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
        ],
        rotationOptions: { angles: [0] }
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
    },
    {
        coordinates: [
            new CoordinatePair(0, 0),
            new CoordinatePair(1, 0),
            new CoordinatePair(1, 1),
            new CoordinatePair(2, 1)
        ]
    }
];

const BLOCK_SET_DEFINITIONS: BlockSetDefinition[] = [
    {
        id: "classic",
        name: "Classic",
        description: "Balanced starter pieces that keep the board approachable.",
        shapes: CLASSIC_SHAPE_DEFINITIONS
    },
    {
        id: "expanded",
        name: "Expanded",
        description: "Adds a chunky 3x3 block for big clears (and bigger jams).",
        shapes: [
            ...CLASSIC_SHAPE_DEFINITIONS,
            {
                coordinates: [
                    new CoordinatePair(0, 0),
                    new CoordinatePair(1, 0),
                    new CoordinatePair(2, 0),
                    new CoordinatePair(0, 1),
                    new CoordinatePair(1, 1),
                    new CoordinatePair(2, 1),
                    new CoordinatePair(0, 2),
                    new CoordinatePair(1, 2),
                    new CoordinatePair(2, 2)
                ],
                rotationOptions: { angles: [0] }
            }
        ]
    }
];

const BLOCK_SETS = BLOCK_SET_DEFINITIONS.map(definition => ({
    id: definition.id,
    name: definition.name,
    description: definition.description,
    shapes: buildShapeRoster(definition.shapes),
    previewShapes: buildPreviewShapes(definition.shapes)
}));

function buildShapeRoster(definitions: ShapeDefinition[]): CoordinatePair[][] {
    const roster: CoordinatePair[][] = [];
    for (const definition of definitions) {
        const variants = generateRotations(definition.coordinates, definition.rotationOptions);
        roster.push(...variants.map(cloneShape));
    }
    return roster;
}

function buildPreviewShapes(definitions: ShapeDefinition[]): CoordinatePair[][] {
    return definitions.map(definition => cloneShape(definition.coordinates));
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

function getBlockSets(): BlockSetSummary[] {
    return BLOCK_SETS.map(set => ({
        id: set.id,
        name: set.name,
        description: set.description,
        shapes: set.shapes.map(cloneShape),
        previewShapes: set.previewShapes.map(cloneShape)
    }));
}

function getDefaultBlockSetId(): string {
    return DEFAULT_BLOCK_SET_ID;
}

function getBlockSetRoster(blockSetId: string): CoordinatePair[][] {
    const blockSet = resolveBlockSet(blockSetId);
    return blockSet.shapes.map(cloneShape);
}

function getBlockSet(blockSetId: string): BlockSetSummary {
    const blockSet = resolveBlockSet(blockSetId);
    return {
        id: blockSet.id,
        name: blockSet.name,
        description: blockSet.description,
        shapes: blockSet.shapes.map(cloneShape),
        previewShapes: blockSet.previewShapes.map(cloneShape)
    };
}

function getRandomShapeForBlockSet(blockSetId: string): CoordinatePair[] {
    const blockSet = resolveBlockSet(blockSetId);
    const randomIndex = Math.floor(Math.random() * blockSet.shapes.length);
    return cloneShape(blockSet.shapes[randomIndex]);
}

function randomShape(): CoordinatePair[] {
    return getRandomShapeForBlockSet(DEFAULT_BLOCK_SET_ID);
}

function resolveBlockSet(blockSetId: string) {
    const fallback = BLOCK_SETS.find(set => set.id === DEFAULT_BLOCK_SET_ID)!;
    if (!blockSetId) {
        return fallback;
    }
    const match = BLOCK_SETS.find(set => set.id === blockSetId);
    return match ?? fallback;
}