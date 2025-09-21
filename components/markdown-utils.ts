import { MarkdownEditorRef } from './markdown-editor';

export interface MarkdownCollaborationUtils {
  insertMeetingNotes: (editor: MarkdownEditorRef, title: string, date: string, attendees: string[], agenda: string[]) => void;
  addTaskList: (editor: MarkdownEditorRef, title: string, tasks: Array<{ text: string; completed?: boolean }>) => void;
  insertTimestamp: (editor: MarkdownEditorRef, label?: string) => void;
  addCollapsibleSection: (editor: MarkdownEditorRef, title: string, content: string) => void;
  formatSelectionAs: (editor: MarkdownEditorRef, format: 'bold' | 'italic' | 'code' | 'quote') => void;
  insertTemplate: (editor: MarkdownEditorRef, template: string) => void;
  appendAIResponse: (editor: MarkdownEditorRef, response: string, timestamp?: boolean) => void;
  insertCodeWithExplanation: (editor: MarkdownEditorRef, code: string, language: string, explanation?: string) => void;
  addCollaboratorComment: (editor: MarkdownEditorRef, author: string, comment: string) => void;
}

export const createMarkdownCollaborationUtils = (): MarkdownCollaborationUtils => ({
  insertMeetingNotes: (editor: MarkdownEditorRef, title: string, date: string, attendees: string[], agenda: string[]) => {
    const meetingTemplate = `# ${title}

**Date:** ${date}
**Attendees:** ${attendees.join(', ')}

## Agenda
${agenda.map(item => `- ${item}`).join('\n')}

## Notes


## Action Items


## Next Steps

`;
    editor.appendText(meetingTemplate);
  },

  addTaskList: (editor: MarkdownEditorRef, title: string, tasks: Array<{ text: string; completed?: boolean }>) => {
    const taskSection = `## ${title}

${tasks.map(task => `- [${task.completed ? 'x' : ' '}] ${task.text}`).join('\n')}

`;
    editor.appendText(taskSection);
  },

  insertTimestamp: (editor: MarkdownEditorRef, label?: string) => {
    const now = new Date();
    const timestamp = now.toLocaleString();
    const timestampText = label ? `**${label}:** ${timestamp}` : `*${timestamp}*`;
    editor.insertAtCursor(timestampText);
  },

  addCollapsibleSection: (editor: MarkdownEditorRef, title: string, content: string) => {
    const collapsible = `
<details>
<summary>${title}</summary>

${content}

</details>

`;
    editor.appendText(collapsible);
  },

  formatSelectionAs: (editor: MarkdownEditorRef, format: 'bold' | 'italic' | 'code' | 'quote') => {
    const content = editor.getContent();

    switch (format) {
      case 'bold':
        editor.insertAtCursor('**text**');
        break;
      case 'italic':
        editor.insertAtCursor('*text*');
        break;
      case 'code':
        editor.insertAtCursor('`code`');
        break;
      case 'quote':
        editor.insertAtCursor('\n> Quote text\n');
        break;
    }
  },

  insertTemplate: (editor: MarkdownEditorRef, template: string) => {
    const templates = {
      'project-plan': `# Project Plan: [Project Name]

## Overview
Brief description of the project...

## Objectives
- Primary objective
- Secondary objective

## Timeline
| Phase | Description | Timeline |
|-------|-------------|----------|
| Phase 1 | Planning | Week 1-2 |
| Phase 2 | Development | Week 3-6 |
| Phase 3 | Testing | Week 7-8 |

## Resources
- Resource 1
- Resource 2

## Risks & Mitigation
| Risk | Impact | Mitigation |
|------|--------|------------|
| Risk 1 | High | Mitigation strategy |

`,
      'bug-report': `# Bug Report

## Description
Brief description of the bug...

## Steps to Reproduce
1. Step 1
2. Step 2
3. Step 3

## Expected Behavior
What should happen...

## Actual Behavior
What actually happens...

## Environment
- OS:
- Browser:
- Version:

## Screenshots
(If applicable)

`,
      'feature-request': `# Feature Request

## Summary
Brief summary of the feature...

## Motivation
Why is this feature needed?

## Detailed Description
Detailed description of the feature...

## Acceptance Criteria
- [ ] Criteria 1
- [ ] Criteria 2
- [ ] Criteria 3

## Technical Notes
Any technical considerations...

`,
      'daily-standup': `# Daily Standup - ${new Date().toLocaleDateString()}

## What I did yesterday
-

## What I plan to do today
-

## Blockers/Issues
-

## Notes
-

`
    };

    const templateContent = templates[template as keyof typeof templates];
    if (templateContent) {
      editor.appendText(templateContent);
    } else {
      console.warn(`Template "${template}" not found`);
    }
  },

  appendAIResponse: (editor: MarkdownEditorRef, response: string, timestamp: boolean = true) => {
    const timestampText = timestamp ? `\n\n---\n*AI Response - ${new Date().toLocaleString()}*\n\n` : '\n\n---\n\n';
    editor.appendText(timestampText + response + '\n');
  },

  insertCodeWithExplanation: (editor: MarkdownEditorRef, code: string, language: string, explanation?: string) => {
    let codeSection = '';

    if (explanation) {
      codeSection += `## Code Explanation\n\n${explanation}\n\n`;
    }

    codeSection += `\`\`\`${language}\n${code}\n\`\`\`\n`;

    editor.appendText(codeSection);
  },

  addCollaboratorComment: (editor: MarkdownEditorRef, author: string, comment: string) => {
    const timestamp = new Date().toLocaleString();
    const commentBlock = `
> **${author}** - *${timestamp}*
>
> ${comment.split('\n').join('\n> ')}

`;
    editor.appendText(commentBlock);
  }
});

export const markdownUtils = createMarkdownCollaborationUtils();