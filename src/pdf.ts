import { readFile, writeFile } from 'node:fs/promises';
import { PDFParse } from 'pdf-parse';
import { translateTexts } from './translate.js';

export async function translatePdf(
  inputPath: string,
  outputPath: string,
  targetLang: string,
  sourceLang?: string,
): Promise<void> {
  const data = await readFile(inputPath);

  const parser = new PDFParse({ data });
  const result = await parser.getText();
  await parser.destroy();

  const lines = result.text.split('\n').filter((l) => l.trim().length > 0);
  const translated = await translateTexts(lines, targetLang, sourceLang);

  await writeFile(outputPath, translated.join('\n'), 'utf-8');
}
