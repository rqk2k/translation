import * as deepl from 'deepl-node';

const BATCH_SIZE = 50;

let _translator: deepl.Translator | undefined;

function getTranslator(): deepl.Translator {
  if (_translator) return _translator;
  const key = process.env['DEEPL_API_KEY'];
  if (!key) throw new Error('DEEPL_API_KEY not set');
  _translator = new deepl.Translator(key);
  return _translator;
}

export async function translateTexts(
  texts: string[],
  targetLang: string,
  sourceLang?: string,
): Promise<string[]> {
  const translator = getTranslator();
  const output: (string | undefined)[] = new Array(texts.length);

  const nonEmpty = texts
    .map((text, index) => ({ text, index }))
    .filter(({ text }) => text.trim().length > 0);

  for (let i = 0; i < nonEmpty.length; i += BATCH_SIZE) {
    const batch = nonEmpty.slice(i, i + BATCH_SIZE);
    const batchTexts = batch.map(({ text }) => text);

    const results = await translator.translateText(
      batchTexts,
      (sourceLang as deepl.SourceLanguageCode | null) ?? null,
      targetLang as deepl.TargetLanguageCode,
    );

    const resultsArr = Array.isArray(results) ? results : [results];
    for (let j = 0; j < batch.length; j++) {
      const item = batch[j];
      const result = resultsArr[j];
      if (item !== undefined && result !== undefined) {
        output[item.index] = result.text;
      }
    }
  }

  return texts.map((t, i) => output[i] ?? t);
}
