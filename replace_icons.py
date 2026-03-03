#!/usr/bin/env python3
"""
Script to replace material-symbols-outlined spans with Icon components
Handles all admin files that still need icon updates
"""

import re
import os
from pathlib import Path

# Icon size mappings based on Tailwind text sizes
SIZE_MAP = {
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
}

def extract_size_and_classes(class_str):
    """Extract size from Tailwind classes and return remaining classes + size"""
    size = None
    other_classes = []
    classes = class_str.split()
    
    for cls in classes:
        if cls in SIZE_MAP:
            size = SIZE_MAP[cls]
        else:
            other_classes.append(cls)
    
    return size, ' '.join(other_classes) if other_classes else None

def convert_span_to_icon(match):
    """Convert a material-symbols-outlined span to Icon component"""
    full_text = match.group(0)
    
    # Extract className
    class_match = re.search(r'className="([^"]*)"', full_text)
    if not class_match:
        return full_text
    
    class_str = class_match.group(1)
    size, other_classes = extract_size_and_classes(class_str)
    
    # Extract icon name
    icon_match = re.search(r'>([^<]+)<', full_text)
    if not icon_match:
        return full_text
    
    icon_name = icon_match.group(1).strip()
    
    # Build the Icon component
    size_str = f'size={{{size}}}' if size else ''
    class_str = f'className="{other_classes}"' if other_classes else ''
    parts = [f'<Icon name="{icon_name}"', size_str, class_str, '/>']
    result = ' '.join([p for p in parts if p])
    result = result.replace('  ', ' ')  # Clean up double spaces
    
    return result

def replace_icons_in_file(filepath):
    """Replace material-symbols-outlined spans in a file"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # Pattern to match material-symbols-outlined spans
    pattern = r'<span\s+className="([^"]*)material-symbols-outlined([^"]*)"[^>]*>([^<]+)</span>'
    
    # First, add Icon import if not already there
    if 'import Icon from' not in content and 'Icon from' not in content:
        # Find the last import statement
        last_import_idx = content.rfind('import ')
        if last_import_idx != -1:
            # Find the end of that import line
            line_end = content.find('\n', last_import_idx)
            import_statement = "import Icon from '../components/common/Icon';\n"
            content = content[:line_end + 1] + import_statement + content[line_end + 1:]
    
    # Replace all spans
    def replace_span(match):
        before_class = match.group(1)
        after_class = match.group(2)
        icon_name = match.group(3).strip()
        
        # Get full class string
        full_class = before_class + 'material-symbols-outlined' + after_class
        size, other_classes = extract_size_and_classes(full_class)
        
        # Build Icon component
        size_str = f'size={{{size}}}' if size else ''
        class_str = f'className="{other_classes}"' if other_classes else ''
        parts = [f'<Icon name="{icon_name}"', size_str, class_str, '/>']
        result = ' '.join([p for p in parts if p])
        result = result.replace('  ', ' ')
        
        return result
    
    content = re.sub(pattern, replace_span, content)
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

# Process files
files_to_process = [
    'src/admin/SeriesDetailManager.tsx',
    'src/admin/SeriesManager.tsx',
    'src/admin/DashboardOverview.tsx',
    'src/admin/AdminRightSidebar.tsx',
    'src/admin/ImageUploadInput.tsx',
    'src/admin/AdminPlaceholder.tsx',
]

workspace = Path('.')
processed = 0

for file_path in files_to_process:
    full_path = workspace / file_path
    if full_path.exists():
        if replace_icons_in_file(str(full_path)):
            print(f'✓ Updated {file_path}')
            processed += 1
        else:
            print(f'- No changes needed for {file_path}')
    else:
        print(f'✗ File not found: {file_path}')

print(f'\nProcessed {processed} files')
