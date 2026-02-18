const xlsx = require('xlsx');
const fs = require('fs');

const filePath = 'D:\\Premade_Assignment\\Final amenity correction.xlsx';
const workbook = xlsx.readFile(filePath);
const sheetName = 'Exterior';
const worksheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

fs.writeFileSync('debug_sheet.json', JSON.stringify(data, null, 2));
console.log('Dumped Exterior sheet to debug_sheet.json');
