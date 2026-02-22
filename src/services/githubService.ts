import type { GitHubRepo, GitHubIssue, GitHubPullRequest, GitHubCommit } from '../types/github';

const GITHUB_API_BASE = 'https://api.github.com';

/** Translates common GitHub API HTTP status codes to user-friendly messages. */
const resolveGitHubError = async (response: Response, context: string): Promise<Error> => {
  if (response.status === 401) return new Error(`GitHub: 인증 실패 - 토큰이 유효하지 않습니다. (${context})`);
  if (response.status === 403) return new Error(`GitHub: 접근 권한이 없습니다. 토큰의 'repo' 스코프를 확인하세요. (${context})`);
  if (response.status === 404) return new Error(`GitHub: 저장소를 찾을 수 없습니다. owner/repo 이름을 확인하세요. (${context})`);
  if (response.status === 422) return new Error(`GitHub: 잘못된 요청입니다. (${context})`);
  if (response.status >= 500) return new Error(`GitHub 서버 오류가 발생했습니다. 잠시 후 다시 시도하세요. (${context})`);
  return new Error(`GitHub API 오류 (${response.status}): ${context}`);
};

export interface GitHubTokenInfo {
  valid: boolean;
  login?: string;
  avatarUrl?: string;
  scopes?: string[];
  expiresAt?: string | null;
  error?: string;
}

/**
 * Service to interact with the GitHub API.
 * All methods throw typed errors with user-facing messages.
 */
export const githubService = {
  // ─── Token Verification ────────────────────────────────────────────
  async verifyToken(token: string): Promise<GitHubTokenInfo> {
    if (!token?.trim()) return { valid: false, error: '토큰이 비어있습니다.' };
    try {
      const response = await fetch(`${GITHUB_API_BASE}/user`, {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) return { valid: false, error: '토큰이 유효하지 않거나 만료되었습니다.' };
        if (response.status === 403) return { valid: false, error: '토큰에 접근 권한이 없습니다.' };
        return { valid: false, error: `GitHub API 오류 (${response.status})` };
      }

      const data = await response.json();
      const scopeHeader = response.headers.get('x-oauth-scopes') || '';
      const scopes = scopeHeader.split(',').map((s: string) => s.trim()).filter(Boolean);
      const expirationHeader = response.headers.get('github-authentication-token-expiration');
      let expiresAt: string | null = null;
      if (expirationHeader) {
        try { expiresAt = new Date(expirationHeader).toISOString(); } catch { expiresAt = expirationHeader; }
      }

      return { valid: true, login: data.login, avatarUrl: data.avatar_url, scopes, expiresAt };
    } catch (err) {
      return { valid: false, error: err instanceof Error ? err.message : '네트워크 오류' };
    }
  },

  // ─── Repositories ──────────────────────────────────────────────────
  async fetchUserRepos(token: string): Promise<GitHubRepo[]> {
    if (!token?.trim()) throw new Error('GitHub Personal Access Token이 없습니다.');
    const response = await fetch(
      `${GITHUB_API_BASE}/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator,organization_member`,
      { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } },
    );
    if (!response.ok) throw await resolveGitHubError(response, 'fetchUserRepos');
    const data: { id: number; name: string; owner: { login: string }; html_url: string }[] = await response.json();
    return data.map((r) => ({ id: r.id, name: r.name, owner: r.owner.login, url: r.html_url }));
  },

  // ─── Issues (Read) ─────────────────────────────────────────────────
  async fetchRepoIssues(owner: string, repo: string, token?: string): Promise<GitHubIssue[]> {
    if (!owner || !repo) throw new Error('owner와 repo 이름이 필요합니다.');
    const headers: HeadersInit = { Accept: 'application/vnd.github.v3+json' };
    if (token) headers['Authorization'] = `token ${token}`;
    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues?state=open&per_page=50`,
      { headers },
    );
    if (!response.ok) throw await resolveGitHubError(response, `fetchRepoIssues(${owner}/${repo})`);
    return response.json();
  },

  // ─── Issues (Create) ───────────────────────────────────────────────
  /**
   * Creates a new issue on GitHub from TaskFlow.
   */
  async createIssue(
    owner: string, repo: string, token: string,
    title: string, body?: string, labels?: string[],
  ): Promise<GitHubIssue> {
    if (!owner || !repo) throw new Error('owner와 repo 이름이 필요합니다.');
    if (!token?.trim()) throw new Error('GitHub 토큰이 필요합니다.');
    if (!title?.trim()) throw new Error('이슈 제목이 필요합니다.');
    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues`,
      {
        method: 'POST',
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: title.trim(), body: body || '', labels: labels || [] }),
      },
    );
    if (!response.ok) throw await resolveGitHubError(response, `createIssue(${owner}/${repo})`);
    return response.json();
  },

  // ─── Issues (Close — bidirectional sync) ────────────────────────────
  /**
   * Closes a GitHub issue. Used when a TaskFlow task linked to an issue is completed.
   */
  async closeIssue(
    owner: string, repo: string, issueNumber: number, token: string,
  ): Promise<GitHubIssue> {
    if (!owner || !repo) throw new Error('owner와 repo 이름이 필요합니다.');
    if (!token?.trim()) throw new Error('GitHub 토큰이 필요합니다.');
    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${issueNumber}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ state: 'closed' }),
      },
    );
    if (!response.ok) throw await resolveGitHubError(response, `closeIssue(${owner}/${repo}#${issueNumber})`);
    return response.json();
  },

  // ─── Pull Requests ─────────────────────────────────────────────────
  async fetchPullRequests(owner: string, repo: string, token?: string): Promise<GitHubPullRequest[]> {
    if (!owner || !repo) throw new Error('owner와 repo 이름이 필요합니다.');
    const headers: HeadersInit = { Accept: 'application/vnd.github.v3+json' };
    if (token) headers['Authorization'] = `token ${token}`;
    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls?state=open&per_page=50`,
      { headers },
    );
    if (!response.ok) throw await resolveGitHubError(response, `fetchPullRequests(${owner}/${repo})`);
    return response.json();
  },

  // ─── Commits ───────────────────────────────────────────────────────
  /**
   * Fetches recent commits for a repository's default branch.
   */
  async fetchCommits(owner: string, repo: string, token?: string, perPage = 30): Promise<GitHubCommit[]> {
    if (!owner || !repo) throw new Error('owner와 repo 이름이 필요합니다.');
    const headers: HeadersInit = { Accept: 'application/vnd.github.v3+json' };
    if (token) headers['Authorization'] = `token ${token}`;
    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?per_page=${perPage}`,
      { headers },
    );
    if (!response.ok) throw await resolveGitHubError(response, `fetchCommits(${owner}/${repo})`);
    return response.json();
  },

  // ─── Mapper ────────────────────────────────────────────────────────
  mapIssueToTask(issue: GitHubIssue, projectId: string, workspaceId: string) {
    const title = issue.title?.trim() || `GitHub Issue #${issue.number}`;
    return {
      text: title,
      description: `GitHub Issue #${issue.number}: ${issue.html_url}`,
      status: 'todo' as const,
      priority: 'P2' as const,
      type: (issue.pull_request ? 'devops' : 'task') as string,
      projectId,
      workspaceId,
      tags: issue.labels?.map((l) => l.name).filter(Boolean) ?? [],
      createdAt: issue.created_at,
      githubId: issue.id,
      githubNumber: issue.number,
      url: issue.html_url,
    };
  },
};
