/// <reference path="util.ts" />
/// <reference path="cell.ts" />
/// <reference path="grid.ts" />
/// <reference path="rootScene.ts" />
/// <reference path="shape.ts" />
/// <reference path="shapes.ts" />
/// <reference path="game.ts" />

let rootElement = document.getElementById("game-container");
if (!rootElement) {
    throw new Error("Failed to find the game container element");
}

let game = new Game(rootElement);