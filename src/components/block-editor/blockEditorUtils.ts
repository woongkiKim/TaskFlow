// src/components/block-editor/blockEditorUtils.ts
import type { Block, BlockType } from './blockEditorTypes';

// ─── Utility Functions ──────────────────────────────
export const genId = () => `block_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const createBlock = (type: BlockType = 'text', content = ''): Block => ({
  id: genId(),
  type,
  content,
  checked: type === 'checklist' ? false : undefined,
});

// ─── Markdown → Blocks Conversion ──────────────────
export const markdownToBlocks = (md: string): Block[] => {
  if (!md.trim()) return [createBlock('text', '')];

  const lines = md.split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block (```)
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({ ...createBlock('code', codeLines.join('\n')), language: lang || undefined });
      i++; // skip closing ```
      continue;
    }

    // Divider
    if (/^---+$/.test(line.trim())) {
      blocks.push(createBlock('divider', ''));
      i++;
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      blocks.push(createBlock('heading3', line.slice(4)));
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      blocks.push(createBlock('heading2', line.slice(3)));
      i++;
      continue;
    }
    if (line.startsWith('# ')) {
      blocks.push(createBlock('heading1', line.slice(2)));
      i++;
      continue;
    }

    // Checklist
    if (/^- \[[ x]\] /.test(line)) {
      const checked = line.startsWith('- [x]');
      const text = line.replace(/^- \[[ x]\] /, '');
      blocks.push({ ...createBlock('checklist', text), checked });
      i++;
      continue;
    }

    // Bullet list
    if (line.startsWith('- ')) {
      blocks.push(createBlock('bullet-list', line.slice(2)));
      i++;
      continue;
    }

    // Numbered list
    if (/^\d+\. /.test(line)) {
      blocks.push(createBlock('numbered-list', line.replace(/^\d+\. /, '')));
      i++;
      continue;
    }

    // Quote
    if (line.startsWith('> ')) {
      blocks.push(createBlock('quote', line.slice(2)));
      i++;
      continue;
    }

    // Callout (> 💡 or similar emoji patterns)
    if (/^> /.test(line) && /[\u{1F4A1}\u{26A0}\u{2139}\u{1F525}\u{2705}\u{274C}\u{1F4CC}]/u.test(line)) {
      blocks.push(createBlock('callout', line.slice(2)));
      i++;
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Image (![alt](url))
    if (line.startsWith('![') && line.includes('](')) {
      const alt = line.slice(2, line.indexOf(']'));
      const url = line.slice(line.indexOf('](') + 2, line.lastIndexOf(')'));
      blocks.push({ ...createBlock('image', alt), url });
      i++;
      continue;
    }

    // Default: text
    blocks.push(createBlock('text', line));
    i++;
  }

  return blocks.length > 0 ? blocks : [createBlock('text', '')];
};

// ─── Blocks → Markdown Conversion ──────────────────
export const blocksToMarkdown = (blocks: Block[]): string => {
  return blocks
    .map((block, idx) => {
      switch (block.type) {
        case 'heading1': return `# ${block.content}`;
        case 'heading2': return `## ${block.content}`;
        case 'heading3': return `### ${block.content}`;
        case 'bullet-list': return `- ${block.content}`;
        case 'numbered-list': {
          // find sequential numbered-list blocks before this one
          let num = 1;
          for (let j = idx - 1; j >= 0; j--) {
            if (blocks[j].type === 'numbered-list') num++;
            else break;
          }
          return `${num}. ${block.content}`;
        }
        case 'checklist':
          return `- [${block.checked ? 'x' : ' '}] ${block.content}`;
        case 'quote': return `> ${block.content}`;
        case 'callout': return `> ${block.content}`;
        case 'code': return `\`\`\`${block.language || ''}\n${block.content}\n\`\`\``;
        case 'divider': return '---';
        case 'image': return `![${block.content}](${block.url || ''})`;
        default: return block.content;
      }
    })
    .join('\n');
};
