import { createRequire } from 'node:module';
import path from 'node:path';
import { parseDocument } from 'htmlparser2';
import type { Alignment, Content, CustomTableLayout, TableCell } from 'pdfmake';

/**
 * HTML → PDF (Chromium'siz). pdfmake + Roboto (lotin va kirill), A4.
 * HTML'ning hujjatlar uchun yetarli qismi qo'llanadi: sarlavhalar, paragraf, qalin/qiya,
 * jadval (colspan, width), ro'yxatlar, hr, br; tekislash — class="right|center" yoki style="text-align".
 * Noma'lum teglar matn sifatida o'qiladi, rasm/skript e'tiborga olinmaydi.
 */

const require = createRequire(import.meta.url);
type PdfMake = typeof import('pdfmake');
const pdfmake = require('pdfmake') as PdfMake;
type TDocumentDefinitions = Parameters<PdfMake['createPdf']>[0];
type ContentText = Extract<Content, { text: unknown }>;
const fontsDir = path.join(
  path.dirname(require.resolve('pdfmake/package.json')),
  'fonts',
  'Roboto',
);

pdfmake.setFonts({
  Roboto: {
    normal: path.join(fontsDir, 'Roboto-Regular.ttf'),
    bold: path.join(fontsDir, 'Roboto-Medium.ttf'),
    italics: path.join(fontsDir, 'Roboto-Italic.ttf'),
    bolditalics: path.join(fontsDir, 'Roboto-MediumItalic.ttf'),
  },
});
// Tashqi URL va fayllarga murojaat taqiqlanadi (faqat shriftlar)
pdfmake.setUrlAccessPolicy(() => false);
pdfmake.setLocalAccessPolicy((p) => path.resolve(p).startsWith(fontsDir));

const GRID: CustomTableLayout = {
  hLineWidth: () => 0.5,
  vLineWidth: () => 0.5,
  hLineColor: () => '#555555',
  vLineColor: () => '#555555',
  paddingLeft: () => 4,
  paddingRight: () => 4,
  paddingTop: () => 2,
  paddingBottom: () => 2,
};
const PLAIN: CustomTableLayout = {
  hLineWidth: () => 0,
  vLineWidth: () => 0,
  paddingLeft: () => 0,
  paddingRight: () => 8,
  paddingTop: () => 2,
  paddingBottom: () => 2,
};

interface DomNode {
  type: string;
  data?: string;
  name?: string;
  attribs?: Record<string, string>;
  children?: DomNode[];
}

interface Style {
  bold?: boolean;
  italics?: boolean;
  decoration?: 'underline';
  fontSize?: number;
}

type Run = ContentText | string;

const BLOCK = new Set([
  'p',
  'div',
  'section',
  'article',
  'header',
  'footer',
  'main',
  'blockquote',
  'h1',
  'h2',
  'h3',
  'h4',
  'table',
  'ul',
  'ol',
  'hr',
  'body',
  'html',
]);
const SKIP = new Set(['script', 'style', 'head', 'title', 'img', 'svg', 'iframe', 'object']);
const HEADING: Record<string, number> = { h1: 15, h2: 13, h3: 11, h4: 10 };

/** O'zbekcha apostroflar shriftda yo'q (ʻ ʼ) — ‘ ’ ga almashtiriladi */
export function normalizeText(s: string): string {
  return s.replace(/ʻ/g, '‘').replace(/ʼ/g, '’');
}

function attrAlign(n: DomNode): Alignment | undefined {
  const a = n.attribs ?? {};
  const cls = ` ${a.class ?? ''} `;
  const style = a.style ?? '';
  const m = /text-align\s*:\s*(left|right|center|justify)/i.exec(style);
  const v = (m?.[1] ?? a.align ?? '').toLowerCase();
  if (v === 'left' || v === 'right' || v === 'center' || v === 'justify') return v;
  if (cls.includes(' right ')) return 'right';
  if (cls.includes(' center ')) return 'center';
  return undefined;
}

function attrStyle(n: DomNode, base: Style): Style {
  const s: Style = { ...base };
  const tag = n.name ?? '';
  if (tag === 'b' || tag === 'strong' || tag === 'th') s.bold = true;
  if (tag === 'i' || tag === 'em') s.italics = true;
  if (tag === 'u') s.decoration = 'underline';
  if (tag === 'small') s.fontSize = 8;
  if (HEADING[tag]) {
    s.bold = true;
    s.fontSize = HEADING[tag];
  }
  const st = n.attribs?.style ?? '';
  if (/font-weight\s*:\s*(bold|[6-9]00)/i.test(st)) s.bold = true;
  if (/font-style\s*:\s*italic/i.test(st)) s.italics = true;
  const fs = /font-size\s*:\s*(\d+(?:\.\d+)?)\s*(px|pt)?/i.exec(st);
  if (fs) {
    const v = Number(fs[1]);
    s.fontSize = Math.min(32, Math.max(6, fs[2] === 'px' ? v * 0.75 : v));
  }
  return s;
}

function textRun(text: string, s: Style): Run {
  const t = normalizeText(text);
  if (!s.bold && !s.italics && !s.decoration && !s.fontSize) return t;
  return { text: t, ...s };
}

/** Bloklar ketma-ketligini quradi; inline matn paragraflarga yig'iladi */
class Builder {
  out: Content[] = [];
  private runs: Run[] = [];

  constructor(private readonly align?: Alignment) {}

  pushRun(r: Run): void {
    this.runs.push(r);
  }

  flush(margin: [number, number, number, number] = [0, 0, 0, 4]): void {
    const runs = trimRuns(this.runs);
    this.runs = [];
    if (runs.length === 0) return;
    this.out.push({ text: runs, margin, ...(this.align ? { alignment: this.align } : {}) });
  }
}

/** Paragraf boshidagi/oxiridagi bo'shliqlarni olib tashlash */
function trimRuns(runs: Run[]): Run[] {
  const r = runs.map((x) => (typeof x === 'string' ? x : { ...x }));
  const get = (x: Run) => (typeof x === 'string' ? x : String(x.text));
  const set = (i: number, v: string) => {
    const x = r[i]!;
    if (typeof x === 'string') r[i] = v;
    else x.text = v;
  };
  if (r.length > 0) set(0, get(r[0]!).replace(/^[ \t]+/, ''));
  if (r.length > 0) set(r.length - 1, get(r[r.length - 1]!).replace(/[ \t]+$/, ''));
  const filtered = r.filter((x) => get(x) !== '');
  return filtered.length === 1 && get(filtered[0]!).trim() === '' ? [] : filtered;
}

function walk(nodes: DomNode[], b: Builder, style: Style): void {
  for (const n of nodes) {
    if (n.type === 'text') {
      const t = (n.data ?? '').replace(/\s+/g, ' ');
      if (t) b.pushRun(textRun(t, style));
      continue;
    }
    if (n.type !== 'tag' || !n.name) continue;
    const tag = n.name.toLowerCase();
    if (SKIP.has(tag)) continue;
    if (tag === 'br') {
      b.pushRun('\n');
      continue;
    }
    const st = attrStyle(n, style);
    if (!BLOCK.has(tag)) {
      walk(n.children ?? [], b, st);
      continue;
    }
    b.flush();
    if (tag === 'hr') {
      b.out.push({
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5 }],
        margin: [0, 4, 0, 6],
      });
      continue;
    }
    if (tag === 'table') {
      b.out.push(table(n, st));
      continue;
    }
    if (tag === 'ul' || tag === 'ol') {
      const items = (n.children ?? [])
        .filter((c) => c.type === 'tag' && c.name === 'li')
        .map((li) => stack(li.children ?? [], st, attrAlign(li)));
      b.out.push(
        tag === 'ul' ? { ul: items, margin: [0, 0, 0, 4] } : { ol: items, margin: [0, 0, 0, 4] },
      );
      continue;
    }
    const inner = new Builder(attrAlign(n));
    walk(n.children ?? [], inner, st);
    inner.flush(HEADING[tag] ? [0, 6, 0, 4] : [0, 0, 0, 4]);
    b.out.push(...inner.out);
  }
}

function stack(nodes: DomNode[], style: Style, align?: Alignment): Content {
  const b = new Builder(align);
  walk(nodes, b, style);
  b.flush([0, 0, 0, 0]);
  if (b.out.length === 0) return '';
  return b.out.length === 1 ? b.out[0]! : { stack: b.out };
}

function rowsOf(n: DomNode): { row: DomNode; head: boolean }[] {
  const out: { row: DomNode; head: boolean }[] = [];
  for (const c of n.children ?? []) {
    if (c.type !== 'tag') continue;
    if (c.name === 'tr') out.push({ row: c, head: false });
    if (c.name === 'thead' || c.name === 'tbody' || c.name === 'tfoot') {
      for (const r of c.children ?? []) {
        if (r.type === 'tag' && r.name === 'tr') out.push({ row: r, head: c.name === 'thead' });
      }
    }
  }
  return out;
}

function cellWidth(c: DomNode): string | number {
  const raw = c.attribs?.width ?? /width\s*:\s*([\d.]+%?)/i.exec(c.attribs?.style ?? '')?.[1];
  if (!raw) return '*';
  if (raw.endsWith('%')) return raw;
  const v = Number(raw);
  return Number.isFinite(v) && v > 0 ? v : '*';
}

function table(n: DomNode, style: Style): Content {
  const rows = rowsOf(n);
  const plain = /\b(plain|no-border)\b/.test(n.attribs?.class ?? '');
  let cols = 0;
  const body: TableCell[][] = [];
  let widths: (string | number)[] = [];
  for (const { row } of rows) {
    const cells = (row.children ?? []).filter(
      (c) => c.type === 'tag' && (c.name === 'td' || c.name === 'th'),
    );
    const out: TableCell[] = [];
    const w: (string | number)[] = [];
    for (const c of cells) {
      const span = Math.max(1, Math.min(20, Number(c.attribs?.colspan ?? 1) || 1));
      const content = stack(c.children ?? [], attrStyle(c, style), attrAlign(c));
      const cell: TableCell =
        typeof content === 'string' ? { text: content } : ({ stack: [content] } as TableCell);
      if (span > 1) (cell as { colSpan?: number }).colSpan = span;
      out.push(cell);
      w.push(span === 1 ? cellWidth(c) : '*');
      for (let i = 1; i < span; i++) {
        out.push({ text: '' });
        w.push('*');
      }
    }
    if (out.length > cols) {
      cols = out.length;
      widths = w;
    }
    body.push(out);
  }
  if (cols === 0) return { text: '' };
  for (const r of body) while (r.length < cols) r.push({ text: '' });
  const headerRows = rows.filter((r) => r.head).length;
  return {
    table: { widths, body, ...(headerRows ? { headerRows } : {}) },
    layout: plain ? PLAIN : GRID,
    margin: [0, 2, 0, 8],
  };
}

/** HTML → pdfmake kontenti (testlar uchun alohida) */
export function htmlToContent(html: string): Content[] {
  const doc = parseDocument(html, { decodeEntities: true, lowerCaseTags: true });
  const b = new Builder();
  walk(doc.children as unknown as DomNode[], b, {});
  b.flush();
  return b.out;
}

export async function htmlToPdf(html: string, title: string): Promise<Buffer> {
  const def: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 48],
    info: { title, creator: 'Savdo CRM' },
    defaultStyle: { font: 'Roboto', fontSize: 10, lineHeight: 1.15 },
    content: htmlToContent(html),
    footer: (page: number, count: number) => ({
      text: `${title} · ${page} / ${count}`,
      alignment: 'center',
      fontSize: 8,
      color: '#777777',
    }),
  };
  const buf = await pdfmake.createPdf(def).getBuffer();
  return Buffer.from(buf);
}
