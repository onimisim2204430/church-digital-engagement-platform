/**
 * Type declarations for react-quill
 * Since @types/react-quill doesn't exist, we provide basic types here
 */

declare module 'react-quill' {
  import { Component } from 'react';
  import Quill from 'quill';

  export interface QuillOptions {
    theme?: string;
    modules?: any;
    formats?: string[];
    readOnly?: boolean;
    placeholder?: string;
    bounds?: string | HTMLElement;
    scrollingContainer?: string | HTMLElement;
  }

  export interface Range {
    index: number;
    length: number;
  }

  export interface UnprivilegedEditor {
    getLength(): number;
    getText(index?: number, length?: number): string;
    getHTML(): string;
    getBounds(index: number, length?: number): any;
    getSelection(focus?: boolean): Range | null;
    getContents(index?: number, length?: number): any;
  }

  export interface ReactQuillProps extends QuillOptions {
    value?: string;
    defaultValue?: string;
    onChange?: (
      content: string,
      delta: any,
      source: string,
      editor: UnprivilegedEditor
    ) => void;
    onChangeSelection?: (selection: Range, source: string, editor: UnprivilegedEditor) => void;
    onFocus?: (selection: Range, source: string, editor: UnprivilegedEditor) => void;
    onBlur?: (previousSelection: Range, source: string, editor: UnprivilegedEditor) => void;
    style?: React.CSSProperties;
    className?: string;
    tabIndex?: number;
    preserveWhitespace?: boolean;
  }

  export default class ReactQuill extends Component<ReactQuillProps> {
    getEditor(): Quill;
    makeUnprivilegedEditor(editor: Quill): UnprivilegedEditor;
    focus(): void;
    blur(): void;
  }

  export const Quill: typeof Quill;
}

declare module 'quill' {
  export default class Quill {
    constructor(container: string | Element, options?: any);
    deleteText(index: number, length: number): void;
    getContents(index?: number, length?: number): any;
    getLength(): number;
    getText(index?: number, length?: number): string;
    insertEmbed(index: number, type: string, value: any): void;
    insertText(index: number, text: string, formats?: any): void;
    setContents(delta: any): void;
    setText(text: string): void;
    updateContents(delta: any): void;
    format(name: string, value: any): void;
    formatLine(index: number, length: number, name: string, value: any): void;
    formatText(index: number, length: number, name: string, value: any): void;
    getFormat(index?: number, length?: number): any;
    removeFormat(index: number, length: number): void;
    getBounds(index: number, length?: number): any;
    getSelection(focus?: boolean): { index: number; length: number } | null;
    setSelection(index: number, length: number, source?: string): void;
    blur(): void;
    focus(): void;
    hasFocus(): boolean;
    update(source?: string): void;
    on(eventName: string, handler: (...args: any[]) => void): void;
    once(eventName: string, handler: (...args: any[]) => void): void;
    off(eventName: string, handler: (...args: any[]) => void): void;
    getModule(name: string): any;
    
    history: {
      undo(): void;
      redo(): void;
      clear(): void;
    };
  }
}
