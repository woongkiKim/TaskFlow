import { ReactRenderer } from '@tiptap/react';
import tippy, { type Instance as TippyInstance } from 'tippy.js';
import { forwardRef, useEffect, useImperativeHandle, useState, useCallback } from 'react';
import type { SuggestionOptions, SuggestionProps } from '@tiptap/suggestion';

export interface MentionMember {
    uid: string;
    displayName: string;
    photoURL?: string;
}

interface MentionListProps {
    items: MentionMember[];
    command: (item: { id: string; label: string }) => void;
}

interface MentionListRef {
    onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

const MentionList = forwardRef<MentionListRef, MentionListProps>((props, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = useCallback((index: number) => {
        const item = props.items[index];
        if (item) {
            props.command({ id: item.uid, label: item.displayName });
        }
    }, [props]);

    useEffect(() => setSelectedIndex(0), [props.items]);

    useImperativeHandle(ref, () => ({
        onKeyDown: ({ event }: { event: KeyboardEvent }) => {
            if (event.key === 'ArrowUp') {
                setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
                return true;
            }
            if (event.key === 'ArrowDown') {
                setSelectedIndex((selectedIndex + 1) % props.items.length);
                return true;
            }
            if (event.key === 'Enter') {
                selectItem(selectedIndex);
                return true;
            }
            return false;
        },
    }));

    return (
        <div className="mention-suggestion-list">
            {props.items.length ? (
                props.items.map((item, index) => (
                    <button
                        className={`mention-suggestion-item ${index === selectedIndex ? 'is-selected' : ''}`}
                        key={item.uid}
                        onClick={() => selectItem(index)}
                        type="button"
                    >
                        <span className="mention-avatar">
                            {item.photoURL ? (
                                <img src={item.photoURL} alt="" />
                            ) : (
                                <span className="mention-avatar-fallback">
                                    {item.displayName.charAt(0).toUpperCase()}
                                </span>
                            )}
                        </span>
                        <span className="mention-name">{item.displayName}</span>
                    </button>
                ))
            ) : (
                <div className="mention-suggestion-empty">No results</div>
            )}
        </div>
    );
});

MentionList.displayName = 'MentionList';

export const createMentionSuggestion = (
    members: MentionMember[],
): Omit<SuggestionOptions<MentionMember>, 'editor'> => ({
    items: ({ query }: { query: string }) => {
        return members
            .filter(m =>
                m.displayName.toLowerCase().includes(query.toLowerCase()),
            )
            .slice(0, 5);
    },
    render: () => {
        let component: ReactRenderer<MentionListRef> | null = null;
        let popup: TippyInstance[] | null = null;

        return {
            onStart: (props: SuggestionProps<MentionMember>) => {
                component = new ReactRenderer(MentionList, {
                    props,
                    editor: props.editor,
                });

                if (!props.clientRect) return;

                popup = tippy('body', {
                    getReferenceClientRect: props.clientRect as () => DOMRect,
                    appendTo: () => document.body,
                    content: component.element,
                    showOnCreate: true,
                    interactive: true,
                    trigger: 'manual',
                    placement: 'bottom-start',
                });
            },
            onUpdate(props: SuggestionProps<MentionMember>) {
                component?.updateProps(props);
                if (!props.clientRect || !popup?.[0]) return;
                popup[0].setProps({
                    getReferenceClientRect: props.clientRect as () => DOMRect,
                });
            },
            onKeyDown(props: { event: KeyboardEvent }) {
                if (props.event.key === 'Escape') {
                    popup?.[0]?.hide();
                    return true;
                }
                return component?.ref?.onKeyDown(props) ?? false;
            },
            onExit() {
                popup?.[0]?.destroy();
                component?.destroy();
            },
        };
    },
});
