type ConnectorPoints = { sourceX: number; sourceY: number; targetX: number; targetY: number };

export function parentConnectorPath({ sourceX, sourceY, targetX, targetY }: ConnectorPoints) {
  if (sourceX === targetX) return `M ${sourceX} ${sourceY} V ${targetY}`;
  // Every parent entering this union uses the same horizontal rail. Generic
  // smooth-step routing adds independent handle offsets, producing small jogs.
  const railY = targetY - 20;
  const direction = Math.sign(targetX - sourceX);
  const radius = Math.min(4, Math.abs(targetX - sourceX), Math.max(0, railY - sourceY));
  return `M ${sourceX} ${sourceY} V ${railY - radius} Q ${sourceX} ${railY} ${sourceX + direction * radius} ${railY} H ${targetX} V ${targetY}`;
}
