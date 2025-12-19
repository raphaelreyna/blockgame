/// <reference path="util.ts" />
/// <reference path="cell.ts" />
/// <reference path="grid.ts" />
/// <reference path="rootScene.ts" />
/// <reference path="shape.ts" />
/// <reference path="shapes.ts" />
/// <reference path="game.ts" />
/// <reference path="shaderBackground.ts" />

const rootElement = document.getElementById("game-container");
if (!(rootElement instanceof HTMLElement)) {
    throw new Error("Failed to find the game container element");
}

let game = new Game(rootElement);

const shaderPanel = document.getElementById("shader-panel");
if (shaderPanel instanceof HTMLElement) {
    new ShaderBackgroundController(shaderPanel);
}

const settingsDrawer = document.getElementById("settings-drawer");
const settingsOverlay = document.getElementById("settings-overlay");
const openSettingsButton = document.getElementById("open-settings");
const closeSettingsButton = document.getElementById("close-settings");
const newGameButton = document.getElementById("new-game-button");
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

openSettingsButton?.addEventListener("click", () => setSettingsDrawerState(true));
closeSettingsButton?.addEventListener("click", () => setSettingsDrawerState(false));
settingsOverlay?.addEventListener("click", () => setSettingsDrawerState(false));
document.addEventListener("keydown", (event: KeyboardEvent) => {
    if (event.key === "Escape") {
        setSettingsDrawerState(false);
    }
});

window.addEventListener("resize", () => scheduleLayoutRefresh());