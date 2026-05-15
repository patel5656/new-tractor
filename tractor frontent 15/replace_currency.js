import fs from 'fs';
import path from 'path';

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const original = content;
      content = content.replace(/₹/g, '₦').replace(/INR/g, 'NGN');
      if (content !== original) {
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

const currentDir = new URL('.', import.meta.url).pathname;
// Adjust the path because Windows pathname might start with /C:/
const basePath = currentDir.startsWith('/') ? currentDir.substring(1) : currentDir;
processDir(path.join(basePath, 'src'));
console.log('Currency replacement completed.');
