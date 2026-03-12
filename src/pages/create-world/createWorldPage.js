import { getGameSession, saveGameSession } from "../../app/storage/gameSessionStorage.js";

const session = getGameSession();
const worldNameInput = document.getElementById("worldNameInput");
const seedInput = document.getElementById("seedInput");
const startButton = document.getElementById("startWorldButton");
const backButton = document.getElementById("backToMenuButton");

if (worldNameInput) worldNameInput.value = session.worldName ?? "";
if (seedInput) seedInput.value = session.seed ?? "";

startButton?.addEventListener("click", () => {
  saveGameSession({
    worldName: worldNameInput?.value?.trim() ?? "",
    seed: seedInput?.value?.trim() ?? "",
    settings: session.settings
  });
  window.location.href = "./game.html";
});

backButton?.addEventListener("click", () => {
  window.location.href = "./menu.html";
});
