/// <reference path="util.ts" />
/// <reference path="cell.ts" />
/// <reference path="grid.ts" />
/// <reference path="rootScene.ts" />
/// <reference path="shape.ts" />
/// <reference path="shapes.ts" />
/// <reference path="highScore.ts" />
/// <reference path="game.ts" />
/// <reference path="shaderBackground.ts" />

const rootElement = document.getElementById("game-container");
if (!(rootElement instanceof HTMLElement)) {
    throw new Error("Failed to find the game container element");
}
const ACTIVE_BLOCK_SET_KEY = "blockgame.activeBlockSet";
const storedBlockSetId = localStorage.getItem(ACTIVE_BLOCK_SET_KEY) ?? getDefaultBlockSetId();

let game = new Game(rootElement, storedBlockSetId);
let activeBlockSetId = game.getActiveBlockSetId();
if (activeBlockSetId !== storedBlockSetId) {
    localStorage.setItem(ACTIVE_BLOCK_SET_KEY, activeBlockSetId);
}

const shaderPanel = document.getElementById("shader-panel");
if (shaderPanel instanceof HTMLElement) {
    new ShaderBackgroundController(shaderPanel);
}

const settingsDrawer = document.getElementById("settings-drawer");
const settingsOverlay = document.getElementById("settings-overlay");
const openSettingsButton = document.getElementById("open-settings");
const closeSettingsButton = document.getElementById("close-settings");
const newGameButton = document.getElementById("new-game-button");
const blockSetList = document.getElementById("blockset-list");
const blockSetCards = new Map<string, { card: HTMLDetailsElement; scoreLabel: HTMLElement; selectButton: HTMLButtonElement }>();
let blockSetData = getBlockSets();
const customBlockSetSelect = document.getElementById("custom-blockset-select") as HTMLSelectElement | null;
const customBlockSetNameInput = document.getElementById("custom-blockset-name") as HTMLInputElement | null;
const customBlockSetDescriptionInput = document.getElementById("custom-blockset-description") as HTMLTextAreaElement | null;
const customBlockSetCreateButton = document.getElementById("custom-blockset-create");
const customBlockSetEmptyCreateButton = document.getElementById("custom-blockset-empty-create");
const customBlockSetSaveButton = document.getElementById("custom-blockset-save") as HTMLButtonElement | null;
const customBlockSetDeleteButton = document.getElementById("custom-blockset-delete") as HTMLButtonElement | null;
const customBlockSetsBody = document.getElementById("custom-blocksets-body");
const customBlockSetsEmpty = document.getElementById("custom-blocksets-empty");
const customShapeLabelInput = document.getElementById("custom-shape-label") as HTMLInputElement | null;
const customShapeBlueprintInput = document.getElementById("custom-shape-blueprint") as HTMLTextAreaElement | null;
const customShapePreview = document.getElementById("custom-shape-preview");
const customShapeRotations = document.getElementById("custom-shape-rotations");
const customShapeAddButton = document.getElementById("custom-shape-add") as HTMLButtonElement | null;
const customShapeStatus = document.getElementById("custom-shape-status");
const customShapeList = document.getElementById("custom-shape-list");
const customImportSource = document.getElementById("custom-import-source") as HTMLSelectElement | null;
const customImportHint = document.getElementById("custom-import-hint");
const customImportApplyButton = document.getElementById("custom-import-apply") as HTMLButtonElement | null;
const highScoreStore = new HighScoreStore();
let lastFocusedElement: HTMLElement | null = null;
let isScrollLocked = false;
let lockedScrollY = 0;
let layoutRefreshTimer: number | null = null;
let customSets = listCustomBlockSets();
let activeEditorSetId: string | null = customSets.length > 0 ? customSets[0].id : null;
let currentBlueprintParse: ParsedBlueprintResult | null = null;
let draftRotationAngles: Set<number> = new Set([0]);

const refreshGameLayout = () => {
    game.configureLayout(rootElement);
};

const scheduleLayoutRefresh = (delay: number = 120) => {
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

const setSettingsDrawerState = (shouldOpen: boolean) => {
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
        const targetFocus = closeSettingsButton ?? settingsDrawer.querySelector<HTMLElement>("button");
        targetFocus?.focus();
        scheduleLayoutRefresh(240);
        return;
    }
    body.classList.remove("settings-open");
    unlockBodyScroll();
    settingsDrawer.setAttribute("aria-hidden", "true");
    settingsOverlay.setAttribute("aria-hidden", "true");
    lastFocusedElement?.focus();
    scheduleLayoutRefresh(320);
};

newGameButton?.addEventListener("click", () => {
    const confirmReset = window.confirm("Start a new game? Your current score will be lost.");
    if (!confirmReset) {
        return;
    }
    game.startNewGame();
    setSettingsDrawerState(false);
});

const handleBlockSetSelection = (blockSetId: string) => {
    if (!blockSetId || blockSetId === activeBlockSetId) {
        return;
    }
    const targetSet = blockSetData.find(set => set.id === blockSetId);
    const friendlyName = targetSet?.name ?? "this block set";
    const confirmSwitch = window.confirm(`Switch to ${friendlyName}? This restarts your current game.`);
    if (!confirmSwitch) {
        return;
    }
    activeBlockSetId = blockSetId;
    localStorage.setItem(ACTIVE_BLOCK_SET_KEY, activeBlockSetId);
    game.setBlockSet(blockSetId);
    ensureActiveCardVisibility();
    updateBlockSetCardState();
};

const renderBlockSetControls = () => {
    if (!(blockSetList instanceof HTMLElement)) {
        return;
    }
    blockSetList.innerHTML = "";
    blockSetCards.clear();
    const snapshot = highScoreStore.getSnapshot();
    for (const blockSet of blockSetData) {
        const card = document.createElement("details");
        card.className = "blockset-card";
        card.dataset.blockSetId = blockSet.id;
        if (blockSet.id === activeBlockSetId) {
            card.open = true;
        }

        const summary = document.createElement("summary");
        summary.className = "blockset-card__summary";

        const meta = document.createElement("div");
        meta.className = "blockset-card__meta";

        const name = document.createElement("span");
        name.className = "blockset-card__name";
        name.textContent = blockSet.name;

        const scoreLabel = document.createElement("span");
        scoreLabel.className = "blockset-card__score";
        const setScore = snapshot.perSet[blockSet.id] ?? 0;
        scoreLabel.textContent = `High: ${setScore}`;

        meta.appendChild(name);
        meta.appendChild(scoreLabel);

        const selectButton = document.createElement("button");
        selectButton.type = "button";
        selectButton.className = "ghost-button blockset-card__select";
        const isActiveSet = blockSet.id === activeBlockSetId;
        selectButton.textContent = isActiveSet ? "Active Set" : "Use This Set";
        selectButton.disabled = isActiveSet;
        selectButton.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            handleBlockSetSelection(blockSet.id);
        });

        const chevron = document.createElement("span");
        chevron.className = "blockset-card__chevron";
        chevron.setAttribute("aria-hidden", "true");

        const summaryActions = document.createElement("div");
        summaryActions.className = "blockset-card__summary-actions";
        summaryActions.appendChild(selectButton);
        summaryActions.appendChild(chevron);

        summary.appendChild(meta);
        summary.appendChild(summaryActions);
        card.appendChild(summary);

        const content = document.createElement("div");
        content.className = "blockset-card__content";

        const description = document.createElement("p");
        description.className = "blockset-card__hint";
        description.textContent = blockSet.description;

        const preview = document.createElement("div");
        preview.className = "blockset-card__preview";
        const previewShapes = blockSet.previewShapes?.length ? blockSet.previewShapes : blockSet.shapes;
        previewShapes.forEach(shape => {
            preview.appendChild(createShapePreview(shape));
        });

        content.appendChild(description);
        content.appendChild(preview);
        card.appendChild(content);

        blockSetList.appendChild(card);
        blockSetCards.set(blockSet.id, { card, scoreLabel, selectButton });
    }
    updateBlockSetCardState();
};

const updateBlockSetCardState = () => {
    blockSetCards.forEach(({ card, selectButton }, id) => {
        const isActive = id === activeBlockSetId;
        card.classList.toggle("blockset-card--active", isActive);
        selectButton.textContent = isActive ? "Active Set" : "Use This Set";
        selectButton.disabled = isActive;
    });
};

const updateBlockSetScores = (perSet: Record<string, number>) => {
    blockSetCards.forEach(({ scoreLabel }, id) => {
        const nextScore = perSet[id] ?? 0;
        scoreLabel.textContent = `High: ${nextScore}`;
    });
};

const ensureActiveCardVisibility = () => {
    blockSetCards.forEach(({ card }, id) => {
        card.open = id === activeBlockSetId;
    });
};

const createShapePreview = (shape: CoordinatePair[]): HTMLElement => {
    const normalized = normalizePreviewShape(shape);
    if (!normalized.length) {
        const empty = document.createElement("div");
        empty.className = "blockset-preview-shape";
        return empty;
    }
    const figure = new Figure(normalized);
    const cellSize = 16;
    const width = Math.max(cellSize * figure.width, cellSize);
    const height = Math.max(cellSize * figure.height, cellSize);
    const shapeElement = document.createElement("div");
    shapeElement.className = "blockset-preview-shape";
    shapeElement.style.width = `${width}px`;
    shapeElement.style.height = `${height}px`;
    shapeElement.style.position = "relative";
    shapeElement.style.margin = "0 0.35rem 0.35rem 0";
    const nodes = figure.toGameNodes(width, figure.width, cellSize);
    nodes.forEach(node => {
        node.element.classList.add("shape-section", "blockset-preview-cell");
        node.element.style.backgroundColor = "rgba(255, 255, 255, 0.85)";
        node.element.style.borderColor = "rgba(255, 255, 255, 0.8)";
        node.addToParent(shapeElement);
    });
    return shapeElement;
};

const normalizePreviewShape = (shape: CoordinatePair[]): CoordinatePair[] => {
    if (!shape.length) {
        return [];
    }
    let minX = Infinity;
    let minY = Infinity;
    for (const point of shape) {
        if (point.x < minX) {
            minX = point.x;
        }
        if (point.y < minY) {
            minY = point.y;
        }
    }
    return shape.map(point => new CoordinatePair(point.x - minX, point.y - minY));
};

const refreshBlockSetList = () => {
    blockSetData = getBlockSets();
    renderBlockSetControls();
    ensureActiveCardVisibility();
    populateImportSources();
};

const syncCustomEditorState = () => {
    customSets = listCustomBlockSets();
    if (!customSets.some(set => set.id === activeEditorSetId)) {
        activeEditorSetId = customSets.length > 0 ? customSets[0].id : null;
    }
    toggleCustomSetVisibility();
    populateCustomSetSelect();
    hydrateCustomSetForm();
    renderShapeBuilderPreview();
    populateImportSources();
};

const toggleCustomSetVisibility = () => {
    const hasSets = customSets.length > 0;
    if (customBlockSetsBody instanceof HTMLElement) {
        customBlockSetsBody.hidden = !hasSets;
    }
    if (customBlockSetsEmpty instanceof HTMLElement) {
        customBlockSetsEmpty.hidden = hasSets;
    }
    const shouldDisable = !hasSets;
    customBlockSetSelect && (customBlockSetSelect.disabled = shouldDisable);
    customBlockSetSaveButton && (customBlockSetSaveButton.disabled = shouldDisable);
    customBlockSetDeleteButton && (customBlockSetDeleteButton.disabled = shouldDisable);
    updateShapeBuilderButtonState();
    updateImportButtonAvailability(false);
};

const populateCustomSetSelect = () => {
    if (!(customBlockSetSelect instanceof HTMLSelectElement)) {
        return;
    }
    customBlockSetSelect.innerHTML = "";
    if (!customSets.length) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "No custom sets yet";
        option.disabled = true;
        option.selected = true;
        customBlockSetSelect.appendChild(option);
        return;
    }
    for (const set of customSets) {
        const option = document.createElement("option");
        option.value = set.id;
        option.textContent = set.name;
        customBlockSetSelect.appendChild(option);
    }
    if (activeEditorSetId) {
        customBlockSetSelect.value = activeEditorSetId;
    }
};

const hydrateCustomSetForm = () => {
    const activeSet = activeEditorSetId ? customSets.find(set => set.id === activeEditorSetId) : undefined;
    if (customBlockSetNameInput) {
        customBlockSetNameInput.value = activeSet?.name ?? "";
        customBlockSetNameInput.disabled = !activeSet;
    }
    if (customBlockSetDescriptionInput) {
        customBlockSetDescriptionInput.value = activeSet?.description ?? "";
        customBlockSetDescriptionInput.disabled = !activeSet;
    }
    renderCustomShapeList(activeSet);
};

const renderCustomShapeList = (activeSet?: CustomBlockSetRecord) => {
    if (!(customShapeList instanceof HTMLElement)) {
        return;
    }
    customShapeList.innerHTML = "";
    if (!activeSet || activeSet.shapes.length === 0) {
        const placeholder = document.createElement("p");
        placeholder.className = "custom-blocksets__hint";
        placeholder.textContent = activeSet ? "No shapes yet. Add one using the blueprint editor." : "Create a custom set to start adding shapes.";
        customShapeList.appendChild(placeholder);
        return;
    }
    for (const shape of activeSet.shapes) {
        const card = document.createElement("article");
        card.className = "custom-shape-card";
        card.dataset.shapeId = shape.id;

        const meta = document.createElement("div");
        meta.className = "custom-shape-card__meta";
        const label = document.createElement("span");
        label.className = "custom-shape-card__label";
        label.textContent = shape.label;
        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "ghost-button ghost-button--compact";
        removeButton.textContent = "Remove";
        removeButton.addEventListener("click", () => handleShapeDeletion(shape.id));
        meta.appendChild(label);
        meta.appendChild(removeButton);
        card.appendChild(meta);

        const previewHost = document.createElement("div");
        previewHost.className = "custom-shape-preview";
        previewHost.appendChild(createShapePreview(convertPointsToCoordinates(shape.points)));
        card.appendChild(previewHost);

        const rotationsWrapper = document.createElement("div");
        rotationsWrapper.className = "custom-shape-card__rotations";
        const descriptors = describeShapeRotations(convertPointsToCoordinates(shape.points));
        for (const descriptor of descriptors) {
            const chip = document.createElement("button");
            chip.type = "button";
            chip.className = "rotation-chip";
            chip.textContent = `${descriptor.angle}°`;
            chip.dataset.angle = descriptor.angle.toString();
            chip.dataset.shapeId = shape.id;
            const isDisabled = descriptor.isDuplicateOfBase || descriptor.isRedundant;
            if (isDisabled) {
                chip.classList.add("is-disabled");
                chip.disabled = true;
            }
            const isActive = shape.rotationAngles.includes(descriptor.angle);
            if (isActive) {
                chip.classList.add("is-active");
            }
            chip.addEventListener("click", () => handleShapeRotationToggle(shape.id, descriptor.angle));
            rotationsWrapper.appendChild(chip);
        }
        card.appendChild(rotationsWrapper);
        customShapeList.appendChild(card);
    }
};

const convertPointsToCoordinates = (points: SerializedCoordinate[]): CoordinatePair[] => {
    return points.map(point => new CoordinatePair(point.x, point.y));
};

const collectRotationKeys = (points: CoordinatePair[]): string[] => {
    const descriptors = describeShapeRotations(points);
    const keys: string[] = [];
    const seen = new Set<string>();
    for (const descriptor of descriptors) {
        if (seen.has(descriptor.key)) {
            continue;
        }
        seen.add(descriptor.key);
        keys.push(descriptor.key);
    }
    return keys;
};

const buildShapeKeySet = (record?: CustomBlockSetRecord | null): Set<string> => {
    const keys = new Set<string>();
    if (!record) {
        return keys;
    }
    for (const shape of record.shapes) {
        const shapePoints = convertPointsToCoordinates(shape.points);
        collectRotationKeys(shapePoints).forEach(key => keys.add(key));
    }
    return keys;
};

const hasShapeCollision = (keys: Set<string>, candidate: CoordinatePair[]): boolean => {
    return collectRotationKeys(candidate).some(key => keys.has(key));
};

const appendShapeKeys = (keys: Set<string>, candidate: CoordinatePair[]): void => {
    collectRotationKeys(candidate).forEach(key => keys.add(key));
};

const handleShapeDeletion = (shapeId: string) => {
    if (!activeEditorSetId) {
        return;
    }
    updateActiveCustomSet(record => {
        record.shapes = record.shapes.filter(shape => shape.id !== shapeId);
    });
};

const handleShapeRotationToggle = (shapeId: string, angle: number) => {
    if (!activeEditorSetId) {
        return;
    }
    updateActiveCustomSet(record => {
        const targetShape = record.shapes.find(shape => shape.id === shapeId);
        if (!targetShape) {
            return;
        }
        const nextAngles = new Set(targetShape.rotationAngles);
        if (nextAngles.has(angle)) {
            if (angle === 0 || nextAngles.size === 1) {
                return;
            }
            nextAngles.delete(angle);
        } else {
            nextAngles.add(angle);
        }
        targetShape.rotationAngles = normalizeRotationSelection(nextAngles);
        targetShape.updatedAt = Date.now();
    });
};

const updateActiveCustomSet = (mutator: (record: CustomBlockSetRecord) => void) => {
    if (!activeEditorSetId) {
        return;
    }
    const working = getCustomBlockSetById(activeEditorSetId);
    if (!working) {
        return;
    }
    mutator(working);
    saveCustomBlockSet(working);
    syncCustomEditorState();
    refreshBlockSetList();
};

const normalizeRotationSelection = (angles: Iterable<number>): number[] => {
    const normalized: number[] = [];
    for (const angle of angles) {
        const deg = ((angle % 360) + 360) % 360;
        if (deg % 90 !== 0) {
            continue;
        }
        if (!normalized.includes(deg)) {
            normalized.push(deg);
        }
    }
    if (!normalized.includes(0)) {
        normalized.unshift(0);
    }
    normalized.sort((a, b) => a - b);
    return normalized.slice(0, 4);
};

const renderShapeBuilderPreview = () => {
    if (!(customShapePreview instanceof HTMLElement) || !(customShapeRotations instanceof HTMLElement)) {
        return;
    }
    customShapePreview.innerHTML = "";
    customShapeRotations.innerHTML = "";
    currentBlueprintParse = null;
    draftRotationAngles = new Set([0]);
    const blueprintValue = customShapeBlueprintInput?.value ?? "";
    if (!blueprintValue.trim()) {
        setShapeStatus("Draw a blueprint to get started.");
        updateShapeBuilderButtonState();
        return;
    }
    try {
        const parsed = parseShapeBlueprint(blueprintValue);
        currentBlueprintParse = parsed;
        const previewElement = createShapePreview(parsed.coordinates);
        customShapePreview.appendChild(previewElement);
        renderBuilderRotationOptions(parsed.coordinates);
        setShapeStatus("", false);
    } catch (error) {
        setShapeStatus(error instanceof Error ? error.message : "Invalid blueprint.");
    }
    updateShapeBuilderButtonState();
};

const renderBuilderRotationOptions = (points: CoordinatePair[]) => {
    if (!(customShapeRotations instanceof HTMLElement)) {
        return;
    }
    customShapeRotations.innerHTML = "";
    const descriptors = describeShapeRotations(points);
    for (const descriptor of descriptors) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "shape-rotation-option";
        button.dataset.angle = descriptor.angle.toString();
        button.setAttribute("aria-pressed", draftRotationAngles.has(descriptor.angle) ? "true" : "false");
        if (descriptor.isDuplicateOfBase || descriptor.isRedundant) {
            button.classList.add("shape-rotation-option--disabled");
            button.disabled = true;
        }
        if (draftRotationAngles.has(descriptor.angle)) {
            button.classList.add("shape-rotation-option--selected");
        }
        const label = document.createElement("span");
        label.className = "shape-rotation-option__label";
        label.textContent = `${descriptor.angle}°`;
        const preview = document.createElement("div");
        preview.className = "shape-rotation-option__preview";
        preview.appendChild(createShapePreview(descriptor.coordinates));
        button.appendChild(label);
        button.appendChild(preview);
        button.addEventListener("click", () => toggleDraftRotation(descriptor.angle, button));
        customShapeRotations.appendChild(button);
    }
};

const toggleDraftRotation = (angle: number, element: HTMLButtonElement) => {
    if (element.classList.contains("shape-rotation-option--disabled")) {
        return;
    }
    const isActive = draftRotationAngles.has(angle);
    if (isActive) {
        if (angle === 0 || draftRotationAngles.size === 1) {
            return;
        }
        draftRotationAngles.delete(angle);
        element.classList.remove("shape-rotation-option--selected");
        element.setAttribute("aria-pressed", "false");
    } else {
        draftRotationAngles.add(angle);
        element.classList.add("shape-rotation-option--selected");
        element.setAttribute("aria-pressed", "true");
    }
    updateShapeBuilderButtonState();
};

const updateShapeBuilderButtonState = () => {
    if (!customShapeAddButton) {
        return;
    }
    const isReady = Boolean(activeEditorSetId && currentBlueprintParse && draftRotationAngles.size > 0);
    customShapeAddButton.disabled = !isReady;
};

const setShapeStatus = (message: string, isError: boolean = true) => {
    if (!(customShapeStatus instanceof HTMLElement)) {
        return;
    }
    customShapeStatus.textContent = message;
    if (message) {
        customShapeStatus.classList.toggle("is-success", !isError);
    } else {
        customShapeStatus.classList.remove("is-success");
    }
};

const handleAddCustomShape = () => {
    if (!activeEditorSetId || !currentBlueprintParse) {
        return;
    }
    const target = getCustomBlockSetById(activeEditorSetId);
    if (!target) {
        return;
    }
    const normalizedCoordinates = currentBlueprintParse.coordinates.map(point => new CoordinatePair(point.x, point.y));
    const existingKeys = buildShapeKeySet(target);
    if (hasShapeCollision(existingKeys, normalizedCoordinates)) {
        setShapeStatus("That shape (or one of its rotations) already exists in this set.");
        return;
    }
    const label = customShapeLabelInput?.value.trim() ?? "";
    const rotationAngles = normalizeRotationSelection(draftRotationAngles);
    const newShape = buildCustomShapeRecord({
        label,
        blueprint: currentBlueprintParse.blueprint,
        rotationAngles
    });
    target.shapes.push(newShape);
    saveCustomBlockSet(target);
    if (customShapeLabelInput) {
        customShapeLabelInput.value = "";
    }
    if (customShapeBlueprintInput) {
        customShapeBlueprintInput.value = "";
    }
    currentBlueprintParse = null;
    draftRotationAngles = new Set([0]);
    setShapeStatus(`Added ${newShape.label} to ${target.name}.`, false);
    syncCustomEditorState();
    refreshBlockSetList();
};

const handleCreateCustomSet = () => {
    const defaultName = `Custom Set ${customSets.length + 1}`;
    const newSet = createCustomBlockSet(defaultName);
    activeEditorSetId = newSet.id;
    syncCustomEditorState();
    refreshBlockSetList();
    window.setTimeout(() => customBlockSetNameInput?.focus(), 0);
};

const handleSaveCustomSet = () => {
    if (!activeEditorSetId) {
        return;
    }
    const record = getCustomBlockSetById(activeEditorSetId);
    if (!record) {
        return;
    }
    const nextName = (customBlockSetNameInput?.value ?? "").trim();
    record.name = nextName.length > 0 ? nextName : record.name;
    record.description = customBlockSetDescriptionInput?.value ?? "";
    saveCustomBlockSet(record);
    if (record.id === activeBlockSetId) {
        game.blockSetName = record.name;
        game.blockSetLabel.textContent = record.name;
    }
    syncCustomEditorState();
    refreshBlockSetList();
};

const handleDeleteCustomSet = () => {
    if (!activeEditorSetId) {
        return;
    }
    const target = customSets.find(set => set.id === activeEditorSetId);
    const friendlyName = target?.name ?? "this block set";
    const confirmRemoval = window.confirm(`Delete ${friendlyName}? This cannot be undone.`);
    if (!confirmRemoval) {
        return;
    }
    deleteCustomBlockSet(activeEditorSetId);
    if (activeBlockSetId === activeEditorSetId) {
        activeBlockSetId = getDefaultBlockSetId();
        localStorage.setItem(ACTIVE_BLOCK_SET_KEY, activeBlockSetId);
        game.setBlockSet(activeBlockSetId);
    }
    activeEditorSetId = null;
    syncCustomEditorState();
    refreshBlockSetList();
};

const populateImportSources = () => {
    if (!(customImportSource instanceof HTMLSelectElement)) {
        setImportHintMessage("Import controls unavailable.");
        updateImportButtonAvailability(false);
        return;
    }
    const availableSources = blockSetData.filter(set => set.id !== activeEditorSetId);
    customImportSource.innerHTML = "";
    if (!availableSources.length) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "No other block sets available";
        option.disabled = true;
        option.selected = true;
        customImportSource.appendChild(option);
        customImportSource.disabled = true;
        setImportHintMessage("Create or select another block set to import from.");
        updateImportButtonAvailability(false);
        return;
    }
    customImportSource.disabled = false;
    for (const set of availableSources) {
        const option = document.createElement("option");
        option.value = set.id;
        option.textContent = set.name;
        customImportSource.appendChild(option);
    }
    if (!customImportSource.value && availableSources.length > 0) {
        customImportSource.value = availableSources[0].id;
    }
    setImportHintMessage(buildImportHint());
    updateImportButtonAvailability(Boolean(customImportSource.value));
};

const buildImportHint = (): string => {
    const sourceId = customImportSource instanceof HTMLSelectElement ? customImportSource.value : "";
    if (!sourceId) {
        return "Choose a source to copy every shape (rotations included).";
    }
    const sourceName = getBlockSetName(sourceId);
    return `Every shape from ${sourceName} will be added below. Remove any you don't want afterwards.`;
};

const setImportHintMessage = (message: string) => {
    if (customImportHint instanceof HTMLElement) {
        customImportHint.textContent = message;
    }
};

const updateImportButtonAvailability = (hasSource: boolean) => {
    if (!customImportApplyButton) {
        return;
    }
    const canImport = Boolean(activeEditorSetId && hasSource);
    customImportApplyButton.disabled = !canImport;
};

const handleImportSubmit = () => {
    if (!activeEditorSetId || !(customImportSource instanceof HTMLSelectElement)) {
        return;
    }
    const sourceId = customImportSource.value;
    if (!sourceId) {
        return;
    }
    const target = getCustomBlockSetById(activeEditorSetId);
    if (!target) {
        return;
    }
    const definitions = getShapeDefinitionsForBlockSet(sourceId);
    if (!definitions.length) {
        setShapeStatus("Selected block set has no shapes to import.");
        return;
    }
    const sourceName = getBlockSetName(sourceId);
    const existingKeys = buildShapeKeySet(target);
    const additions: CustomBlockSetShapeRecord[] = [];
    let skippedDuplicates = 0;
    definitions.forEach((definition, index) => {
        const normalizedCoordinates = normalizeShape(definition.coordinates.map(point => new CoordinatePair(point.x, point.y)));
        if (hasShapeCollision(existingKeys, normalizedCoordinates)) {
            skippedDuplicates++;
            return;
        }
        const rotationAngles = definition.rotationOptions?.angles && definition.rotationOptions.angles.length > 0
            ? [...definition.rotationOptions.angles]
            : [0, 90, 180, 270];
        const shapeRecord = buildCustomShapeRecord({
            label: `${sourceName} ${index + 1}`,
            coordinates: normalizedCoordinates,
            rotationAngles
        });
        additions.push(shapeRecord);
        appendShapeKeys(existingKeys, normalizedCoordinates);
    });
    if (!additions.length) {
        setShapeStatus("All shapes from that block set already exist here.");
        return;
    }
    target.shapes.push(...additions);
    saveCustomBlockSet(target);
    const message = skippedDuplicates > 0
        ? `Imported ${additions.length} shapes from ${sourceName} (skipped ${skippedDuplicates} duplicates).`
        : `Imported ${additions.length} shapes from ${sourceName}.`;
    setShapeStatus(message, false);
    syncCustomEditorState();
    refreshBlockSetList();
};

const getBlockSetName = (blockSetId: string): string => {
    return blockSetData.find(set => set.id === blockSetId)?.name ?? "Block Set";
};

openSettingsButton?.addEventListener("click", () => setSettingsDrawerState(true));
closeSettingsButton?.addEventListener("click", () => setSettingsDrawerState(false));
settingsOverlay?.addEventListener("click", () => setSettingsDrawerState(false));
document.addEventListener("keydown", (event: KeyboardEvent) => {
    if (event.key === "Escape") {
        setSettingsDrawerState(false);
    }
});

customBlockSetCreateButton?.addEventListener("click", handleCreateCustomSet);
customBlockSetEmptyCreateButton?.addEventListener("click", handleCreateCustomSet);
customBlockSetSelect?.addEventListener("change", event => {
    if (!(event.target instanceof HTMLSelectElement)) {
        return;
    }
    activeEditorSetId = event.target.value || null;
    syncCustomEditorState();
});
customBlockSetSaveButton?.addEventListener("click", handleSaveCustomSet);
customBlockSetDeleteButton?.addEventListener("click", handleDeleteCustomSet);
customShapeBlueprintInput?.addEventListener("input", () => renderShapeBuilderPreview());
customShapeLabelInput?.addEventListener("input", () => setShapeStatus(""));
customShapeAddButton?.addEventListener("click", handleAddCustomShape);
customImportSource?.addEventListener("change", event => {
    if (!(event.target instanceof HTMLSelectElement)) {
        return;
    }
    setImportHintMessage(buildImportHint());
    updateImportButtonAvailability(Boolean(event.target.value));
});
customImportApplyButton?.addEventListener("click", handleImportSubmit);

window.addEventListener("resize", () => scheduleLayoutRefresh());

refreshBlockSetList();
syncCustomEditorState();

document.addEventListener("blockgame:scores", (event: Event) => {
    const scoreEvent = event as CustomEvent<BlockGameScoreEventDetail>;
    if (!scoreEvent.detail) {
        return;
    }
    activeBlockSetId = scoreEvent.detail.blockSetId;
    localStorage.setItem(ACTIVE_BLOCK_SET_KEY, activeBlockSetId);
    updateBlockSetCardState();
    updateBlockSetScores(scoreEvent.detail.snapshot.perSet);
});

type BlockGameScoreEventDetail = {
    blockSetId: string;
    blockSetName: string;
    score: number;
    highScore: number;
    overallHighScore: number;
    snapshot: HighScoreSnapshot;
};
