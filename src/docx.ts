import JSZip from 'jszip';
import { readFile, writeFile } from 'node:fs/promises';
import { translateTexts } from './translate.js';

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function xmlUnescape(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function applyDirection(xml: string, sourceIsRTL: boolean, targetIsRTL: boolean): string {
  if (sourceIsRTL === targetIsRTL) return xml;

  if (targetIsRTL) {
    // Strip any existing markers first to avoid duplicates, then inject
    return xml
      .replace(/<w:bidi\s*\/>/g, '')
      .replace(/<w:rtl\s*\/>/g, '')
      .replace(/<\/w:pPr>/g, '<w:bidi/></w:pPr>')
      .replace(/<\/w:rPr>/g, '<w:rtl/></w:rPr>');
  } else {
    // RTL → LTR: strip all direction markers
    return xml
      .replace(/<w:bidi\s*\/>/g, '')
      .replace(/<w:rtl\s*\/>/g, '');
  }
}

export async function translateDocx(
  inputPath: string,
  outputPath: string,
  targetLang: string,
  sourceLang?: string,
  sourceIsRTL = false,
  targetIsRTL = false,
): Promise<void> {
  const data = await readFile(inputPath);
  const zip = await JSZip.loadAsync(data);

  const docFile = zip.file('word/document.xml');
  if (!docFile) throw new Error('Invalid DOCX: word/document.xml not found');

  const xml = await docFile.async('string');

  // Collect all <w:t> text content in order
  const wtRegex = /<w:t([^>]*)>([^<]*)<\/w:t>/g;
  const rawTexts: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = wtRegex.exec(xml)) !== null) {
    rawTexts.push(xmlUnescape(m[2] ?? ''));
  }

  const translated = await translateTexts(rawTexts, targetLang, sourceLang);

  // Replace each <w:t> text in order using a counter closure
  let i = 0;
  const translatedXml = xml.replace(
    /<w:t([^>]*)>([^<]*)<\/w:t>/g,
    (_, attrs: string) => {
      const text = translated[i++] ?? '';
      return `<w:t${attrs}>${xmlEscape(text)}</w:t>`;
    },
  );

  const finalXml = applyDirection(translatedXml, sourceIsRTL, targetIsRTL);

  zip.file('word/document.xml', finalXml);

  const output = await zip.generateAsync({ type: 'nodebuffer' });
  await writeFile(outputPath, output);
}
