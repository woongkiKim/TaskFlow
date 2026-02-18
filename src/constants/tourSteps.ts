import type { TourStep } from '../hooks/useOnboarding';

export const getTourSteps = (lang: 'ko' | 'en'): TourStep[] => {
  if (lang === 'ko') {
    return [
      {
        targetSelector: '[data-tour="sidebar-projects"]',
        title: '\uD504\uB85C\uC81D\uD2B8 \uD0D0\uC0C9',
        description: '\uC5EC\uAE30\uC11C \uC6CC\uD06C\uC2A4\uD398\uC774\uC2A4\uC640 \uD504\uB85C\uC81D\uD2B8\uB97C \uC120\uD0DD\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4. \uD504\uB85C\uC81D\uD2B8\uBCC4\uB85C \uC791\uC5C5\uC744 \uAD00\uB9AC\uD558\uACE0 \uD300\uC6D0\uACFC \uD611\uC5C5\uD558\uC138\uC694.',
        icon: '\uD83D\uDCC1',
        placement: 'right',
      },
      {
        targetSelector: '[data-tour="sidebar-views"]',
        title: '\uBDF0 \uBAA8\uB4DC',
        description: '\uBCF4\uB4DC, \uB9AC\uC2A4\uD2B8, \uCE98\uB9B0\uB354, \uD14C\uC774\uBE14 \uB4F1 \uB2E4\uC591\uD55C \uBDF0\uB85C \uC791\uC5C5\uC744 \uD655\uC778\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4. \uC6D0\uD558\uB294 \uBC29\uC2DD\uC73C\uB85C \uC791\uC5C5\uC744 \uC815\uB9AC\uD558\uC138\uC694.',
        icon: '\uD83D\uDC41\uFE0F',
        placement: 'right',
      },
      {
        targetSelector: '[data-tour="sidebar-custom-views"]',
        title: '\uCEE4\uC2A4\uD140 \uBDF0',
        description: '\uC790\uC8FC \uC0AC\uC6A9\uD558\uB294 \uD544\uD130 \uC870\uD569\uC744 \uC800\uC7A5\uD558\uC5EC \uBE60\uB974\uAC8C \uC811\uADFC\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4. "+"\uBC84\uD2BC\uC73C\uB85C \uC0C8 \uBDF0\uB97C \uB9CC\uB4E4\uC5B4\uBCF4\uC138\uC694.',
        icon: '\u2B50',
        placement: 'right',
      },
      {
        targetSelector: '[data-tour="sidebar-sprints"]',
        title: '\uC2A4\uD504\uB9B0\uD2B8 & \uC774\uD130\uB808\uC774\uC158',
        description: '\uC2A4\uD504\uB9B0\uD2B8, \uD398\uC774\uC988, \uB9C8\uC77C\uC2A4\uD1A4\uC744 \uAD00\uB9AC\uD569\uB2C8\uB2E4. \uD074\uB9AD\uD558\uBA74 \uD574\uB2F9 \uC774\uD130\uB808\uC774\uC158\uC758 \uC791\uC5C5\uB9CC \uD544\uD130\uB429\uB2C8\uB2E4.',
        icon: '\uD83C\uDFC3',
        placement: 'right',
      },
      {
        targetSelector: '[data-tour="header-search"]',
        title: '\uBE60\uB978 \uAC80\uC0C9',
        description: '\uC0C1\uB2E8 \uAC80\uC0C9\uBC14\uC5D0\uC11C \uC791\uC5C5\uC744 \uBE60\uB974\uAC8C \uCC3E\uC744 \uC218 \uC788\uC2B5\uB2C8\uB2E4. Ctrl+K\uB85C \uBA85\uB839 \uBA54\uB274\uB3C4 \uC5F4 \uC218 \uC788\uC5B4\uC694!',
        icon: '\uD83D\uDD0D',
        placement: 'bottom',
      },
      {
        targetSelector: '[data-tour="header-notifications"]',
        title: '\uC54C\uB9BC',
        description: '\uC791\uC5C5 \uBCC0\uACBD, \uBA58\uC158, \uC2A4\uD504\uB9B0\uD2B8 \uC5C5\uB370\uC774\uD2B8 \uB4F1\uC758 \uC54C\uB9BC\uC744 \uD655\uC778\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.',
        icon: '\uD83D\uDD14',
        placement: 'bottom',
      },
      {
        targetSelector: '[data-tour="main-content"]',
        title: '\uC791\uC5C5 \uBCF4\uB4DC',
        description: '\uC5EC\uAE30\uC11C \uC791\uC5C5\uC744 \uAD00\uB9AC\uD569\uB2C8\uB2E4. \uB4DC\uB798\uADF8\uB85C \uC0C1\uD0DC\uB97C \uBCC0\uACBD\uD558\uACE0, \uD074\uB9AD\uD558\uC5EC \uC0C1\uC138 \uC815\uBCF4\uB97C \uD655\uC778\uD558\uC138\uC694. C\uD0A4\uB85C \uC0C8 \uC791\uC5C5\uC744 \uBE60\uB974\uAC8C \uB9CC\uB4E4 \uC218 \uC788\uC2B5\uB2C8\uB2E4!',
        icon: '\uD83D\uDCCB',
        placement: 'top',
      },
    ];
  }

  return [
    {
      targetSelector: '[data-tour="sidebar-projects"]',
      title: 'Navigate Projects',
      description: 'Select your workspace and project here. Manage tasks per project and collaborate with your team.',
      icon: '\uD83D\uDCC1',
      placement: 'right',
    },
    {
      targetSelector: '[data-tour="sidebar-views"]',
      title: 'View Modes',
      description: 'Switch between Board, List, Calendar, and Table views. Organize your tasks the way you prefer.',
      icon: '\uD83D\uDC41\uFE0F',
      placement: 'right',
    },
    {
      targetSelector: '[data-tour="sidebar-custom-views"]',
      title: 'Custom Views',
      description: 'Save frequently used filter combinations for quick access. Click "+" to create a new custom view.',
      icon: '\u2B50',
      placement: 'right',
    },
    {
      targetSelector: '[data-tour="sidebar-sprints"]',
      title: 'Sprints & Iterations',
      description: 'Manage sprints, phases, and milestones. Click to filter tasks for a specific iteration.',
      icon: '\uD83C\uDFC3',
      placement: 'right',
    },
    {
      targetSelector: '[data-tour="header-search"]',
      title: 'Quick Search',
      description: 'Find tasks quickly with the search bar. You can also press Ctrl+K to open the command menu!',
      icon: '\uD83D\uDD0D',
      placement: 'bottom',
    },
    {
      targetSelector: '[data-tour="header-notifications"]',
      title: 'Notifications',
      description: 'Stay updated with task changes, mentions, and sprint updates.',
      icon: '\uD83D\uDD14',
      placement: 'bottom',
    },
    {
      targetSelector: '[data-tour="main-content"]',
      title: 'Task Board',
      description: 'Manage your tasks here. Drag to change status, click for details. Press C to quickly create a new task!',
      icon: '\uD83D\uDCCB',
      placement: 'top',
    },
  ];
};
