import type { TourStep } from '../hooks/useOnboarding';

export const getTourSteps = (lang: 'ko' | 'en'): TourStep[] => {
  if (lang === 'ko') {
    return [
      {
        targetSelector: '[data-tour="sidebar-projects"]',
        title: '프로젝트 선택 & 관리',
        description:
          '① 프로젝트 이름을 클릭하면 해당 프로젝트의 작업만 보입니다.\n' +
          '② 오른쪽 "+" 버튼으로 새 프로젝트를 만들 수 있어요.\n' +
          '③ 팀 멤버들과 같은 워크스페이스에서 실시간으로 협업하세요.\n\n' +
          '💡 팁: 프로젝트별로 독립적인 칸반 보드, 스프린트, 칼럼 설정이 적용됩니다.',
        icon: '📁',
        placement: 'right',
      },
      {
        targetSelector: '[data-tour="sidebar-views"]',
        title: '뷰 모드 전환하기',
        description:
          '작업을 4가지 방식으로 볼 수 있습니다:\n' +
          '• 리스트 — 간단한 목록 형태\n' +
          '• 보드 — 칸반 스타일 (드래그로 상태 변경)\n' +
          '• 캘린더 — 날짜별 작업 확인\n' +
          '• 테이블 — 스프레드시트처럼 일괄 편집\n\n' +
          '💡 팁: 보드 뷰에서 카드를 드래그하면 상태(Todo→진행중→완료)가 자동으로 바뀝니다.',
        icon: '👁️',
        placement: 'right',
      },
      {
        targetSelector: '[data-tour="sidebar-custom-views"]',
        title: '나만의 필터 뷰 저장',
        description:
          '자주 쓰는 필터 조합을 저장해서 원클릭으로 불러올 수 있어요.\n\n' +
          '사용 방법:\n' +
          '① 보드에서 원하는 필터를 적용하세요 (예: 우선순위 높음 + 내 작업)\n' +
          '② 하단의 "뷰로 저장" 버튼을 클릭\n' +
          '③ 이름과 아이콘을 지정하면 사이드바에 나타납니다\n\n' +
          '💡 팁: "내가 담당하는 긴급 작업" 같은 뷰를 만들어보세요!',
        icon: '⭐',
        placement: 'right',
      },
      {
        targetSelector: '[data-tour="sidebar-sprints"]',
        title: '스프린트 & 이터레이션',
        description:
          '애자일 스프린트를 3가지 유형으로 관리할 수 있습니다:\n' +
          '🏃 스프린트 — 1~2주 단위 작업 묶음\n' +
          '📦 페이즈 — 상위 그룹 (예: MVP, Beta)\n' +
          '🎯 마일스톤 — 중요 마감일 표시\n\n' +
          '사용 방법:\n' +
          '① "+" 버튼으로 새 스프린트를 생성\n' +
          '② 클릭하면 해당 스프린트의 작업만 필터링됨\n' +
          '③ 캘린더 뷰에서 타임라인으로도 확인 가능',
        icon: '🏃',
        placement: 'right',
      },
      {
        targetSelector: '[data-tour="header-search"]',
        title: '검색 & 명령 메뉴',
        description:
          '검색바에 키워드를 입력하면 제목, 설명, 태그를 기준으로 작업을 찾습니다.\n\n' +
          '⌨️ 단축키:\n' +
          '• Ctrl+K — 명령 메뉴 열기 (검색 + 네비게이션)\n' +
          '• C — 새 작업 빠르게 만들기\n' +
          '• ? — 전체 단축키 목록 보기\n' +
          '• G → B — 보드로 이동\n' +
          '• G → P — 플래너로 이동\n\n' +
          '💡 팁: 검색 결과를 클릭하면 작업 상세 정보를 바로 확인할 수 있어요.',
        icon: '🔍',
        placement: 'bottom',
      },
      {
        targetSelector: '[data-tour="header-notifications"]',
        title: '알림 센터',
        description:
          '다음과 같은 경우 알림이 발생합니다:\n' +
          '• 작업이 나에게 배정되었을 때\n' +
          '• 댓글이나 멘션(@)이 달렸을 때\n' +
          '• 스프린트 상태가 변경되었을 때\n' +
          '• 마감일이 다가올 때\n\n' +
          '💡 팁: 알림을 클릭하면 해당 작업으로 바로 이동합니다. 읽은 알림은 자동으로 표시됩니다.',
        icon: '🔔',
        placement: 'bottom',
      },
      {
        targetSelector: '[data-tour="main-content"]',
        title: '작업 보드 사용법',
        description:
          '여기가 핵심 작업 공간입니다!\n\n' +
          '✅ 작업 만들기: C키를 누르거나 칼럼 상단의 "+" 클릭\n' +
          '🔄 상태 변경: 카드를 다른 칼럼으로 드래그\n' +
          '📝 상세 보기: 카드를 클릭하면 설명, 담당자, 태그, 우선순위 등을 편집\n' +
          '🏷️ 태그 추가: 작업 제목에 #태그를 입력하면 자동 인식\n' +
          '⏱️ 집중 모드: 작업 옆의 ▶ 버튼으로 포모도로 타이머 시작\n\n' +
          '💡 팁: 우선순위(P0~P3)를 설정하면 작업이 중요도순으로 정렬됩니다.',
        icon: '📋',
        placement: 'top',
      },
    ];
  }

  return [
    {
      targetSelector: '[data-tour="sidebar-projects"]',
      title: 'Select & Manage Projects',
      description:
        '① Click a project name to view only its tasks.\n' +
        '② Click the "+" button to create a new project.\n' +
        '③ Collaborate in real-time with your team members.\n\n' +
        '💡 Tip: Each project has its own Kanban board, sprints, and column settings.',
      icon: '📁',
      placement: 'right',
    },
    {
      targetSelector: '[data-tour="sidebar-views"]',
      title: 'Switch View Modes',
      description:
        'View your tasks in 4 different ways:\n' +
        '• List — Simple list layout\n' +
        '• Board — Kanban style (drag to change status)\n' +
        '• Calendar — See tasks by date\n' +
        '• Table — Spreadsheet-like bulk editing\n\n' +
        '💡 Tip: In Board view, drag cards between columns to change status (Todo → In Progress → Done).',
      icon: '👁️',
      placement: 'right',
    },
    {
      targetSelector: '[data-tour="sidebar-custom-views"]',
      title: 'Save Custom Filter Views',
      description:
        'Save frequently used filter combinations for one-click access.\n\n' +
        'How to use:\n' +
        '① Apply your desired filters on the board (e.g., High Priority + My Tasks)\n' +
        '② Click "Save as View" at the bottom\n' +
        '③ Name it and pick an icon — it appears in the sidebar\n\n' +
        '💡 Tip: Create views like "My Urgent Tasks" or "Blocked Items" for quick access!',
      icon: '⭐',
      placement: 'right',
    },
    {
      targetSelector: '[data-tour="sidebar-sprints"]',
      title: 'Sprints & Iterations',
      description:
        'Manage agile sprints with 3 types:\n' +
        '🏃 Sprint — 1-2 week work cycles\n' +
        '📦 Phase — Higher-level groups (e.g., MVP, Beta)\n' +
        '🎯 Milestone — Important deadline markers\n\n' +
        'How to use:\n' +
        '① Click "+" to create a new sprint\n' +
        '② Click a sprint to filter its tasks only\n' +
        '③ View timelines in Calendar view',
      icon: '🏃',
      placement: 'right',
    },
    {
      targetSelector: '[data-tour="header-search"]',
      title: 'Search & Command Menu',
      description:
        'Type keywords to search by title, description, or tags.\n\n' +
        '⌨️ Shortcuts:\n' +
        '• Ctrl+K — Open command menu (search + navigation)\n' +
        '• C — Quick-create a new task\n' +
        '• ? — View all keyboard shortcuts\n' +
        '• G → B — Go to Board\n' +
        '• G → P — Go to Planner\n\n' +
        '💡 Tip: Click a search result to jump straight to that task\'s details.',
      icon: '🔍',
      placement: 'bottom',
    },
    {
      targetSelector: '[data-tour="header-notifications"]',
      title: 'Notification Center',
      description:
        'You\'ll receive notifications when:\n' +
        '• A task is assigned to you\n' +
        '• Someone comments or @mentions you\n' +
        '• Sprint status changes\n' +
        '• A deadline is approaching\n\n' +
        '💡 Tip: Click a notification to jump directly to the related task. Read notifications are automatically marked.',
      icon: '🔔',
      placement: 'bottom',
    },
    {
      targetSelector: '[data-tour="main-content"]',
      title: 'How to Use the Task Board',
      description:
        'This is your main workspace!\n\n' +
        '✅ Create tasks: Press C or click "+" at the top of a column\n' +
        '🔄 Change status: Drag cards to another column\n' +
        '📝 View details: Click a card to edit description, assignee, tags, priority\n' +
        '🏷️ Add tags: Type #tag in the task title for auto-recognition\n' +
        '⏱️ Focus mode: Click ▶ next to a task to start a Pomodoro timer\n\n' +
        '💡 Tip: Setting priority (P0-P3) sorts tasks by importance automatically.',
      icon: '📋',
      placement: 'top',
    },
  ];
};
