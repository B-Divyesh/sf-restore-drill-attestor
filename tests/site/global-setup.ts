import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

const exec = promisify(execFile);

export default async function globalSetup(): Promise<void> {
  const repo = resolve(import.meta.dirname, '../..');
  await exec('cargo', ['test', '--no-run', '--quiet', '--manifest-path', resolve(repo, 'Cargo.toml')], {
    cwd: repo,
    env: process.env,
    timeout: 120_000
  });
}
