import { 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify, 
  PlusCircle,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Code,
  Undo,
  Redo,
  Heading,
  ChevronDown,
  Link,
  Image,
  Table,
  SeparatorHorizontal,
  BookOpen,
  Heart,
  Megaphone,
  Eye,
  FileDown,
  FileCode,
  Subscript,
  Superscript,
  Weight,
  Paintbrush,
  Space,
  AlignVerticalJustifyCenter,
  ArrowLeftRight,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  SigmaSquare,
  Layers,
  FileCheck,
  LayoutTemplate,
  Palette,
  Languages,
  Mic,
  Keyboard,
  Rocket,
  Calendar,
  Trash2,
  Type,
  Highlighter,
  CaseSensitive,
  Sparkles,
  WrapText,
  Columns2,
  Columns3,
  Columns4,
  CheckSquare,
  Info,
  Terminal,
  FileText,
  Video,
  Search,
  X,
  MoreHorizontal,

  Save,

 
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
// SacredEditor.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import postService from '../services/post.service';
import draftService from '../services/draft.service';
import seriesService from '../services/series.service';
import ImageUploadInput from './components/ImageUploadInput';
import Icon from '../components/common/Icon';

interface PostMetadata {
  title: string;
  contentType: string;
  series: string;
  tags: string[];
  featuredImage: string | null;
  videoUrl: string;
  allowComments: boolean;
  allowReactions: boolean;
  featuredOnHomepage: boolean;
}

interface SacredEditorProps {
  mode?: 'create' | 'edit';
  postId?: string;
  draftId?: string;
  initialData?: any;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// Custom hook for contentEditable
const useContentEditable = (initialContent: string) => {
  const [content, setContent] = useState(initialContent);
  const ref = useRef<HTMLDivElement>(null);
  const isUpdatingRef = useRef(false);
  const lastCursorPositionRef = useRef<{ node: Node; offset: number } | null>(null);

  // Save cursor position
  const saveCursorPosition = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (ref.current && ref.current.contains(range.commonAncestorContainer)) {
        lastCursorPositionRef.current = {
          node: range.startContainer,
          offset: range.startOffset
        };
      }
    }
  };

  // Restore cursor position
  const restoreCursorPosition = () => {
    if (!lastCursorPositionRef.current || !ref.current) return;
    
    try {
      const { node, offset } = lastCursorPositionRef.current;
      if (ref.current.contains(node)) {
        const selection = window.getSelection();
        const range = document.createRange();
        range.setStart(node, Math.min(offset, node.textContent?.length || 0));
        range.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    } catch (e) {
      console.log('Could not restore cursor position');
    }
  };

  const handleChange = () => {
    if (ref.current && !isUpdatingRef.current) {
      saveCursorPosition();
      isUpdatingRef.current = true;
      const newContent = ref.current.innerHTML;
      if (newContent !== content) {
        setContent(newContent);
      }
      isUpdatingRef.current = false;
    }
  };

  useEffect(() => {
    if (ref.current && !isUpdatingRef.current && ref.current.innerHTML !== content) {
      isUpdatingRef.current = true;
      saveCursorPosition();
      ref.current.innerHTML = content;
      restoreCursorPosition();
      isUpdatingRef.current = false;
    }
  }, [content]);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== initialContent) {
      ref.current.innerHTML = initialContent;
    }
  }, []);

  return { ref, content, setContent, handleChange };
};

// Toolbar Button Component
const ToolbarButton: React.FC<{
  icon: LucideIcon;
  active?: boolean;
  onClick: () => void;
  title: string;
  className?: string;
  showLabel?: boolean;
  label?: string;
}> = ({ icon: Icon, active, onClick, title, className = '', showLabel, label }) => (
  <button
    onClick={onClick}
    title={title}
    className={`relative group flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg transition-all duration-200 ${
      active 
        ? 'bg-primary/10 text-primary dark:bg-primary/20' 
        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
    } ${className}`}
  >
    <Icon className="w-4 h-4" />
    {showLabel && label && <span className="text-xs font-medium">{label}</span>}
    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-slate-900 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
      {title}
    </span>
  </button>
);

// Dropdown Menu Component
const DropdownMenu: React.FC<{
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
  width?: string;
}> = ({ trigger, children, align = 'left', width = 'w-56' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>
      {isOpen && (
        <div className={`absolute top-full ${align === 'left' ? 'left-0' : 'right-0'} mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1 ${width} z-50 animate-in fade-in slide-in-from-top-2`}>
          {children}
        </div>
      )}
    </div>
  );
};

// Dropdown Item Component
const DropdownItem: React.FC<{
  onClick: () => void;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
  shortcut?: string;
}> = ({ onClick, icon: Icon, children, className = '', shortcut }) => (
  <button
    onClick={onClick}
    className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between group ${className}`}
  >
    <div className="flex items-center gap-2">
      {Icon && <Icon className="w-4 h-4 text-slate-500 dark:text-slate-400 group-hover:text-primary" />}
      <span>{children}</span>
    </div>
    {shortcut && <span className="text-xs text-slate-400 dark:text-slate-500">{shortcut}</span>}
  </button>
);

// Color Picker Component
const ColorPicker: React.FC<{
  value: string;
  onChange: (color: string) => void;
  label?: string;
  icon?: LucideIcon;
}> = ({ value, onChange, label, icon: Icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const colors = [
    '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef',
    '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff',
    '#9900ff', '#ff00ff', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#cfe2f3',
    '#d9d2e9', '#ead1dc', '#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8', '#a2c4c9', '#9fc5e8',
    '#b4a7d6', '#d5a6bd', '#e06666', '#f6b26b', '#ffd966', '#93c47d', '#76a5af', '#6fa8dc',
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative group flex items-center gap-1 px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
        title={label || "Color picker"}
      >
        {Icon && <Icon className="w-4 h-4 text-slate-600 dark:text-slate-300" />}
        <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600" style={{ backgroundColor: value }} />
        <ChevronDown className="w-3 h-3 text-slate-400" />
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-slate-900 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
          {label}
        </span>
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 p-3 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 z-50 animate-in fade-in slide-in-from-top-2">
          <div className="grid grid-cols-8 gap-1">
            {colors.map(color => (
              <button
                key={color}
                onClick={() => {
                  onChange(color);
                  setIsOpen(false);
                }}
                className="w-6 h-6 rounded-full border border-slate-200 dark:border-slate-700 hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
            <input
              type="color"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-full h-8 cursor-pointer rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Toolbar Section Component

// Toolbar Divider
const ToolbarDivider: React.FC = () => (
  <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
);

// Responsive Toolbar Wrapper

// Link Insert Modal
const LinkModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onInsert: (url: string, text: string, title?: string, target?: string) => void;
}> = ({ isOpen, onClose, onInsert }) => {
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('_blank');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Insert Link</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Link Text (optional)
            </label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Click here"
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Title (tooltip)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Additional info"
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Open in
            </label>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="_blank">New tab</option>
              <option value="_self">Same tab</option>
              <option value="_parent">Parent frame</option>
              <option value="_top">Full window</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onInsert(url, text || url, title, target);
              onClose();
            }}
            disabled={!url}
            className="px-4 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Insert Link
          </button>
        </div>
      </div>
    </div>
  );
};

// Image Insert Modal
const ImageModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onInsert: (url: string, alt: string, width?: string, height?: string, align?: string) => void;
}> = ({ isOpen, onClose, onInsert }) => {
  const [url, setUrl] = useState('');
  const [alt, setAlt] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [align, setAlign] = useState('left');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Insert Image</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Image URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Alt Text
            </label>
            <input
              type="text"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="Description of image"
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Width
              </label>
              <input
                type="text"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                placeholder="Auto"
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Height
              </label>
              <input
                type="text"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="Auto"
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Alignment
            </label>
            <select
              value={align}
              onChange={(e) => setAlign(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onInsert(url, alt, width, height, align);
              onClose();
            }}
            disabled={!url}
            className="px-4 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Insert Image
          </button>
        </div>
      </div>
    </div>
  );
};

// Table Insert Modal
const TableModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onInsert: (rows: number, cols: number, style: string) => void;
}> = ({ isOpen, onClose, onInsert }) => {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [style, setStyle] = useState('default');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Insert Table</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Rows
              </label>
              <input
                type="number"
                value={rows}
                onChange={(e) => setRows(parseInt(e.target.value) || 1)}
                min="1"
                max="20"
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Columns
              </label>
              <input
                type="number"
                value={cols}
                onChange={(e) => setCols(parseInt(e.target.value) || 1)}
                min="1"
                max="20"
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Style
            </label>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="default">Default</option>
              <option value="bordered">Bordered</option>
              <option value="striped">Striped</option>
              <option value="minimal">Minimal</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onInsert(rows, cols, style);
            }}
            className="px-4 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:opacity-90"
          >
            Insert Table
          </button>
        </div>
      </div>
    </div>
  );
};

// Find & Replace Modal
const FindReplaceModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onFind: (text: string) => void;
  onReplace: (find: string, replace: string, all: boolean) => void;
}> = ({ isOpen, onClose, onFind, onReplace }) => {
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Find & Replace</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Find
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={findText}
                onChange={(e) => setFindText(e.target.value)}
                placeholder="Text to find"
                className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
                autoFocus
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Replace with
            </label>
            <input
              type="text"
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              placeholder="Replacement text"
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={matchCase}
                onChange={(e) => setMatchCase(e.target.checked)}
                className="rounded border-slate-300 text-primary focus:ring-primary"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">Match case</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={wholeWord}
                onChange={(e) => setWholeWord(e.target.checked)}
                className="rounded border-slate-300 text-primary focus:ring-primary"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">Whole word</span>
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-700">
          <button
            onClick={() => onFind(findText)}
            disabled={!findText}
            className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
          >
            Find
          </button>
          <button
            onClick={() => onReplace(findText, replaceText, false)}
            disabled={!findText}
            className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
          >
            Replace
          </button>
          <button
            onClick={() => onReplace(findText, replaceText, true)}
            disabled={!findText}
            className="px-4 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            Replace All
          </button>
        </div>
      </div>
    </div>
  );
};

// Special Characters Modal
const SpecialCharsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onInsert: (char: string) => void;
}> = ({ isOpen, onClose, onInsert }) => {
  const categories = [
    {
      name: 'Common',
      chars: ['©', '®', '™', '§', '¶', '†', '‡', '•', '·', '…', '—', '–']
    },
    {
      name: 'Currency',
      chars: ['$', '€', '£', '¥', '¢', '₽', '₹', '₿', '₣', '₤', '₦', '₩']
    },
    {
      name: 'Math',
      chars: ['±', '×', '÷', '≠', '≈', '≤', '≥', '∞', '√', '∑', '∏', '∫']
    },
    {
      name: 'Arrows',
      chars: ['←', '→', '↑', '↓', '↔', '↕', '⇐', '⇒', '⇑', '⇓', '⇔', '⇕']
    },
    {
      name: 'Greek',
      chars: ['α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'λ', 'μ', 'π', 'σ']
    },
    {
      name: 'Symbols',
      chars: ['♥', '♦', '♣', '♠', '♫', '☺', '☻', '☼', '♀', '♂', '♯', '♭']
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[80vh] flex flex-col animate-in fade-in zoom-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Special Characters</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-6">
          {categories.map((category) => (
            <div key={category.name} className="mb-6">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">{category.name}</h4>
              <div className="grid grid-cols-6 gap-2">
                {category.chars.map((char) => (
                  <button
                    key={char}
                    onClick={() => {
                      onInsert(char);
                      onClose();
                    }}
                    className="p-3 text-lg font-mono hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 transition-all hover:border-primary"
                  >
                    {char}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Statistics Modal
const StatisticsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  content: string;
}> = ({ isOpen, onClose, content }) => {
  if (!isOpen) return null;

  const stripHtml = (html: string) => {
    return html.replace(/<[^>]*>?/gm, '');
  };

  const text = stripHtml(content);
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const characters = text.length;
  const charactersNoSpaces = text.replace(/\s/g, '').length;
  const sentences = text.split(/[.!?]+/).filter(Boolean).length;
  const paragraphs = content.split('</p>').filter(p => p.trim()).length;
  
  const readingTime = Math.ceil(words / 200);
  
  const syllables = text.toLowerCase().replace(/[^a-z]/g, '').length / 2;
  const fleschScore = Math.round(206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words));
  const readabilityGrade = Math.round(0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Document Statistics</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <div className="text-2xl font-bold text-primary">{words}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Words</div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <div className="text-2xl font-bold text-primary">{characters}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Characters</div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <div className="text-2xl font-bold text-primary">{charactersNoSpaces}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Chars (no spaces)</div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <div className="text-2xl font-bold text-primary">{sentences}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Sentences</div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <div className="text-2xl font-bold text-primary">{paragraphs}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Paragraphs</div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <div className="text-2xl font-bold text-primary">{readingTime} min</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Reading time</div>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Readability</h4>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Flesch Reading Ease</span>
                  <span className="font-semibold">{fleschScore}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div 
                    className="bg-primary rounded-full h-2" 
                    style={{ width: `${Math.min(100, Math.max(0, fleschScore))}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {fleschScore >= 90 ? 'Very Easy' :
                   fleschScore >= 80 ? 'Easy' :
                   fleschScore >= 70 ? 'Fairly Easy' :
                   fleschScore >= 60 ? 'Standard' :
                   fleschScore >= 50 ? 'Fairly Difficult' :
                   fleschScore >= 30 ? 'Difficult' :
                   'Very Difficult'}
                </p>
              </div>
              <div>
                <div className="flex justify-between text-sm">
                  <span>Flesch-Kincaid Grade Level</span>
                  <span className="font-semibold">{readabilityGrade}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Template Modal
const TemplateModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSelect: (template: any) => void;
}> = ({ isOpen, onClose, onSelect }) => {
  const templates = [
    {
      id: 'sermon',
      name: 'Sermon Note',
      description: 'Structured sermon outline with scripture, points, and application',
      icon: BookOpen,
      content: `
        <h1>Sermon Title</h1>
        <h2>Scripture: </h2>
        <h3>Introduction</h3>
        <p></p>
        <h3>Main Points</h3>
        <ol>
          <li></li>
          <li></li>
          <li></li>
        </ol>
        <h3>Application</h3>
        <p></p>
        <h3>Prayer Points</h3>
        <ul>
          <li></li>
          <li></li>
        </ul>
      `
    },
    {
      id: 'devotional',
      name: 'Daily Devotional',
      description: 'Daily spiritual reflection with prayer',
      icon: Sparkles,
      content: `
        <h1>Daily Devotional</h1>
        <h2>Date: </h2>
        <h3>Opening Prayer</h3>
        <p></p>
        <h3>Scripture Reading</h3>
        <p></p>
        <h3>Reflection</h3>
        <p></p>
        <h3>Application</h3>
        <p></p>
        <h3>Closing Prayer</h3>
        <p></p>
      `
    },
    {
      id: 'article',
      name: 'Article / Essay',
      description: 'Standard article format with sections',
      icon: FileText,
      content: `
        <h1>Title</h1>
        <h2>By Author</h2>
        <h3>Introduction</h3>
        <p></p>
        <h3>Section 1</h3>
        <p></p>
        <h3>Section 2</h3>
        <p></p>
        <h3>Conclusion</h3>
        <p></p>
        <h4>References</h4>
        <ol>
          <li></li>
        </ol>
      `
    },
    {
      id: 'study',
      name: 'Bible Study',
      description: 'In-depth Bible study format',
      icon: BookOpen,
      content: `
        <h1>Bible Study: </h1>
        <h2>Passage: </h2>
        <h3>Context</h3>
        <p></p>
        <h3>Observation</h3>
        <p></p>
        <h3>Interpretation</h3>
        <p></p>
        <h3>Application</h3>
        <p></p>
        <h3>Discussion Questions</h3>
        <ol>
          <li></li>
          <li></li>
          <li></li>
        </ol>
      `
    },
    {
      id: 'prayer',
      name: 'Prayer Journal',
      description: 'Personal prayer and reflection',
      icon: Heart,
      content: `
        <h1>Prayer Journal</h1>
        <h2>Date: </h2>
        <h3>Thanksgiving</h3>
        <p></p>
        <h3>Confession</h3>
        <p></p>
        <h3>Supplication</h3>
        <p></p>
        <h3>Intercession</h3>
        <p></p>
        <h3>Response</h3>
        <p></p>
      `
    },
    {
      id: 'announcement',
      name: 'Church Announcement',
      description: 'Weekly announcements template',
      icon: Megaphone,
      content: `
        <h1>Announcements</h1>
        <h2>Date: </h2>
        <h3>This Week</h3>
        <ul>
          <li></li>
          <li></li>
        </ul>
        <h3>Upcoming Events</h3>
        <ul>
          <li></li>
          <li></li>
        </ul>
        <h3>Prayer Requests</h3>
        <ul>
          <li></li>
          <li></li>
        </ul>
      `
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl max-h-[80vh] flex flex-col animate-in fade-in zoom-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Templates</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-6">
          <div className="grid grid-cols-2 gap-4">
            {templates.map((template) => {
              const Icon = template.icon;
              return (
                <button
                  key={template.id}
                  onClick={() => {
                    onSelect(template);
                    onClose();
                  }}
                  className="p-6 text-left border border-slate-200 dark:border-slate-700 rounded-xl hover:border-primary hover:bg-primary/5 transition-all group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <h4 className="font-semibold text-slate-900 dark:text-white">{template.name}</h4>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{template.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// Color Theme Modal
const ThemeModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSelect: (theme: any) => void;
}> = ({ isOpen, onClose, onSelect }) => {
  const themes = [
    {
      id: 'classic',
      name: 'Classic',
      description: 'Traditional black text on white background',
      colors: {
        text: '#000000',
        background: '#ffffff',
        primary: '#3b82f6'
      }
    },
    {
      id: 'sepia',
      name: 'Sepia',
      description: 'Warm, paper-like reading experience',
      colors: {
        text: '#5f4b3c',
        background: '#fbf7f0',
        primary: '#8b5a2b'
      }
    },
    {
      id: 'dark',
      name: 'Dark Mode',
      description: 'Easy on the eyes in low light',
      colors: {
        text: '#e5e7eb',
        background: '#1f2937',
        primary: '#60a5fa'
      }
    },
    {
      id: 'forest',
      name: 'Forest',
      description: 'Calming green tones',
      colors: {
        text: '#2d3e2d',
        background: '#f0f7f0',
        primary: '#2e7d32'
      }
    },
    {
      id: 'ocean',
      name: 'Ocean',
      description: 'Refreshing blue palette',
      colors: {
        text: '#1e3b5c',
        background: '#f0f9ff',
        primary: '#0369a1'
      }
    },
    {
      id: 'sunset',
      name: 'Sunset',
      description: 'Warm and vibrant',
      colors: {
        text: '#7f1d1d',
        background: '#fef2f2',
        primary: '#b91c1c'
      }
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl max-h-[80vh] flex flex-col animate-in fade-in zoom-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Color Themes</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-6">
          <div className="grid grid-cols-2 gap-4">
            {themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => onSelect(theme)}
                className="p-6 text-left border border-slate-200 dark:border-slate-700 rounded-xl hover:border-primary hover:bg-primary/5 transition-all group"
              >
                <h4 className="font-semibold text-slate-900 dark:text-white mb-2">{theme.name}</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{theme.description}</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-slate-200" style={{ backgroundColor: theme.colors.text }} />
                  <div className="w-8 h-8 rounded-full border-2 border-slate-200" style={{ backgroundColor: theme.colors.background }} />
                  <div className="w-8 h-8 rounded-full border-2 border-slate-200" style={{ backgroundColor: theme.colors.primary }} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const SacredEditor: React.FC<SacredEditorProps> = ({ 
  mode = 'create',
  postId,
  draftId,
  initialData 
}) => {
  const navigate = useNavigate();
  
  const isCreateMode = mode === 'create' || (!postId && !draftId);
  const isEditMode = mode === 'edit' || !!postId;
  const isDraftMode = !!draftId;

  // State
  const [title, setTitle] = useState('');
  const [autoSaveTime, setAutoSaveTime] = useState('just now');
  const [metadata, setMetadata] = useState<PostMetadata>({
    title: '',
    contentType: 'Sermon Note',
    series: '',
    tags: [],
    featuredImage: null,
    videoUrl: '',
    allowComments: true,
    allowReactions: true,
    featuredOnHomepage: false
  });
  const [newTag, setNewTag] = useState('');
  const [isDraft, setIsDraft] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [series, setSeries] = useState<Array<{ id: string; title: string }>>([]);
  const [showScriptureLookup, setShowScriptureLookup] = useState(false);
  const [scriptureQuery, setScriptureQuery] = useState('');
  const [scriptureResults, setScriptureResults] = useState<any[]>([]);
  
  // Modal states
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [showFindReplaceModal, setShowFindReplaceModal] = useState(false);
  const [showSpecialCharsModal, setShowSpecialCharsModal] = useState(false);
  const [showStatisticsModal, setShowStatisticsModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);

  // Rich text formatting state
  const [fontFamily, setFontFamily] = useState('Inter');
  const [fontSize, setFontSize] = useState(16);
  const [textColor, setTextColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [highlightColor, setHighlightColor] = useState('#ffff00');
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [lineHeight, setLineHeight] = useState(1.5);
  const [, setTextTransform] = useState('none');
  const [fontWeight, setFontWeight] = useState('normal');
  const [textShadow, setTextShadow] = useState('none');
  const [textOutline, setTextOutline] = useState('none');
  const [dropCap, setDropCap] = useState(false);
  const [smallCaps, setSmallCaps] = useState(false);
  const [columnCount, setColumnCount] = useState(1);
  const [columnGap] = useState(20);
  const [wordSpacing, setWordSpacing] = useState(0);
  
  const [formats, setFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    h1: false,
    h2: false,
    h3: false,
    h4: false,
    h5: false,
    h6: false,
    alignLeft: true,
    alignCenter: false,
    alignRight: false,
    alignJustify: false,
    bulletList: false,
    numberList: false,
    checklist: false,
    blockquote: false,
    code: false,
    subscript: false,
    superscript: false,
  });

  const { ref: contentEditableRef, content, setContent, handleChange: handleContentChange } = 
    useContentEditable('<p class="mb-6 opacity-40">Start your sermon or article...</p>');

  const CurrentAlignIcon = formats.alignLeft ? AlignLeft : formats.alignCenter ? AlignCenter : formats.alignRight ? AlignRight : AlignJustify;

  const titleTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const loadSeries = async () => {
      try {
        const data = await seriesService.getAllSeries();
        setSeries(data);
      } catch (err) {
        console.error('Failed to load series:', err);
      }
    };
    loadSeries();
  }, []);

  useEffect(() => {
    const loadPostData = async () => {
      if (isEditMode && postId) {
        setLoading(true);
        try {
          const post = await postService.getPost(postId);
          setTitle(post.title || '');
          setContent(post.content || '<p class="mb-6 opacity-40">Start your sermon or article...</p>');
          setMetadata({
            title: post.title || '',
            contentType: post.content_type || 'Sermon Note',
            series: post.series || '',
            tags: (post as any).tags || [],
            featuredImage: post.featured_image || null,
            videoUrl: post.video_url || '',
            allowComments: post.comments_enabled ?? true,
            allowReactions: post.reactions_enabled ?? true,
            featuredOnHomepage: (post as any).is_featured || false
          });
          setIsDraft(post.status !== 'PUBLISHED');
        } catch (err) {
          console.error('Failed to load post:', err);
        } finally {
          setLoading(false);
        }
      } else if (isDraftMode && draftId) {
        setLoading(true);
        try {
          const draft = await draftService.getDraft(draftId);
          const draftData = draft.draft_data || {};
          setTitle(draftData.title || '');
          setContent(draftData.content || '<p class="mb-6 opacity-40">Start your sermon or article...</p>');
          setMetadata({
            title: draftData.title || '',
            contentType: draft.content_type || 'Sermon Note',
            series: draftData.series || '',
            tags: (draftData as any).tags || [],
            featuredImage: draftData.featured_image || null,
            videoUrl: draftData.video_url || '',
            allowComments: draftData.comments_enabled ?? true,
            allowReactions: draftData.reactions_enabled ?? true,
            featuredOnHomepage: (draftData as any).is_featured || false
          });
          setIsDraft(true);
        } catch (err) {
          console.error('Failed to load draft:', err);
        } finally {
          setLoading(false);
        }
      } else if (initialData) {
        setTitle(initialData.title || '');
        setContent(initialData.content || '<p class="mb-6 opacity-40">Start your sermon or article...</p>');
        setMetadata(prev => ({
          ...prev,
          ...initialData,
          title: initialData.title || '',
        }));
      }
    };

    loadPostData();
  }, [isEditMode, isDraftMode, postId, draftId, initialData, setContent]);

  useEffect(() => {
    if (titleTextareaRef.current) {
      titleTextareaRef.current.style.height = 'auto';
      titleTextareaRef.current.style.height = `${titleTextareaRef.current.scrollHeight}px`;
    }
  }, [title]);

  useEffect(() => {
    if (!isCreateMode && !isEditMode && !isDraftMode) return;

    const autoSaveTimer = setTimeout(() => {
      handleAutoSave();
    }, 30000);

    return () => clearTimeout(autoSaveTimer);
  }, [title, content, metadata]);

  const handleAutoSave = async () => {
    if (!title.trim() && !content.trim()) return;

    setSaving(true);
    try {
      const draftData = {
        title,
        content,
        content_type: metadata.contentType,
        series: metadata.series,
        tags: metadata.tags,
        featured_image: metadata.featuredImage === null ? undefined : metadata.featuredImage,
        video_url: metadata.videoUrl,
        comments_enabled: metadata.allowComments,
        reactions_enabled: metadata.allowReactions,
        is_featured: metadata.featuredOnHomepage,
      };

      if (isDraftMode && draftId) {
        await draftService.updateDraft(draftId, { draft_data: draftData });
      } else {
        await draftService.createDraft({
          draft_data: draftData,
          content_type: metadata.contentType,
          post: isEditMode && postId ? postId : undefined,
        });
      }
      setAutoSaveTime('just now');
    } catch (err) {
      console.error('Auto-save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTitle(e.target.value);
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    handleContentChange();
  };

  const handleFormat = (format: keyof typeof formats) => {
    switch (format) {
      case 'bold':
        execCommand('bold');
        setFormats(prev => ({ ...prev, bold: !prev.bold }));
        break;
      case 'italic':
        execCommand('italic');
        setFormats(prev => ({ ...prev, italic: !prev.italic }));
        break;
      case 'underline':
        execCommand('underline');
        setFormats(prev => ({ ...prev, underline: !prev.underline }));
        break;
      case 'strikethrough':
        execCommand('strikeThrough');
        setFormats(prev => ({ ...prev, strikethrough: !prev.strikethrough }));
        break;
      case 'h1':
        execCommand('formatBlock', '<h1>');
        setFormats(prev => ({ ...prev, h1: !prev.h1, h2: false, h3: false, h4: false, h5: false, h6: false }));
        break;
      case 'h2':
        execCommand('formatBlock', '<h2>');
        setFormats(prev => ({ ...prev, h2: !prev.h2, h1: false, h3: false, h4: false, h5: false, h6: false }));
        break;
      case 'h3':
        execCommand('formatBlock', '<h3>');
        setFormats(prev => ({ ...prev, h3: !prev.h3, h1: false, h2: false, h4: false, h5: false, h6: false }));
        break;
      case 'h4':
        execCommand('formatBlock', '<h4>');
        setFormats(prev => ({ ...prev, h4: !prev.h4, h1: false, h2: false, h3: false, h5: false, h6: false }));
        break;
      case 'h5':
        execCommand('formatBlock', '<h5>');
        setFormats(prev => ({ ...prev, h5: !prev.h5, h1: false, h2: false, h3: false, h4: false, h6: false }));
        break;
      case 'h6':
        execCommand('formatBlock', '<h6>');
        setFormats(prev => ({ ...prev, h6: !prev.h6, h1: false, h2: false, h3: false, h4: false, h5: false }));
        break;
      case 'alignLeft':
        execCommand('justifyLeft');
        setFormats(prev => ({ ...prev, alignLeft: true, alignCenter: false, alignRight: false, alignJustify: false }));
        break;
      case 'alignCenter':
        execCommand('justifyCenter');
        setFormats(prev => ({ ...prev, alignLeft: false, alignCenter: true, alignRight: false, alignJustify: false }));
        break;
      case 'alignRight':
        execCommand('justifyRight');
        setFormats(prev => ({ ...prev, alignLeft: false, alignCenter: false, alignRight: true, alignJustify: false }));
        break;
      case 'alignJustify':
        execCommand('justifyFull');
        setFormats(prev => ({ ...prev, alignLeft: false, alignCenter: false, alignRight: false, alignJustify: true }));
        break;
      case 'bulletList':
        execCommand('insertUnorderedList');
        setFormats(prev => ({ ...prev, bulletList: !prev.bulletList }));
        break;
      case 'numberList':
        execCommand('insertOrderedList');
        setFormats(prev => ({ ...prev, numberList: !prev.numberList }));
        break;
      case 'blockquote':
        execCommand('formatBlock', '<blockquote>');
        setFormats(prev => ({ ...prev, blockquote: !prev.blockquote }));
        break;
      case 'code':
        execCommand('formatBlock', '<pre>');
        setFormats(prev => ({ ...prev, code: !prev.code }));
        break;
      case 'subscript':
        execCommand('subscript');
        setFormats(prev => ({ ...prev, subscript: !prev.subscript }));
        break;
      case 'superscript':
        execCommand('superscript');
        setFormats(prev => ({ ...prev, superscript: !prev.superscript }));
        break;
    }
  };

  const handleFontFamilyChange = (font: string) => {
    setFontFamily(font);
    execCommand('fontName', font);
  };

  const handleFontSizeChange = (size: number) => {
    setFontSize(size);
    execCommand('fontSize', size.toString());
  };

  const handleFontWeightChange = (weight: string) => {
    setFontWeight(weight);
    execCommand('bold', weight === 'bold' ? 'true' : 'false');
  };

  const handleTextColorChange = (color: string) => {
    setTextColor(color);
    execCommand('foreColor', color);
  };

  const handleBgColorChange = (color: string) => {
    setBgColor(color);
    execCommand('hiliteColor', color);
  };

  const handleHighlightChange = (color: string) => {
    setHighlightColor(color);
    execCommand('backColor', color);
  };

  const handleTextTransform = (transform: string) => {
    setTextTransform(transform);
    const selectedText = window.getSelection()?.toString();
    if (selectedText) {
      let transformed = selectedText;
      switch (transform) {
        case 'uppercase':
          transformed = selectedText.toUpperCase();
          break;
        case 'lowercase':
          transformed = selectedText.toLowerCase();
          break;
        case 'capitalize':
          transformed = selectedText.replace(/\b\w/g, l => l.toUpperCase());
          break;
      }
      execCommand('insertText', transformed);
    }
  };

  const handleLetterSpacing = (spacing: number) => {
    setLetterSpacing(spacing);
    if (contentEditableRef.current) {
      contentEditableRef.current.style.letterSpacing = `${spacing}px`;
    }
  };

  const handleLineHeight = (height: number) => {
    setLineHeight(height);
    if (contentEditableRef.current) {
      contentEditableRef.current.style.lineHeight = height.toString();
    }
  };

  const handleColumns = (count: number) => {
    setColumnCount(count);
    if (contentEditableRef.current) {
      contentEditableRef.current.style.columnCount = count.toString();
      contentEditableRef.current.style.columnGap = `${columnGap}px`;
    }
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTag.trim()) {
      e.preventDefault();
      if (!metadata.tags.includes(newTag.trim())) {
        setMetadata({
          ...metadata,
          tags: [...metadata.tags, newTag.trim()]
        });
      }
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setMetadata({
      ...metadata,
      tags: metadata.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const toggleSwitch = (field: keyof Pick<PostMetadata, 'allowComments' | 'allowReactions' | 'featuredOnHomepage'>) => {
    setMetadata({
      ...metadata,
      [field]: !metadata[field]
    });
  };

  const handlePublish = async () => {
    if (!title.trim()) {
      alert('Please enter a title before publishing.');
      return;
    }

    setSaving(true);
    try {
      const postData = {
        title,
        content,
        content_type: metadata.contentType,
        series: metadata.series,
        tags: metadata.tags,
        featured_image: metadata.featuredImage === null ? undefined : metadata.featuredImage,
        video_url: metadata.videoUrl,
        comments_enabled: metadata.allowComments,
        reactions_enabled: metadata.allowReactions,
        is_featured: metadata.featuredOnHomepage,
        status: 'PUBLISHED' as 'PUBLISHED',
      };

      if (isEditMode && postId) {
        await postService.updatePost(postId, postData);
        if (draftId) {
          await draftService.deleteDraft(draftId);
        }
      } else if (isDraftMode && draftId) {
        await draftService.publishDraft(draftId);
      } else {
        await postService.createPost(postData);
      }
      
      navigate('/admin/content');
    } catch (err) {
      console.error('Publish failed:', err);
      alert('Failed to publish. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    await handleAutoSave();
  };

  const handlePreview = () => {
    const previewData = {
      title,
      content,
      metadata,
    };
    localStorage.setItem('preview_data', JSON.stringify(previewData));
    window.open('/preview', '_blank');
  };

  const handleScriptureLookup = async () => {
    if (!scriptureQuery.trim()) return;
    
    setShowScriptureLookup(true);
    setScriptureResults([
      { reference: 'Psalm 23:1-3', text: 'The Lord is my shepherd; I shall not want. He makes me lie down in green pastures. He leads me beside still waters. He restores my soul.' },
      { reference: 'Isaiah 40:31', text: 'But they who wait for the Lord shall renew their strength; they shall mount up with wings like eagles; they shall run and not be weary; they shall walk and not faint.' },
      { reference: 'Philippians 4:6-7', text: 'Do not be anxious about anything, but in everything by prayer and supplication with thanksgiving let your requests be made known to God. And the peace of God, which surpasses all understanding, will guard your hearts and your minds in Christ Jesus.' },
      { reference: 'Romans 8:28', text: 'And we know that in all things God works for the good of those who love him, who have been called according to his purpose.' },
      { reference: 'Jeremiah 29:11', text: 'For I know the plans I have for you, declares the Lord, plans for welfare and not for evil, to give you a future and a hope.' },
    ]);
  };

  const insertScripture = (reference: string, text: string) => {
    const scriptureBlock = `
      <div class="my-10 border-l-4 border-primary/40 pl-8 py-2 bg-primary/5 rounded-r-lg relative group">
        <Icon name="menu_book" size={14} className="absolute -left-4 top-1/2 -translate-y-1/2 bg-white rounded-full p-1 text-primary shadow-sm" />
        <p class="italic text-2xl text-slate-700 font-serif leading-relaxed">"${text}"</p>
        <cite class="block mt-3 font-display not-italic font-bold text-sm text-primary uppercase tracking-wider">${reference}</cite>
      </div>
    `;

    if (contentEditableRef.current) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const div = document.createElement('div');
        div.innerHTML = scriptureBlock;
        const fragment = document.createDocumentFragment();
        while (div.firstChild) {
          fragment.appendChild(div.firstChild);
        }
        range.insertNode(fragment);
      } else {
        contentEditableRef.current.innerHTML += scriptureBlock;
      }
      handleContentChange();
    }
    setShowScriptureLookup(false);
    setScriptureQuery('');
  };

  const handleInsertLink = (url: string, text: string, title?: string, target?: string) => {
    if (!url) return;
    
    if (contentEditableRef.current) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
        execCommand('createLink', url);
      } else {
        const linkHtml = `<a href="${url}" title="${title || ''}" target="${target || '_blank'}" rel="noopener noreferrer" class="text-primary underline">${text || url}</a>`;
        execCommand('insertHTML', linkHtml);
      }
      handleContentChange();
    }
  };

  const handleInsertImage = (url: string, alt: string, width?: string, height?: string, align?: string) => {
    if (!url) return;
    
    const alignClass = align ? `float-${align}` : '';
    const widthStyle = width ? `width: ${width};` : '';
    const heightStyle = height ? `height: ${height};` : '';
    
    const imageHtml = `<img src="${url}" alt="${alt}" class="max-w-full ${alignClass}" style="${widthStyle} ${heightStyle} margin: 10px;" />`;
    execCommand('insertHTML', imageHtml);
    handleContentChange();
  };

  const handleInsertTable = (rows: number, cols: number, style: string) => {
    let tableHtml = '<table class="w-full border-collapse">';
    const styleClass = style === 'bordered' ? 'border border-slate-300' : 
                       style === 'striped' ? 'border border-slate-300 even:bg-slate-50' : 
                       style === 'minimal' ? '' : 'border border-slate-300';
    
    for (let i = 0; i < rows; i++) {
      tableHtml += '<tr>';
      for (let j = 0; j < cols; j++) {
        const cellContent = i === 0 && j === 0 ? 'Header 1' : 
                           i === 0 && j === 1 ? 'Header 2' :
                           i === 1 && j === 0 ? 'Cell 1' :
                           i === 1 && j === 1 ? 'Cell 2' : '';
        tableHtml += `<td class="p-2 ${styleClass}">${cellContent}</td>`;
      }
      tableHtml += '</tr>';
    }
    tableHtml += '</table>';
    
    execCommand('insertHTML', tableHtml);
    handleContentChange();
  };

  const handleFind = (text: string) => {
    if (!text || !contentEditableRef.current) return;
    
    const selection = window.getSelection();
    selection?.removeAllRanges();
    
    const walker = document.createTreeWalker(
      contentEditableRef.current,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          if (node.textContent?.toLowerCase().includes(text.toLowerCase())) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_REJECT;
        }
      }
    );
    
    const firstMatch = walker.nextNode();
    if (firstMatch) {
      const range = document.createRange();
      range.setStart(firstMatch, firstMatch.textContent?.toLowerCase().indexOf(text.toLowerCase()) || 0);
      range.setEnd(firstMatch, (firstMatch.textContent?.toLowerCase().indexOf(text.toLowerCase()) || 0) + text.length);
      selection?.addRange(range);
    }
  };

  const handleReplace = (find: string, replace: string, all: boolean) => {
    if (!find || !contentEditableRef.current) return;
    
    if (all) {
      const html = contentEditableRef.current.innerHTML;
      const regex = new RegExp(find, 'gi');
      contentEditableRef.current.innerHTML = html.replace(regex, replace);
      setContent(contentEditableRef.current.innerHTML);
    } else {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const selectedText = range.toString();
        if (selectedText.toLowerCase() === find.toLowerCase()) {
          range.deleteContents();
          range.insertNode(document.createTextNode(replace));
          handleContentChange();
        }
      }
    }
  };

  const handleInsertSpecialChar = (char: string) => {
    execCommand('insertText', char);
  };

  const handleSelectTemplate = (template: any) => {
    setContent(template.content);
    if (template.name === 'Sermon Note') {
      setMetadata(prev => ({ ...prev, contentType: 'Sermon Note' }));
    } else if (template.name === 'Daily Devotional') {
      setMetadata(prev => ({ ...prev, contentType: 'Devotional' }));
    } else if (template.name === 'Article / Essay') {
      setMetadata(prev => ({ ...prev, contentType: 'Article / Essay' }));
    }
  };

  const handleSelectTheme = (theme: any) => {
    setTextColor(theme.colors.text);
    setBgColor(theme.colors.background);
    if (contentEditableRef.current) {
      contentEditableRef.current.style.color = theme.colors.text;
      contentEditableRef.current.style.backgroundColor = theme.colors.background;
    }
  };

  const handleMoveToTrash = async () => {
    if (!window.confirm('Move this post to trash? It can be restored later.')) return;
    
    try {
      if (isEditMode && postId) {
        await postService.deletePost(postId);
      } else if (isDraftMode && draftId) {
        await draftService.deleteDraft(draftId);
      }
      navigate('/admin/content');
    } catch (err) {
      console.error('Failed to move to trash:', err);
      alert('Failed to move to trash. Please try again.');
    }
  };

  const handleExport = (format: 'pdf' | 'docx' | 'html' | 'markdown') => {
    const element = document.createElement('a');
    let contentToExport = '';
    let filename = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    let mimeType = 'text/plain';
    
    switch (format) {
      case 'pdf':
        alert('PDF export coming soon!');
        return;
      case 'docx':
        alert('DOCX export coming soon!');
        return;
      case 'html':
        contentToExport = `<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <style>
    body { font-family: ${fontFamily}; font-size: ${fontSize}px; line-height: ${lineHeight}; }
  </style>
</head>
<body>
  ${content}
</body>
</html>`;
        mimeType = 'text/html';
        filename += '.html';
        break;
      case 'markdown':
        contentToExport = content
          .replace(/<h1>(.*?)<\/h1>/gi, '# $1\n\n')
          .replace(/<h2>(.*?)<\/h2>/gi, '## $1\n\n')
          .replace(/<h3>(.*?)<\/h3>/gi, '### $1\n\n')
          .replace(/<p>(.*?)<\/p>/gi, '$1\n\n')
          .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
          .replace(/<em>(.*?)<\/em>/gi, '*$1*')
          .replace(/<[^>]*>/g, '');
        filename += '.md';
        break;
    }
    
    const blob = new Blob([contentToExport], { type: mimeType });
    const url = URL.createObjectURL(blob);
    element.href = url;
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Icon name="progress_activity" size={36} className="animate-spin" />
          <p className="text-sm font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 antialiased overflow-hidden h-screen flex flex-col">
      {/* Header */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-6 z-30 shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-primary">
            <BookOpen className="w-6 h-6" />
            <h2 className="text-slate-900 dark:text-white text-lg font-bold">Sacred Editor</h2>
          </div>
          <nav className="hidden md:flex items-center gap-1 text-slate-500 dark:text-slate-400 text-sm font-medium">
            <button onClick={() => navigate('/admin/content')} className="hover:text-primary transition-colors px-2">
              Content
            </button>
            <ChevronDown className="w-4 h-4" />
            <span className="text-slate-900 dark:text-white">
              {isCreateMode ? 'New Post' : isEditMode ? 'Edit Post' : 'Edit Draft'}
            </span>
          </nav>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handlePreview}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all disabled:opacity-50"
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">Preview</span>
          </button>
          <button 
            onClick={handleSaveDraft}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all disabled:opacity-50"
          >
            {saving ? (
              <>
                <Icon name="progress_activity" size={20} className="animate-spin" />
                <span className="hidden sm:inline">Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span className="hidden sm:inline">Save Draft</span>
              </>
            )}
          </button>
          <DropdownMenu
            trigger={
              <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all">
                <FileDown className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
                <ChevronDown className="w-4 h-4" />
              </button>
            }
          >
            <DropdownItem onClick={() => handleExport('pdf')} icon={FileText} shortcut="PDF">
              Export as PDF
            </DropdownItem>
            <DropdownItem onClick={() => handleExport('docx')} icon={FileText} shortcut="DOCX">
              Export as DOCX
            </DropdownItem>
            <DropdownItem onClick={() => handleExport('html')} icon={FileCode} shortcut="HTML">
              Export as HTML
            </DropdownItem>
            <DropdownItem onClick={() => handleExport('markdown')} icon={FileText} shortcut="MD">
              Export as Markdown
            </DropdownItem>
          </DropdownMenu>
          <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2" />
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700">
            <img 
              alt="User Profile" 
              className="w-full h-full object-cover" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBXL7WBL-u4dR6h6BciTvdrauYfLmiLMlfCfkX6FGolltXhn7ZQ9iLizTazM_R1w1OOauD-SUDYeIt2w1xM1d2Zfy5z8rUiBbRXURoXm_Ph1fynNlwVBsO9iSSnx851XSUWDRBOw8JyXNXX5-xYuS8eRtOl8C33VDWtGxvLz0DjbFxwllTZbhSJJSyHReBC2GSREMijeS353R2uw1bQFnpiJr0kNcAPv68fQ3G-V4T2ClCXx5t7RWjCPDm8jAJnG4h8_hLkXd6YxbQ"
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 overflow-hidden">
        {/* Left Pane */}
        <section className="writing-canvas flex-1 overflow-y-auto relative flex justify-center py-8 px-4 sm:px-6">
          <div className="max-w-3xl w-full relative">
            {/* Auto-save indicator */}
            <div className="absolute top-0 right-0 flex items-center gap-2 text-slate-400 dark:text-slate-500 text-xs font-medium z-10">
              <Icon name="{saving ? 'sync' : 'sync_saved_locally'}" size={14} />
              {saving ? 'Saving...' : `Saved ${autoSaveTime}`}
            </div>

            {/* Toolbar - Now sits before the title */}
            <div className="sticky top-0 z-20 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mb-6 overflow-hidden">
              <div className="p-2">
                {/* Font & Size Row */}
                <div className="flex flex-wrap items-center gap-1 pb-2 border-b border-slate-200 dark:border-slate-700 mb-2">
                  <select
                    value={fontFamily}
                    onChange={(e) => handleFontFamilyChange(e.target.value)}
                    className="text-sm bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    title="Font Family"
                  >
                    <option value="Inter">Inter</option>
                    <option value="Fraunces">Fraunces</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Arial">Arial</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Helvetica">Helvetica</option>
                    <option value="Courier New">Courier New</option>
                    <option value="Verdana">Verdana</option>
                    <option value="Tahoma">Tahoma</option>
                  </select>
                  
                  <select
                    value={fontSize}
                    onChange={(e) => handleFontSizeChange(Number(e.target.value))}
                    className="text-sm bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 w-20 focus:outline-none focus:ring-1 focus:ring-primary hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    title="Font Size"
                  >
                    {[8,9,10,11,12,14,16,18,20,22,24,26,28,32,36,40,48,56,64,72].map(size => (
                      <option key={size} value={size}>{size}px</option>
                    ))}
                  </select>

                  <ToolbarDivider />

                  <ToolbarButton icon={Bold} active={formats.bold} onClick={() => handleFormat('bold')} title="Bold (Ctrl+B)" />
                  <ToolbarButton icon={Italic} active={formats.italic} onClick={() => handleFormat('italic')} title="Italic (Ctrl+I)" />
                  <ToolbarButton icon={Underline} active={formats.underline} onClick={() => handleFormat('underline')} title="Underline (Ctrl+U)" />
                  <ToolbarButton icon={Strikethrough} active={formats.strikethrough} onClick={() => handleFormat('strikethrough')} title="Strikethrough" />
                  
                  <DropdownMenu
                    trigger={
                      <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1" title="More Strikethrough">
                        <Strikethrough className="w-4 h-4" />
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    }
                  >
                    <DropdownItem onClick={() => handleFormat('strikethrough')} icon={Strikethrough}>
                      Single Strikethrough
                    </DropdownItem>
                    <DropdownItem onClick={() => execCommand('strikeThrough')} icon={Strikethrough}>
                      Double Strikethrough
                    </DropdownItem>
                    <DropdownItem onClick={() => execCommand('strikeThrough')} icon={Strikethrough}>
                      Wavy Strikethrough
                    </DropdownItem>
                  </DropdownMenu>

                  <ToolbarDivider />

                  <ToolbarButton icon={Subscript} active={formats.subscript} onClick={() => handleFormat('subscript')} title="Subscript" />
                  <ToolbarButton icon={Superscript} active={formats.superscript} onClick={() => handleFormat('superscript')} title="Superscript" />

                  <ToolbarDivider />

                  <DropdownMenu
                    trigger={
                      <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1" title="Text Transform">
                        <CaseSensitive className="w-4 h-4" />
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    }
                  >
                    <DropdownItem onClick={() => handleTextTransform('uppercase')} icon={CaseSensitive}>
                      UPPERCASE
                    </DropdownItem>
                    <DropdownItem onClick={() => handleTextTransform('lowercase')} icon={CaseSensitive}>
                      lowercase
                    </DropdownItem>
                    <DropdownItem onClick={() => handleTextTransform('capitalize')} icon={CaseSensitive}>
                      Capitalize Each Word
                    </DropdownItem>
                    <DropdownItem onClick={() => setSmallCaps(!smallCaps)} icon={CaseSensitive}>
                      Small Caps {smallCaps && '✓'}
                    </DropdownItem>
                  </DropdownMenu>

                  <DropdownMenu
                    trigger={
                      <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1" title="Font Weight">
                        <Weight className="w-4 h-4" />
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    }
                    width="w-48"
                  >
                    <DropdownItem onClick={() => handleFontWeightChange('normal')}>Normal</DropdownItem>
                    <DropdownItem onClick={() => handleFontWeightChange('bold')}>Bold</DropdownItem>
                    <DropdownItem onClick={() => handleFontWeightChange('bolder')}>Bolder</DropdownItem>
                    <DropdownItem onClick={() => handleFontWeightChange('lighter')}>Lighter</DropdownItem>
                    <div className="border-t border-slate-200 dark:border-slate-700 my-1" />
                    <DropdownItem onClick={() => handleFontWeightChange('100')}>Thin (100)</DropdownItem>
                    <DropdownItem onClick={() => handleFontWeightChange('300')}>Light (300)</DropdownItem>
                    <DropdownItem onClick={() => handleFontWeightChange('400')}>Regular (400)</DropdownItem>
                    <DropdownItem onClick={() => handleFontWeightChange('500')}>Medium (500)</DropdownItem>
                    <DropdownItem onClick={() => handleFontWeightChange('600')}>Semi Bold (600)</DropdownItem>
                    <DropdownItem onClick={() => handleFontWeightChange('700')}>Bold (700)</DropdownItem>
                    <DropdownItem onClick={() => handleFontWeightChange('800')}>Extra Bold (800)</DropdownItem>
                    <DropdownItem onClick={() => handleFontWeightChange('900')}>Black (900)</DropdownItem>
                  </DropdownMenu>
                </div>

                {/* Colors & Effects Row */}
                <div className="flex flex-wrap items-center gap-1 pb-2 border-b border-slate-200 dark:border-slate-700 mb-2">
                  <ColorPicker value={textColor} onChange={handleTextColorChange} label="Text color" icon={Type} />
                  <ColorPicker value={bgColor} onChange={handleBgColorChange} label="Background color" icon={Paintbrush} />
                  <ColorPicker value={highlightColor} onChange={handleHighlightChange} label="Highlight" icon={Highlighter} />

                  <ToolbarDivider />

                  <DropdownMenu
                    trigger={
                      <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1" title="Text Effects">
                        <Sparkles className="w-4 h-4" />
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    }
                  >
                    <DropdownItem onClick={() => setTextShadow('none')}>No Shadow</DropdownItem>
                    <DropdownItem onClick={() => setTextShadow('1px 1px 2px rgba(0,0,0,0.1)')}>Light Shadow</DropdownItem>
                    <DropdownItem onClick={() => setTextShadow('2px 2px 4px rgba(0,0,0,0.2)')}>Medium Shadow</DropdownItem>
                    <DropdownItem onClick={() => setTextShadow('3px 3px 6px rgba(0,0,0,0.3)')}>Heavy Shadow</DropdownItem>
                    <div className="border-t border-slate-200 dark:border-slate-700 my-1" />
                    <DropdownItem onClick={() => setTextOutline('1px 0 0 #000')}>Outline</DropdownItem>
                    <DropdownItem onClick={() => setTextOutline('1px 0 0 #f00')}>Red Outline</DropdownItem>
                    <DropdownItem onClick={() => setTextOutline('2px 0 0 #00f')}>Blue Outline</DropdownItem>
                  </DropdownMenu>

                  <ToolbarButton icon={WrapText} active={dropCap} onClick={() => setDropCap(!dropCap)} title="Drop Cap" />

                  <ToolbarDivider />

                  {/* Spacing Controls */}
                  <div className="flex items-center gap-1">
                    <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800" title="Letter Spacing">
                      <Space className="w-4 h-4" />
                    </button>
                    <input
                      type="range"
                      min="-2"
                      max="10"
                      step="0.5"
                      value={letterSpacing}
                      onChange={(e) => handleLetterSpacing(parseFloat(e.target.value))}
                      className="w-16 sm:w-20"
                    />
                    <span className="text-xs w-8 text-slate-600 dark:text-slate-400">{letterSpacing}px</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800" title="Line Height">
                      <AlignVerticalJustifyCenter className="w-4 h-4" />
                    </button>
                    <input
                      type="range"
                      min="1"
                      max="3"
                      step="0.1"
                      value={lineHeight}
                      onChange={(e) => handleLineHeight(parseFloat(e.target.value))}
                      className="w-16 sm:w-20"
                    />
                    <span className="text-xs w-8 text-slate-600 dark:text-slate-400">{lineHeight}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800" title="Word Spacing">
                      <ArrowLeftRight className="w-4 h-4" />
                    </button>
                    <input
                      type="range"
                      min="-2"
                      max="10"
                      step="0.5"
                      value={wordSpacing}
                      onChange={(e) => setWordSpacing(parseFloat(e.target.value))}
                      className="w-16 sm:w-20"
                    />
                    <span className="text-xs w-8 text-slate-600 dark:text-slate-400">{wordSpacing}px</span>
                  </div>
                </div>

                {/* Headings, Alignment, Lists Row */}
                <div className="flex flex-wrap items-center gap-1 pb-2 border-b border-slate-200 dark:border-slate-700 mb-2">
                  <DropdownMenu
                    trigger={
                      <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1" title="Headings">
                        <Heading className="w-4 h-4" />
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    }
                  >
                    <DropdownItem onClick={() => handleFormat('h1')} icon={Heading1} shortcut="H1">Heading 1</DropdownItem>
                    <DropdownItem onClick={() => handleFormat('h2')} icon={Heading2} shortcut="H2">Heading 2</DropdownItem>
                    <DropdownItem onClick={() => handleFormat('h3')} icon={Heading3} shortcut="H3">Heading 3</DropdownItem>
                    <DropdownItem onClick={() => handleFormat('h4')} icon={Heading4} shortcut="H4">Heading 4</DropdownItem>
                    <DropdownItem onClick={() => handleFormat('h5')} icon={Heading5} shortcut="H5">Heading 5</DropdownItem>
                    <DropdownItem onClick={() => handleFormat('h6')} icon={Heading6} shortcut="H6">Heading 6</DropdownItem>
                    <div className="border-t border-slate-200 dark:border-slate-700 my-1" />
                    <DropdownItem onClick={() => execCommand('formatBlock', '<p>')}>Normal</DropdownItem>
                  </DropdownMenu>

                  <DropdownMenu
                    trigger={
                      <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1" title="Alignment">
                        <CurrentAlignIcon className="w-4 h-4" />
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    }
                  >
                    <DropdownItem onClick={() => handleFormat('alignLeft')} icon={AlignLeft}>Align Left</DropdownItem>
                    <DropdownItem onClick={() => handleFormat('alignCenter')} icon={AlignCenter}>Align Center</DropdownItem>
                    <DropdownItem onClick={() => handleFormat('alignRight')} icon={AlignRight}>Align Right</DropdownItem>
                    <DropdownItem onClick={() => handleFormat('alignJustify')} icon={AlignJustify}>Justify</DropdownItem>
                  </DropdownMenu>

                  <ToolbarButton icon={List} active={formats.bulletList} onClick={() => handleFormat('bulletList')} title="Bullet List" />
                  <ToolbarButton icon={ListOrdered} active={formats.numberList} onClick={() => handleFormat('numberList')} title="Numbered List" />
                  <ToolbarButton icon={CheckSquare} active={formats.checklist} onClick={() => execCommand('insertUnorderedList')} title="Checklist" />

                  <ToolbarDivider />

                  <ToolbarButton icon={Quote} active={formats.blockquote} onClick={() => handleFormat('blockquote')} title="Blockquote" />
                  <ToolbarButton icon={Code} active={formats.code} onClick={() => handleFormat('code')} title="Code Block" />
                  <ToolbarButton icon={Terminal} onClick={() => execCommand('formatBlock', '<pre>')} title="Preformatted" />

                  <DropdownMenu
                    trigger={
                      <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1" title="Insert Block">
                        <PlusCircle className="w-4 h-4" />
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    }
                  >
                    <DropdownItem onClick={() => {
                      const infoHtml = '<div class="p-4 bg-blue-50 border-l-4 border-blue-500 my-4"><p class="text-blue-700">Info: </p></div>';
                      execCommand('insertHTML', infoHtml);
                    }} icon={Info}>Info Box</DropdownItem>
                    <DropdownItem onClick={() => {
                      const calloutHtml = '<div class="my-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg"><p class="text-yellow-800">📌 Callout: </p></div>';
                      execCommand('insertHTML', calloutHtml);
                    }} icon={Megaphone}>Callout</DropdownItem>
                    <DropdownItem onClick={() => {
                      const panelHtml = '<div class="my-4 p-4 bg-gray-50 border border-gray-200 rounded-lg"><p class="text-gray-700">📦 Panel content</p></div>';
                      execCommand('insertHTML', panelHtml);
                    }} icon={Layers}>Panel</DropdownItem>
                    <DropdownItem onClick={() => {
                      const quoteHtml = '<div class="my-8 text-2xl font-serif italic text-center text-gray-600 border-l-4 border-gray-300 pl-4">"Pull quote"</div>';
                      execCommand('insertHTML', quoteHtml);
                    }} icon={Quote}>Pull Quote</DropdownItem>
                  </DropdownMenu>
                </div>

                {/* Insert & Tools Row */}
                <div className="flex flex-wrap items-center gap-1">
                  <DropdownMenu
                    trigger={
                      <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 bg-primary/10 text-primary" title="Insert">
                        <PlusCircle className="w-4 h-4" />
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    }
                  >
                    <DropdownItem onClick={() => setShowLinkModal(true)} icon={Link} shortcut="Ctrl+K">Link</DropdownItem>
                    <DropdownItem onClick={() => setShowImageModal(true)} icon={Image}>Image</DropdownItem>
                    <DropdownItem onClick={() => setShowTableModal(true)} icon={Table}>Table</DropdownItem>
                    <DropdownItem onClick={() => execCommand('insertHorizontalRule')} icon={SeparatorHorizontal}>Horizontal Rule</DropdownItem>
                    <DropdownItem onClick={() => setShowSpecialCharsModal(true)} icon={SigmaSquare}>Special Characters</DropdownItem>
                    <div className="border-t border-slate-200 dark:border-slate-700 my-1" />
                    <DropdownItem onClick={() => setShowTemplateModal(true)} icon={LayoutTemplate}>Templates</DropdownItem>
                    <DropdownItem onClick={() => setShowThemeModal(true)} icon={Palette}>Themes</DropdownItem>
                  </DropdownMenu>

                  <DropdownMenu
                    trigger={
                      <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1" title="Columns">
                        <Columns2 className="w-4 h-4" />
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    }
                  >
                    <DropdownItem onClick={() => handleColumns(1)} icon={Columns2}>1 Column</DropdownItem>
                    <DropdownItem onClick={() => handleColumns(2)} icon={Columns2}>2 Columns</DropdownItem>
                    <DropdownItem onClick={() => handleColumns(3)} icon={Columns3}>3 Columns</DropdownItem>
                    <DropdownItem onClick={() => handleColumns(4)} icon={Columns4}>4 Columns</DropdownItem>
                  </DropdownMenu>

                  <ToolbarDivider />

                  <ToolbarButton icon={Undo} onClick={() => { document.execCommand('undo'); handleContentChange(); }} title="Undo (Ctrl+Z)" />
                  <ToolbarButton icon={Redo} onClick={() => { document.execCommand('redo'); handleContentChange(); }} title="Redo (Ctrl+Y)" />

                  <ToolbarDivider />

                  <ToolbarButton icon={Search} onClick={() => setShowFindReplaceModal(true)} title="Find & Replace (Ctrl+F)" />
                  <ToolbarButton icon={FileCheck} onClick={() => setShowStatisticsModal(true)} title="Statistics" />
                  <ToolbarButton icon={BookOpen} onClick={() => setShowScriptureLookup(true)} title="Scripture Lookup" />
                  
                  <DropdownMenu
                    trigger={
                      <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1" title="More Tools">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    }
                    align="right"
                  >
                    <DropdownItem onClick={() => alert('Translation coming soon!')} icon={Languages}>Translate</DropdownItem>
                    <DropdownItem onClick={() => alert('Voice typing coming soon!')} icon={Mic}>Voice Typing</DropdownItem>
                    <DropdownItem onClick={() => alert('Keyboard shortcuts: Ctrl+B Bold, Ctrl+I Italic, Ctrl+U Underline')} icon={Keyboard}>Keyboard Shortcuts</DropdownItem>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            {/* Post Title */}
            <textarea
              ref={titleTextareaRef}
              value={title}
              onChange={handleTitleChange}
              className="fraunces-title w-full bg-transparent border-none focus:ring-0 text-4xl sm:text-5xl font-bold text-slate-900 dark:text-slate-800 placeholder-slate-300 resize-none leading-tight mb-8"
              placeholder="Enter a soulful title..."
              rows={1}
            />

            {/* Rich Text Editor */}
            <div className="prose prose-slate prose-lg max-w-none text-slate-800 dark:text-slate-700">
              <div
                ref={contentEditableRef}
                className="rich-editor min-h-[500px] text-lg sm:text-xl leading-relaxed font-serif"
                contentEditable
                dir="ltr"
                suppressContentEditableWarning
                onInput={handleContentChange}
                onBlur={handleContentChange}
                style={{
                  fontFamily: fontFamily === 'Inter' ? 'Inter, sans-serif' : 
                             fontFamily === 'Fraunces' ? 'Fraunces, serif' : 
                             fontFamily,
                  fontSize: `${fontSize}px`,
                  color: textColor,
                  backgroundColor: bgColor,
                  letterSpacing: `${letterSpacing}px`,
                  lineHeight: lineHeight,
                  wordSpacing: `${wordSpacing}px`,
                  fontWeight: fontWeight,
                  textShadow: textShadow !== 'none' ? textShadow : undefined,
                  WebkitTextStroke: textOutline !== 'none' ? textOutline : undefined,
                  columnCount: columnCount > 1 ? columnCount : undefined,
                  columnGap: columnCount > 1 ? `${columnGap}px` : undefined,
                }}
              />
            </div>

            {/* Scripture Lookup Trigger */}
            <div className="mt-8 flex justify-center">
              <button 
                onClick={() => setShowScriptureLookup(true)}
                className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-primary hover:text-white text-primary border border-primary/20 rounded-full shadow-sm transition-all font-medium text-sm group"
              >
                <PlusCircle className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                Scripture Lookup
              </button>
            </div>
          </div>
        </section>

        {/* Right Pane */}
        <aside className="sidebar-panel w-80 sidebar-scroll overflow-y-auto shrink-0 z-20 hidden lg:flex flex-col p-6 gap-8">
          {/* Publishing Status */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Publishing</h3>
              <span className={`px-2 py-0.5 ${isDraft ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'} text-[10px] font-bold rounded uppercase`}>
                {isDraft ? 'Draft' : 'Published'}
              </span>
            </div>
            <div className="flex flex-col gap-3">
              <button 
                onClick={handlePublish}
                disabled={saving}
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-lg shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Rocket className="w-4 h-4" />
                Publish Now
              </button>
              <div className="flex items-center gap-2 text-slate-500 text-xs">
                <Calendar className="w-3 h-3" />
                <span>Schedule for later</span>
              </div>
            </div>
          </section>

          {/* Content Details */}
          <section className="flex flex-col gap-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Post Metadata</h3>
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">Content Type</label>
                <div className="relative">
                  <select 
                    value={metadata.contentType}
                    onChange={(e) => setMetadata({...metadata, contentType: e.target.value})}
                    className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-primary focus:border-primary text-slate-700"
                  >
                    <option>Sermon Note</option>
                    <option>Article / Essay</option>
                    <option>Devotional</option>
                    <option>Announcement</option>
                    <option>Bible Study</option>
                    <option>Prayer Journal</option>
                    <option>Teaching</option>
                    <option>Testimony</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-slate-600">Series</label>
                  <button className="text-[10px] font-bold text-primary flex items-center gap-0.5">
                    <PlusCircle className="w-3 h-3" /> NEW
                  </button>
                </div>
                <div className="relative">
                  <select 
                    value={metadata.series}
                    onChange={(e) => setMetadata({...metadata, series: e.target.value})}
                    className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-primary focus:border-primary text-slate-700"
                  >
                    <option value="">None</option>
                    {series.map(s => (
                      <option key={s.id} value={s.id}>{s.title}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">Tags</label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {metadata.tags.map((tag) => (
                    <span key={tag} className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1">
                      {tag} 
                      <X 
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => handleRemoveTag(tag)}
                      />
                    </span>
                  ))}
                </div>
                <input 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-primary focus:border-primary" 
                  placeholder="Add tag and press Enter..." 
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={handleAddTag}
                />
              </div>
            </div>
          </section>

          {/* Media */}
          <section className="flex flex-col gap-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Media Assets</h3>
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">Featured Image</label>
                <ImageUploadInput
                  value={metadata.featuredImage || ''}
                  onChange={(url) => setMetadata({...metadata, featuredImage: url})}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">Video Link</label>
                <div className="relative">
                  <Video className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-primary focus:border-primary" 
                    placeholder="YouTube or Vimeo URL" 
                    type="text"
                    value={metadata.videoUrl}
                    onChange={(e) => setMetadata({...metadata, videoUrl: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Engagement */}
          <section className="flex flex-col gap-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Engagement</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-700">Allow Comments</span>
                <button 
                  onClick={() => toggleSwitch('allowComments')}
                  className={`w-10 h-5 rounded-full relative transition-colors ${
                    metadata.allowComments ? 'bg-primary' : 'bg-slate-200'
                  }`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${
                    metadata.allowComments ? 'right-0.5' : 'left-0.5'
                  }`} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-700">Emoji Reactions</span>
                <button 
                  onClick={() => toggleSwitch('allowReactions')}
                  className={`w-10 h-5 rounded-full relative transition-colors ${
                    metadata.allowReactions ? 'bg-primary' : 'bg-slate-200'
                  }`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${
                    metadata.allowReactions ? 'right-0.5' : 'left-0.5'
                  }`} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-700">Feature on Homepage</span>
                <button 
                  onClick={() => toggleSwitch('featuredOnHomepage')}
                  className={`w-10 h-5 rounded-full relative transition-colors ${
                    metadata.featuredOnHomepage ? 'bg-primary' : 'bg-slate-200'
                  }`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${
                    metadata.featuredOnHomepage ? 'right-0.5' : 'left-0.5'
                  }`} />
                </button>
              </div>
            </div>
          </section>

          {/* Advanced Settings */}
          <section className="flex flex-col gap-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Advanced</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-700">Enable Track Changes</span>
                <button className="w-10 h-5 rounded-full bg-slate-200 relative">
                  <span className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm" />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-700">Require Review</span>
                <button className="w-10 h-5 rounded-full bg-slate-200 relative">
                  <span className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm" />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-700">Password Protected</span>
                <button className="w-10 h-5 rounded-full bg-slate-200 relative">
                  <span className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm" />
                </button>
              </div>
            </div>
          </section>

          <div className="mt-auto pt-6 border-t border-slate-100">
            <button 
              onClick={handleMoveToTrash}
              className="w-full flex items-center justify-center gap-2 text-red-500 hover:bg-red-50 py-2 rounded-lg text-xs font-bold transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Move to Trash
            </button>
          </div>
        </aside>
      </main>

      {/* Modals */}
      <LinkModal isOpen={showLinkModal} onClose={() => setShowLinkModal(false)} onInsert={handleInsertLink} />
      <ImageModal isOpen={showImageModal} onClose={() => setShowImageModal(false)} onInsert={handleInsertImage} />
      <TableModal isOpen={showTableModal} onClose={() => setShowTableModal(false)} onInsert={handleInsertTable} />
      <FindReplaceModal isOpen={showFindReplaceModal} onClose={() => setShowFindReplaceModal(false)} onFind={handleFind} onReplace={handleReplace} />
      <SpecialCharsModal isOpen={showSpecialCharsModal} onClose={() => setShowSpecialCharsModal(false)} onInsert={handleInsertSpecialChar} />
      <StatisticsModal isOpen={showStatisticsModal} onClose={() => setShowStatisticsModal(false)} content={content} />
      <TemplateModal isOpen={showTemplateModal} onClose={() => setShowTemplateModal(false)} onSelect={handleSelectTemplate} />
      <ThemeModal isOpen={showThemeModal} onClose={() => setShowThemeModal(false)} onSelect={handleSelectTheme} />

      {/* Scripture Lookup Modal */}
      {showScriptureLookup && (
        <div 
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowScriptureLookup(false); }}
        >
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-xl shadow-2xl max-h-[80vh] flex flex-col animate-in fade-in zoom-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-5 h-5 text-primary" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Scripture Lookup</h2>
              </div>
              <button
                onClick={() => setShowScriptureLookup(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  className="w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Search by reference or keyword (e.g., Psalm 23, love, grace)"
                  value={scriptureQuery}
                  onChange={e => setScriptureQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleScriptureLookup()}
                  autoFocus
                />
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-6">
              {scriptureResults.length > 0 ? (
                <div className="space-y-4">
                  {scriptureResults.map((result, index) => (
                    <div 
                      key={index}
                      className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-primary hover:bg-primary/5 cursor-pointer transition-all"
                      onClick={() => insertScripture(result.reference, result.text)}
                    >
                      <p className="text-sm font-bold text-primary">{result.reference}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">{result.text}</p>
                      <button className="mt-2 text-xs text-primary font-semibold">Insert</button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <BookOpen className="w-12 h-12 mx-auto text-slate-200 dark:text-slate-700" />
                  <p className="mt-2 text-sm font-medium">Enter a reference to search</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .writing-canvas {
          background-color: #F7F4F0;
        }
        .sidebar-panel {
          background-color: #FFFFFF;
          border-left: 1px solid #E5E7EB;
        }
        .dark .sidebar-panel {
          background-color: #1F2937;
          border-left: 1px solid #374151;
        }
        .rich-editor:focus {
          outline: none;
        }
        .fraunces-title {
          font-family: 'Fraunces', serif;
        }
        .sidebar-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .sidebar-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .sidebar-scroll::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .dark .sidebar-scroll::-webkit-scrollbar-thumb {
          background: #4b5563;
        }
        .rich-editor p:first-child:first-letter {
          ${dropCap ? 'font-size: 3em; float: left; line-height: 1; margin-right: 0.1em;' : ''}
        }
        .rich-editor {
          ${smallCaps ? 'font-variant: small-caps;' : ''}
        }
        @media (max-width: 1024px) {
          .writing-canvas {
            padding-left: 1rem;
            padding-right: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default SacredEditor;