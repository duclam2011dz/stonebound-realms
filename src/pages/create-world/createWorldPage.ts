import { getGameSession, saveGameSession } from '../../app/storage/gameSessionStorage';

const session = getGameSession();
const worldNameInput = document.getElementById('worldNameInput') as HTMLInputElement | null;
const seedInput = document.getElementById('seedInput') as HTMLInputElement | null;
const startButton = document.getElementById('startWorldButton');
const backButton = document.getElementById('backToMenuButton');

if (worldNameInput) worldNameInput.value = session.worldName ?? '';
if (seedInput) seedInput.value = session.seed ?? '';

startButton?.addEventListener('click', () => {
  saveGameSession({
    worldName: worldNameInput?.value?.trim() ?? '',
    seed: seedInput?.value?.trim() ?? '',
    settings: session.settings
  });
  window.location.href = './game.html';
});

backButton?.addEventListener('click', () => {
  window.location.href = './menu.html';
});
