// src/services/aiService.ts
/**
 * Simulated AI Service for TaskFlow
 * In a real-world scenario, this would call an LLM (OpenAI, Claude, etc.)
 */

export interface SuggestedSubtask {
  text: string;
  type: string;
}

export const decomposeTask = async (title: string, description: string): Promise<SuggestedSubtask[]> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  const t = title.toLowerCase();
  const d = description.toLowerCase();

  // Keyword-based heuristic for smart suggestions
  const dIncludes = (word: string) => d.includes(word);
  if (t.includes('frontend') || dIncludes('ui') || t.includes('design')) {
    return [
      { text: 'Finalize UI components and layout', type: 'design' },
      { text: 'Implement responsive design for mobile/tablet', type: 'task' },
      { text: 'Integrate with backend API endpoints', type: 'devops' },
      { text: 'Write unit tests for core logic', type: 'task' },
      { text: 'Perform visual regression testing', type: 'bug' },
    ];
  }

  if (t.includes('backend') || t.includes('api') || t.includes('database')) {
    return [
      { text: 'Design DB schema and migrations', type: 'task' },
      { text: 'Implement CRUD endpoints with validation', type: 'task' },
      { text: 'Add authentication and authorization layers', type: 'handoff' },
      { text: 'Optimize query performance and indexing', type: 'devops' },
      { text: 'Document API using Swagger/OpenAPI', type: 'content' },
    ];
  }

  if (t.includes('bug') || t.includes('fix') || t.includes('error')) {
    return [
      { text: 'Reproduce the bug in local environment', type: 'bug' },
      { text: 'Identify root cause through debugging', type: 'task' },
      { text: 'Draft a fix and verify locally', type: 'task' },
      { text: 'Request peer review for the fix', type: 'handoff' },
      { text: 'Monitor production logs after deployment', type: 'devops' },
    ];
  }

  // Default suggestions for generic tasks
  return [
    { text: 'Research and gather requirements', type: 'content' },
    { text: 'Create initial implementation draft', type: 'task' },
    { text: 'Refine and polish the work', type: 'design' },
    { text: 'Final review and sign-off', type: 'handoff' },
  ];
};

export const refineDescription = async (currentDescription: string): Promise<string> => {
  await new Promise(resolve => setTimeout(resolve, 1200));
  if (!currentDescription.trim()) return 'No description provided to refine.';

  return `### 🎯 Context\n${currentDescription}\n\n### 📝 Acceptance Criteria\n- [ ] Functional requirements met\n- [ ] UI/UX matches design specs\n- [ ] Tests passed\n\n### 🛡️ Post-deployment\n- Monitoring logs for any regressions.`;
};
