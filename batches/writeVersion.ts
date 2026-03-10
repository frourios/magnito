import assert from 'assert';
import fs from 'fs';
import path from 'path';
import rootPackage from '../package.json' with { type: 'json' };

const version = process.argv[2];
const jsonPath = path.join(process.cwd(), 'package.json');

assert(/\d+\.\d+\.\d+/.test(version));

fs.writeFileSync(jsonPath, JSON.stringify({ ...rootPackage, version }, null, 2), 'utf8');
