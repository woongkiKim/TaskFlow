// src/components/block-editor/index.ts
// Barrel file for external consumers — keeps BlockEditor.tsx as a pure component export
export type { BlockType, Block } from './blockEditorTypes';
export { markdownToBlocks, blocksToMarkdown } from './blockEditorUtils';
