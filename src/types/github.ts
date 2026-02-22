// src/types/github.ts

export interface GitHubRepo {
  owner: string;
  name: string;
  url: string;
  id: number;
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  state: string;
  html_url: string;
  repository_url: string;
  user: {
    login: string;
    avatar_url: string;
  };
  labels: {
    name: string;
    color: string;
  }[];
  created_at: string;
  updated_at: string;
  pull_request?: {
    url: string;
  };
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed' | 'merged';
  html_url: string;
  user: {
    login: string;
    avatar_url: string;
  };
  merged_at: string | null;
  base: {
    ref: string;
  };
  head: {
    ref: string;
  };
}

export interface GitHubCommit {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
  author: {
    login: string;
    avatar_url: string;
  } | null;
}
