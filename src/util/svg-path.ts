export interface Point {
  x: number;
  y: number;
}

const r = (n: number): number => Math.round(n);

export function bezierPath(from: Point, to: Point, control: Point): string {
  return `M ${r(from.x)} ${r(from.y)} Q ${r(control.x)} ${r(control.y)} ${r(to.x)} ${r(to.y)}`;
}

export function straightPath(from: Point, to: Point): string {
  return `M ${r(from.x)} ${r(from.y)} L ${r(to.x)} ${r(to.y)}`;
}
