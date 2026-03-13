export type RGB = [number, number, number];

export function colorToCss(color: RGB): string {
  return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
}

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

export function tint(color: RGB, amount: number): RGB {
  return [
    clampChannel(color[0] + amount),
    clampChannel(color[1] + amount),
    clampChannel(color[2] + amount)
  ];
}
