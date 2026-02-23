// src/components/VirtualTaskList.tsx
// ──────────────────────────────────────────────────────────
// Virtualized list wrapper using react-virtuoso.
// Renders only visible items + small overscan buffer,
// dramatically reducing DOM nodes for 200+ item lists.
//
// Usage:
//   <VirtualTaskList
//     items={tasks}
//     renderItem={(task, index) => <YourTaskRow task={task} />}
//     estimateSize={64}     // estimated row height in px
//     endReached={loadMore} // infinite scroll callback
//   />
// ──────────────────────────────────────────────────────────

import { useRef, forwardRef } from 'react';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
import { Box, CircularProgress, Typography } from '@mui/material';

interface VirtualTaskListProps<T> {
  /** Array of items to render */
  items: T[];
  /** Render function for each item */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Called when user scrolls near the bottom */
  endReached?: () => void;
  /** Whether more items are being loaded */
  loadingMore?: boolean;
  /** Whether there are more items to load */
  hasMore?: boolean;
  /** Empty list message */
  emptyMessage?: string;
  /** Fixed height in px for the scroll container (default: fill parent) */
  height?: number | string;
  /** Overscan — extra items rendered above/below viewport (default: 200px) */
  overscan?: number;
}

function VirtualTaskListInner<T>(
  {
    items,
    renderItem,
    endReached,
    loadingMore = false,
    hasMore = false,
    emptyMessage = 'No items',
    height = '100%',
    overscan = 200,
  }: VirtualTaskListProps<T>,
  ref: React.Ref<VirtuosoHandle>,
) {
  const internalRef = useRef<VirtuosoHandle>(null);
  const virtuosoRef = (ref as React.RefObject<VirtuosoHandle>) || internalRef;

  if (items.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8, color: 'text.secondary' }}>
        <Typography variant="body2">{emptyMessage}</Typography>
      </Box>
    );
  }

  return (
    <Virtuoso
      ref={virtuosoRef}
      data={items}
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
      overscan={overscan}
      itemContent={(index, item) => (
        <Box key={index} sx={{ pb: 0.5 }}>
          {renderItem(item, index)}
        </Box>
      )}
      endReached={() => {
        if (endReached && hasMore && !loadingMore) {
          endReached();
        }
      }}
      components={{
        Footer: () =>
          loadingMore ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={20} />
            </Box>
          ) : null,
      }}
    />
  );
}

// Forward ref with generic support
const VirtualTaskList = forwardRef(VirtualTaskListInner) as <T>(
  props: VirtualTaskListProps<T> & { ref?: React.Ref<VirtuosoHandle> },
) => React.ReactElement | null;

export default VirtualTaskList;
export type { VirtualTaskListProps };
