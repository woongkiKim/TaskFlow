# Cross-Industry Features (Part 2)

## Epic 11: Public Form to Task (Issue Intake) - In Progress
- [ ] Create `FormBuilder.tsx` to let workspace admins design intake forms (Text, Dropdown, Attachments).
- [ ] Create public frontend route `/f/[hash]` for clients to submit forms without logging in.
- [ ] Create Django DRF backend endpoint `POST /api/public/forms/[hash]/submit` to accept unauthenticated requests and map them to `Task.objects.create()`.
- [ ] Auto-assign new tasks to a predefined 'Triage' or 'Inbox' Kanban column of the linked project.
- [ ] Notify project owners when a new public form is submitted.

## Epic 12: Whiteboard / Mindmap Canvas
- [ ] Install whiteboard dependency (e.g., `excalidraw` or `@react-flow/node-based`).
- [ ] Create `WhiteboardPage.tsx` and route it under a workspace or project (`/project/1/whiteboard`).
- [ ] Implement saving/loading the canvas state JSON to Firebase Firestore or Django Backend.
- [ ] Implement right-click integration: "Convert sticky note to Task" action.

## Epic 13: Guest Portal & Public Shared Views
- [ ] Add "Share View" toggle in Project settings.
- [ ] Generate secure public URLs (`/shared/[uuid]`) for Gantt, Kanban, or List view.
- [ ] Refactor DRF backend permissions to allow read-only access for `shared_uuid` tokens.
- [ ] Implement strict filtering to ensure private tasks/comments are NOT leaked to the public API payload.
