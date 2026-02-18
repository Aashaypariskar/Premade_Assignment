const xlsx = require('xlsx');
const fs = require('fs');
const filePath = 'D:\\Premade_Assignment\\Final amenity correction.xlsx';

function analyze() {
    try {
        let output = '--- ANALYZING EXCEL STRUCTURE FOR ACTIVITY TYPES ---\n';
        const workbook = xlsx.readFile(filePath);

        workbook.SheetNames.forEach(sheetName => {
            if (sheetName === 'Final Estimate') return;

            output += `\n--- SHEET: "${sheetName}" ---\n`;
            const worksheet = workbook.Sheets[sheetName];
            const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

            // 1. Print Header Rows
            rows.slice(0, 5).forEach((row, i) => {
                output += `Row ${i}: ${JSON.stringify(row)}\n`;
            });

            // 2. Scan for "Major"
            rows.forEach((row, index) => {
                if (!row) return;
                const rowStr = JSON.stringify(row).toLowerCase();
                if (rowStr.includes('major')) {
                    output += `!!! FOUND 'MAJOR' in Row ${index}: ${JSON.stringify(row)}\n`;
                }
            });
        });

        fs.writeFileSync('analysis_output.txt', output);
        console.log('Analysis written to analysis_output.txt');

    } catch (err) {
        console.error('Analysis Failed:', err);
    }
}

analyze();
