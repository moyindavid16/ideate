"use client";

import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Play, Save, AlertCircle, CheckCircle, Loader } from "lucide-react";
import Editor from "@monaco-editor/react";
import type { editor } from "monaco-editor";

// Monaco Editor Configuration
const MONACO_OPTIONS = {
  minimap: { enabled: false },
  fontSize: 14,
  lineNumbers: 'on' as const,
  roundedSelection: false,
  scrollBeyondLastLine: false,
  automaticLayout: true,
  tabSize: 4,
  insertSpaces: true,
  wordWrap: 'on' as const,
  lineNumbersMinChars: 3,
  glyphMargin: true,
  folding: true,
  lineDecorationsWidth: 20,
  renderLineHighlight: 'line' as const,
  selectionHighlight: false,
  occurrencesHighlight: false,
  codeLens: false,
  contextmenu: true,
  mouseWheelZoom: true,
  quickSuggestions: true,
  parameterHints: { enabled: true },
  suggestOnTriggerCharacters: true,
  acceptSuggestionOnEnter: 'on' as const,
  tabCompletion: 'on' as const,
  wordBasedSuggestions: 'allDocuments' as const,
  dragAndDrop: true,
  links: true,
  colorDecorators: true
};

// Python completion suggestions
const PYTHON_COMPLETIONS = [
  {
    label: 'print',
    kind: 'Function' as const,
    insertText: 'print(${1:value})',
    documentation: 'Print values to the console'
  },
  {
    label: 'def',
    kind: 'Keyword' as const,
    insertText: 'def ${1:function_name}(${2:args}):\n    ${3:pass}',
    documentation: 'Define a function'
  },
  {
    label: 'if',
    kind: 'Keyword' as const,
    insertText: 'if ${1:condition}:\n    ${2:pass}',
    documentation: 'Conditional statement'
  },
  {
    label: 'for',
    kind: 'Keyword' as const,
    insertText: 'for ${1:item} in ${2:iterable}:\n    ${3:pass}',
    documentation: 'For loop'
  },
  {
    label: 'while',
    kind: 'Keyword' as const,
    insertText: 'while ${1:condition}:\n    ${2:pass}',
    documentation: 'While loop'
  },
  {
    label: 'class',
    kind: 'Keyword' as const,
    insertText: 'class ${1:ClassName}:\n    def __init__(self${2:, args}):\n        ${3:pass}',
    documentation: 'Define a class'
  }
];

const DEFAULT_PYTHON_CODE = `# Welcome to the Ideate's Python IDE
# This is a full-featured Python interpreter with linting and execution

def hello_world():
    """A simple greeting function"""
    print("Hello from Ideate!")
    return "Welcome to the Ideate"

result = hello_world()
print(f"Result: {result}")

# Example: list comprehension
squares = [x**2 for x in range(1, 6)]
print(f"Squares: {squares}")`;

interface CodeEditorProps {
  tabType?: string;
  onCodeChange?: (code: string) => void;
  initialCode?: string;
}

interface PyodideInstance {
  runPython: (code: string) => unknown;
  loadPackage: (packages: string[]) => Promise<void>;
  globals: {
    get: (name: string) => unknown;
  };
}

export interface CodeEditorRef {
  getCode: () => string;
  setCode: (code: string) => void;
  runCode: () => Promise<void>;
  insertCode: (code: string, position?: 'cursor' | 'end') => void;
  appendCode: (code: string) => void;
  replaceCode: (code: string) => void;
  formatCode: () => void;
  clearCode: () => void;
}

export const CodeEditor = forwardRef<CodeEditorRef, CodeEditorProps>(
  ({ tabType = 'code', onCodeChange, initialCode }, ref) => {
    const [code, setCode] = useState(initialCode || DEFAULT_PYTHON_CODE);
    const [output, setOutput] = useState<string>("");
    const [isRunning, setIsRunning] = useState(false);
    const [pyodide, setPyodide] = useState<PyodideInstance | null>(null);
    const [pyodideStatus, setPyodideStatus] = useState<'loading' | 'ready' | 'error'>('loading');
    const [diagnostics, setDiagnostics] = useState<editor.IMarkerData[]>([]);
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<typeof import('monaco-editor') | null>(null);

    // Initialize Pyodide
    useEffect(() => {
      const initPyodide = async () => {
        try {
          setPyodideStatus('loading');

          // Load Pyodide from CDN
          if (typeof window !== 'undefined') {
            const windowWithPyodide = window as Window & typeof globalThis & {
              loadPyodide?: (config: { indexURL: string }) => Promise<PyodideInstance>
            };

            if (!windowWithPyodide.loadPyodide) {
              const script = document.createElement('script');
              script.src = 'https://cdn.jsdelivr.net/pyodide/v0.28.2/full/pyodide.js';
              script.onload = async () => {
                try {
                  const pyodideInstance = await windowWithPyodide.loadPyodide!({
                    indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.28.2/full/',
                  });

                  // Install common packages
                  await pyodideInstance.loadPackage(['numpy', 'matplotlib']);

                  setPyodide(pyodideInstance);
                  setPyodideStatus('ready');
                } catch (error) {
                  console.error('Failed to initialize Pyodide:', error);
                  setPyodideStatus('error');
                }
              };
              script.onerror = () => {
                console.error('Failed to load Pyodide script');
                setPyodideStatus('error');
              };
              document.head.appendChild(script);
            } else {
              const pyodideInstance = await windowWithPyodide.loadPyodide({
                indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.28.2/full/',
              });

              // Install common packages
              await pyodideInstance.loadPackage(['numpy', 'matplotlib']);

              setPyodide(pyodideInstance);
              setPyodideStatus('ready');
            }
          }
        } catch (error) {
          console.error('Failed to load Pyodide:', error);
          setPyodideStatus('error');
        }
      };

      initPyodide();
    }, []);

    // Setup Monaco Editor with Python language features
    const handleEditorDidMount = useCallback((editor: editor.IStandaloneCodeEditor, monaco: typeof import('monaco-editor')) => {
      editorRef.current = editor;
      monacoRef.current = monaco;

      // Configure Python language settings
      monaco.languages.registerCompletionItemProvider('python', {
        provideCompletionItems: () => {
          const suggestions = PYTHON_COMPLETIONS.map(completion => ({
            label: completion.label,
            kind: monaco.languages.CompletionItemKind[completion.kind],
            insertText: completion.insertText,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: completion.documentation
          }));
          return { suggestions };
        }
      });

      // Setup basic linting
      const performLinting = () => {
        const model = editor.getModel();
        if (!model) return;

        const code = model.getValue();
        const markers: editor.IMarkerData[] = [];

        // Basic syntax checking
        const lines = code.split('\n');
        lines.forEach((line, index) => {
          // Check for common Python syntax issues
          if (line.trim().endsWith(':') && !line.trim().match(/^(if|for|while|def|class|try|except|finally|with|elif|else)\b/)) {
            if (!line.includes('lambda')) {
              markers.push({
                severity: monaco.MarkerSeverity.Warning,
                message: 'Possible syntax error: unexpected colon',
                startLineNumber: index + 1,
                startColumn: line.indexOf(':') + 1,
                endLineNumber: index + 1,
                endColumn: line.length + 1
              });
            }
          }

          // Check for undefined variables (basic check)
          const undefinedVarMatch = line.match(/^\s*([a-zA-Z_]\w*)\s*(?!=)/);
          if (undefinedVarMatch && !line.includes('=') && !line.includes('import') && !line.includes('def') && !line.includes('class')) {
            // This is a very basic check - in a real IDE you'd use a proper AST parser
          }
        });

        monaco.editor.setModelMarkers(model, 'python', markers);
        setDiagnostics(markers);
      };

      // Perform linting on content change
      editor.onDidChangeModelContent(() => {
        performLinting();
      });

      // Initial linting
      performLinting();
    }, []);

    const handleCodeChange = useCallback((value: string | undefined) => {
      const newCode = value || '';
      setCode(newCode);
      onCodeChange?.(newCode);
    }, [onCodeChange]);

    const runCode = useCallback(async () => {
      if (!pyodide || pyodideStatus !== 'ready') {
        setOutput('Python interpreter is not ready. Please wait...');
        return;
      }

      setIsRunning(true);
      setOutput('');

      try {
        // Capture stdout and stderr
        pyodide.runPython(`
import sys
import traceback
from io import StringIO
sys.stdout = StringIO()
sys.stderr = StringIO()
        `);

        // Run the user code with proper error handling
        try {
          pyodide.runPython(code);
        } catch (pythonError) {
          // Get the detailed Python traceback
          const traceback = pyodide.runPython(`
import traceback
import sys
traceback.print_exc(file=sys.stderr)
sys.stderr.getvalue()
          `);
          setOutput(`Python Error:\n${traceback}`);
          setIsRunning(false);
          return;
        }

        // Get the captured output
        const stdout = pyodide.runPython('sys.stdout.getvalue()');
        const stderr = pyodide.runPython('sys.stderr.getvalue()');

        let result = '';
        if (stdout) result += stdout;
        if (stderr) result += `\nErrors:\n${stderr}`;

        setOutput(result || 'Code executed successfully (no output)');
      } catch (error) {
        // This catches JavaScript/Pyodide initialization errors
        setOutput(`System Error: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setIsRunning(false);
      }
    }, [code, pyodide, pyodideStatus]);

    const saveCode = useCallback(() => {
      const blob = new Blob([code], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'code.py';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, [code]);


    // Programmatic API for LLMs
    useImperativeHandle(ref, () => ({
      getCode: () => code,
      setCode: (newCode: string) => {
        setCode(newCode);
        if (editorRef.current) {
          editorRef.current.setValue(newCode);
        }
      },
      runCode,
      insertCode: (newCode: string, position: 'cursor' | 'end' = 'cursor') => {
        if (editorRef.current) {
          const editor = editorRef.current;
          const model = editor.getModel();
          if (model) {
            if (position === 'end') {
              const lineCount = model.getLineCount();
              const lastLineLength = model.getLineLength(lineCount);
              editor.executeEdits('', [{
                range: {
                  startLineNumber: lineCount,
                  startColumn: lastLineLength + 1,
                  endLineNumber: lineCount,
                  endColumn: lastLineLength + 1
                },
                text: '\n' + newCode
              }]);
            } else {
              const position = editor.getPosition();
              if (position) {
                editor.executeEdits('', [{
                  range: {
                    startLineNumber: position.lineNumber,
                    startColumn: position.column,
                    endLineNumber: position.lineNumber,
                    endColumn: position.column
                  },
                  text: newCode
                }]);
              }
            }
          }
        }
      },
      appendCode: (newCode: string) => {
        if (editorRef.current) {
          const editor = editorRef.current;
          const model = editor.getModel();
          if (model) {
            const lineCount = model.getLineCount();
            const lastLineLength = model.getLineLength(lineCount);
            editor.executeEdits('', [{
              range: {
                startLineNumber: lineCount,
                startColumn: lastLineLength + 1,
                endLineNumber: lineCount,
                endColumn: lastLineLength + 1
              },
              text: '\n\n' + newCode
            }]);
          }
        }
      },
      replaceCode: (newCode: string) => {
        setCode(newCode);
        if (editorRef.current) {
          editorRef.current.setValue(newCode);
        }
      },
      formatCode: () => {
        if (editorRef.current) {
          editorRef.current.getAction('editor.action.formatDocument')?.run();
        }
      },
      clearCode: () => {
        setCode('');
        if (editorRef.current) {
          editorRef.current.setValue('');
        }
      }
    }), [code, runCode]);


    const getStatusIcon = () => {
      switch (pyodideStatus) {
        case 'loading':
          return <Loader className="w-3 h-3 animate-spin text-blue-600" />;
        case 'ready':
          return <CheckCircle className="w-3 h-3 text-green-600" />;
        case 'error':
          return <AlertCircle className="w-3 h-3 text-red-600" />;
      }
    };

    const diagnosticsCount = diagnostics.length;
    const errorCount = diagnostics.filter(d => d.severity === 8).length; // MarkerSeverity.Error = 8
    const warningCount = diagnostics.filter(d => d.severity === 4).length; // MarkerSeverity.Warning = 4

    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-transparent">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-medium text-gray-700">Python IDE</h3>
            <div className="flex items-center gap-1">
              {getStatusIcon()}
              <span className="text-xs text-gray-500">
                {pyodideStatus === 'loading' && 'Loading...'}
                {pyodideStatus === 'ready' && 'Ready'}
                {pyodideStatus === 'error' && 'Error'}
              </span>
            </div>
            {diagnosticsCount > 0 && (
              <div className="flex items-center gap-1">
                {errorCount > 0 && (
                  <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                    {errorCount} error{errorCount > 1 ? 's' : ''}
                  </span>
                )}
                {warningCount > 0 && (
                  <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                    {warningCount} warning{warningCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="sticky-blue rounded-md hover:rotate-1 transition-all duration-200"
              onClick={saveCode}
            >
              <Save className="w-3 h-3 mr-1 text-blue-700" />
              <span className="text-blue-700 text-xs">Save</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="sticky-pink rounded-md hover:rotate-1 transition-all duration-200"
              onClick={runCode}
              disabled={isRunning || pyodideStatus !== 'ready'}
            >
              {isRunning ? (
                <Loader className="w-3 h-3 mr-1 animate-spin text-pink-700" />
              ) : (
                <Play className="w-3 h-3 mr-1 text-pink-700" />
              )}
              <span className="text-pink-700 text-xs">
                {isRunning ? 'Running...' : 'Run'}
              </span>
            </Button>
          </div>
        </div>

        <div className="flex-1 bg-transparent overflow-hidden">
          <div className="h-2/3 border-b border-gray-200">
            <Editor
              height="100%"
              defaultLanguage="python"
              value={code}
              onChange={handleCodeChange}
              onMount={handleEditorDidMount}
              theme="vs-light"
              options={MONACO_OPTIONS}
            />
          </div>

          <div className="h-1/3 p-4 bg-gray-50 overflow-auto">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-700">Output Console</h4>
              {output && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setOutput('')}
                  className="text-xs h-6 px-2"
                >
                  Clear
                </Button>
              )}
            </div>
            <pre className="text-xs font-mono text-gray-800 whitespace-pre-wrap overflow-auto max-h-full">
              {output || 'Run your code to see output here...'}
            </pre>
          </div>
        </div>
      </div>
    );
  }
);

CodeEditor.displayName = 'CodeEditor';