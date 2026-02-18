const xlsx = require('xlsx');
const path = require('path');

const filePath = 'D:\\Premade_Assignment\\Final amenity correction.xlsx';
const workbook = xlsx.readFile(filePath);
const sheetName = 'Water System';
const worksheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

console.log('--- WATER SYSTEM SHEET ROWS (first 20) ---');
data.slice(0, 20).forEach((row, i) => {
    console.log(`Row ${i}:`, row);
});
