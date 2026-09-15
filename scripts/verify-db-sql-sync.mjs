// 檢查 supabase/ 與 docs 內 DB SQL v2.0 規格包是否一致（SHA-256）
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const source = join(root, 'docs', '森映_Headless自助建站平台_DB_SQL_v2.0', 'supabase');
const target = join(root, 'supabase');

function listSql(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return listSql(full);
    return entry.name.endsWith('.sql') ? [full] : [];
  });
}

const hash = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');
const problems = [];

for (const file of listSql(source)) {
  const rel = relative(source, file);
  const copy = join(target, rel);
  if (!existsSync(copy)) problems.push(`missing: supabase/${rel}`);
  else if (hash(copy) !== hash(file)) problems.push(`changed: supabase/${rel}`);
}
for (const file of listSql(target)) {
  const rel = relative(target, file);
  if (!existsSync(join(source, rel))) problems.push(`extra: supabase/${rel}`);
}

if (problems.length > 0) {
  console.error('DB SQL v2.0 not in sync:\n' + problems.join('\n'));
  process.exit(1);
}
console.log('DB SQL v2.0 in sync.');
