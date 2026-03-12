#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function cleanupIconComponents(filepath) {
  let content = fs.readFileSync(filepath, 'utf-8');
  const original = content;
  
  // Remove material-symbols-outlined class from Icon components
  // Pattern: <Icon ... className="material-symbols-outlined ...
  content = content.replace(/<Icon\s+name="([^"]+)"([^>]*)className="material-symbols-outlined"\s/g, 
    '<Icon name="$1"$2');
  
  // Also handle when material-symbols-outlined is in the middle of other classes
  content = content.replace(/<Icon\s+([^>]*)className="([^"]*)\s*material-symbols-outlined\s*([^"]*)"/g, 
    '<Icon $1className="$2 $3"');
  content = content.replace(/className="([^"]*)\s*material-symbols-outlined\s*([^"]*)"/g, 
    'className="$1$2"');
  
  // Fix dynamic icon names that are incorrectly quoted
  // Pattern: name="{variable}" should be name={variable}
  content = content.replace(/name="{([^}]+)}"/g, 'name={$1}');
  
  // Clean up double spaces in className
  content = content.replace(/className="([^"]*)  +([^"]*)"/g, 'className="$1 $2"');
  
  if (content !== original) {
    fs.writeFileSync(filepath, content, 'utf-8');
    return true;
  }
  return false;
}

// Cleanup Icon components in converted admin files
const admin_files = [
  'src/admin/SeriesDetailManager.tsx',
  'src/admin/SeriesManager.tsx',
  'src/admin/DashboardOverview.tsx',
  'src/admin/layouts/AdminRightSidebar.tsx',
  'src/admin/components/ImageUploadInput.tsx',
  'src/admin/AdminPlaceholder.tsx',
];

console.log('Cleaning up Icon components...');
let cleaned = 0;

for (const file of admin_files) {
  const filepath = path.join(process.cwd(), file);
  if (fs.existsSync(filepath)) {
    if (cleanupIconComponents(filepath)) {
      console.log(`✓ Cleaned up ${file}`);
      cleaned++;
    }
  }
}

console.log(`\nCleaned ${cleaned} files`);
