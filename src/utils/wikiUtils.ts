// src/utils/wikiUtils.ts

export const extractHeadings = (md: string) => {
  const lines = md.split('\n');
  return lines
    .filter(l => /^#{1,3} /.test(l))
    .map((l, i) => {
      const match = l.match(/^(#{1,3}) (.+)$/);
      if (!match) return null;
      return { id: `h-${i}`, level: match[1].length, text: match[2].replace(/\*\*/g, '').trim() };
    })
    .filter(Boolean) as { id: string; level: number; text: string }[];
};

export const RECENT_DOCS_KEY = 'wiki_recent_docs';
export const getRecentDocIds = (wsId: string): string[] => {
  try { return JSON.parse(localStorage.getItem(`${RECENT_DOCS_KEY}_${wsId}`) || '[]'); } catch { return []; }
};
export const addRecentDocId = (wsId: string, docId: string) => {
  const ids = getRecentDocIds(wsId).filter(id => id !== docId);
  ids.unshift(docId);
  localStorage.setItem(`${RECENT_DOCS_KEY}_${wsId}`, JSON.stringify(ids.slice(0, 10)));
};

export const renderMarkdown = (md: string): string => {
  const html = md
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:0.85em;">$1</code>')
    .replace(/^### (.+)$/gm, '<h3 style="font-size:1.1rem;font-weight:700;margin:1.2em 0 0.4em;">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="font-size:1.3rem;font-weight:700;margin:1.4em 0 0.5em;border-bottom:1px solid #e2e8f0;padding-bottom:0.3em;">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="font-size:1.6rem;font-weight:800;margin:0 0 0.6em;">$1</h1>')
    .replace(/^> (.+)$/gm, '<blockquote style="border-left:4px solid #6366f1;padding:0.5em 1em;margin:1em 0;background:#f8fafc;border-radius:0 8px 8px 0;color:#475569;">$1</blockquote>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^\|(.+)\|$/gm, (match) => {
      const cells = match.split('|').filter(Boolean).map(c => c.trim());
      if (cells.every(c => /^[-:]+$/.test(c))) return '';
      const tag = 'td';
      return `<tr>${cells.map(c => `<${tag} style="padding:8px 12px;border:1px solid #e2e8f0;">${c}</${tag}>`).join('')}</tr>`;
    })
    .replace(/((<tr>.*<\/tr>\n?)+)/g, '<table style="border-collapse:collapse;width:100%;margin:1em 0;">$1</table>')
    .replace(/^- \[x\] (.+)$/gm, '<div style="display:flex;align-items:center;gap:6px;margin:3px 0;"><input type="checkbox" checked disabled style="accent-color:#6366f1;"/>$1</div>')
    .replace(/^- \[ \] (.+)$/gm, '<div style="display:flex;align-items:center;gap:6px;margin:3px 0;"><input type="checkbox" disabled/>$1</div>')
    .replace(/^- (.+)$/gm, '<li style="margin:3px 0;">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li style="margin:3px 0;">$1</li>')
    .replace(/((<li.*<\/li>\n?)+)/g, '<ul style="padding-left:1.4em;margin:0.5em 0;">$1</ul>')
    .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #e2e8f0;margin:1.5em 0;"/>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:12px;display:block;margin:1.5em auto;box-shadow:0 8px 30px rgba(0,0,0,0.12);"/>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#6366f1;text-decoration:none;font-weight:600;">$1</a>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
  return html;
};

export const EMOJI_OPTIONS = ['📄', '📝', '📡', '🚀', '🔑', '📐', '🚢', '🔄', '💡', '📋', '📊', '🎯', '🧪', '🛡️', '📦', '🎨', '⚙️', '📌', '🗂️', '💬'];

export const getDisplayTitle = (title: string, icon?: string) => {
  if (!title) return '';
  if (!icon) return title;
  if (title.startsWith(icon)) return title.slice(icon.length).trim();
  try {
    const iconStr = String(icon);
    if (title.startsWith(iconStr)) return title.slice(iconStr.length).trim();
  } catch { /* ignore */ }
  return title;
};

export const FORMATTING_GUIDE = [
  { syntax: '# 제목', desc: '큰 제목', descEn: 'Heading 1' },
  { syntax: '## 제목', desc: '중간 제목', descEn: 'Heading 2' },
  { syntax: '### 제목', desc: '작은 제목', descEn: 'Heading 3' },
  { syntax: '**굵게**', desc: '굵은 글씨', descEn: 'Bold' },
  { syntax: '*기울임*', desc: '기울임꼴', descEn: 'Italic' },
  { syntax: '- 항목', desc: '목록', descEn: 'List item' },
  { syntax: '- [ ] 할 일', desc: '체크리스트', descEn: 'Checklist' },
  { syntax: '> 인용', desc: '인용문', descEn: 'Blockquote' },
  { syntax: '`코드`', desc: '인라인 코드', descEn: 'Inline code' },
  { syntax: '```코드```', desc: '코드 블록', descEn: 'Code block' },
  { syntax: '---', desc: '구분선', descEn: 'Divider' },
  { syntax: '| A | B |', desc: '표', descEn: 'Table' },
  { syntax: '[링크](url)', desc: '하이퍼링크', descEn: 'Link' },
];
