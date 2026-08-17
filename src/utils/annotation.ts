

import { FileText, Pencil, MessageCircle } from 'lucide-react-native';

export const ANNOTATION_META_OPEN = '[[meta]]';
export const ANNOTATION_META_CLOSE = '[[/meta]]';

export type AnnotationType = 'comment' | 'note' | 'draw';

export interface AnnotationRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AnnotationPoint {
  x: number;
  y: number;
}

export interface ParsedAnnotationMeta {
  meta: Record<string, unknown>;
  note: string;
}

export function parseAnnotationMeta(text: string): ParsedAnnotationMeta {
  const metaStart = text.indexOf(ANNOTATION_META_OPEN);
  const metaEnd = text.indexOf(ANNOTATION_META_CLOSE);

  let meta: Record<string, unknown> = {};
  let note = text;

  if (metaStart === 0 && metaEnd > ANNOTATION_META_OPEN.length) {
    try {
      meta = JSON.parse(text.slice(ANNOTATION_META_OPEN.length, metaEnd)) as Record<string, unknown>;
    } catch {
      meta = {};
    }
    note = text.slice(metaEnd + ANNOTATION_META_CLOSE.length).trim();
  }

  return { meta, note };
}

export function sanitizeHighlightRects(input: unknown): AnnotationRect[] | null {
  if (!Array.isArray(input)) return null;
  const out: AnnotationRect[] = [];
  for (const item of input) {
    if (item && typeof item === 'object') {
      const x = Number((item as any).x);
      const y = Number((item as any).y);
      const w = Number((item as any).w);
      const h = Number((item as any).h);
      if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(w) && Number.isFinite(h)) {
        out.push({ x, y, w, h });
      }
    }
  }
  return out.length > 0 ? out : null;
}

export function sanitizeAnchorPercent(input: unknown): AnnotationPoint | null {
  if (input && typeof input === 'object') {
    const x = Number((input as any).x);
    const y = Number((input as any).y);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      return { x, y };
    }
  }
  return null;
}

export function normalizeAnnotationType(value: unknown): AnnotationType {
  const str = String(value || '');
  if (str === 'note' || str === 'draw') return str;
  return 'comment';
}

export const ANNOTATION_ICONS = {
  note: FileText,
  draw: Pencil,
  comment: MessageCircle,
} as const;
