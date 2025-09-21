/**
 * Utility functions for programmatic Python IDE access
 * This module provides LLM-friendly functions to interact with the Python IDE
 */

import { CodeEditorRef } from './code-editor';

export interface PythonIDEController {
  // Basic operations
  getCode: () => string;
  setCode: (code: string) => void;
  replaceCode: (code: string) => void;
  appendCode: (code: string) => void;
  insertCodeAtCursor: (code: string) => void;
  clearCode: () => void;
  runCode: () => Promise<void>;
  formatCode: () => void;

  // Advanced operations
  insertFunction: (name: string, args: string[], body: string) => void;
  insertClass: (name: string, methods: { name: string; args: string[]; body: string }[]) => void;
  insertImport: (module: string, items?: string[]) => void;
  replaceFunction: (functionName: string, newCode: string) => void;
  addTestCase: (functionName: string, testCases: { input: unknown; expected: unknown }[]) => void;

  // Smart code insertion - the main method LLMs should use
  insertPythonCode: (code: string, options?: {
    position?: 'cursor' | 'end' | 'replace';
    format?: boolean;
    run?: boolean;
  }) => Promise<void>;
}

/**
 * Creates a controller for programmatic Python IDE access
 * @param editorRef Reference to the CodeEditor component
 * @returns PythonIDEController object with methods for code manipulation
 */
export function createPythonIDEController(editorRef: React.RefObject<CodeEditorRef>): PythonIDEController {
  const editor = editorRef.current;

  if (!editor) {
    throw new Error('Editor reference is not available');
  }

  return {
    // Basic operations
    getCode: () => editor.getCode(),
    setCode: (code: string) => editor.setCode(code),
    replaceCode: (code: string) => editor.replaceCode(code),
    appendCode: (code: string) => editor.appendCode(code),
    insertCodeAtCursor: (code: string) => editor.insertCode(code, 'cursor'),
    clearCode: () => editor.clearCode(),
    runCode: () => editor.runCode(),
    formatCode: () => editor.formatCode(),

    insertFunction: (name: string, args: string[], body: string) => {
      const functionCode = `\ndef ${name}(${args.join(', ')}):\n    ${body.split('\n').join('\n    ')}\n`;
      editor.insertCode(functionCode, 'end');
    },

    insertClass: (name: string, methods: { name: string; args: string[]; body: string }[]) => {
      let classCode = `\nclass ${name}:\n`;
      methods.forEach(method => {
        classCode += `    def ${method.name}(${method.args.join(', ')}):\n`;
        classCode += `        ${method.body.split('\n').join('\n        ')}\n\n`;
      });
      editor.insertCode(classCode, 'end');
    },

    insertImport: (module: string, items?: string[]) => {
      const currentCode = editor.getCode();
      const importStatement = items
        ? `from ${module} import ${items.join(', ')}\n`
        : `import ${module}\n`;

      // Insert import at the top of the file
      const lines = currentCode.split('\n');
      const firstNonCommentLine = lines.findIndex(line =>
        line.trim() && !line.trim().startsWith('#') && !line.trim().startsWith('"""') && !line.trim().startsWith("'''")
      );

      if (firstNonCommentLine === -1) {
        editor.setCode(importStatement + currentCode);
      } else {
        lines.splice(firstNonCommentLine, 0, importStatement.trim());
        editor.setCode(lines.join('\n'));
      }
    },

    replaceFunction: (functionName: string, newCode: string) => {
      const currentCode = editor.getCode();
      const lines = currentCode.split('\n');

      let functionStart = -1;
      let functionEnd = -1;
      let indentLevel = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim().startsWith(`def ${functionName}(`)) {
          functionStart = i;
          indentLevel = line.length - line.trimStart().length;
          continue;
        }

        if (functionStart !== -1) {
          const currentIndent = line.length - line.trimStart().length;
          if (line.trim() && currentIndent <= indentLevel) {
            functionEnd = i;
            break;
          }
        }
      }

      if (functionStart !== -1) {
        if (functionEnd === -1) functionEnd = lines.length;

        const beforeFunction = lines.slice(0, functionStart);
        const afterFunction = lines.slice(functionEnd);

        const newFunction = newCode.split('\n').map((line, index) =>
          index === 0 ? ' '.repeat(indentLevel) + line.trim() : line
        );

        const updatedCode = [...beforeFunction, ...newFunction, ...afterFunction].join('\n');
        editor.setCode(updatedCode);
      }
    },

    addTestCase: (functionName: string, testCases: { input: unknown; expected: unknown }[]) => {
      let testCode = `\n# Test cases for ${functionName}\nif __name__ == "__main__":\n`;

      testCases.forEach((testCase, index) => {
        const inputStr = typeof testCase.input === 'string'
          ? `"${testCase.input}"`
          : JSON.stringify(testCase.input);
        const expectedStr = typeof testCase.expected === 'string'
          ? `"${testCase.expected}"`
          : JSON.stringify(testCase.expected);

        testCode += `    # Test case ${index + 1}\n`;
        testCode += `    result${index + 1} = ${functionName}(${inputStr})\n`;
        testCode += `    expected${index + 1} = ${expectedStr}\n`;
        testCode += `    print(f"Test ${index + 1}: {'PASS' if result${index + 1} == expected${index + 1} else 'FAIL'}")\n`;
        testCode += `    print(f"  Input: {${inputStr}}, Expected: {expected${index + 1}}, Got: {result${index + 1}}")\n\n`;
      });

      editor.insertCode(testCode, 'end');
    },

    // Smart code insertion - the main method LLMs should use
    insertPythonCode: async (code: string, options = {}) => {
      const { position = 'end', format = true, run = false } = options;

      // Insert the code based on position
      switch (position) {
        case 'cursor':
          editor.insertCode(code, 'cursor');
          break;
        case 'end':
          editor.appendCode(code);
          break;
        case 'replace':
          editor.replaceCode(code);
          break;
        default:
          editor.appendCode(code);
      }

      // Format if requested
      if (format) {
        // Small delay to allow code insertion to complete
        setTimeout(() => {
          editor.formatCode();
        }, 100);
      }

      // Run if requested
      if (run) {
        // Small delay to allow formatting to complete
        setTimeout(async () => {
          await editor.runCode();
        }, format ? 300 : 100);
      }
    }
  };
}

/**
 * Common Python code templates for LLM use
 */
export const pythonTemplates = {
  basicFunction: (name: string, docstring?: string) => `
def ${name}():
    """${docstring || 'TODO: Add docstring'}"""
    pass
`,

  functionWithArgs: (name: string, args: string[], docstring?: string) => `
def ${name}(${args.join(', ')}):
    """${docstring || 'TODO: Add docstring'}"""
    pass
`,

  class: (name: string, methods: string[] = ['__init__']) => `
class ${name}:
    """TODO: Add class docstring"""

    def __init__(self):
        pass
${methods.filter(m => m !== '__init__').map(method => `
    def ${method}(self):
        """TODO: Add method docstring"""
        pass`).join('')}
`,

  dataAnalysis: () => `
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

# Load your data
# df = pd.read_csv('data.csv')

# Basic data exploration
# print(df.head())
# print(df.info())
# print(df.describe())

# Data visualization
# plt.figure(figsize=(10, 6))
# plt.plot(df['column_name'])
# plt.title('Your Chart Title')
# plt.xlabel('X Label')
# plt.ylabel('Y Label')
# plt.show()
`,

  machineLearning: () => `
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, r2_score

# Load and prepare data
# X = df[['feature1', 'feature2']]  # Features
# y = df['target']  # Target variable

# Split the data
# X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Create and train model
# model = LinearRegression()
# model.fit(X_train, y_train)

# Make predictions
# y_pred = model.predict(X_test)

# Evaluate model
# mse = mean_squared_error(y_test, y_pred)
# r2 = r2_score(y_test, y_pred)
# print(f'MSE: {mse}, R²: {r2}')
`,

  webScraping: () => `
import requests
from bs4 import BeautifulSoup
import pandas as pd

# Make a request
# url = 'https://example.com'
# response = requests.get(url)

# Parse HTML
# soup = BeautifulSoup(response.content, 'html.parser')

# Extract data
# data = []
# for element in soup.find_all('div', class_='target-class'):
#     data.append({
#         'title': element.find('h2').text,
#         'content': element.find('p').text
#     })

# Convert to DataFrame
# df = pd.DataFrame(data)
# print(df.head())
`,

  apiClient: () => `
import requests
import json

class APIClient:
    def __init__(self, base_url, api_key=None):
        self.base_url = base_url
        self.api_key = api_key
        self.session = requests.Session()

        if api_key:
            self.session.headers.update({'Authorization': f'Bearer {api_key}'})

    def get(self, endpoint, params=None):
        """Make GET request"""
        url = f"{self.base_url}/{endpoint}"
        response = self.session.get(url, params=params)
        response.raise_for_status()
        return response.json()

    def post(self, endpoint, data=None):
        """Make POST request"""
        url = f"{self.base_url}/{endpoint}"
        response = self.session.post(url, json=data)
        response.raise_for_status()
        return response.json()

# Usage example:
# client = APIClient('https://api.example.com')
# result = client.get('users', params={'page': 1})
# print(result)
`
};

/**
 * Code analysis utilities
 */
export const codeAnalysis = {
  /**
   * Extract function names from Python code
   */
  extractFunctions: (code: string): string[] => {
    const functionRegex = /def\s+(\w+)\s*\(/g;
    const functions: string[] = [];
    let match;

    while ((match = functionRegex.exec(code)) !== null) {
      functions.push(match[1]);
    }

    return functions;
  },

  /**
   * Extract class names from Python code
   */
  extractClasses: (code: string): string[] => {
    const classRegex = /class\s+(\w+)(?:\([^)]*\))?:/g;
    const classes: string[] = [];
    let match;

    while ((match = classRegex.exec(code)) !== null) {
      classes.push(match[1]);
    }

    return classes;
  },

  /**
   * Extract imports from Python code
   */
  extractImports: (code: string): { module: string; items?: string[] }[] => {
    const imports: { module: string; items?: string[] }[] = [];
    const lines = code.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      // Standard import: import module
      const standardImport = trimmed.match(/^import\s+(\w+(?:\.\w+)*)/);
      if (standardImport) {
        imports.push({ module: standardImport[1] });
        continue;
      }

      // From import: from module import item1, item2
      const fromImport = trimmed.match(/^from\s+(\w+(?:\.\w+)*)\s+import\s+(.+)/);
      if (fromImport) {
        const items = fromImport[2].split(',').map(item => item.trim());
        imports.push({ module: fromImport[1], items });
      }
    }

    return imports;
  },

  /**
   * Check if code has syntax errors (basic check)
   */
  hasBasicSyntaxErrors: (code: string): { hasErrors: boolean; errors: string[] } => {
    const errors: string[] = [];
    const lines = code.split('\n');

    let openParens = 0;
    let openBrackets = 0;
    let openBraces = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Check indentation consistency (basic)
      if (trimmed && !trimmed.startsWith('#')) {
        const indent = line.length - line.trimStart().length;
        if (indent % 4 !== 0) {
          errors.push(`Line ${i + 1}: Inconsistent indentation (should be multiple of 4)`);
        }
      }

      // Check brackets/parentheses balance
      for (const char of line) {
        switch (char) {
          case '(': openParens++; break;
          case ')': openParens--; break;
          case '[': openBrackets++; break;
          case ']': openBrackets--; break;
          case '{': openBraces++; break;
          case '}': openBraces--; break;
        }
      }

      if (openParens < 0) errors.push(`Line ${i + 1}: Unmatched closing parenthesis`);
      if (openBrackets < 0) errors.push(`Line ${i + 1}: Unmatched closing bracket`);
      if (openBraces < 0) errors.push(`Line ${i + 1}: Unmatched closing brace`);
    }

    if (openParens > 0) errors.push('Unclosed parentheses');
    if (openBrackets > 0) errors.push('Unclosed brackets');
    if (openBraces > 0) errors.push('Unclosed braces');

    return { hasErrors: errors.length > 0, errors };
  }
};