// src/utils/tagUtils.ts
// Tag-related utility functions — extracted to fix Fast Refresh warnings

const TAG_COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#06b6d4',
];

export const getTagColor = (tag: string) => {
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
        hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }
    return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
};

export const parseTagsFromText = (text: string): { cleanText: string; tags: string[] } => {
    const tagRegex = /#([\w\uAC00-\uD7A3]+)/g;
    const tags: string[] = [];
    let match;
    while ((match = tagRegex.exec(text)) !== null) {
        if (!tags.includes(match[1])) {
            tags.push(match[1]);
        }
    }
    const cleanText = text.replace(tagRegex, '').trim();
    return { cleanText, tags };
};
