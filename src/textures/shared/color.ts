export function colorToCss(color) {
  return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
}

function clampChannel(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

export function tint(color, amount) {
  return [
    clampChannel(color[0] + amount),
    clampChannel(color[1] + amount),
    clampChannel(color[2] + amount)
  ];
}
