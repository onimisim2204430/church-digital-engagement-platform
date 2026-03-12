/**
 * RichTextEditor Component - Professional WYSIWYG Editor
 * A fully-featured rich text editor with Microsoft Word-like capabilities
 * Built with React Quill for optimal React integration
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import ReactQuill from 'react-quill';
import {
  Undo,
  Redo,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  ListIndentDecrease,
  ListIndentIncrease,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Quote,
  Code,
  Link,
  Image,
  Eraser,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import 'react-quill/dist/quill.snow.css';
import './RichTextEditor.css';

interface RichTextEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minHeight?: number;
  onImageUpload?: (file: File) => Promise<string>;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Write your content here...',
  disabled = false,
  minHeight = 400,
  onImageUpload
}) => {
  const quillRef = useRef<ReactQuill>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [wordCount, setWordCount] = useState(0);

  // Custom toolbar configuration
  const modules = useMemo(() => ({
    toolbar: {
      container: '#toolbar',
      handlers: {
        image: imageHandler,
        undo: undoHandler,
        redo: redoHandler,
      }
    },
    clipboard: {
      matchVisual: false, // Better paste handling from Word/Google Docs
    },
    history: {
      delay: 1000,
      maxStack: 100,
      userOnly: true
    }
  }), []);

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'script',
    'blockquote', 'code-block',
    'list', 'bullet', 'indent',
    'align',
    'link', 'image',
    'clean'
  ];

  // Handle image insertion
  function imageHandler() {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB');
        return;
      }

      const editor = quillRef.current?.getEditor();
      if (!editor) return;

      const range = editor.getSelection(true);
      if (!range) return;

      // Show loading indicator
      editor.insertEmbed(range.index, 'image', '/images/loading.gif');
      editor.setSelection(range.index + 1, 0);

      try {
        let imageUrl: string;

        if (onImageUpload) {
          // Use custom upload handler if provided
          imageUrl = await onImageUpload(file);
        } else {
          // Fallback: Convert to base64 (not recommended for production)
          imageUrl = await convertToBase64(file);
        }

        // Replace loading image with actual image
        editor.deleteText(range.index, 1);
        editor.insertEmbed(range.index, 'image', imageUrl);
        editor.setSelection(range.index + 1, 0);
      } catch (error) {
        console.error('Image upload failed:', error);
        alert('Failed to upload image. Please try again.');
        editor.deleteText(range.index, 1);
      }
    };
  }

  // Convert image to base64
  function convertToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }

  // Undo handler
  function undoHandler() {
    const editor = quillRef.current?.getEditor();
    if (editor) {
      (editor as any).history.undo();
    }
  }

  // Redo handler
  function redoHandler() {
    const editor = quillRef.current?.getEditor();
    if (editor) {
      (editor as any).history.redo();
    }
  }

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Handle content change
  const handleChange = (content: string, _delta: any, _source: any, editor: any) => {
    onChange(content);
    
    // Update character and word count
    const text = editor.getText().trim();
    setCharCount(text.length);
    setWordCount(text.split(/\s+/).filter(Boolean).length);
  };

  // Update counts on mount and value change
  useEffect(() => {
    const editor = quillRef.current?.getEditor();
    if (editor) {
      const text = editor.getText().trim();
      setCharCount(text.length);
      setWordCount(text.split(/\s+/).filter(Boolean).length);
    }
  }, [value]);

  // Escape fullscreen with ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isFullscreen]);

  return (
    <div className={`rich-text-editor-wrapper ${isFullscreen ? 'fullscreen' : ''}`}>
      {/* Custom Toolbar */}
      <div id="toolbar" className="rich-text-toolbar">
        <div className="toolbar-group">
          <button className="ql-undo" title="Undo" type="button">
            <Undo className="w-4 h-4" />
          </button>
          <button className="ql-redo" title="Redo" type="button">
            <Redo className="w-4 h-4" />
          </button>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-group">
          <select className="ql-header" defaultValue="" title="Heading">
            <option value="">Normal</option>
            <option value="1">Heading 1</option>
            <option value="2">Heading 2</option>
            <option value="3">Heading 3</option>
            <option value="4">Heading 4</option>
          </select>
          <select className="ql-size" defaultValue="normal" title="Font Size">
            <option value="small">Small</option>
            <option value="normal">Normal</option>
            <option value="large">Large</option>
            <option value="huge">Huge</option>
          </select>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-group">
          <button className="ql-bold" title="Bold" type="button">
            <Bold className="w-4 h-4" />
          </button>
          <button className="ql-italic" title="Italic" type="button">
            <Italic className="w-4 h-4" />
          </button>
          <button className="ql-underline" title="Underline" type="button">
            <Underline className="w-4 h-4" />
          </button>
          <button className="ql-strike" title="Strikethrough" type="button">
            <Strikethrough className="w-4 h-4" />
          </button>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-group">
          <select className="ql-color" title="Text Color">
            <option value="#000000" />
            <option value="#e60000" />
            <option value="#ff9900" />
            <option value="#ffff00" />
            <option value="#008a00" />
            <option value="#0066cc" />
            <option value="#9933ff" />
            <option value="#ffffff" />
            <option value="#facccc" />
            <option value="#ffebcc" />
            <option value="#ffffcc" />
            <option value="#cce8cc" />
            <option value="#cce0f5" />
            <option value="#ebd6ff" />
            <option value="#bbbbbb" />
            <option value="#f06666" />
            <option value="#ffc266" />
            <option value="#ffff66" />
            <option value="#66b966" />
            <option value="#66a3e0" />
            <option value="#c285ff" />
            <option value="#888888" />
            <option value="#a10000" />
            <option value="#b26b00" />
            <option value="#b2b200" />
            <option value="#006100" />
            <option value="#0047b2" />
            <option value="#6b24b2" />
            <option value="#444444" />
            <option value="#5c0000" />
            <option value="#663d00" />
            <option value="#666600" />
            <option value="#003700" />
            <option value="#002966" />
            <option value="#3d1466" />
          </select>
          <select className="ql-background" title="Background Color">
            <option value="transparent" />
            <option value="#e60000" />
            <option value="#ff9900" />
            <option value="#ffff00" />
            <option value="#008a00" />
            <option value="#0066cc" />
            <option value="#9933ff" />
            <option value="#ffffff" />
            <option value="#facccc" />
            <option value="#ffebcc" />
            <option value="#ffffcc" />
            <option value="#cce8cc" />
            <option value="#cce0f5" />
            <option value="#ebd6ff" />
            <option value="#bbbbbb" />
            <option value="#f06666" />
            <option value="#ffc266" />
            <option value="#ffff66" />
            <option value="#66b966" />
            <option value="#66a3e0" />
            <option value="#c285ff" />
            <option value="#888888" />
            <option value="#a10000" />
            <option value="#b26b00" />
            <option value="#b2b200" />
            <option value="#006100" />
            <option value="#0047b2" />
            <option value="#6b24b2" />
            <option value="#444444" />
            <option value="#5c0000" />
            <option value="#663d00" />
            <option value="#666600" />
            <option value="#003700" />
            <option value="#002966" />
            <option value="#3d1466" />
          </select>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-group">
          <button className="ql-list" value="ordered" title="Numbered List" type="button">
            <ListOrdered className="w-4 h-4" />
          </button>
          <button className="ql-list" value="bullet" title="Bullet List" type="button">
            <List className="w-4 h-4" />
          </button>
          <button className="ql-indent" value="-1" title="Decrease Indent" type="button">
            <ListIndentDecrease className="w-4 h-4" />
          </button>
          <button className="ql-indent" value="+1" title="Increase Indent" type="button">
            <ListIndentIncrease className="w-4 h-4" />
          </button>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-group">
          <button className="ql-align" value="" title="Align Left" type="button">
            <AlignLeft className="w-4 h-4" />
          </button>
          <button className="ql-align" value="center" title="Align Center" type="button">
            <AlignCenter className="w-4 h-4" />
          </button>
          <button className="ql-align" value="right" title="Align Right" type="button">
            <AlignRight className="w-4 h-4" />
          </button>
          <button className="ql-align" value="justify" title="Align Justify" type="button">
            <AlignJustify className="w-4 h-4" />
          </button>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-group">
          <button className="ql-blockquote" title="Blockquote" type="button">
            <Quote className="w-4 h-4" />
          </button>
          <button className="ql-code-block" title="Code Block" type="button">
            <Code className="w-4 h-4" />
          </button>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-group">
          <button className="ql-link" title="Insert Link" type="button">
            <Link className="w-4 h-4" />
          </button>
          <button className="ql-image" title="Insert Image" type="button">
            <Image className="w-4 h-4" />
          </button>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-group">
          <button className="ql-clean" title="Clear Formatting" type="button">
            <Eraser className="w-4 h-4" />
          </button>
        </div>

        <div className="toolbar-spacer" />

        <div className="toolbar-group">
          <button
            type="button"
            className="ql-fullscreen"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Editor */}
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={handleChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        readOnly={disabled}
        style={{ minHeight: `${minHeight}px` }}
      />

      {/* Stats Footer */}
      <div className="rich-text-footer">
        <div className="editor-stats">
          <span className="stat-item">
            <strong>{charCount}</strong> characters
          </span>
          <span className="stat-divider">•</span>
          <span className="stat-item">
            <strong>{wordCount}</strong> words
          </span>
        </div>
      </div>
    </div>
  );
};

export default RichTextEditor;
