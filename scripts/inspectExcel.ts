
import XLSX from 'xlsx';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.resolve('data/nist-800-171a.xlsx');
const workbook = XLSX.readFile(filePath);

console.log('Sheet Names:', workbook.SheetNames);

const secondSheetName = workbook.SheetNames[1];
const worksheet = workbook.Sheets[secondSheetName];
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }); // Use array of arrays to see everything

console.log('Total Rows:', data.length);
console.log('First 5 Rows Sample:', JSON.stringify(data.slice(0, 5), null, 2));
