// src/services/mock/mockData.ts
// Realistic dummy data for all TaskFlow entities

import type {
  Task, Project, Sprint, Workspace, TeamMember, TeamGroup,
  Decision, Handoff, Issue, Notification, Initiative,
  CustomView, IssueTemplate, AutomationRule, KanbanColumn,
  WikiDocument,
} from '../../types';

export const MOCK_USER_ID = 'mock_user_001';
const MOCK_WS_ID = 'mock_ws_001';
const MOCK_PROJECT_A = 'mock_proj_001';
const MOCK_PROJECT_B = 'mock_proj_002';
const MOCK_PROJECT_C = 'mock_proj_003';

// ─── Team Members ────────────────────────────────────────
export const mockMembers: TeamMember[] = [
  { uid: MOCK_USER_ID, displayName: '김영수', email: 'youngsoo@test.com', photoURL: undefined, role: 'owner', joinedAt: '2025-12-01 09:00:00' },
  { uid: 'mock_user_002', displayName: '박지현', email: 'jihyun@test.com', photoURL: undefined, role: 'admin', joinedAt: '2025-12-05 10:00:00' },
  { uid: 'mock_user_003', displayName: '이민수', email: 'minsu@test.com', photoURL: undefined, role: 'maintainer', joinedAt: '2025-12-10 11:00:00' },
  { uid: 'mock_user_004', displayName: '최서연', email: 'seoyeon@test.com', photoURL: undefined, role: 'member', joinedAt: '2026-01-02 09:30:00' },
  { uid: 'mock_user_005', displayName: '정우진', email: 'woojin@test.com', photoURL: undefined, role: 'triage', joinedAt: '2026-01-15 14:00:00' },
  { uid: 'mock_user_006', displayName: '한소영', email: 'soyoung@test.com', photoURL: undefined, role: 'viewer', joinedAt: '2026-01-20 10:00:00' },
];

/** Default Kanban columns */
const defaultColumns: KanbanColumn[] = [
  { id: 'todo', title: 'To Do', color: '#6366f1', order: 0 },
  { id: 'inprogress', title: 'In Progress', color: '#f59e0b', order: 1 },
  { id: 'in-review', title: 'In Review', color: '#d97706', order: 2 },
  { id: 'done', title: 'Done', color: '#10b981', order: 3 },
];

const designColumns: KanbanColumn[] = [
  { id: 'backlog', title: 'Backlog', color: '#6b7280', order: 0 },
  { id: 'designing', title: 'Designing', color: '#8b5cf6', order: 1 },
  { id: 'feedback', title: 'Feedback', color: '#f59e0b', order: 2 },
  { id: 'approved', title: 'Approved', color: '#10b981', order: 3 },
];

// ─── Workspaces ──────────────────────────────────────────
export const mockWorkspaces: Workspace[] = [
  {
    id: MOCK_WS_ID,
    name: 'Jambo Studios',
    color: '#6366f1',
    type: 'team',
    members: mockMembers,
    memberUids: mockMembers.map(m => m.uid),
    createdBy: MOCK_USER_ID,
    inviteCode: 'MOCK01',
    createdAt: '2025-12-01 09:00:00',
  },
];

// ─── Projects ────────────────────────────────────────────
export const mockProjects: Project[] = [
  {
    id: MOCK_PROJECT_A,
    name: 'TaskFlow v2.0',
    workspaceId: MOCK_WS_ID,
    color: '#6366f1',
    createdBy: MOCK_USER_ID,
    createdAt: '2025-12-01 10:00:00',
    kanbanColumns: defaultColumns,
    status: 'active',
    startDate: '2025-12-01',
    targetDate: '2026-03-15',
    description: 'TaskFlow 2.0 버전 개발 프로젝트 — 칸반, 알림, 다크모드 등 핵심 기능 포함',
  },
  {
    id: MOCK_PROJECT_B,
    name: 'Landing Page',
    workspaceId: MOCK_WS_ID,
    color: '#10b981',
    createdBy: 'mock_user_002',
    createdAt: '2026-01-15 14:00:00',
    kanbanColumns: designColumns,
    status: 'active',
    startDate: '2026-01-15',
    targetDate: '2026-02-28',
    description: '마케팅 랜딩 페이지 리디자인 — 히어로, 프라이싱, 고객 후기 포함',
  },
  {
    id: MOCK_PROJECT_C,
    name: 'Mobile App MVP',
    workspaceId: MOCK_WS_ID,
    color: '#f59e0b',
    createdBy: MOCK_USER_ID,
    createdAt: '2026-02-01 09:00:00',
    kanbanColumns: defaultColumns,
    status: 'active',
    startDate: '2026-02-10',
    targetDate: '2026-04-30',
    description: 'React Native 기반 모바일 앱 MVP 개발',
  },
];

// ─── Sprints ─────────────────────────────────────────────
export const mockSprints: Sprint[] = [
  // TaskFlow v2.0
  {
    id: 'mock_sprint_001',
    projectId: MOCK_PROJECT_A,
    name: 'Sprint 1 — MVP',
    type: 'sprint',
    status: 'completed',
    startDate: '2026-01-06',
    endDate: '2026-01-17',
    order: 0,
    scope: 'team',
    createdAt: '2025-12-20 09:00:00',
  },
  {
    id: 'mock_sprint_002',
    projectId: MOCK_PROJECT_A,
    name: 'Sprint 2 — Polish',
    type: 'sprint',
    status: 'active',
    startDate: '2026-01-20',
    endDate: '2026-02-07',
    order: 1,
    scope: 'team',
    dependsOn: ['mock_sprint_001'],
    createdAt: '2026-01-18 09:00:00',
  },
  {
    id: 'mock_sprint_003',
    projectId: MOCK_PROJECT_A,
    name: 'Beta Phase',
    type: 'phase',
    status: 'active',
    startDate: '2026-01-20',
    endDate: '2026-03-01',
    order: 2,
    scope: 'company',
    createdAt: '2025-12-20 09:30:00',
  },
  {
    id: 'mock_sprint_004',
    projectId: MOCK_PROJECT_A,
    name: '🎯 Public Launch',
    type: 'milestone',
    status: 'planning',
    endDate: '2026-03-15',
    order: 3,
    scope: 'company',
    linkedSprintIds: ['mock_sprint_002', 'mock_sprint_003'],
    dependsOn: ['mock_sprint_002', 'mock_sprint_003'],
    createdAt: '2025-12-20 10:00:00',
  },
  // Landing Page
  {
    id: 'mock_sprint_005',
    projectId: MOCK_PROJECT_B,
    name: 'Design Sprint',
    type: 'sprint',
    status: 'active',
    startDate: '2026-01-20',
    endDate: '2026-02-10',
    order: 0,
    scope: 'personal',
    createdAt: '2026-01-16 09:00:00',
  },
  // Mobile App
  {
    id: 'mock_sprint_006',
    projectId: MOCK_PROJECT_C,
    name: 'Sprint 1 — 셋업',
    type: 'sprint',
    status: 'active',
    startDate: '2026-02-10',
    endDate: '2026-02-28',
    order: 0,
    scope: 'team',
    dependsOn: ['mock_sprint_005'],
    createdAt: '2026-02-01 10:00:00',
  },
];

// ─── Tasks ───────────────────────────────────────────────
export const mockTasks: Task[] = [
  // ══════ TaskFlow v2.0 — Sprint 1 (done) ══════
  {
    id: 'mock_task_001', taskCode: 'T-001', text: '사용자 인증 시스템 구현', completed: true,
    status: 'done', priority: 'P0', type: 'feature',
    description: 'Google OAuth + 이메일 인증 구현. Firebase Auth 사용.',
    dueDate: '2026-01-15', tags: ['backend', 'auth'],
    projectId: MOCK_PROJECT_A, workspaceId: MOCK_WS_ID,
    sprintId: 'mock_sprint_001',
    owners: [{ uid: MOCK_USER_ID, name: '김영수' }],
    ownerUids: [MOCK_USER_ID], assigneeId: MOCK_USER_ID, assigneeName: '김영수',
    createdAt: '2025-12-15 10:00:00', updatedAt: '2026-01-14 18:30:00',
    scope: 'work', estimate: 8,
    subtasks: [
      { id: 'sub_001_1', text: 'Firebase Auth 모듈 셋업', completed: true },
      { id: 'sub_001_2', text: 'Google OAuth provider 연동', completed: true },
      { id: 'sub_001_3', text: '로그인/로그아웃 UI 구현', completed: true },
    ],
  },
  {
    id: 'mock_task_002', taskCode: 'T-002', text: '칸반 보드 드래그 앤 드롭', completed: true,
    status: 'done', priority: 'P0', type: 'feature',
    description: '칼럼 간 카드 드래그 및 상태 자동 변경. @dnd-kit/core 사용.',
    dueDate: '2026-01-17', tags: ['frontend', 'kanban'],
    projectId: MOCK_PROJECT_A, workspaceId: MOCK_WS_ID,
    sprintId: 'mock_sprint_001',
    owners: [{ uid: 'mock_user_002', name: '박지현' }],
    ownerUids: ['mock_user_002'], assigneeId: 'mock_user_002', assigneeName: '박지현',
    createdAt: '2025-12-16 09:00:00', updatedAt: '2026-01-16 17:00:00',
    scope: 'work', estimate: 5,
  },
  // ══════ TaskFlow v2.0 — Sprint 2 (active) ══════
  {
    id: 'mock_task_003', taskCode: 'T-003', text: '실시간 알림 센터 개발', completed: false,
    status: 'inprogress', priority: 'P1', type: 'feature',
    description: '작업 배정, 멘션, 마감일 알림 기능 구현. Sonner toast + 알림 패널.',
    dueDate: '2026-02-05', tags: ['frontend', 'notifications'],
    projectId: MOCK_PROJECT_A, workspaceId: MOCK_WS_ID,
    sprintId: 'mock_sprint_002',
    owners: [{ uid: MOCK_USER_ID, name: '김영수' }],
    ownerUids: [MOCK_USER_ID], assigneeId: MOCK_USER_ID, assigneeName: '김영수',
    createdAt: '2026-01-20 10:00:00',
    scope: 'work', estimate: 5,
    subtasks: [
      { id: 'sub_003_1', text: '알림 데이터 모델 설계', completed: true },
      { id: 'sub_003_2', text: '알림 패널 UI 구현', completed: true },
      { id: 'sub_003_3', text: '실시간 구독 연결', completed: false },
      { id: 'sub_003_4', text: '읽음/보관 기능', completed: false },
    ],
  },
  {
    id: 'mock_task_004', taskCode: 'T-004', text: '다크모드 테마 시스템', completed: false,
    status: 'inprogress', priority: 'P1', type: 'feature',
    description: 'MUI 테마 프로바이더 + CSS 변수 기반 다크모드/라이트모드 전환',
    dueDate: '2026-02-03', tags: ['frontend', 'UI', 'theme'],
    projectId: MOCK_PROJECT_A, workspaceId: MOCK_WS_ID,
    sprintId: 'mock_sprint_002',
    owners: [{ uid: 'mock_user_002', name: '박지현' }, { uid: 'mock_user_004', name: '최서연' }],
    ownerUids: ['mock_user_002', 'mock_user_004'],
    assigneeId: 'mock_user_002', assigneeName: '박지현',
    createdAt: '2026-01-20 11:00:00',
    scope: 'work', estimate: 3,
  },
  {
    id: 'mock_task_005', taskCode: 'T-005', text: '스프린트 번다운 차트', completed: false,
    status: 'todo', priority: 'P2', type: 'feature',
    description: '스프린트별 진행률을 시각적으로 보여주는 번다운 차트 구현. Recharts 라이브러리 활용.',
    dueDate: '2026-02-10', tags: ['frontend', 'chart', 'analytics'],
    projectId: MOCK_PROJECT_A, workspaceId: MOCK_WS_ID,
    sprintId: 'mock_sprint_002',
    owners: [{ uid: 'mock_user_003', name: '이민수' }],
    ownerUids: ['mock_user_003'], assigneeId: 'mock_user_003', assigneeName: '이민수',
    createdAt: '2026-01-22 09:30:00',
    scope: 'work', estimate: 5,
  },
  {
    id: 'mock_task_006', taskCode: 'T-006', text: '모바일 반응형 사이드바', completed: false,
    status: 'todo', priority: 'P2', type: 'other',
    description: '768px 이하에서 슬라이드 메뉴로 전환. 햄버거 버튼 + 오버레이.',
    tags: ['frontend', 'responsive', 'UI'],
    projectId: MOCK_PROJECT_A, workspaceId: MOCK_WS_ID,
    sprintId: 'mock_sprint_002',
    owners: [{ uid: 'mock_user_004', name: '최서연' }],
    ownerUids: ['mock_user_004'], assigneeId: 'mock_user_004', assigneeName: '최서연',
    createdAt: '2026-01-23 14:00:00',
    scope: 'work', estimate: 3,
  },
  {
    id: 'mock_task_007', taskCode: 'T-007', text: '로그인 페이지 폰트 깨짐 수정', completed: false,
    status: 'in-review', priority: 'P1', type: 'bug',
    description: 'Safari에서 Google Fonts 로딩 실패. FOUT 발생. font-display: swap 적용 필요.',
    tags: ['bug', 'safari', 'fonts'],
    projectId: MOCK_PROJECT_A, workspaceId: MOCK_WS_ID,
    sprintId: 'mock_sprint_002',
    owners: [{ uid: 'mock_user_002', name: '박지현' }],
    ownerUids: ['mock_user_002'], assigneeId: 'mock_user_002', assigneeName: '박지현',
    createdAt: '2026-01-25 16:00:00',
    scope: 'work', estimate: 2,
    blockerStatus: 'blocked',
    blockerDetail: 'Safari WebKit 팀의 font-display 지원 확인 필요',
  },
  {
    id: 'mock_task_008', taskCode: 'T-008', text: '작업 필터 성능 최적화', completed: false,
    status: 'todo', priority: 'P3', type: 'other',
    description: '500개 이상 작업 시 필터링 지연 (>200ms). useMemo + 가상화 적용.',
    tags: ['performance', 'optimization'],
    projectId: MOCK_PROJECT_A, workspaceId: MOCK_WS_ID,
    owners: [{ uid: MOCK_USER_ID, name: '김영수' }],
    ownerUids: [MOCK_USER_ID], assigneeId: MOCK_USER_ID, assigneeName: '김영수',
    createdAt: '2026-01-27 10:00:00',
    scope: 'work', estimate: 8,
  },
  {
    id: 'mock_task_015', taskCode: 'T-015', text: '워크스페이스 역할 권한 시스템', completed: false,
    status: 'inprogress', priority: 'P0', type: 'feature',
    description: 'Owner/Admin/Member 역할별 UI 접근 제어. 설정, 멤버 관리, 프로젝트 삭제 등.',
    dueDate: '2026-02-20', tags: ['backend', 'security', 'permissions'],
    projectId: MOCK_PROJECT_A, workspaceId: MOCK_WS_ID,
    sprintId: 'mock_sprint_002',
    owners: [{ uid: MOCK_USER_ID, name: '김영수' }, { uid: 'mock_user_005', name: '정우진' }],
    ownerUids: [MOCK_USER_ID, 'mock_user_005'],
    assigneeId: MOCK_USER_ID, assigneeName: '김영수',
    createdAt: '2026-02-10 09:00:00',
    scope: 'work', estimate: 8,
    subtasks: [
      { id: 'sub_015_1', text: '역할 타입 정의', completed: true },
      { id: 'sub_015_2', text: 'usePermission 커스텀 훅', completed: true },
      { id: 'sub_015_3', text: '라우트 가드 적용', completed: false },
      { id: 'sub_015_4', text: '설정 페이지 제한', completed: false },
    ],
  },
  {
    id: 'mock_task_016', taskCode: 'T-016', text: '파일 첨부 기능 리서치', completed: false,
    status: 'todo', priority: 'P3', type: 'task',
    description: 'Firebase Storage vs Cloudinary vs S3 비교 분석. 비용/성능/보안 측면.',
    tags: ['research', 'storage'],
    projectId: MOCK_PROJECT_A, workspaceId: MOCK_WS_ID,
    owners: [{ uid: 'mock_user_005', name: '정우진' }],
    ownerUids: ['mock_user_005'], assigneeId: 'mock_user_005', assigneeName: '정우진',
    createdAt: '2026-02-12 11:00:00',
    scope: 'work', estimate: 3,
  },
  // ══════ Landing Page — Design Sprint ══════
  {
    id: 'mock_task_009', taskCode: 'L-001', text: '히어로 섹션 디자인', completed: false,
    status: 'inprogress', priority: 'P0', type: 'feature',
    description: '애니메이션이 있는 히어로 섹션 구현. Lottie 또는 CSS 애니메이션 사용.',
    dueDate: '2026-02-01', tags: ['design', 'landing', 'animation'],
    projectId: MOCK_PROJECT_B, workspaceId: MOCK_WS_ID,
    sprintId: 'mock_sprint_005',
    owners: [{ uid: 'mock_user_004', name: '최서연' }],
    ownerUids: ['mock_user_004'], assigneeId: 'mock_user_004', assigneeName: '최서연',
    createdAt: '2026-01-16 09:00:00',
    scope: 'work', estimate: 5,
  },
  {
    id: 'mock_task_010', taskCode: 'L-002', text: 'Pricing 섹션 구현', completed: false,
    status: 'todo', priority: 'P1', type: 'feature',
    description: 'Free/Pro/Enterprise 3단 카드 레이아웃. 인기 플랜 하이라이트.',
    tags: ['frontend', 'landing', 'pricing'],
    projectId: MOCK_PROJECT_B, workspaceId: MOCK_WS_ID,
    sprintId: 'mock_sprint_005',
    owners: [{ uid: 'mock_user_003', name: '이민수' }],
    ownerUids: ['mock_user_003'], assigneeId: 'mock_user_003', assigneeName: '이민수',
    createdAt: '2026-01-17 10:00:00',
    scope: 'work', estimate: 3,
  },
  {
    id: 'mock_task_013', taskCode: 'L-003', text: '고객 후기 섹션', completed: false,
    status: 'todo', priority: 'P2', type: 'feature',
    description: '캐러셀 형태의 고객 후기. 사진 + 회사명 + 인용문.',
    tags: ['frontend', 'landing', 'social-proof'],
    projectId: MOCK_PROJECT_B, workspaceId: MOCK_WS_ID,
    sprintId: 'mock_sprint_005',
    owners: [{ uid: 'mock_user_006', name: '한소영' }],
    ownerUids: ['mock_user_006'], assigneeId: 'mock_user_006', assigneeName: '한소영',
    createdAt: '2026-01-20 09:00:00',
    scope: 'work', estimate: 3,
  },
  {
    id: 'mock_task_014', taskCode: 'L-004', text: 'SEO 메타 태그 최적화', completed: true,
    status: 'done', priority: 'P1', type: 'task',
    description: 'Open Graph, Twitter Card, 구조화 데이터 추가',
    tags: ['seo', 'landing'],
    projectId: MOCK_PROJECT_B, workspaceId: MOCK_WS_ID,
    sprintId: 'mock_sprint_005',
    owners: [{ uid: 'mock_user_003', name: '이민수' }],
    ownerUids: ['mock_user_003'], assigneeId: 'mock_user_003', assigneeName: '이민수',
    createdAt: '2026-01-18 14:00:00', updatedAt: '2026-02-05 11:00:00',
    scope: 'work', estimate: 2,
  },
  // ══════ Mobile App ══════
  {
    id: 'mock_task_017', taskCode: 'M-001', text: 'React Native 프로젝트 초기화', completed: false,
    status: 'inprogress', priority: 'P0', type: 'feature',
    description: 'Expo + React Native CLI 프로젝트 셋업. Navigation, Auth 기본 구조.',
    dueDate: '2026-02-15', tags: ['mobile', 'setup'],
    projectId: MOCK_PROJECT_C, workspaceId: MOCK_WS_ID,
    sprintId: 'mock_sprint_006',
    owners: [{ uid: 'mock_user_005', name: '정우진' }],
    ownerUids: ['mock_user_005'], assigneeId: 'mock_user_005', assigneeName: '정우진',
    createdAt: '2026-02-10 09:00:00',
    scope: 'work', estimate: 5,
  },
  {
    id: 'mock_task_018', taskCode: 'M-002', text: '모바일 작업 목록 화면', completed: false,
    status: 'todo', priority: 'P1', type: 'feature',
    description: '작업 리스트 + 필터링 + 스와이프 완료 기능',
    tags: ['mobile', 'ui'],
    projectId: MOCK_PROJECT_C, workspaceId: MOCK_WS_ID,
    sprintId: 'mock_sprint_006',
    owners: [{ uid: 'mock_user_006', name: '한소영' }],
    ownerUids: ['mock_user_006'], assigneeId: 'mock_user_006', assigneeName: '한소영',
    createdAt: '2026-02-11 10:00:00',
    scope: 'work', estimate: 5,
  },
  {
    id: 'mock_task_019', taskCode: 'M-003', text: '푸시 알림 설정', completed: false,
    status: 'todo', priority: 'P2', type: 'feature',
    description: 'Firebase Cloud Messaging + Expo Notifications. 토큰 관리.',
    tags: ['mobile', 'notifications'],
    projectId: MOCK_PROJECT_C, workspaceId: MOCK_WS_ID,
    sprintId: 'mock_sprint_006',
    owners: [{ uid: MOCK_USER_ID, name: '김영수' }],
    ownerUids: [MOCK_USER_ID], assigneeId: MOCK_USER_ID, assigneeName: '김영수',
    createdAt: '2026-02-12 14:00:00',
    scope: 'work', estimate: 5,
  },
  // ══════ Personal tasks (개인 작업) ══════
  {
    id: 'mock_task_011', text: 'React 19 새 기능 공부', completed: false,
    status: 'todo', priority: 'P3', type: 'task',
    description: 'Server Components, use() hook, Actions, Optimistic Updates 등',
    tags: ['학습', 'react'],
    createdAt: '2026-02-01 08:00:00',
    scope: 'personal',
  },
  {
    id: 'mock_task_012', text: '주간 회의 아젠다 정리', completed: true,
    status: 'done', priority: 'P2', type: 'task',
    dueDate: '2026-02-17',
    tags: ['회의'],
    createdAt: '2026-02-14 09:00:00', updatedAt: '2026-02-17 10:00:00',
    scope: 'personal',
  },
  {
    id: 'mock_task_020', text: '이력서 업데이트', completed: false,
    status: 'inprogress', priority: 'P2', type: 'task',
    description: 'TaskFlow 프로젝트 경험 추가. 기술 스택 업데이트.',
    dueDate: '2026-02-25',
    tags: ['커리어'],
    createdAt: '2026-02-15 20:00:00',
    scope: 'personal',
  },
  {
    id: 'mock_task_021', text: 'TypeScript 5.4 마이그레이션 가이드 읽기', completed: false,
    status: 'todo', priority: 'P3', type: 'task',
    tags: ['학습', 'typescript'],
    createdAt: '2026-02-16 09:00:00',
    scope: 'personal',
  },
  {
    id: 'mock_task_022', text: '팀 워크숍 자료 준비', completed: false,
    status: 'todo', priority: 'P1', type: 'task',
    dueDate: '2026-02-22',
    description: 'Git 워크플로우 + PR 리뷰 가이드라인 발표 자료',
    tags: ['회의', '발표'],
    createdAt: '2026-02-17 11:00:00',
    scope: 'personal',
  },
  // ══════ Triage (미분류) ══════
  {
    id: 'mock_task_023', taskCode: 'TRIAGE-001', text: '대시보드 위젯 추가 요청', completed: false,
    status: 'todo', priority: 'P2', type: 'feature',
    description: '프로젝트별 진행률 파이차트 위젯. 사용자 요청.',
    tags: ['feature-request'],
    workspaceId: MOCK_WS_ID,
    triageStatus: 'pending',
    createdAt: '2026-02-18 09:00:00',
    scope: 'work',
  },
  {
    id: 'mock_task_024', taskCode: 'TRIAGE-002', text: '이메일 알림 기능 요청', completed: false,
    status: 'todo', priority: 'P3', type: 'feature',
    description: '매일 아침 할 일 요약 이메일 발송 기능.',
    tags: ['feature-request', 'email'],
    workspaceId: MOCK_WS_ID,
    triageStatus: 'pending',
    createdAt: '2026-02-18 14:00:00',
    scope: 'work',
  },
];

// ─── Initiatives ─────────────────────────────────────────
export const mockInitiatives: Initiative[] = [
  {
    id: 'mock_init_001',
    name: 'Q1 제품 출시',
    description: '2026년 Q1 내 TaskFlow v2.0 정식 출시. 웹 + 모바일 동시 런칭.',
    status: 'active',
    startDate: '2025-12-01',
    targetDate: '2026-03-31',
    color: '#6366f1',
    workspaceId: MOCK_WS_ID,
    projectIds: [MOCK_PROJECT_A, MOCK_PROJECT_B, MOCK_PROJECT_C],
    createdBy: MOCK_USER_ID,
    createdAt: '2025-12-01 09:00:00',
  },
  {
    id: 'mock_init_002',
    name: '사용자 확보 캠페인',
    description: 'Product Hunt 런칭 + 블로그 마케팅으로 초기 1,000명 사용자 확보',
    status: 'planned',
    startDate: '2026-04-01',
    targetDate: '2026-06-30',
    color: '#f59e0b',
    workspaceId: MOCK_WS_ID,
    projectIds: [MOCK_PROJECT_B],
    createdBy: 'mock_user_002',
    createdAt: '2026-02-01 09:00:00',
  },
  {
    id: 'mock_init_003',
    name: 'Q2 인프라 안정화',
    description: 'CI/CD 파이프라인, 모니터링, 로드밸런싱 등 운영 인프라 구축',
    status: 'planned',
    startDate: '2026-04-01',
    targetDate: '2026-05-31',
    color: '#10b981',
    workspaceId: MOCK_WS_ID,
    projectIds: [MOCK_PROJECT_A],
    createdBy: 'mock_user_003',
    createdAt: '2026-02-15 09:00:00',
  },
  {
    id: 'mock_init_004',
    name: 'Enterprise 기능 개발',
    description: 'SSO, RBAC 고도화, 감사 로그, 데이터 내보내기 등 기업용 기능',
    status: 'planned',
    startDate: '2026-06-01',
    targetDate: '2026-09-30',
    color: '#8b5cf6',
    workspaceId: MOCK_WS_ID,
    projectIds: [],
    createdBy: MOCK_USER_ID,
    createdAt: '2026-02-18 10:00:00',
  },
  {
    id: 'mock_init_005',
    name: '디자인 시스템 v1 구축',
    description: '공통 컴포넌트 라이브러리 및 디자인 토큰 정의 완료',
    status: 'completed',
    startDate: '2025-10-01',
    targetDate: '2025-12-15',
    color: '#ec4899',
    workspaceId: MOCK_WS_ID,
    projectIds: [MOCK_PROJECT_A],
    createdBy: 'mock_user_004',
    createdAt: '2025-10-01 09:00:00',
  },
  {
    id: 'mock_init_006',
    name: 'Slack 연동 PoC',
    description: 'Slack 봇을 통한 작업 알림 PoC — 비용 대비 효과 부족으로 취소',
    status: 'canceled',
    startDate: '2025-11-01',
    targetDate: '2025-12-31',
    color: '#ef4444',
    workspaceId: MOCK_WS_ID,
    projectIds: [],
    createdBy: 'mock_user_005',
    createdAt: '2025-11-01 09:00:00',
  },
];

// ─── Team Groups ─────────────────────────────────────────
export const mockTeamGroups: TeamGroup[] = [
  {
    id: 'mock_tg_001',
    workspaceId: MOCK_WS_ID,
    name: 'Frontend',
    color: '#3b82f6',
    memberIds: [MOCK_USER_ID, 'mock_user_002', 'mock_user_004', 'mock_user_006'],
    createdAt: '2025-12-05 10:00:00',
  },
  {
    id: 'mock_tg_002',
    workspaceId: MOCK_WS_ID,
    name: 'Backend',
    color: '#10b981',
    memberIds: [MOCK_USER_ID, 'mock_user_003', 'mock_user_005'],
    createdAt: '2025-12-05 10:10:00',
  },
  {
    id: 'mock_tg_003',
    workspaceId: MOCK_WS_ID,
    name: 'Design',
    color: '#a855f7',
    memberIds: ['mock_user_004', 'mock_user_006'],
    createdAt: '2026-01-15 09:00:00',
  },
];

// ─── Decisions ───────────────────────────────────────────
export const mockDecisions: Decision[] = [
  {
    id: 'mock_dec_001',
    decisionCode: 'D-001',
    date: '2026-01-15',
    summary: 'Firebase Firestore를 메인 DB로 사용',
    context: 'Supabase vs Firebase 비교. 실시간 동기화 + Auth 통합 용이성 + 무료 티어 → Firebase 결정.',
    decider: MOCK_USER_ID,
    deciderName: '김영수',
    affectedTaskIds: ['T-001'],
    followUpAction: '김영수 — Firebase 프로젝트 셋업 완료 (1/16)',
    workspaceId: MOCK_WS_ID,
    projectId: MOCK_PROJECT_A,
    createdAt: '2026-01-15 14:00:00',
  },
  {
    id: 'mock_dec_002',
    decisionCode: 'D-002',
    date: '2026-01-20',
    summary: 'MUI v6 + Emotion으로 UI 프레임워크 확정',
    context: 'Chakra UI, Ant Design 비교 검토. 커스텀 테마 지원 + 컴포넌트 풍부도 + 한국어 지원 → MUI 결정.',
    decider: 'mock_user_002',
    deciderName: '박지현',
    affectedTaskIds: ['T-004'],
    followUpAction: '박지현 — 공용 테마 파일 생성 (1/22)',
    workspaceId: MOCK_WS_ID,
    projectId: MOCK_PROJECT_A,
    createdAt: '2026-01-20 11:00:00',
  },
  {
    id: 'mock_dec_003',
    decisionCode: 'D-003',
    date: '2026-02-05',
    summary: 'React Native (Expo) 로 모바일 앱 개발',
    context: 'Flutter vs React Native vs PWA 비교. 웹 코드 재사용률 + 팀 스킬셋 → React Native(Expo) 결정.',
    decider: MOCK_USER_ID,
    deciderName: '김영수',
    affectedTaskIds: ['M-001'],
    followUpAction: '정우진 — Expo 프로젝트 초기화 (2/10)',
    workspaceId: MOCK_WS_ID,
    projectId: MOCK_PROJECT_C,
    createdAt: '2026-02-05 15:00:00',
  },
  {
    id: 'mock_dec_004',
    decisionCode: 'D-004',
    date: '2026-02-12',
    summary: 'Vercel로 호스팅 확정',
    context: 'AWS Amplify vs Vercel vs Firebase Hosting 비교. CI/CD 편의성 + 프리뷰 환경 → Vercel 결정.',
    decider: 'mock_user_005',
    deciderName: '정우진',
    affectedTaskIds: [],
    followUpAction: '정우진 — Vercel 프로젝트 설정 (2/13)',
    workspaceId: MOCK_WS_ID,
    projectId: MOCK_PROJECT_B,
    createdAt: '2026-02-12 10:00:00',
  },
];

// ─── Handoffs ────────────────────────────────────────────
export const mockHandoffs: Handoff[] = [
  {
    id: 'mock_hoff_001',
    handoffCode: 'H-001',
    fromTeam: 'Design',
    toTeam: 'Frontend',
    type: 'design_review',
    ready: true,
    readyDate: '2026-01-25',
    senderUid: 'mock_user_004',
    senderName: '최서연',
    receiverUid: 'mock_user_002',
    receiverName: '박지현',
    checklist: { 'Figma Link': true, 'Spec/Copy Confirmed': true, 'Assets Ready': true },
    relatedTaskId: 'mock_task_004',
    notes: 'Dark mode 시안 포함. 컬러 토큰은 Figma 변수 참고.',
    workspaceId: MOCK_WS_ID,
    projectId: MOCK_PROJECT_A,
    createdAt: '2026-01-25 10:00:00',
    status: 'completed',
  },
  {
    id: 'mock_hoff_002',
    handoffCode: 'H-002',
    fromTeam: 'Frontend',
    toTeam: 'QA',
    type: 'qa_review',
    ready: false,
    senderUid: MOCK_USER_ID,
    senderName: '김영수',
    receiverUid: 'mock_user_003',
    receiverName: '이민수',
    checklist: { 'Build Deployed': true, 'Test Instructions': false, 'Known Limitations': false },
    blockingQuestion: 'QA 환경 접근 권한 확인 필요',
    relatedTaskId: 'mock_task_003',
    workspaceId: MOCK_WS_ID,
    projectId: MOCK_PROJECT_A,
    createdAt: '2026-02-15 14:00:00',
    status: 'pending',
  },
  {
    id: 'mock_hoff_003',
    handoffCode: 'H-003',
    fromTeam: 'Design',
    toTeam: 'Frontend',
    type: 'design_review',
    ready: true,
    readyDate: '2026-02-18',
    senderUid: 'mock_user_004',
    senderName: '최서연',
    receiverUid: 'mock_user_006',
    receiverName: '한소영',
    checklist: { 'Figma Link': true, 'Spec/Copy Confirmed': true, 'Assets Ready': false },
    relatedTaskId: 'mock_task_013',
    notes: '고객 후기 섹션 디자인. 슬라이더 인터랙션 Prototype 링크 첨부.',
    workspaceId: MOCK_WS_ID,
    projectId: MOCK_PROJECT_B,
    createdAt: '2026-02-18 09:00:00',
    status: 'pending',
  },
];

// ─── Issues ──────────────────────────────────────────────
export const mockIssues: Issue[] = [
  {
    id: 'mock_issue_001',
    date: '2026-02-10',
    time: '14:30',
    memberUid: 'mock_user_003',
    memberName: '이민수',
    category: 'internet',
    description: '사무실 Wi-Fi 불안정 — 오후 2시 30분부터 약 40분간 연결 끊김',
    scope: 'team',
    timeLost: '40분',
    workaround: '핫스팟 사용',
    status: 'resolved',
    workspaceId: MOCK_WS_ID,
    createdAt: '2026-02-10 15:10:00',
  },
  {
    id: 'mock_issue_002',
    date: '2026-02-18',
    time: '10:00',
    memberUid: 'mock_user_002',
    memberName: '박지현',
    category: 'software',
    description: 'Vite HMR이 간헐적으로 멈추는 현상. 재시작 시 복구됨.',
    scope: 'individual',
    timeLost: '20분',
    workaround: 'dev 서버 재시작',
    status: 'monitoring',
    workspaceId: MOCK_WS_ID,
    createdAt: '2026-02-18 10:30:00',
  },
  {
    id: 'mock_issue_003',
    date: '2026-02-15',
    time: '09:00',
    memberUid: 'mock_user_005',
    memberName: '정우진',
    category: 'hardware',
    description: '외부 모니터 연결 인식 불안정. USB-C 허브 교체 후 해결.',
    scope: 'individual',
    timeLost: '30분',
    workaround: '다른 USB-C 허브 사용',
    status: 'resolved',
    workspaceId: MOCK_WS_ID,
    createdAt: '2026-02-15 09:30:00',
  },
  {
    id: 'mock_issue_004',
    date: '2026-02-19',
    time: '11:00',
    memberUid: MOCK_USER_ID,
    memberName: '김영수',
    category: 'software',
    description: 'Firebase 에뮬레이터 포트 충돌. 다른 프로세스가 8080 점유 중.',
    scope: 'individual',
    timeLost: '15분',
    workaround: '포트 변경 (8081)',
    status: 'resolved',
    workspaceId: MOCK_WS_ID,
    createdAt: '2026-02-19 11:15:00',
  },
];

// ─── Notifications ───────────────────────────────────────
export const mockNotifications: Notification[] = [
  {
    id: 'mock_noti_001',
    type: 'task_assigned',
    title: '박지현이 작업을 배정했습니다',
    body: '다크모드 테마 시스템',
    read: false,
    archived: false,
    actorUid: 'mock_user_002',
    actorName: '박지현',
    recipientUid: MOCK_USER_ID,
    workspaceId: MOCK_WS_ID,
    projectId: MOCK_PROJECT_A,
    taskId: 'mock_task_004',
    taskText: '다크모드 테마 시스템',
    createdAt: '2026-02-19 09:00:00',
  },
  {
    id: 'mock_noti_002',
    type: 'task_completed',
    title: '이민수가 작업을 완료했습니다',
    body: 'SEO 메타 태그 최적화',
    read: false,
    archived: false,
    actorUid: 'mock_user_003',
    actorName: '이민수',
    recipientUid: MOCK_USER_ID,
    workspaceId: MOCK_WS_ID,
    projectId: MOCK_PROJECT_B,
    taskId: 'mock_task_014',
    taskText: 'SEO 메타 태그 최적화',
    createdAt: '2026-02-18 16:45:00',
  },
  {
    id: 'mock_noti_003',
    type: 'task_due_soon',
    title: '마감일 임박',
    body: '실시간 알림 센터 개발 (2/5 마감)',
    read: false,
    archived: false,
    actorUid: 'system',
    actorName: 'TaskFlow',
    recipientUid: MOCK_USER_ID,
    workspaceId: MOCK_WS_ID,
    projectId: MOCK_PROJECT_A,
    taskId: 'mock_task_003',
    taskText: '실시간 알림 센터 개발',
    createdAt: '2026-02-18 08:00:00',
  },
  {
    id: 'mock_noti_004',
    type: 'task_assigned',
    title: '정우진이 작업을 배정했습니다',
    body: '푸시 알림 설정',
    read: true,
    archived: false,
    actorUid: 'mock_user_005',
    actorName: '정우진',
    recipientUid: MOCK_USER_ID,
    workspaceId: MOCK_WS_ID,
    projectId: MOCK_PROJECT_C,
    taskId: 'mock_task_019',
    taskText: '푸시 알림 설정',
    createdAt: '2026-02-17 14:00:00',
  },
  {
    id: 'mock_noti_005',
    type: 'task_completed',
    title: '한소영이 작업을 완료했습니다',
    body: '칸반 보드 드래그 앤 드롭',
    read: true,
    archived: false,
    actorUid: 'mock_user_006',
    actorName: '한소영',
    recipientUid: MOCK_USER_ID,
    workspaceId: MOCK_WS_ID,
    projectId: MOCK_PROJECT_A,
    taskId: 'mock_task_002',
    taskText: '칸반 보드 드래그 앤 드롭',
    createdAt: '2026-02-16 17:00:00',
  },
  {
    id: 'mock_noti_006',
    type: 'task_mentioned',
    title: '최서연이 코멘트에서 멘션했습니다',
    body: '@김영수 히어로 섹션 애니메이션 검토 부탁드려요',
    read: false,
    archived: false,
    actorUid: 'mock_user_004',
    actorName: '최서연',
    recipientUid: MOCK_USER_ID,
    workspaceId: MOCK_WS_ID,
    projectId: MOCK_PROJECT_B,
    taskId: 'mock_task_009',
    taskText: '히어로 섹션 디자인',
    createdAt: '2026-02-19 10:30:00',
  },
];

// ─── Custom Views ────────────────────────────────────────
export const mockCustomViews: CustomView[] = [
  {
    id: 'mock_cv_001',
    name: '내 긴급 작업',
    icon: '🔥',
    color: '#ef4444',
    filters: { priorities: ['P0', 'P1'], hideCompleted: true },
    viewMode: 'board',
    projectId: MOCK_PROJECT_A,
    workspaceId: MOCK_WS_ID,
    createdBy: MOCK_USER_ID,
    createdAt: '2026-01-30 10:00:00',
  },
  {
    id: 'mock_cv_002',
    name: '버그 트래커',
    icon: '🐛',
    color: '#f97316',
    filters: { types: ['bug'], hideCompleted: false },
    viewMode: 'list',
    projectId: MOCK_PROJECT_A,
    workspaceId: MOCK_WS_ID,
    createdBy: MOCK_USER_ID,
    createdAt: '2026-02-01 14:00:00',
  },
  {
    id: 'mock_cv_003',
    name: '이번 주 마감',
    icon: '📅',
    color: '#3b82f6',
    filters: { hideCompleted: true },
    viewMode: 'list',
    projectId: MOCK_PROJECT_A,
    workspaceId: MOCK_WS_ID,
    createdBy: 'mock_user_002',
    createdAt: '2026-02-10 09:00:00',
  },
];

// ─── Issue Templates ─────────────────────────────────────
export const mockIssueTemplates: IssueTemplate[] = [
  {
    id: 'mock_tmpl_001',
    name: 'Bug Report',
    icon: '🐛',
    description: '버그 리포트 작성용 템플릿',
    titlePattern: '[Bug] ',
    defaultDescription: '## 재현 방법\n1. \n\n## 기대 결과\n\n## 실제 결과\n\n## 스크린샷\n',
    defaultType: 'bug',
    defaultPriority: 'P1',
    defaultTags: ['bug'],
    workspaceId: MOCK_WS_ID,
    createdBy: MOCK_USER_ID,
    createdAt: '2026-01-10 09:00:00',
  },
  {
    id: 'mock_tmpl_002',
    name: 'Feature Request',
    icon: '✨',
    description: '신규 기능 요청 템플릿',
    titlePattern: '[Feature] ',
    defaultDescription: '## 요약\n\n## 배경\n\n## 상세 스펙\n\n## 수용 기준 (AC)\n- [ ] \n',
    defaultType: 'feature',
    defaultPriority: 'P2',
    defaultTags: ['feature'],
    workspaceId: MOCK_WS_ID,
    createdBy: MOCK_USER_ID,
    createdAt: '2026-01-10 09:30:00',
  },
  {
    id: 'mock_tmpl_003',
    name: 'Improvement',
    icon: '💡',
    description: '기존 기능 개선 제안 템플릿',
    titlePattern: '[Improvement] ',
    defaultDescription: '## 현재 상태\n\n## 개선 방향\n\n## 영향 범위\n\n## 기대 효과\n',
    defaultType: 'other',
    defaultPriority: 'P2',
    defaultTags: ['improvement'],
    workspaceId: MOCK_WS_ID,
    createdBy: 'mock_user_002',
    createdAt: '2026-02-01 10:00:00',
  },
];

// ─── Automation Rules ────────────────────────────────────
export const mockAutomationRules: AutomationRule[] = [
  {
    id: 'mock_auto_001',
    workspaceId: MOCK_WS_ID,
    name: 'Done → 완료 알림 전송',
    trigger: { type: 'status_change', to: 'done' },
    actions: [{ type: 'assign_user', userId: MOCK_USER_ID, userName: '김영수' }],
    isEnabled: true,
    createdBy: MOCK_USER_ID,
    createdAt: '2026-02-01 10:00:00',
  },
  {
    id: 'mock_auto_002',
    workspaceId: MOCK_WS_ID,
    name: 'P0 버그 → 즉시 배정',
    trigger: { type: 'status_change', to: 'todo' },
    actions: [{ type: 'assign_user', userId: 'mock_user_002', userName: '박지현' }],
    isEnabled: true,
    createdBy: 'mock_user_002',
    createdAt: '2026-02-05 11:00:00',
  },
  {
    id: 'mock_auto_003',
    workspaceId: MOCK_WS_ID,
    name: 'In Review → QA 팀 알림',
    trigger: { type: 'status_change', to: 'in-review' },
    actions: [{ type: 'assign_user', userId: 'mock_user_003', userName: '이민수' }],
    isEnabled: false,
    createdBy: MOCK_USER_ID,
    createdAt: '2026-02-10 14:00:00',
  },
];

// ─── OKR Objectives ──────────────────────────────────────
export const mockObjectives: import('../../types').Objective[] = [
  {
    id: 'mock_okr_001',
    title: '제품 품질 60% 향상',
    description: 'Q1 중 버그율 감소 및 코드 커버리지 향상을 통해 제품 안정성 확보',
    period: 'Q1 2026',
    startDate: '2026-01-01',
    endDate: '2026-03-31',
    status: 'active',
    ownerId: MOCK_USER_ID,
    ownerName: '김영수',
    keyResults: [
      { id: 'kr_001', title: '버그 발생률 40% 감소', targetValue: 40, currentValue: 28, unit: '%', linkedTaskIds: ['mock_task_001'] },
      { id: 'kr_002', title: '코드 커버리지 80% 달성', targetValue: 80, currentValue: 65, unit: '%' },
      { id: 'kr_003', title: 'P0 이슈 평균 해결 시간 4시간 이내', targetValue: 4, currentValue: 6.2, unit: '시간' },
    ],
    workspaceId: MOCK_WS_ID,
    createdBy: MOCK_USER_ID,
    createdAt: '2026-01-02 09:00:00',
  },
  {
    id: 'mock_okr_002',
    title: '사용자 온보딩 개선',
    description: '신규 사용자의 첫 주 리텐션을 높이고 온보딩 퍼널 전환율 개선',
    period: 'Q1 2026',
    startDate: '2026-01-01',
    endDate: '2026-03-31',
    status: 'active',
    ownerId: 'mock_user_002',
    ownerName: '박지현',
    keyResults: [
      { id: 'kr_004', title: '첫 주 리텐션 70% 달성', targetValue: 70, currentValue: 55, unit: '%' },
      { id: 'kr_005', title: '온보딩 완료율 90%', targetValue: 90, currentValue: 72, unit: '%' },
    ],
    workspaceId: MOCK_WS_ID,
    createdBy: 'mock_user_002',
    createdAt: '2026-01-05 10:00:00',
  },
  {
    id: 'mock_okr_003',
    title: '팀 생산성 20% 향상',
    period: 'Q2 2026',
    startDate: '2026-04-01',
    endDate: '2026-06-30',
    status: 'draft',
    ownerId: 'mock_user_003',
    ownerName: '이민수',
    keyResults: [
      { id: 'kr_006', title: '스프린트 완료율 95%', targetValue: 95, currentValue: 0, unit: '%' },
      { id: 'kr_007', title: '평균 사이클 타임 3일 이내', targetValue: 3, currentValue: 0, unit: '일' },
    ],
    workspaceId: MOCK_WS_ID,
    createdBy: 'mock_user_003',
    createdAt: '2026-02-01 11:00:00',
  },
  {
    id: 'mock_okr_004',
    title: '연간 매출 목표 달성',
    description: '2026년 전체 ARR $500K 달성을 위한 전략적 목표',
    period: 'FY2026',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    status: 'active',
    ownerId: MOCK_USER_ID,
    ownerName: '김영수',
    keyResults: [
      { id: 'kr_008', title: 'ARR $500K 달성', targetValue: 500, currentValue: 120, unit: 'K$' },
      { id: 'kr_009', title: '유료 전환율 5%', targetValue: 5, currentValue: 2.1, unit: '%' },
    ],
    workspaceId: MOCK_WS_ID,
    createdBy: MOCK_USER_ID,
    createdAt: '2026-01-02 08:00:00',
  },
  {
    id: 'mock_okr_005',
    title: '모바일 앱 MVP 출시',
    description: '2월 말~4월 중순 비표준 기간으로 MVP 개발 및 출시',
    period: '커스텀',
    startDate: '2026-02-24',
    endDate: '2026-04-15',
    status: 'draft',
    ownerId: 'mock_user_005',
    ownerName: '정우진',
    keyResults: [
      { id: 'kr_010', title: '핵심 기능 5개 구현', targetValue: 5, currentValue: 1, unit: '개' },
      { id: 'kr_011', title: 'TestFlight 배포', targetValue: 1, currentValue: 0, unit: '회' },
    ],
    workspaceId: MOCK_WS_ID,
    createdBy: 'mock_user_005',
    createdAt: '2026-02-20 09:00:00',
  },
];

// ─── Wiki Documents ──────────────────────────────────────
export const mockWikiDocuments: WikiDocument[] = [
  {
    id: 'mock_wiki_folder_001',
    title: '개발 문서',
    content: '',
    icon: '📁',
    isFolder: true,
    visibility: 'workspace',
    workspaceId: MOCK_WS_ID,
    createdBy: MOCK_USER_ID,
    createdByName: '김영수',
    tags: [],
    createdAt: '2026-01-05 09:00:00',
  },
  {
    id: 'mock_wiki_001',
    title: '🚀 신규 입사자 온보딩 가이드',
    content: `# 신규 입사자 온보딩 가이드

TaskFlow에 오신 것을 환영합니다! 이 문서는 새로운 팀원이 빠르게 적응할 수 있도록 안내합니다.

## 1일차 — 환경 설정

### 개발 환경
- **Node.js** 18+ 설치
- **pnpm** 패키지 매니저 사용
- VSCode 확장: ESLint, Prettier, GitLens

### 저장소 클론
\`\`\`bash
git clone https://github.com/jambo/taskflow.git
cd taskflow
pnpm install
pnpm dev
\`\`\`

## 2일차 — 코드 구조 파악
- \`src/pages/\` — 각 페이지 컴포넌트
- \`src/components/\` — 재사용 가능한 UI 컴포넌트
- \`src/services/\` — API 및 Firebase 서비스
- \`src/contexts/\` — React Context (Auth, Language, Workspace)

## 3일차 — 첫 PR
> 첫 주 안에 작은 버그 수정이나 번역 추가를 통해 PR을 보내보세요!

---
*최종 수정: 2026년 2월 15일*`,
    icon: '🚀',
    visibility: 'workspace',
    workspaceId: MOCK_WS_ID,
    createdBy: MOCK_USER_ID,
    createdByName: '김영수',
    pinned: true,
    tags: ['온보딩', '가이드'],
    createdAt: '2026-01-10 09:00:00',
    updatedAt: '2026-02-15 14:00:00',
    updatedBy: MOCK_USER_ID,
    updatedByName: '김영수',
  },
  {
    id: 'mock_wiki_002',
    title: '🔑 계정 및 권한 설정',
    content: `# 계정 및 권한 설정

## Slack 채널
| 채널 | 용도 |
|------|------|
| #general | 전체 공지 |
| #dev | 개발 논의 |
| #design | 디자인 리뷰 |
| #random | 잡담 |

## 권한 매트릭스
- **Owner**: 모든 권한
- **Admin**: 멤버 관리, 프로젝트 생성
- **Member**: 태스크 생성/편집
- **Viewer**: 읽기 전용

## 필수 도구
1. GitHub 저장소 접근 권한 요청
2. Figma 디자인 파일 초대
3. Firebase 콘솔 접근 (Admin 이상)`,
    icon: '🔑',
    visibility: 'workspace',
    workspaceId: MOCK_WS_ID,
    createdBy: 'mock_user_002',
    createdByName: '박지현',
    tags: ['온보딩', '권한'],
    createdAt: '2026-01-11 10:00:00',
  },
  {
    id: 'mock_wiki_003',
    title: '📡 API 가이드',
    content: `# TaskFlow API 가이드

## 인증
모든 API 요청에는 Firebase Auth 토큰이 필요합니다.

\`\`\`typescript
const token = await auth.currentUser?.getIdToken();
fetch('/api/tasks', {
  headers: { Authorization: \`Bearer \${token}\` }
});
\`\`\`

## 주요 엔드포인트

### Tasks
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/tasks | 전체 태스크 조회 |
| POST | /api/tasks | 태스크 생성 |
| PATCH | /api/tasks/:id | 태스크 수정 |
| DELETE | /api/tasks/:id | 태스크 삭제 |

### Projects
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/projects | 워크스페이스 프로젝트 목록 |
| POST | /api/projects | 프로젝트 생성 |

## 에러 처리
\`\`\`json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found"
  }
}
\`\`\``,
    icon: '📡',
    parentId: 'mock_wiki_folder_001',
    visibility: 'workspace',
    workspaceId: MOCK_WS_ID,
    createdBy: 'mock_user_003',
    createdByName: '이민수',
    pinned: true,
    tags: ['API', '개발'],
    createdAt: '2026-01-20 11:00:00',
    updatedAt: '2026-02-10 16:30:00',
    updatedBy: 'mock_user_003',
    updatedByName: '이민수',
  },
  {
    id: 'mock_wiki_004',
    title: '🔄 스프린트 2 회고',
    content: `# Sprint 2 — Polish 회고

**기간:** 2026년 2월 3일 ~ 2월 14일

## ✅ 잘된 점 (Keep)
- 칸반 보드 드래그 앤 드롭 구현 완료
- 코드 리뷰 시간 평균 4시간 → 2시간으로 개선
- 디자인 시스템 컴포넌트 10개 추가

## 🔧 개선할 점 (Problem)
- QA 테스트가 스프린트 마무리에 집중됨
- 번역 키 관리가 수동적 → 자동화 필요

## 💡 시도할 점 (Try)
- 스프린트 초반부터 QA 진행
- i18n 키 자동 추출 스크립트 도입
- 주간 디자인 리뷰 정례화

## 📊 스프린트 통계
- 계획: **24 포인트**
- 완료: **21 포인트** (87.5%)
- 이월: 3 포인트`,
    icon: '🔄',
    workspaceId: MOCK_WS_ID,
    projectId: MOCK_PROJECT_A,
    createdBy: 'mock_user_002',
    createdByName: '박지현',
    tags: ['회고', 'Sprint 2'],
    createdAt: '2026-02-15 17:00:00',
  },
  {
    id: 'mock_wiki_005',
    title: '📐 코딩 컨벤션',
    content: `# 코딩 컨벤션

## TypeScript
- \`strict\` 모드 필수
- \`any\` 사용 최소화 (\`unknown\` 또는 제네릭 선호)
- 인터페이스는 \`I\` 접두어 없이 \`PascalCase\`

## React
- **함수형 컴포넌트 + Hooks** 사용
- 상태 관리: Context API (전역), useState (로컬)
- \`useCallback\` / \`useMemo\`는 성능 이슈가 있을 때만

## 파일 구조
\`\`\`
ComponentName/
├── ComponentName.tsx
├── ComponentName.test.tsx
└── index.ts
\`\`\`

## Git 커밋 규칙
\`\`\`
feat: 새 기능 추가
fix: 버그 수정
docs: 문서 변경
style: 코드 포맷 (기능 변경 X)
refactor: 리팩토링
test: 테스트 추가/수정
chore: 빌드/도구 변경
\`\`\`

## PR 규칙
- 제목: \`[타입] 간단한 설명\`
- 리뷰어 최소 1명 승인 필요
- 모든 CI 통과 필수`,
    icon: '📐',
    parentId: 'mock_wiki_folder_001',
    visibility: 'workspace',
    workspaceId: MOCK_WS_ID,
    createdBy: MOCK_USER_ID,
    createdByName: '김영수',
    pinned: true,
    tags: ['컨벤션', '개발'],
    createdAt: '2025-12-20 09:00:00',
    updatedAt: '2026-02-01 11:00:00',
    updatedBy: MOCK_USER_ID,
    updatedByName: '김영수',
  },
  {
    id: 'mock_wiki_006',
    title: '🚢 배포 프로세스',
    content: `# 배포 프로세스

## 환경
| 환경 | URL | 브랜치 |
|------|-----|--------|
| Development | dev.taskflow.app | \`develop\` |
| Staging | staging.taskflow.app | \`release/*\` |
| Production | taskflow.app | \`main\` |

## 배포 절차
1. \`develop\` → \`release/x.y.z\` 브랜치 생성
2. Staging에 자동 배포 (GitHub Actions)
3. QA 검증 (1~2일)
4. 승인 후 \`main\`에 머지
5. Production 자동 배포
6. 버전 태그 생성

## 핫픽스
\`\`\`
main → hotfix/issue-number → main + develop
\`\`\`

## 롤백
\`\`\`bash
# Firebase Hosting 롤백
firebase hosting:clone <previous-version> live
\`\`\`

> ⚠️ 금요일 오후 5시 이후 배포 금지!`,
    icon: '🚢',
    parentId: 'mock_wiki_folder_001',
    visibility: 'private',
    workspaceId: MOCK_WS_ID,
    createdBy: 'mock_user_003',
    createdByName: '이민수',
    tags: ['배포', 'DevOps'],
    createdAt: '2026-01-05 14:00:00',
    updatedAt: '2026-02-18 09:00:00',
    updatedBy: 'mock_user_003',
    updatedByName: '이민수',
  },
  {
    id: 'mock_wiki_007',
    title: '📝 주간 회의록 템플릿',
    content: `# 주간 회의록

## 📅 날짜: YYYY-MM-DD
**참석자:** @전원

---

## 🔍 지난 주 리뷰
- [ ] 액션 아이템 1
- [ ] 액션 아이템 2

## 📋 이번 주 안건
1. **안건 1**: 설명
2. **안건 2**: 설명

## 💬 논의 사항
- 

## ✅ 결정 사항
- 

## 📌 액션 아이템
| 담당 | 액션 | 기한 |
|------|------|------|
| @이름 | ... | MM/DD |

---
*다음 회의: YYYY-MM-DD*`,
    icon: '📝',
    workspaceId: MOCK_WS_ID,
    createdBy: 'mock_user_004',
    createdByName: '최서연',
    tags: ['회의', '템플릿'],
    createdAt: '2026-02-01 09:00:00',
  },
];

// ─── Activity Log ──────────────────────────────────────
import type { ActivityEntry } from '../../types';

export const mockActivities: ActivityEntry[] = [
  {
    id: 'act_001',
    entityType: 'task',
    entityId: 'mock_task_001',
    entityTitle: '사용자 인증 시스템 구현',
    action: 'status_changed',
    workspaceId: MOCK_WS_ID,
    userId: MOCK_USER_ID,
    userName: '김영수',
    changes: [{ field: 'status', displayField: '상태', from: 'inprogress', to: 'in-review' }],
    timestamp: '2026-02-20 16:30:00',
  },
  {
    id: 'act_002',
    entityType: 'task',
    entityId: 'mock_task_002',
    entityTitle: '대시보드 차트 리팩토링',
    action: 'assigned',
    workspaceId: MOCK_WS_ID,
    userId: 'mock_user_002',
    userName: '박지현',
    changes: [{ field: 'assignee', displayField: '담당자', to: '이민수' }],
    timestamp: '2026-02-20 15:15:00',
  },
  {
    id: 'act_003',
    entityType: 'wiki',
    entityId: 'mock_wiki_001',
    entityTitle: '신규 입사자 온보딩 가이드',
    action: 'updated',
    workspaceId: MOCK_WS_ID,
    userId: MOCK_USER_ID,
    userName: '김영수',
    changes: [
      { field: 'content', displayField: '내용', from: '(이전 버전)', to: '(수정됨)' },
      { field: 'tags', displayField: '태그', from: '온보딩', to: '온보딩, 가이드' },
    ],
    timestamp: '2026-02-20 14:00:00',
  },
  {
    id: 'act_004',
    entityType: 'task',
    entityId: 'mock_task_003',
    entityTitle: '모바일 반응형 디자인 적용',
    action: 'priority_changed',
    workspaceId: MOCK_WS_ID,
    userId: 'mock_user_003',
    userName: '이민수',
    changes: [{ field: 'priority', displayField: '우선순위', from: 'P2', to: 'P0' }],
    timestamp: '2026-02-20 11:45:00',
  },
  {
    id: 'act_005',
    entityType: 'task',
    entityId: 'mock_task_005',
    entityTitle: 'API 엔드포인트 보안 강화',
    action: 'created',
    workspaceId: MOCK_WS_ID,
    userId: 'mock_user_002',
    userName: '박지현',
    timestamp: '2026-02-20 10:30:00',
  },
  {
    id: 'act_006',
    entityType: 'sprint',
    entityId: 'mock_sprint_002',
    entityTitle: 'Sprint 2',
    action: 'created',
    workspaceId: MOCK_WS_ID,
    userId: MOCK_USER_ID,
    userName: '김영수',
    description: '스프린트 2 시작 (2026.02.03 ~ 2026.02.14)',
    timestamp: '2026-02-19 09:00:00',
  },
  {
    id: 'act_007',
    entityType: 'task',
    entityId: 'mock_task_001',
    entityTitle: '사용자 인증 시스템 구현',
    action: 'commented',
    workspaceId: MOCK_WS_ID,
    userId: 'mock_user_003',
    userName: '이민수',
    description: 'OAuth2 플로우 테스트 완료, PKCE 적용 확인 필요',
    timestamp: '2026-02-19 17:20:00',
  },
  {
    id: 'act_008',
    entityType: 'wiki',
    entityId: 'mock_wiki_003',
    entityTitle: 'API 가이드',
    action: 'created',
    workspaceId: MOCK_WS_ID,
    userId: 'mock_user_003',
    userName: '이민수',
    timestamp: '2026-02-18 11:00:00',
  },
  {
    id: 'act_009',
    entityType: 'task',
    entityId: 'mock_task_004',
    entityTitle: '다국어 지원 (i18n)',
    action: 'completed',
    workspaceId: MOCK_WS_ID,
    userId: 'mock_user_004',
    userName: '최서연',
    changes: [{ field: 'status', displayField: '상태', from: 'inprogress', to: 'done' }],
    timestamp: '2026-02-18 09:30:00',
  },
  {
    id: 'act_010',
    entityType: 'task',
    entityId: 'mock_task_002',
    entityTitle: '대시보드 차트 리팩토링',
    action: 'updated',
    workspaceId: MOCK_WS_ID,
    userId: 'mock_user_002',
    userName: '박지현',
    changes: [
      { field: 'description', displayField: '설명', from: '(없음)', to: 'Recharts → Nivo 마이그레이션' },
      { field: 'dueDate', displayField: '마감일', from: '2026-02-10', to: '2026-02-15' },
    ],
    timestamp: '2026-02-17 14:15:00',
  },
  {
    id: 'act_011',
    entityType: 'task',
    entityId: 'mock_task_006',
    entityTitle: '캘린더 뷰 통합',
    action: 'moved',
    workspaceId: MOCK_WS_ID,
    userId: MOCK_USER_ID,
    userName: '김영수',
    changes: [{ field: 'sprint', displayField: '스프린트', from: 'Sprint 1', to: 'Sprint 2' }],
    timestamp: '2026-02-17 10:00:00',
  },
  {
    id: 'act_012',
    entityType: 'wiki',
    entityId: 'mock_wiki_001',
    entityTitle: '신규 입사자 온보딩 가이드',
    action: 'pinned',
    workspaceId: MOCK_WS_ID,
    userId: MOCK_USER_ID,
    userName: '김영수',
    timestamp: '2026-02-16 16:00:00',
  },
];

// ─── Export constants for use elsewhere ──────────────────
export { MOCK_WS_ID, MOCK_PROJECT_A, MOCK_PROJECT_B, MOCK_PROJECT_C };
