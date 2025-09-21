import { ExcalidrawElement, AppState } from '@excalidraw/excalidraw/types/types';

export interface ExcalidrawContext {
  elements: ExcalidrawElement[];
  appState: Partial<AppState>;
  summary: string;
  elementCount: number;
  hasText: boolean;
  hasShapes: boolean;
  hasArrows: boolean;
}

export function extractExcalidrawContext(excalidrawData: any): ExcalidrawContext {
  if (!excalidrawData || !excalidrawData.elements) {
    return {
      elements: [],
      appState: {},
      summary: "Empty canvas",
      elementCount: 0,
      hasText: false,
      hasShapes: false,
      hasArrows: false,
    };
  }

  const elements = excalidrawData.elements as ExcalidrawElement[];
  const appState = excalidrawData.appState || {};

  // Analyze elements
  const elementTypes = elements.map(el => el.type);
  const hasText = elementTypes.includes('text');
  const hasShapes = elementTypes.some(type =>
    ['rectangle', 'ellipse', 'diamond', 'freedraw'].includes(type)
  );
  const hasArrows = elementTypes.includes('arrow');

  // Create summary
  const summary = generateCanvasSummary(elements);

  return {
    elements,
    appState,
    summary,
    elementCount: elements.length,
    hasText,
    hasShapes,
    hasArrows,
  };
}

function generateCanvasSummary(elements: ExcalidrawElement[]): string {
  if (elements.length === 0) {
    return "Empty canvas with no elements";
  }

  const elementCounts = elements.reduce((acc, el) => {
    acc[el.type] = (acc[el.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const parts: string[] = [];

  if (elementCounts.text) {
    const textElements = elements.filter(el => el.type === 'text');
    const textContent = textElements.map(el => (el as any).text).join(', ');
    parts.push(`${elementCounts.text} text element(s): "${textContent}"`);
  }

  if (elementCounts.rectangle) {
    parts.push(`${elementCounts.rectangle} rectangle(s)`);
  }

  if (elementCounts.ellipse) {
    parts.push(`${elementCounts.ellipse} ellipse(s)`);
  }

  if (elementCounts.arrow) {
    parts.push(`${elementCounts.arrow} arrow(s)`);
  }

  if (elementCounts.freedraw) {
    parts.push(`${elementCounts.freedraw} freehand drawing(s)`);
  }

  return `Canvas contains: ${parts.join(', ')}`;
}

export function serializeForLLM(context: ExcalidrawContext): string {
  const { summary, elementCount, hasText, hasShapes, hasArrows, elements } = context;

  let description = `Canvas Analysis:\n`;
  description += `- Summary: ${summary}\n`;
  description += `- Total elements: ${elementCount}\n`;
  description += `- Contains text: ${hasText}\n`;
  description += `- Contains shapes: ${hasShapes}\n`;
  description += `- Contains arrows: ${hasArrows}\n\n`;

  if (hasText) {
    const textElements = elements.filter(el => el.type === 'text');
    description += `Text Content:\n`;
    textElements.forEach((el, index) => {
      description += `${index + 1}. "${(el as any).text}"\n`;
    });
    description += '\n';
  }

  if (hasShapes || hasArrows) {
    description += `Visual Elements:\n`;
    const visualElements = elements.filter(el => el.type !== 'text');
    visualElements.forEach((el, index) => {
      description += `${index + 1}. ${el.type} at position (${Math.round(el.x)}, ${Math.round(el.y)})\n`;
    });
  }

  return description;
}