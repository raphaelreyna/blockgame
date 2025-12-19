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

type SerializedCoordinate = { x: number; y: number };

type CustomBlockSetShapeRecord = {
	id: string;
	label: string;
	blueprint: string;
	points: SerializedCoordinate[];
	rotationAngles: number[];
	createdAt: number;
	updatedAt: number;
};

type CustomBlockSetRecord = {
	id: string;
	name: string;
	description: string;
	shapes: CustomBlockSetShapeRecord[];
	createdAt: number;
	updatedAt: number;
};

type ParsedBlueprintResult = {
	blueprint: string;
	coordinates: CoordinatePair[];
	width: number;
	height: number;
};

type ShapeRotationDescriptor = {
	angle: number;
	coordinates: CoordinatePair[];
	key: string;
	isDuplicateOfBase: boolean;
	isRedundant: boolean;
};

type CustomShapeBuildInput = {
	label?: string;
	blueprint?: string;
	coordinates?: CoordinatePair[];
	rotationAngles?: number[];
};

const DEFAULT_BLOCK_SET_ID = "classic";
const CUSTOM_BLOCK_SET_STORAGE_KEY = "blockgame.customBlockSets";
const CUSTOM_BLOCK_SET_ID_PREFIX = "custom";
const BLUEPRINT_MAX_DIMENSION = 8;
const DEFAULT_ROTATION_ANGLES: ReadonlyArray<number> = [0, 90, 180, 270];

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

const BUILT_IN_BLOCK_SETS = BLOCK_SET_DEFINITIONS.map(definition => ({
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

function cloneBlockSetSummary(summary: BlockSetSummary): BlockSetSummary {
	return {
		id: summary.id,
		name: summary.name,
		description: summary.description,
		shapes: summary.shapes.map(cloneShape),
		previewShapes: summary.previewShapes.map(cloneShape)
	};
}

function getBuiltInBlockSetSummaries(): BlockSetSummary[] {
	return BUILT_IN_BLOCK_SETS.map(cloneBlockSetSummary);
}

function getCustomBlockSetSummaries(): BlockSetSummary[] {
	return readCustomBlockSetRecords().map(convertCustomRecordToSummary);
}

function getBlockSets(): BlockSetSummary[] {
	return [...getBuiltInBlockSetSummaries(), ...getCustomBlockSetSummaries()];
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

function resolveBlockSet(blockSetId: string): BlockSetSummary {
	const fallback = cloneBlockSetSummary(BUILT_IN_BLOCK_SETS.find(set => set.id === DEFAULT_BLOCK_SET_ID)!);
	if (!blockSetId) {
		return fallback;
	}
	const builtInMatch = BUILT_IN_BLOCK_SETS.find(set => set.id === blockSetId);
	if (builtInMatch) {
		return cloneBlockSetSummary(builtInMatch);
	}
	const customRecord = getCustomBlockSetRecordInternal(blockSetId);
	if (customRecord) {
		return convertCustomRecordToSummary(customRecord);
	}
	return fallback;
}

function getShapeDefinitionsForBlockSet(blockSetId: string): ShapeDefinition[] {
	const builtIn = BLOCK_SET_DEFINITIONS.find(def => def.id === blockSetId);
	if (builtIn) {
		return builtIn.shapes.map(def => ({
			coordinates: cloneShape(def.coordinates),
			rotationOptions: def.rotationOptions ? { angles: def.rotationOptions.angles ? [...def.rotationOptions.angles] : undefined } : undefined
		}));
	}
	const custom = getCustomBlockSetRecordInternal(blockSetId);
	if (!custom) {
		return [];
	}
	return custom.shapes.map(shape => ({
		coordinates: shape.points.map(point => new CoordinatePair(point.x, point.y)),
		rotationOptions: { angles: [...shape.rotationAngles] }
	}));
}

function convertCustomRecordToSummary(record: CustomBlockSetRecord): BlockSetSummary {
	const definitions = record.shapes.map(shape => ({
		coordinates: shape.points.map(point => new CoordinatePair(point.x, point.y)),
		rotationOptions: { angles: [...shape.rotationAngles] }
	}));
	return {
		id: record.id,
		name: record.name,
		description: record.description,
		shapes: buildShapeRoster(definitions),
		previewShapes: buildPreviewShapes(definitions)
	};
}

function listCustomBlockSets(): CustomBlockSetRecord[] {
	return readCustomBlockSetRecords().map(cloneCustomBlockSetRecord).sort((a, b) => a.name.localeCompare(b.name));
}

function getCustomBlockSetById(blockSetId: string): CustomBlockSetRecord | undefined {
	const record = getCustomBlockSetRecordInternal(blockSetId);
	return record ? cloneCustomBlockSetRecord(record) : undefined;
}

function createCustomBlockSet(name: string, description: string = ""): CustomBlockSetRecord {
	const timestamp = Date.now();
	const record: CustomBlockSetRecord = {
		id: generateCustomBlockSetId(),
		name: sanitizeBlockSetName(name),
		description: typeof description === "string" ? description.trim() : "",
		shapes: [],
		createdAt: timestamp,
		updatedAt: timestamp
	};
	const existing = readCustomBlockSetRecords();
	existing.push(record);
	writeCustomBlockSetRecords(existing);
	return cloneCustomBlockSetRecord(record);
}

function saveCustomBlockSet(record: CustomBlockSetRecord): CustomBlockSetRecord {
	const normalized = normalizeCustomBlockSetRecord(record, false);
	normalized.updatedAt = Date.now();
	const existing = readCustomBlockSetRecords();
	const index = existing.findIndex(entry => entry.id === normalized.id);
	if (index >= 0) {
		existing[index] = normalized;
	} else {
		existing.push(normalized);
	}
	writeCustomBlockSetRecords(existing);
	return cloneCustomBlockSetRecord(normalized);
}

function deleteCustomBlockSet(blockSetId: string): boolean {
	const existing = readCustomBlockSetRecords();
	const next = existing.filter(entry => entry.id !== blockSetId);
	if (next.length === existing.length) {
		return false;
	}
	writeCustomBlockSetRecords(next);
	return true;
}

function buildCustomShapeRecord(input: CustomShapeBuildInput): CustomBlockSetShapeRecord {
	if (!input.blueprint && !input.coordinates) {
		throw new Error("Shape input must include a blueprint or coordinates.");
	}
	let coordinates: CoordinatePair[];
	let blueprint: string;
	if (input.blueprint) {
		const parsed = parseShapeBlueprint(input.blueprint);
		coordinates = parsed.coordinates;
		blueprint = parsed.blueprint;
	} else {
		const normalized = normalizeShape((input.coordinates ?? []).map(point => new CoordinatePair(point.x, point.y)));
		coordinates = normalized;
		blueprint = shapeToBlueprint(normalized);
	}
	const timestamp = Date.now();
	return {
		id: generateCustomShapeId(),
		label: sanitizeShapeLabel(input.label),
		blueprint: blueprint,
		points: coordinates.map(point => ({ x: point.x, y: point.y })),
		rotationAngles: ensureRotationAngles(input.rotationAngles ?? [0]),
		createdAt: timestamp,
		updatedAt: timestamp
	};
}

function parseShapeBlueprint(blueprint: string): ParsedBlueprintResult {
	const rows = (blueprint ?? "")
		.split(/\r?\n/)
		.map(line => line.replace(/\t/g, " ").replace(/\s+$/, ""))
		.filter(line => line.trim().length > 0);
	if (rows.length === 0) {
		throw new Error("Provide at least one row of characters.");
	}
	if (rows.length > BLUEPRINT_MAX_DIMENSION) {
		throw new Error(`Blueprints are limited to ${BLUEPRINT_MAX_DIMENSION} rows.`);
	}
	const coordinates: CoordinatePair[] = [];
	let width = 0;
	rows.forEach((row, rowIndex) => {
		if (row.length > BLUEPRINT_MAX_DIMENSION) {
			throw new Error(`Each row is limited to ${BLUEPRINT_MAX_DIMENSION} characters.`);
		}
		width = Math.max(width, row.length);
		for (let col = 0; col < row.length; col++) {
			const char = row[col];
			if (isFilledBlueprintChar(char)) {
				coordinates.push(new CoordinatePair(col, rowIndex));
			}
		}
	});
	if (coordinates.length === 0) {
		throw new Error("Use #, X, or 1 to mark filled cells.");
	}
	const normalized = normalizeShape(coordinates);
	const normalizedBlueprint = shapeToBlueprint(normalized);
	return {
		blueprint: normalizedBlueprint,
		coordinates: normalized,
		width,
		height: rows.length
	};
}

function describeShapeRotations(points: CoordinatePair[]): ShapeRotationDescriptor[] {
	const normalized = normalizeShape(points);
	const seen = new Set<string>();
	const baseKey = canonicalKey(normalized);
	const descriptors: ShapeRotationDescriptor[] = [];
	for (const angle of DEFAULT_ROTATION_ANGLES) {
		let rotated = normalized;
		const turns = (angle / 90) | 0;
		for (let i = 0; i < turns; i++) {
			rotated = rotateQuarterTurn(rotated);
		}
		rotated = normalizeShape(rotated);
		const key = canonicalKey(rotated);
		const isRedundant = seen.has(key);
		descriptors.push({
			angle,
			coordinates: rotated.map(point => new CoordinatePair(point.x, point.y)),
			key,
			isDuplicateOfBase: key === baseKey && angle !== 0,
			isRedundant
		});
		if (!seen.has(key)) {
			seen.add(key);
		}
	}
	return descriptors;
}

function shapeToBlueprint(points: CoordinatePair[]): string {
	if (points.length === 0) {
		return "";
	}
	const width = Math.max(...points.map(point => point.x)) + 1;
	const height = Math.max(...points.map(point => point.y)) + 1;
	const grid: string[][] = [];
	for (let r = 0; r < height; r++) {
		grid[r] = [];
		for (let c = 0; c < width; c++) {
			grid[r][c] = ".";
		}
	}
	for (const point of points) {
		grid[point.y][point.x] = "#";
	}
	return grid.map(row => row.join("")).join("\n");
}

function ensureRotationAngles(angles: number[]): number[] {
	const normalized = angles
		.map(angle => ((angle % 360) + 360) % 360)
		.filter(angle => angle % 90 === 0);
	const unique = Array.from(new Set(normalized));
	if (!unique.includes(0)) {
		unique.unshift(0);
	}
	return unique.slice(0, DEFAULT_ROTATION_ANGLES.length);
}

function sanitizeBlockSetName(name: string): string {
	const trimmed = (name ?? "").trim();
	return trimmed.length > 0 ? trimmed : "Custom Block Set";
}

function sanitizeShapeLabel(label?: string): string {
	const trimmed = (label ?? "").trim();
	return trimmed.length > 0 ? trimmed : "Custom Shape";
}

function isFilledBlueprintChar(char: string): boolean {
	return char === "#" || char === "X" || char === "x" || char === "1" || char === "@";
}

function generateCustomBlockSetId(): string {
	if (typeof crypto !== "undefined" && crypto.randomUUID) {
		return `${CUSTOM_BLOCK_SET_ID_PREFIX}-${crypto.randomUUID()}`;
	}
	return `${CUSTOM_BLOCK_SET_ID_PREFIX}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000000)}`;
}

function generateCustomShapeId(): string {
	return `shape-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000000)}`;
}

function cloneCustomBlockSetRecord(record: CustomBlockSetRecord): CustomBlockSetRecord {
	return {
		id: record.id,
		name: record.name,
		description: record.description,
		createdAt: record.createdAt,
		updatedAt: record.updatedAt,
		shapes: record.shapes.map(shape => ({
			id: shape.id,
			label: shape.label,
			blueprint: shape.blueprint,
			rotationAngles: [...shape.rotationAngles],
			createdAt: shape.createdAt,
			updatedAt: shape.updatedAt,
			points: shape.points.map(point => ({ x: point.x, y: point.y }))
		}))
	};
}

function getCustomBlockSetRecordInternal(blockSetId: string): CustomBlockSetRecord | null {
	const records = readCustomBlockSetRecords();
	const match = records.find(entry => entry.id === blockSetId);
	return match ? { ...match, shapes: match.shapes.map(shape => ({
		...shape,
		rotationAngles: [...shape.rotationAngles],
		points: shape.points.map(point => ({ x: point.x, y: point.y }))
	})) } : null;
}

function readCustomBlockSetRecords(): CustomBlockSetRecord[] {
	const raw = localStorage.getItem(CUSTOM_BLOCK_SET_STORAGE_KEY);
	if (!raw) {
		return [];
	}
	try {
		const parsed = JSON.parse(raw) as CustomBlockSetRecord[];
		if (!Array.isArray(parsed)) {
			return [];
		}
		return parsed.map(record => normalizeCustomBlockSetRecord(record, true));
	} catch (_error) {
		return [];
	}
}

function writeCustomBlockSetRecords(records: CustomBlockSetRecord[]): void {
	localStorage.setItem(CUSTOM_BLOCK_SET_STORAGE_KEY, JSON.stringify(records));
}

function normalizeCustomBlockSetRecord(record: CustomBlockSetRecord, preserveTimestamps: boolean): CustomBlockSetRecord {
	const createdAt = preserveTimestamps && Number.isFinite(record?.createdAt) ? record.createdAt : Date.now();
	const updatedAt = preserveTimestamps && Number.isFinite(record?.updatedAt) ? record.updatedAt : createdAt;
	const normalizedShapes: CustomBlockSetShapeRecord[] = Array.isArray(record?.shapes)
		? record.shapes.map(shape => normalizeCustomBlockSetShape(shape, preserveTimestamps)).filter(Boolean) as CustomBlockSetShapeRecord[]
		: [];
	return {
		id: typeof record?.id === "string" && record.id.length > 0 ? record.id : generateCustomBlockSetId(),
		name: sanitizeBlockSetName(record?.name ?? ""),
		description: typeof record?.description === "string" ? record.description : "",
		shapes: normalizedShapes,
		createdAt,
		updatedAt
	};
}

function normalizeCustomBlockSetShape(shape: CustomBlockSetShapeRecord, preserveTimestamps: boolean): CustomBlockSetShapeRecord | null {
	if (!shape || !Array.isArray(shape.points) || shape.points.length === 0) {
		return null;
	}
	const normalizedPoints = shape.points
		.filter(point => Number.isFinite(point?.x) && Number.isFinite(point?.y))
		.map(point => ({ x: Math.floor(point.x), y: Math.floor(point.y) }));
	if (normalizedPoints.length === 0) {
		return null;
	}
	const normalizedAngles = ensureRotationAngles(Array.isArray(shape.rotationAngles) ? shape.rotationAngles : [0]);
	const createdAt = preserveTimestamps && Number.isFinite(shape.createdAt) ? shape.createdAt : Date.now();
	const updatedAt = preserveTimestamps && Number.isFinite(shape.updatedAt) ? shape.updatedAt : createdAt;
	return {
		id: typeof shape.id === "string" && shape.id.length > 0 ? shape.id : generateCustomShapeId(),
		label: sanitizeShapeLabel(shape.label),
		blueprint: typeof shape.blueprint === "string" && shape.blueprint.length > 0 ? shape.blueprint : shapeToBlueprint(normalizedPoints.map(point => new CoordinatePair(point.x, point.y))),
		points: normalizedPoints,
		rotationAngles: normalizedAngles,
		createdAt,
		updatedAt
	};
}
