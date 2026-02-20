import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Mention from '@tiptap/extension-mention';
import Image from '@tiptap/extension-image';
import { useEffect, useCallback, useMemo } from 'react';
import { createMentionSuggestion, type MentionMember } from './MentionSuggestion';
import './RichTextEditor.css';

interface RichTextEditorProps {
    content: string;
    onChange: (html: string) => void;
    placeholder?: string;
    minHeight?: number;
    editable?: boolean;
    members?: MentionMember[];
}

/** Ensure backward compat: if content is plain text (no HTML), wrap in <p> */
const normalizeContent = (content: string): string => {
    if (!content) return '';
    const trimmed = content.trim();
    if (trimmed.startsWith('<')) return trimmed;
    return trimmed.split('\n').map(line => `<p>${line || '<br>'}</p>`).join('');
};

const MenuBar = ({ editor, onAddImage }: {
    editor: ReturnType<typeof useEditor>;
    onAddImage: () => void;
}) => {
    const addLink = useCallback(() => {
        if (!editor) return;
        const url = window.prompt('URL:');
        if (url) {
            editor.chain().focus().setLink({ href: url }).run();
        }
    }, [editor]);

    if (!editor) return null;

    return (
        <div className="rich-text-toolbar">
            <button type="button" onClick={() => editor.chain().focus().toggleBold().run()}
                className={editor.isActive('bold') ? 'is-active' : ''} title="Bold (Ctrl+B)">
                <strong>B</strong>
            </button>
            <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()}
                className={editor.isActive('italic') ? 'is-active' : ''} title="Italic (Ctrl+I)">
                <em>I</em>
            </button>
            <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()}
                className={editor.isActive('strike') ? 'is-active' : ''} title="Strikethrough">
                <s>S</s>
            </button>
            <button type="button" onClick={() => editor.chain().focus().toggleCode().run()}
                className={editor.isActive('code') ? 'is-active' : ''} title="Inline Code">
                {'</>'}
            </button>

            <div className="separator" />

            <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''} title="Heading">
                H
            </button>
            <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={editor.isActive('bulletList') ? 'is-active' : ''} title="Bullet List">
                •
            </button>
            <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={editor.isActive('orderedList') ? 'is-active' : ''} title="Ordered List">
                1.
            </button>
            <button type="button" onClick={() => editor.chain().focus().toggleTaskList().run()}
                className={editor.isActive('taskList') ? 'is-active' : ''} title="Task List">
                ☑
            </button>

            <div className="separator" />

            <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()}
                className={editor.isActive('blockquote') ? 'is-active' : ''} title="Blockquote">
                &ldquo;
            </button>
            <button type="button" onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                className={editor.isActive('codeBlock') ? 'is-active' : ''} title="Code Block">
                {'{ }'}
            </button>
            <button type="button" onClick={addLink}
                className={editor.isActive('link') ? 'is-active' : ''} title="Link (Ctrl+K)">
                🔗
            </button>
            <button type="button" onClick={onAddImage} title="Image">
                🖼️
            </button>
            <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider">
                ─
            </button>
        </div>
    );
};

const RichTextEditor = ({
    content,
    onChange,
    placeholder = 'Write something... (type @ to mention)',
    minHeight = 80,
    editable = true,
    members = [],
}: RichTextEditorProps) => {
    const mentionSuggestion = useMemo(
        () => createMentionSuggestion(members),
        [members],
    );

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3] },
            }),
            Placeholder.configure({ placeholder }),
            Link.configure({
                openOnClick: true,
                autolink: true,
                HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
            }),
            TaskList,
            TaskItem.configure({ nested: true }),
            Image.configure({
                inline: false,
                allowBase64: true,
                HTMLAttributes: { class: 'editor-image' },
            }),
            Mention.configure({
                HTMLAttributes: { class: 'mention' },
                suggestion: mentionSuggestion,
            }),
        ],
        content: normalizeContent(content),
        editable,
        onUpdate: ({ editor: e }) => {
            onChange(e.getHTML());
        },
    });

    // Sync external content changes
    useEffect(() => {
        if (editor && !editor.isFocused) {
            const normalized = normalizeContent(content);
            if (editor.getHTML() !== normalized) {
                editor.commands.setContent(normalized);
            }
        }
    }, [content, editor]);

    const handleAddImage = useCallback(() => {
        if (!editor) return;
        const url = window.prompt('Image URL:');
        if (url) {
            editor.chain().focus().setImage({ src: url }).run();
        }
    }, [editor]);

    return (
        <div className="rich-text-editor" style={{ minHeight }}>
            {editable && <MenuBar editor={editor} onAddImage={handleAddImage} />}
            <EditorContent editor={editor} />
        </div>
    );
};

export default RichTextEditor;
