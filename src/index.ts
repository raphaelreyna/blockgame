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
const blockSetCards = new Map<string, { card: HTMLButtonElement; scoreLabel: HTMLElement }>();
const blockSetData = getBlockSets();
const highScoreStore = new HighScoreStore();
let lastFocusedElement: HTMLElement | null = null;
let isScrollLocked = false;
let lockedScrollY = 0;
let layoutRefreshTimer: number | null = null;

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
        const card = document.createElement("button");
        card.type = "button";
        card.className = "blockset-card";
        card.dataset.blockSetId = blockSet.id;

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

        const description = document.createElement("p");
        description.className = "blockset-card__hint";
        description.textContent = blockSet.description;

        const preview = document.createElement("div");
        preview.className = "blockset-card__preview";
        const previewShapes = blockSet.previewShapes?.length ? blockSet.previewShapes : blockSet.shapes;
        previewShapes.forEach(shape => {
            preview.appendChild(createShapePreview(shape));
        });

        card.appendChild(meta);
        card.appendChild(description);
        card.appendChild(preview);
        card.addEventListener("click", () => handleBlockSetSelection(blockSet.id));

        blockSetList.appendChild(card);
        blockSetCards.set(blockSet.id, { card, scoreLabel });
    }
    updateBlockSetCardState();
};

const updateBlockSetCardState = () => {
    blockSetCards.forEach(({ card }, id) => {
        const isActive = id === activeBlockSetId;
        card.classList.toggle("blockset-card--active", isActive);
        card.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
};

const updateBlockSetScores = (perSet: Record<string, number>) => {
    blockSetCards.forEach(({ scoreLabel }, id) => {
        const nextScore = perSet[id] ?? 0;
        scoreLabel.textContent = `High: ${nextScore}`;
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

openSettingsButton?.addEventListener("click", () => setSettingsDrawerState(true));
closeSettingsButton?.addEventListener("click", () => setSettingsDrawerState(false));
settingsOverlay?.addEventListener("click", () => setSettingsDrawerState(false));
document.addEventListener("keydown", (event: KeyboardEvent) => {
    if (event.key === "Escape") {
        setSettingsDrawerState(false);
    }
});

window.addEventListener("resize", () => scheduleLayoutRefresh());

renderBlockSetControls();

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