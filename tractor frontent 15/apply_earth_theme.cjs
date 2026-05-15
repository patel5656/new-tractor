const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function traverseAndReplace(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            traverseAndReplace(fullPath);
        } else if (fullPath.endsWith('.jsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            
            // 1. Backgrounds
            content = content.replace(/bg-neutral-950/g, 'bg-earth-main');
            content = content.replace(/bg-neutral-900/g, 'bg-earth-card'); // Sidebars will need manual fix
            content = content.replace(/bg-neutral-800/g, 'bg-earth-card-alt');
            
            // 2. Texts
            content = content.replace(/text-white/g, 'text-earth-brown');
            content = content.replace(/text-neutral-100/g, 'text-earth-brown');
            content = content.replace(/text-neutral-200/g, 'text-earth-brown');
            content = content.replace(/text-neutral-300/g, 'text-earth-brown');
            
            content = content.replace(/text-neutral-400/g, 'text-earth-sub');
            content = content.replace(/text-neutral-500/g, 'text-earth-mut');
            content = content.replace(/text-neutral-600/g, 'text-earth-mut');
            
            content = content.replace(/text-neutral-950/g, 'text-earth-brown');
            content = content.replace(/text-neutral-900/g, 'text-earth-brown');
            
            // 3. Accents
            content = content.replace(/bg-accent-500/g, 'bg-earth-primary');
            content = content.replace(/hover:bg-accent-400/g, 'hover:bg-earth-primary-hover');
            content = content.replace(/text-accent-400/g, 'text-earth-primary');
            content = content.replace(/text-accent-500/g, 'text-earth-primary');
            content = content.replace(/border-accent-500/g, 'border-earth-primary');
            content = content.replace(/from-accent-500/g, 'from-earth-primary');
            
            // 4. Emerald mostly used for success/status, but for primary buttons it needs to be orange
            content = content.replace(/bg-emerald-500/g, 'bg-earth-primary'); // Assumes buttons were emerald
            content = content.replace(/hover:bg-emerald-400/g, 'hover:bg-earth-primary-hover'); // Assumes buttons were emerald
            content = content.replace(/text-emerald-400/g, 'text-earth-green');
            content = content.replace(/text-emerald-500/g, 'text-earth-green');
            
            // 5. Borders
            content = content.replace(/border-neutral-800/g, 'border-earth-dark\/10');
            content = content.replace(/border-neutral-700/g, 'border-earth-dark\/15');
            
            fs.writeFileSync(fullPath, content, 'utf8');
            console.log(`Updated: ${fullPath}`);
        }
    }
}

traverseAndReplace(srcDir);
console.log("Theme classes replacement complete!");
