import simpleGit, { SimpleGit, LogResult, BranchSummary } from 'simple-git';

export interface CommitInfo {
    hash: string;
    date: string;
    message: string;
    author: string;
    branch: string;
}

export interface BranchInfo {
    name: string;
    current: boolean;
    commit: string;
}

export class GitManager {
    private git: SimpleGit;
    private projectPath: string;

    constructor(projectPath: string) {
        this.projectPath = projectPath;
        this.git = simpleGit(projectPath);
    }

    async isGitRepo(): Promise<boolean> {
        try {
            await this.git.status();
            return true;
        } catch {
            return false;
        }
    }

    async initIfNeeded(): Promise<void> {
        if (!(await this.isGitRepo())) {
            await this.git.init();
        }
    }

    async getCurrentBranch(): Promise<string> {
        const status = await this.git.status();
        return status.current || 'main';
    }

    async createTaskBranch(taskId: string): Promise<string> {
        const timestamp = Date.now();
        const branchName = `overknight/${taskId}-${timestamp}`;
        await this.git.checkoutLocalBranch(branchName);
        return branchName;
    }

    async listBranches(): Promise<BranchInfo[]> {
        const summary: BranchSummary = await this.git.branch();
        return Object.entries(summary.branches).map(([name, branch]) => ({
            name,
            current: branch.current,
            commit: branch.commit,
        }));
    }

    async listOverknightBranches(): Promise<BranchInfo[]> {
        const branches = await this.listBranches();
        return branches.filter(b => b.name.startsWith('overknight/'));
    }

    async getCommitLog(count: number = 20): Promise<CommitInfo[]> {
        try {
            const log: LogResult = await this.git.log({ maxCount: count });
            const currentBranch = await this.getCurrentBranch();
            return log.all.map(commit => ({
                hash: commit.hash,
                date: commit.date,
                message: commit.message,
                author: commit.author_name,
                branch: currentBranch,
            }));
        } catch {
            return [];
        }
    }

    async checkout(branchName: string): Promise<void> {
        await this.git.checkout(branchName);
    }

    async resetToCommit(commitHash: string): Promise<void> {
        await this.git.reset(['--hard', commitHash]);
    }

    async hasUncommittedChanges(): Promise<boolean> {
        const status = await this.git.status();
        return !status.isClean();
    }

    async getStatus(): Promise<{ branch: string; isClean: boolean; modified: string[]; staged: string[] }> {
        const status = await this.git.status();
        return {
            branch: status.current || 'unknown',
            isClean: status.isClean(),
            modified: status.modified,
            staged: status.staged,
        };
    }

    async commitAll(message: string): Promise<string> {
        await this.git.add('.');
        const result = await this.git.commit(message);
        return result.commit;
    }

    async merge(branch: string): Promise<{ success: boolean; message: string; conflict?: boolean }> {
        try {
            await this.git.merge([branch]);
            return { success: true, message: 'Merged successfully' };
        } catch (error) {
            const status = await this.git.status();
            if (status.conflicted.length > 0) {
                return { success: false, message: 'Merge conflicts detected', conflict: true };
            }
            return { success: false, message: String(error) };
        }
    }

    async getDiff(branch: string, target: string = 'main'): Promise<string> {
        try {
            // Get diff between the target branch (e.g., main) and the task branch
            // We use 'target..branch' to see what 'branch' adds to 'target'
            return await this.git.diff([`${target}..${branch}`]);
        } catch (e) {
            console.error('Failed to get diff', e);
            return '';
        }
    }

    async getMergeStatus(branch: string): Promise<{ canMerge: boolean; behind?: number; ahead?: number }> {
        try {
            // Assumes we are on the target branch or can access it
            // This is a simple check. For a more robust check we might need to fetch origin
            const revList = await this.git.raw(['rev-list', '--left-right', '--count', `main...${branch}`]);
            const [behind, ahead] = revList.trim().split('\t').map(Number);
            return { canMerge: true, behind, ahead };
        } catch {
            return { canMerge: false };
        }
    }

    async abortMerge(): Promise<void> {
        await this.git.merge(['--abort']);
    }
}

export function createGitManager(projectPath: string): GitManager {
    return new GitManager(projectPath);
}
