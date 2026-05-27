import 'dotenv/config';
import { program } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { existsSync } from 'node:fs';
import { extname, join, dirname, basename } from 'node:path';
import {
  SUPPORTED_LANGUAGES,
  LANGUAGE_NAMES,
  DEEPL_SOURCE,
  DEEPL_TARGET,
  isLangCode,
} from './languages.js';
import { translateDocx } from './docx.js';
import { translatePdf } from './pdf.js';
import { translateTexts } from './translate.js';

async function main(): Promise<void> {
  program
    .name('translate')
    .description('Translate text or documents (.docx, .pdf) using DeepL')
    .argument('<input>', 'text string or path to a .docx or .pdf file')
    .option(
      '-f, --from <lang>',
      `source language (${SUPPORTED_LANGUAGES.join(', ')}); auto-detected if omitted`,
    )
    .option('-t, --to <lang>', `target language (${SUPPORTED_LANGUAGES.join(', ')})`);

  program.parse();

  if (!process.env['DEEPL_API_KEY']) {
    console.error(
      chalk.red('Error: DEEPL_API_KEY is not set. Add it to a .env file or export it in your shell.'),
    );
    process.exit(1);
  }

  const opts = program.opts<{ from?: string; to?: string }>();
  const input = program.args[0];

  if (input === undefined) {
    console.error(chalk.red('Error: <input> argument is required'));
    process.exit(1);
  }

  // Validate --from if provided
  if (opts.from !== undefined && !isLangCode(opts.from)) {
    console.error(
      chalk.red(`Error: unsupported source language "${opts.from}". Supported: ${SUPPORTED_LANGUAGES.join(', ')}`),
    );
    process.exit(1);
  }

  // Resolve --to, prompt if missing
  let toLangRaw = opts.to;
  if (!toLangRaw) {
    const answer = await inquirer.prompt<{ to: string }>([
      {
        type: 'select',
        name: 'to',
        message: 'Target language:',
        choices: SUPPORTED_LANGUAGES.map((code) => ({
          name: `${LANGUAGE_NAMES[code]} (${code})`,
          value: code,
        })),
      },
    ]);
    toLangRaw = answer.to;
  }

  if (!isLangCode(toLangRaw)) {
    console.error(
      chalk.red(`Error: unsupported target language "${toLangRaw}". Supported: ${SUPPORTED_LANGUAGES.join(', ')}`),
    );
    process.exit(1);
  }

  const targetLang = DEEPL_TARGET[toLangRaw];
  const sourceLang =
    opts.from !== undefined && isLangCode(opts.from) ? DEEPL_SOURCE[opts.from] : undefined;

  // Detect whether input is a file path or a raw string
  if (existsSync(input)) {
    const ext = extname(input).toLowerCase();
    const dir = dirname(input);
    const base = basename(input, ext);

    if (ext === '.docx') {
      const outputPath = join(dir, `${base}.${toLangRaw}.docx`);
      console.log(chalk.cyan(`Translating DOCX → ${outputPath} …`));
      await translateDocx(input, outputPath, targetLang, sourceLang);
      console.log(chalk.green(`Done: ${outputPath}`));
    } else if (ext === '.pdf') {
      const outputPath = join(dir, `${base}.${toLangRaw}.txt`);
      console.log(chalk.yellow('Note: PDF output is plain text — formatting cannot be preserved.'));
      console.log(chalk.cyan(`Translating PDF → ${outputPath} …`));
      await translatePdf(input, outputPath, targetLang, sourceLang);
      console.log(chalk.green(`Done: ${outputPath}`));
    } else {
      console.error(chalk.red(`Error: unsupported file type "${ext}". Supported: .docx, .pdf`));
      process.exit(1);
    }
  } else {
    // Treat input as a plain string
    const [result] = await translateTexts([input], targetLang, sourceLang);
    console.log(result ?? input);
  }
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(chalk.red(`Error: ${message}`));
  process.exit(1);
});
