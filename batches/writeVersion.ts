import assert from 'assert';
import fs from 'fs';
import path from 'path';

const version = process.argv[2];
const jsonPath = path.join(process.cwd(), 'package.json');

assert(/\d+\.\d+\.\d+/.test(version));

fs.writeFileSync(
  jsonPath,
  JSON.stringify({ ...JSON.parse(fs.readFileSync(jsonPath, 'utf8')), version }, null, 2),
  'utf8',
);
