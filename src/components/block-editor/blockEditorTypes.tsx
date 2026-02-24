// src/components/block-editor/blockEditorTypes.ts
import React from 'react';
import TitleIcon from '@mui/icons-material/Title';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import CheckBoxOutlinedIcon from '@mui/icons-material/CheckBoxOutlined';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import CodeIcon from '@mui/icons-material/Code';
import HorizontalRuleIcon from '@mui/icons-material/HorizontalRule';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AlternateEmailIcon from '@mui/icons-material/AlternateEmail';

// ─── Block Types ─────────────────────────────────────
export type BlockType =
  | 'text'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'bullet-list'
  | 'numbered-list'
  | 'checklist'
  | 'quote'
  | 'code'
  | 'divider'
  | 'callout'
  | 'image'
  | 'task'
  | 'mention';

export interface Block {
  id: string;
  type: BlockType;
  content: string;
  checked?: boolean; // for checklist
  language?: string; // for code blocks
  url?: string; // for images
  taskId?: string; // for task embed
  userId?: string; // for mentions
}

// ─── Slash Command Definitions ──────────────────────
export interface SlashCommand {
  id: BlockType;
  label: string;
  labelKo: string;
  description: string;
  descriptionKo: string;
  icon: React.ReactNode;
  keywords: string[];
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    id: 'text', label: 'Text', labelKo: '텍스트',
    description: 'Plain text block', descriptionKo: '일반 텍스트',
    icon: <TextFieldsIcon sx={{ fontSize: 20 }} />,
    keywords: ['text', 'paragraph', '텍스트', '문단'],
  },
  {
    id: 'heading1', label: 'Heading 1', labelKo: '제목 1',
    description: 'Large section heading', descriptionKo: '큰 섹션 제목',
    icon: <TitleIcon sx={{ fontSize: 20 }} />,
    keywords: ['h1', 'heading', 'title', '제목', '큰제목'],
  },
  {
    id: 'heading2', label: 'Heading 2', labelKo: '제목 2',
    description: 'Medium section heading', descriptionKo: '중간 섹션 제목',
    icon: <TitleIcon sx={{ fontSize: 18 }} />,
    keywords: ['h2', 'heading', 'subtitle', '소제목'],
  },
  {
    id: 'heading3', label: 'Heading 3', labelKo: '제목 3',
    description: 'Small section heading', descriptionKo: '작은 섹션 제목',
    icon: <TitleIcon sx={{ fontSize: 16 }} />,
    keywords: ['h3', 'heading', '작은제목'],
  },
  {
    id: 'bullet-list', label: 'Bullet List', labelKo: '글머리 기호',
    description: 'Unordered list', descriptionKo: '순서 없는 목록',
    icon: <FormatListBulletedIcon sx={{ fontSize: 20 }} />,
    keywords: ['bullet', 'list', 'ul', '목록', '글머리'],
  },
  {
    id: 'numbered-list', label: 'Numbered List', labelKo: '번호 목록',
    description: 'Ordered list', descriptionKo: '순서 있는 목록',
    icon: <FormatListNumberedIcon sx={{ fontSize: 20 }} />,
    keywords: ['number', 'list', 'ol', 'ordered', '번호', '순서'],
  },
  {
    id: 'checklist', label: 'Checklist', labelKo: '체크리스트',
    description: 'To-do checklist', descriptionKo: '할 일 체크리스트',
    icon: <CheckBoxOutlinedIcon sx={{ fontSize: 20 }} />,
    keywords: ['check', 'todo', 'checkbox', '체크', '할일'],
  },
  {
    id: 'quote', label: 'Quote', labelKo: '인용',
    description: 'Quote or callout', descriptionKo: '인용문',
    icon: <FormatQuoteIcon sx={{ fontSize: 20 }} />,
    keywords: ['quote', 'blockquote', '인용', '인용문'],
  },
  {
    id: 'callout', label: 'Callout', labelKo: '콜아웃',
    description: 'Highlighted callout box', descriptionKo: '강조 박스',
    icon: <LightbulbOutlinedIcon sx={{ fontSize: 20 }} />,
    keywords: ['callout', 'alert', 'info', '콜아웃', '알림', '강조'],
  },
  {
    id: 'image', label: 'Image', labelKo: '이미지',
    description: 'Upload or embed image', descriptionKo: '이미지 업로드 또는 삽입',
    icon: <ImageOutlinedIcon sx={{ fontSize: 20 }} />,
    keywords: ['image', 'picture', 'upload', '이미지', '사진', '업로드'],
  },
  {
    id: 'code', label: 'Code', labelKo: '코드',
    description: 'Code block', descriptionKo: '코드 블록',
    icon: <CodeIcon sx={{ fontSize: 20 }} />,
    keywords: ['code', 'snippet', '코드'],
  },
  {
    id: 'divider', label: 'Divider', labelKo: '구분선',
    description: 'Horizontal divider', descriptionKo: '수평 구분선',
    icon: <HorizontalRuleIcon sx={{ fontSize: 20 }} />,
    keywords: ['divider', 'line', 'hr', '구분선', '줄'],
  },
  {
    id: 'task', label: 'Embed Task', labelKo: '작업 임베드',
    description: 'Link and display a task', descriptionKo: '작업을 연결하고 표시합니다',
    icon: <AssignmentIcon sx={{ fontSize: 20 }} />,
    keywords: ['task', 'embed', 'link', '작업', '태스크', '임베드'],
  },
  {
    id: 'mention', label: 'Mention Person', labelKo: '사람 멘션',
    description: 'Mention a team member', descriptionKo: '팀원을 멘션합니다',
    icon: <AlternateEmailIcon sx={{ fontSize: 20 }} />,
    keywords: ['mention', 'person', 'user', '멘션', '@', '사람', '사용자'],
  },
];
