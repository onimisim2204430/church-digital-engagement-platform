#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Icon size mappings based on Tailwind text sizes
const SIZE_MAP = {
  'text-4xl': 36,
  'text-5xl': 48,
  'text-3xl': 32,
  'text-2xl': 24,
  'text-xl': 20,
  'text-lg': 18,
  'text-base': 16,
  'text-sm': 14,
  'text-[18px]': 18,
  'text-[14px]': 14,
  'text-[12px]': 12,
  'text-[10px]': 10,
};

function extractSizeAndClasses(classStr) {
  const classes = classStr.split(/\s+/);
  let size = null;
  const otherClasses = [];
  
  for (const cls of classes) {
    if (SIZE_MAP[cls]) {
      size = SIZE_MAP[cls];
    } else {
      otherClasses.push(cls);
    }
  }
  
  return {
    size,
    classes: otherClasses.length > 0 ? otherClasses.join(' ') : null
  };
}

function replaceIconsInFile(filepath) {
  let content = fs.readFileSync(filepath, 'utf-8');
  const original = content;
  
  // Add Icon import if not present
  if (!content.includes('import Icon from')) {
    const lastImportMatch = content.match(/import\s+.*?from\s+['"][^'"]+['"]\s*;/g);
    if (lastImportMatch) {
      const lastImport = lastImportMatch[lastImportMatch.length - 1];
      const lastImportIdx = content.lastIndexOf(lastImport);
      const insertPos = lastImportIdx + lastImport.length + 1;
      content = content.slice(0, insertPos) + 
                "\nimport Icon from '../components/common/Icon';" + 
                content.slice(insertPos);
    }
  }
  
  // Replace material-symbols-outlined spans
  // Pattern: <span className="...material-symbols-outlined...">icon_name</span>
  const pattern = /<span\s+className="([^"]*)material-symbols-outlined([^"]*)"\s*>([^<]+)<\/span>/g;
  
  content = content.replace(pattern, (match, before, after, iconName) => {
    const fullClass = before + 'material-symbols-outlined' + after;
    const { size, classes } = extractSizeAndClasses(fullClass);
    
    let result = `<Icon name="${iconName.trim()}"`;
    if (size) result += ` size={${size}}`;
    if (classes) result += ` className="${classes}"`;
    result += ' />';
    
    return result;
  });
  
  if (content !== original) {
    fs.writeFileSync(filepath, content, 'utf-8');
    return true;
  }
  return false;
}

// Files to process
const files = [
  'src/admin/SeriesDetailManager.tsx',
  'src/admin/SeriesManager.tsx',
  'src/admin/DashboardOverview.tsx',
  'src/admin/layouts/AdminRightSidebar.tsx',
  'src/admin/components/ImageUploadInput.tsx',
  'src/admin/AdminPlaceholder.tsx',
];

let processed = 0;

for (const file of files) {
  const filepath = path.join(process.cwd(), file);
  if (fs.existsSync(filepath)) {
    if (replaceIconsInFile(filepath)) {
      console.log(`✓ Updated ${file}`);
      processed++;
    } else {
      console.log(`- No changes needed for ${file}`);
    }
  } else {
    console.log(`✗ File not found: ${file}`);
  }
}

console.log(`\nProcessed ${processed} files`);
