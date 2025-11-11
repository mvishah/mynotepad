import type { Point, DrawingPath } from '../components/DrawingCanvas';

export type ShapeType = 'line' | 'circle' | 'rectangle' | 'arrow' | 'none';

export interface RecognizedShape {
  type: ShapeType;
  confidence: number; // 0-1, how confident we are this is the detected shape
  points: Point[]; // Perfect shape points to replace the original path
}

// Threshold constants
const LINE_STRAIGHTNESS_THRESHOLD = 0.15; // How straight a line needs to be
const CIRCLE_ROUNDNESS_THRESHOLD = 0.2; // How circular a circle needs to be
const MIN_POINTS = 5; // Minimum points needed for recognition

/**
 * Analyze a path and recognize if it's a common shape
 */
export const recognizeShape = (path: DrawingPath): RecognizedShape | null => {
  if (path.points.length < MIN_POINTS) {
    return null;
  }

  const points = path.points;
  
  // Try to recognize different shapes in order of complexity
  const lineResult = recognizeLine(points);
  if (lineResult && lineResult.confidence > 0.8) {
    return lineResult;
  }

  const circleResult = recognizeCircle(points);
  if (circleResult && circleResult.confidence > 0.7) {
    return circleResult;
  }

  const rectangleResult = recognizeRectangle(points);
  if (rectangleResult && rectangleResult.confidence > 0.7) {
    return rectangleResult;
  }

  const arrowResult = recognizeArrow(points);
  if (arrowResult && arrowResult.confidence > 0.75) {
    return arrowResult;
  }

  return null;
};

/**
 * Calculate distance between two points
 */
const distance = (p1: Point, p2: Point): number => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Calculate total path length
 */
const pathLength = (points: Point[]): number => {
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    length += distance(points[i - 1], points[i]);
  }
  return length;
};

/**
 * Recognize if path is a straight line
 */
const recognizeLine = (points: Point[]): RecognizedShape | null => {
  if (points.length < 2) return null;

  const start = points[0];
  const end = points[points.length - 1];
  const directDistance = distance(start, end);
  const totalLength = pathLength(points);

  // If the direct distance is close to the total path length, it's a line
  const straightness = directDistance / totalLength;
  
  if (straightness > (1 - LINE_STRAIGHTNESS_THRESHOLD)) {
    return {
      type: 'line',
      confidence: straightness,
      points: [start, end],
    };
  }

  return null;
};

/**
 * Recognize if path is a circle/ellipse
 */
const recognizeCircle = (points: Point[]): RecognizedShape | null => {
  if (points.length < 10) return null;

  // Check if path is closed
  const start = points[0];
  const end = points[points.length - 1];
  const totalLength = pathLength(points);
  const closedDistance = distance(start, end);

  // Path should loop back to start
  if (closedDistance > totalLength * 0.15) {
    return null;
  }

  // Find center point (average of all points)
  let centerX = 0;
  let centerY = 0;
  points.forEach(p => {
    centerX += p.x;
    centerY += p.y;
  });
  centerX /= points.length;
  centerY /= points.length;

  const center: Point = { x: centerX, y: centerY };

  // Calculate average radius
  let avgRadius = 0;
  points.forEach(p => {
    avgRadius += distance(p, center);
  });
  avgRadius /= points.length;

  // Calculate variance in radius (how circular it is)
  let variance = 0;
  points.forEach(p => {
    const r = distance(p, center);
    variance += Math.abs(r - avgRadius);
  });
  variance /= points.length;

  const roundness = 1 - (variance / avgRadius);

  if (roundness > (1 - CIRCLE_ROUNDNESS_THRESHOLD)) {
    // Generate perfect circle points
    const circlePoints: Point[] = [];
    const numPoints = 64;
    for (let i = 0; i <= numPoints; i++) {
      const angle = (i / numPoints) * 2 * Math.PI;
      circlePoints.push({
        x: center.x + avgRadius * Math.cos(angle),
        y: center.y + avgRadius * Math.sin(angle),
      });
    }

    return {
      type: 'circle',
      confidence: roundness,
      points: circlePoints,
    };
  }

  return null;
};

/**
 * Recognize if path is a rectangle
 */
const recognizeRectangle = (points: Point[]): RecognizedShape | null => {
  if (points.length < 15) return null;

  // Check if path is closed
  const start = points[0];
  const end = points[points.length - 1];
  const totalLength = pathLength(points);
  const closedDistance = distance(start, end);

  if (closedDistance > totalLength * 0.15) {
    return null;
  }

  // Find corners by detecting points where direction changes significantly
  const corners: Point[] = [start];
  const angleThreshold = Math.PI / 4; // 45 degrees

  for (let i = 2; i < points.length - 2; i++) {
    const prev = points[i - 2];
    const curr = points[i];
    const next = points[i + 2];

    const angle1 = Math.atan2(curr.y - prev.y, curr.x - prev.x);
    const angle2 = Math.atan2(next.y - curr.y, next.x - curr.x);
    let angleDiff = Math.abs(angle2 - angle1);

    // Normalize angle difference
    if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

    if (angleDiff > angleThreshold) {
      // Check if this corner is far enough from previous corners
      const tooClose = corners.some(c => distance(c, curr) < totalLength * 0.1);
      if (!tooClose) {
        corners.push(curr);
      }
    }
  }

  // Should have 4 corners for a rectangle
  if (corners.length !== 4) {
    return null;
  }

  // Calculate bounding box
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  corners.forEach(c => {
    minX = Math.min(minX, c.x);
    minY = Math.min(minY, c.y);
    maxX = Math.max(maxX, c.x);
    maxY = Math.max(maxY, c.y);
  });

  // Generate perfect rectangle
  const rectPoints: Point[] = [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
    { x: minX, y: minY },
  ];

  return {
    type: 'rectangle',
    confidence: 0.75,
    points: rectPoints,
  };
};

/**
 * Recognize if path is an arrow
 */
const recognizeArrow = (points: Point[]): RecognizedShape | null => {
  if (points.length < 8) return null;

  // An arrow is essentially a line with a triangular head at the end
  // Check if the first 70% of points form a line
  const linePartEnd = Math.floor(points.length * 0.7);
  const linePart = points.slice(0, linePartEnd);
  const lineResult = recognizeLine(linePart);

  if (!lineResult || lineResult.confidence < 0.8) {
    return null;
  }

  // Check if last 30% forms a "V" shape back from the end
  const headPart = points.slice(linePartEnd);
  if (headPart.length < 3) return null;

  const lineEnd = linePart[linePart.length - 1];
  const headStart = headPart[0];

  // Head should start near where line ends
  if (distance(lineEnd, headStart) > pathLength(linePart) * 0.1) {
    return null;
  }

  // Generate perfect arrow
  const start = lineResult.points[0];
  const end = lineResult.points[1];

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const angle = Math.atan2(dy, dx);
  const arrowLength = distance(start, end);
  const headLength = arrowLength * 0.2;

  const arrowPoints: Point[] = [
    start,
    end,
    {
      x: end.x - headLength * Math.cos(angle - Math.PI / 6),
      y: end.y - headLength * Math.sin(angle - Math.PI / 6),
    },
    end,
    {
      x: end.x - headLength * Math.cos(angle + Math.PI / 6),
      y: end.y - headLength * Math.sin(angle + Math.PI / 6),
    },
  ];

  return {
    type: 'arrow',
    confidence: 0.75,
    points: arrowPoints,
  };
};

