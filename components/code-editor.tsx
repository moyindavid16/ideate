"use client";

import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Play, Save, AlertCircle, CheckCircle, Loader } from "lucide-react";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { usePyodide } from "@/lib/pyodide-manager";

const DEFAULT_PYTHON_CODE = `# Welcome to the Ideate's Python IDE
# This is a full-featured Python interpreter with linting and execution

def hello_world():
    """A simple greeting function"""
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

export interface CodeEditorRef {
  getCode: () => string;
  setCode: (code: string) => void;
  runCode: () => Promise<void>;
  insertCode: (code: string, position?: 'cursor' | 'end') => void;
  appendCode: (code: string) => void;
  replaceCode: (code: string) => void;
  formatCode: () => void;
  clearCode: () => void;
  resize: () => void;
}

export const CodeEditor = forwardRef<CodeEditorRef, CodeEditorProps>(
  ({ onCodeChange, initialCode }, ref) => {
    const [code, setCode] = useState(initialCode || DEFAULT_PYTHON_CODE);
    const [output, setOutput] = useState<string>("");
    const [isRunning, setIsRunning] = useState(false);
    const editorRef = useRef<React.ComponentRef<typeof CodeMirror>>(null);

    // Use singleton Pyodide manager
    const { instance: pyodide, status: pyodideStatus, error: pyodideError, initialize } = usePyodide();

    // Initialize Pyodide when component mounts
    useEffect(() => {
      if (pyodideStatus === 'idle') {
        initialize();
      }
    }, [pyodideStatus, initialize]);


    const handleCodeChange = useCallback((value: string) => {
      setCode(value);
      onCodeChange?.(value);
    }, [onCodeChange]);

    const runCode = useCallback(async () => {
      if (!pyodide || pyodideStatus !== 'ready') {
        const statusMessage = pyodideStatus === 'loading'
          ? 'Python interpreter is loading. Please wait...'
          : pyodideStatus === 'error'
          ? `Python interpreter failed to load: ${pyodideError?.message || 'Unknown error'}`
          : 'Python interpreter is not ready. Please wait...';
        setOutput(statusMessage);
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
        } catch {
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
    }, [code, pyodide, pyodideStatus, pyodideError?.message]);

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
      },
      runCode,
      insertCode: (newCode: string, position: 'cursor' | 'end' = 'cursor') => {
        if (position === 'end') {
          setCode(prev => prev + '\n' + newCode);
        } else {
          // For cursor position, we'll append to end for simplicity
          // In a real implementation, you'd need to track cursor position
          setCode(prev => prev + '\n' + newCode);
        }
      },
      appendCode: (newCode: string) => {
        setCode(prev => prev + '\n\n' + newCode);
      },
      replaceCode: (newCode: string) => {
        setCode(newCode);
      },
      formatCode: () => {
        // CodeMirror doesn't have built-in Python formatting
        // You could integrate with a Python formatter like black
        console.log('Format code not implemented for CodeMirror');
      },
      clearCode: () => {
        setCode('');
      },
      resize: () => {
        // CodeMirror handles resizing automatically with its parent container
        console.log('CodeMirror handles resize automatically');
      }
    }), [code, runCode]);


    const getStatusIcon = () => {
      switch (pyodideStatus) {
        case 'idle':
          return <Loader className="w-3 h-3 text-gray-400" />;
        case 'loading':
          return <Loader className="w-3 h-3 animate-spin text-blue-600" />;
        case 'ready':
          return <CheckCircle className="w-3 h-3 text-green-600" />;
        case 'error':
          return <AlertCircle className="w-3 h-3 text-red-600" />;
        default:
          return <Loader className="w-3 h-3 text-gray-400" />;
      }
    };


    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-transparent">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-medium text-gray-700">Python IDE</h3>
            <div className="flex items-center gap-1">
              {getStatusIcon()}
              <span className="text-xs text-gray-500">
                {pyodideStatus === 'idle' && 'Initializing...'}
                {pyodideStatus === 'loading' && 'Loading...'}
                {pyodideStatus === 'ready' && 'Ready'}
                {pyodideStatus === 'error' && `Error: ${pyodideError?.message || 'Unknown'}`}
              </span>
            </div>
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
          <PanelGroup
            direction="vertical"
            className="h-full"
          >
            <Panel
              defaultSize={70}
              minSize={10}
            >
              <div className="h-full border-b border-gray-200 rounded-t-3xl overflow-hidden">
                <CodeMirror
                  ref={editorRef}
                  value={code}
                  onChange={handleCodeChange}
                  extensions={[python()]}
                  theme={oneDark}
                  height="100%"
                  style={{
                    fontSize: '14px',
                    height: '100%'
                  }}
                  basicSetup={{
                    lineNumbers: true,
                    foldGutter: true,
                    dropCursor: false,
                    allowMultipleSelections: false,
                    indentOnInput: true,
                    bracketMatching: true,
                    closeBrackets: true,
                    autocompletion: true,
                    highlightSelectionMatches: false,
                    searchKeymap: true,
                  }}
                />
              </div>
            </Panel>

            <PanelResizeHandle className="relative flex items-center justify-center group h-2 bg-gray-100 hover:bg-gray-200 transition-colors cursor-row-resize">
              <div className="w-full h-0.5 bg-gray-300 group-hover:bg-gray-400 transition-colors" />
            </PanelResizeHandle>

            <Panel defaultSize={30} minSize={10}>
              <div className="h-full p-4 bg-gray-50 overflow-auto rounded-b-3xl">
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
            </Panel>
          </PanelGroup>
        </div>
      </div>
    );
  }
);

CodeEditor.displayName = 'CodeEditor';