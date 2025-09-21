"use client";

import { useState, useImperativeHandle, forwardRef, useCallback, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Save } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export interface MarkdownEditorRef {
  getContent: () => string;
  setContent: (content: string) => void;
  insertText: (text: string, position?: number) => void;
  appendText: (text: string) => void;
  prependText: (text: string) => void;
  replaceText: (searchText: string, replaceText: string) => void;
  replaceSelection: (startIndex: number, endIndex: number, newText: string) => void;
  insertAtCursor: (text: string) => void;
  addHeading: (text: string, level?: number) => void;
  addList: (items: string[], ordered?: boolean) => void;
  addCodeBlock: (code: string, language?: string) => void;
  addTable: (headers: string[], rows: string[][]) => void;
  addLink: (text: string, url: string) => void;
  addImage: (altText: string, url: string) => void;
  clear: () => void;
  focus: () => void;
}

interface MarkdownEditorProps {
  initialContent?: string;
  onContentChange?: (content: string) => void;
}

export const MarkdownEditor = forwardRef<MarkdownEditorRef, MarkdownEditorProps>(
  ({ initialContent, onContentChange }, ref) => {
    const defaultContent = `# Welcome to the Markdown Editor

This is your collaborative documentation space where you can:

## Features
- Write **rich text** with *emphasis*
- Create lists and organize thoughts
- Document your ideas and findings
- Collaborate with AI on content creation

## Getting Started
1. Start typing your notes here
2. Use standard Markdown syntax
3. The AI can help expand and improve your content
4. Export your work when ready

> **Tip:** This editor supports all standard Markdown features including links, images, tables, and code blocks.

\`\`\`javascript
// Code blocks are supported too!
console.log("Hello from Ideate!");
\`\`\`

---

Happy documenting! 📝
`;

    const [content, setContentState] = useState(initialContent || defaultContent);
    const [previewMode, setPreviewMode] = useState(false);
    const [textareaRef, setTextareaRef] = useState<HTMLTextAreaElement | null>(null);

    // Update content when initialContent prop changes (for tab switching)
    useEffect(() => {
      if (initialContent !== undefined) {
        setContentState(initialContent);
      }
    }, [initialContent]);

    const updateContent = useCallback((newContent: string) => {
      setContentState(newContent);
      onContentChange?.(newContent);
    }, [onContentChange]);

    useImperativeHandle(ref, () => ({
      getContent: () => content,

      setContent: (newContent: string) => {
        if (typeof newContent !== 'string') {
          console.warn('MarkdownEditor.setContent: content must be a string');
          return;
        }
        updateContent(newContent);
      },

      insertText: (text: string, position?: number) => {
        if (typeof text !== 'string') {
          console.warn('MarkdownEditor.insertText: text must be a string');
          return;
        }

        if (position !== undefined) {
          if (typeof position !== 'number' || position < 0 || position > content.length) {
            console.warn('MarkdownEditor.insertText: position must be a valid number within content bounds');
            return;
          }
          const newContent = content.slice(0, position) + text + content.slice(position);
          updateContent(newContent);
        } else {
          updateContent(content + text);
        }
      },

      appendText: (text: string) => {
        if (typeof text !== 'string') {
          console.warn('MarkdownEditor.appendText: text must be a string');
          return;
        }
        updateContent(content + (content.endsWith('\n') ? '' : '\n') + text);
      },

      prependText: (text: string) => {
        if (typeof text !== 'string') {
          console.warn('MarkdownEditor.prependText: text must be a string');
          return;
        }
        updateContent(text + (text.endsWith('\n') ? '' : '\n') + content);
      },

      replaceText: (searchText: string, replaceText: string) => {
        if (typeof searchText !== 'string' || typeof replaceText !== 'string') {
          console.warn('MarkdownEditor.replaceText: both searchText and replaceText must be strings');
          return;
        }
        try {
          const newContent = content.replace(new RegExp(searchText, 'g'), replaceText);
          updateContent(newContent);
        } catch (error) {
          console.warn('MarkdownEditor.replaceText: invalid regex pattern', error);
        }
      },

      replaceSelection: (startIndex: number, endIndex: number, newText: string) => {
        if (typeof startIndex !== 'number' || typeof endIndex !== 'number' || typeof newText !== 'string') {
          console.warn('MarkdownEditor.replaceSelection: startIndex and endIndex must be numbers, newText must be string');
          return;
        }
        if (startIndex < 0 || endIndex > content.length || startIndex > endIndex) {
          console.warn('MarkdownEditor.replaceSelection: invalid selection indices');
          return;
        }
        const newContent = content.slice(0, startIndex) + newText + content.slice(endIndex);
        updateContent(newContent);
      },

      insertAtCursor: (text: string) => {
        if (typeof text !== 'string') {
          console.warn('MarkdownEditor.insertAtCursor: text must be a string');
          return;
        }

        if (textareaRef && !previewMode) {
          const start = textareaRef.selectionStart;
          const end = textareaRef.selectionEnd;
          const newContent = content.slice(0, start) + text + content.slice(end);
          updateContent(newContent);

          setTimeout(() => {
            if (textareaRef) {
              textareaRef.selectionStart = textareaRef.selectionEnd = start + text.length;
              textareaRef.focus();
            }
          }, 0);
        } else {
          updateContent(content + text);
        }
      },

      addHeading: (text: string, level: number = 1) => {
        if (typeof text !== 'string') {
          console.warn('MarkdownEditor.addHeading: text must be a string');
          return;
        }
        if (typeof level !== 'number' || level < 1 || level > 6) {
          console.warn('MarkdownEditor.addHeading: level must be a number between 1 and 6');
          level = Math.max(1, Math.min(6, level || 1));
        }
        const heading = '#'.repeat(level) + ' ' + text;
        updateContent(content + (content.endsWith('\n') ? '' : '\n\n') + heading + '\n');
      },

      addList: (items: string[], ordered: boolean = false) => {
        if (!Array.isArray(items) || items.some(item => typeof item !== 'string')) {
          console.warn('MarkdownEditor.addList: items must be an array of strings');
          return;
        }
        if (items.length === 0) {
          console.warn('MarkdownEditor.addList: items array cannot be empty');
          return;
        }

        const listItems = items.map((item, index) =>
          ordered ? `${index + 1}. ${item}` : `- ${item}`
        ).join('\n');
        updateContent(content + (content.endsWith('\n') ? '' : '\n\n') + listItems + '\n');
      },

      addCodeBlock: (code: string, language: string = '') => {
        if (typeof code !== 'string') {
          console.warn('MarkdownEditor.addCodeBlock: code must be a string');
          return;
        }
        if (typeof language !== 'string') {
          console.warn('MarkdownEditor.addCodeBlock: language must be a string');
          language = '';
        }

        const codeBlock = `\`\`\`${language}\n${code}\n\`\`\``;
        updateContent(content + (content.endsWith('\n') ? '' : '\n\n') + codeBlock + '\n');
      },

      addTable: (headers: string[], rows: string[][]) => {
        if (!Array.isArray(headers) || headers.some(h => typeof h !== 'string')) {
          console.warn('MarkdownEditor.addTable: headers must be an array of strings');
          return;
        }
        if (!Array.isArray(rows) || rows.some(row => !Array.isArray(row) || row.some(cell => typeof cell !== 'string'))) {
          console.warn('MarkdownEditor.addTable: rows must be an array of arrays of strings');
          return;
        }
        if (headers.length === 0) {
          console.warn('MarkdownEditor.addTable: headers array cannot be empty');
          return;
        }

        const headerRow = '| ' + headers.join(' | ') + ' |';
        const separatorRow = '| ' + headers.map(() => '---').join(' | ') + ' |';
        const dataRows = rows.map(row => {
          const paddedRow = [...row];
          while (paddedRow.length < headers.length) {
            paddedRow.push('');
          }
          return '| ' + paddedRow.slice(0, headers.length).join(' | ') + ' |';
        }).join('\n');

        const table = [headerRow, separatorRow, dataRows].join('\n');
        updateContent(content + (content.endsWith('\n') ? '' : '\n\n') + table + '\n');
      },

      addLink: (text: string, url: string) => {
        if (typeof text !== 'string' || typeof url !== 'string') {
          console.warn('MarkdownEditor.addLink: both text and url must be strings');
          return;
        }
        const link = `[${text}](${url})`;
        updateContent(content + link);
      },

      addImage: (altText: string, url: string) => {
        if (typeof altText !== 'string' || typeof url !== 'string') {
          console.warn('MarkdownEditor.addImage: both altText and url must be strings');
          return;
        }
        const image = `![${altText}](${url})`;
        updateContent(content + (content.endsWith('\n') ? '' : '\n\n') + image + '\n');
      },

      clear: () => {
        updateContent('');
      },

      focus: () => {
        if (textareaRef && !previewMode) {
          textareaRef.focus();
        }
      }
    }), [content, updateContent, textareaRef, previewMode]);

  // Get the background class based on tab type - using transparent to match parent sticky note
  const getBackgroundClass = () => {
    return 'bg-transparent';
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className={`flex items-center justify-between px-4 py-3 border-b border-gray-200 ${getBackgroundClass()}`}>
        <h3 className="text-sm font-medium text-gray-700">Markdown Editor</h3>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPreviewMode(!previewMode)}
            className="sticky-orange rounded-md hover:rotate-1 transition-all duration-200"
          >
            {previewMode ? <EyeOff className="w-3 h-3 mr-1 text-orange-700" /> : <Eye className="w-3 h-3 mr-1 text-orange-700" />}
            <span className="text-orange-700 text-xs">{previewMode ? "Edit" : "Preview"}</span>
          </Button>
          <Button size="sm" variant="outline" className="sticky-blue rounded-md hover:rotate-1 transition-all duration-200">
            <Save className="w-3 h-3 mr-1 text-blue-700" />
            <span className="text-blue-700 text-xs">Save</span>
          </Button>
        </div>
      </div>

      <div className={`flex-1 p-4 ${getBackgroundClass()}`}>
        {previewMode ? (
          <div className={`flex-1 overflow-auto prose prose-sm max-w-none rounded-md border border-gray-200 p-4 ${getBackgroundClass()} shadow-sm`}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 text-gray-800">{children}</h1>,
                h2: ({ children }) => <h2 className="text-xl font-semibold mb-3 text-gray-800">{children}</h2>,
                h3: ({ children }) => <h3 className="text-lg font-medium mb-2 text-gray-800">{children}</h3>,
                p: ({ children }) => <p className="mb-3 text-gray-700 leading-relaxed">{children}</p>,
                ul: ({ children }) => <ul className="list-disc list-inside mb-3 text-gray-700">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside mb-3 text-gray-700">{children}</ol>,
                li: ({ children }) => <li className="mb-1">{children}</li>,
                strong: ({ children }) => <strong className="font-semibold text-gray-800">{children}</strong>,
                em: ({ children }) => <em className="italic text-gray-700">{children}</em>,
                code: ({ children }) => <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono text-gray-800">{children}</code>,
                pre: ({ children }) => <pre className="bg-gray-100 p-3 rounded-md overflow-x-auto mb-3">{children}</pre>,
                blockquote: ({ children }) => <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 mb-3">{children}</blockquote>,
                a: ({ href, children }) => <a href={href} className="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                hr: () => <hr className="my-6 border-gray-300" />,
                table: ({ children }) => <table className="w-full border-collapse border border-gray-300 mb-3">{children}</table>,
                th: ({ children }) => <th className="border border-gray-300 px-3 py-2 bg-gray-100 font-semibold text-left">{children}</th>,
                td: ({ children }) => <td className="border border-gray-300 px-3 py-2">{children}</td>,
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        ) : (
          <Textarea
            ref={setTextareaRef}
            value={content}
            onChange={(e) => updateContent(e.target.value)}
            className={`flex-1 min-h-0 resize-none text-sm rounded-md border-gray-200 focus:border-gray-400 transition-all duration-200 ${getBackgroundClass()} shadow-sm`}
            placeholder="Write your markdown content here..."
          />
        )}
      </div>

      <div className={`px-4 py-2 border-t border-gray-200 ${getBackgroundClass()}`}>
        <p className="text-xs text-gray-600">
          {previewMode ? "Viewing rendered markdown" : "Editing markdown - supports standard syntax"}
        </p>
      </div>
    </div>
  );
});

MarkdownEditor.displayName = 'MarkdownEditor';