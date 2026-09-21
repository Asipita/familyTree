type ConnectorPoints = { sourceX: number; sourceY: number; targetX: number; targetY: number };
type Bounds = { left: number; right: number; top: number; bottom: number };

function overlapsHorizontalRail(railY: number, xStart: number, xEnd: number, box: Bounds, padding = 8) {
  const xA = Math.min(xStart, xEnd), xB = Math.max(xStart, xEnd);
  return box.top - padding < railY && railY < box.bottom + padding && xA < box.right && xB > box.left;
}

function overlapsVerticalLeg(x: number, yStart: number, yEnd: number, box: Bounds, padding = 8) {
  const yA = Math.min(yStart, yEnd), yB = Math.max(yStart, yEnd);
  return box.left - padding < x && x < box.right + padding && yA < box.bottom && yB > box.top;
}

function pickRailY(preferred: number, sourceY: number, targetY: number, sourceX: number, targetX: number, boxes: Bounds[], requested?: number) {
  const lo = Math.min(sourceY, targetY);
  const hi = Math.max(sourceY, targetY);
  const candidates = [requested ?? preferred];
  for (const box of boxes) {
    candidates.push(box.top - 12, box.bottom + 12);
  }
  candidates.push(lo + 8, hi - 8, (lo + hi) / 2);
  let best = preferred;
  let bestScore = Infinity;
  for (const raw of candidates) {
    const y = Math.max(lo + 4, Math.min(hi - 4, raw));
    let score = Math.abs(y - preferred);
    for (const box of boxes) if (overlapsHorizontalRail(y, sourceX, targetX, box)) score += 10000;
    for (const box of boxes) {
      if (overlapsVerticalLeg(sourceX, sourceY, y, box)) score += 10000;
      if (overlapsVerticalLeg(targetX, y, targetY, box)) score += 10000;
    }
    if (score < bestScore) { bestScore = score; best = y; }
  }
  return best;
}

export function parentConnectorPath({ sourceX, sourceY, targetX, targetY }: ConnectorPoints, boxes: Bounds[] = [], requestedRailY?: number) {
  if (sourceX === targetX) return `M ${sourceX} ${sourceY} V ${targetY}`;
  // Every parent entering this union uses the same horizontal rail. Generic
  // smooth-step routing adds independent handle offsets, producing small jogs.
  const railY = pickRailY(targetY - 20, sourceY, targetY, sourceX, targetX, boxes, requestedRailY);
  const direction = Math.sign(targetX - sourceX);
  const vertical = railY - sourceY;
  const radius = Math.min(4, Math.abs(targetX - sourceX), Math.max(0, vertical));
  return `M ${sourceX} ${sourceY} V ${railY - radius} Q ${sourceX} ${railY} ${sourceX + direction * radius} ${railY} H ${targetX} V ${targetY}`;
}

// Union → child and single-parent → union connectors. The horizontal rail is
// placed so it never runs through any card box; the vertical stem joins at the
// rail and the end connects to the target. This guarantees no connector line
// passes *behind* a person node even when source/target are far apart.
export function unionConnectorPath({ sourceX, sourceY, targetX, targetY }: ConnectorPoints, boxes: Bounds[] = [], requestedRailY?: number) {
  if (sourceX === targetX) return `M ${sourceX} ${sourceY} V ${targetY}`;
  const railY = pickRailY((sourceY + targetY) / 2, sourceY, targetY, sourceX, targetX, boxes, requestedRailY);
  const dirTarget = Math.sign(targetX - sourceX);
  const dirSource = Math.sign(sourceX - targetX);
  const down = railY - sourceY;
  const up = targetY - railY;
  const rDown = Math.min(4, Math.abs(targetX - sourceX), Math.max(0, down));
  const rUp = Math.min(4, Math.abs(targetX - sourceX), Math.max(0, up));
  return `M ${sourceX} ${sourceY} V ${railY - rDown} Q ${sourceX} ${railY} ${sourceX + dirTarget * rDown} ${railY} H ${targetX + dirSource * rUp} Q ${targetX} ${railY} ${targetX} ${railY + rUp} V ${targetY}`;
}

export function personBoxes(nodes: { type?: string; position: { x: number; y: number } }[], personWidth = 202, personHeight = 80): Bounds[] {
  return nodes
    .filter(node => node.type === "person")
    .map(node => ({ left: node.position.x, right: node.position.x + personWidth, top: node.position.y, bottom: node.position.y + personHeight }));
}
