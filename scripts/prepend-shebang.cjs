const fs = require('fs');
const path = require('path');

const filePath = process.argv[2];

if (!filePath) {
  console.error('Please provide a file path.');
  process.exit(1);
}

const absolutePath = path.resolve(filePath);

fs.readFile(absolutePath, 'utf8', (err, data) => {
  if (err) {
    console.error(`Error reading file: ${err}`);
    process.exit(1);
  }

  const shebang = '#!/usr/bin/env node\n';
  const newData = shebang + data;

  fs.writeFile(absolutePath, newData, 'utf8', (err) => {
    if (err) {
      console.error(`Error writing file: ${err}`);
      process.exit(1);
    }
    console.log(`Shebang added to ${absolutePath}`);
  });
});
