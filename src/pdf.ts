import { readFile, writeFile } from 'node:fs/promises';
import { PDFParse } from 'pdf-parse';
import { translateTexts } from './translate.js';

export async function translatePdf(
  inputPath: string,
  outputPath: string,
  targetLang: string,
  sourceLang?: string,
  targetIsRTL = false,
): Promise<void> {
  const data = await readFile(inputPath);

  const parser = new PDFParse({ data });
  const result = await parser.getText();
  await parser.destroy();

  const lines = result.text.split('\n').filter((l) => l.trim().length > 0);
  const translated = await translateTexts(lines, targetLang, sourceLang);

  // Prepend a Right-to-Left Mark so plain-text viewers render RTL correctly
  const prefix = targetIsRTL ? '‏' : '';
  await writeFile(outputPath, translated.map((l) => prefix + l).join('\n'), 'utf-8');
}
