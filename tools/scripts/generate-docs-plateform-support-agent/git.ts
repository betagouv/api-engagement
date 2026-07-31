import { execFileSync } from "node:child_process";

const git = (args: string[], cwd?: string): string => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();

export const getRepositoryRoot = (): string => git(["rev-parse", "--show-toplevel"]);

export const getHeadCommit = (repositoryRoot: string): string => git(["rev-parse", "HEAD"], repositoryRoot);

export const getChangedFiles = (repositoryRoot: string, previousCommit: string | null): string[] => {
  if (!previousCommit) return [];
  try {
    git(["cat-file", "-e", `${previousCommit}^{commit}`], repositoryRoot);
  } catch {
    return [];
  }
  const output = git(["diff", "--name-only", `${previousCommit}..HEAD`], repositoryRoot);
  return output ? output.split("\n").filter(Boolean) : [];
};

export const readPreviousSourceCommit = (readme: string): string | null => {
  const match = readme.match(/^source_commit:\s*([a-f0-9]{7,40}|null)\s*$/m);
  return match && match[1] !== "null" ? match[1] : null;
};
