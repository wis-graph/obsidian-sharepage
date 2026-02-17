import { GitHubClient } from './github-client';

export interface GithubFile {
    path: string;
    content: string | ArrayBuffer | null;
    isBinary?: boolean;
    isDeleted?: boolean;
}

export class ContentManager extends GitHubClient {
    async getFileContent(path: string): Promise<{ content: string; sha: string } | null> {
        try {
            const response = await this.octokit.rest.repos.getContent({
                owner: this.owner,
                repo: this.repo,
                path: path,
                ref: this.branch
            });

            const data = response.data as any;
            if (data.type === 'file' && 'content' in data) {
                return {
                    content: Buffer.from(data.content, 'base64').toString('utf-8'),
                    sha: data.sha
                };
            }
            return null;
        } catch (error: any) {
            if (error.status === 404) return null;
            throw error;
        }
    }

    async uploadFile(path: string, content: ArrayBuffer, message: string): Promise<void> {
        const existing = await this.getFileContent(path);
        const sha = existing ? existing.sha : undefined;
        const base64Content = Buffer.from(content).toString('base64');

        await this.octokit.rest.repos.createOrUpdateFileContents({
            owner: this.owner,
            repo: this.repo,
            path,
            message,
            content: base64Content,
            sha,
            branch: this.branch
        });
    }

    async deleteFileByPath(path: string): Promise<void> {
        const file = await this.getFileContent(path);
        if (!file) throw new Error('File not found on GitHub');

        await this.octokit.rest.repos.deleteFile({
            owner: this.owner,
            repo: this.repo,
            path: path,
            message: `chore: delete ${path} via Obsidian`,
            sha: file.sha,
            branch: this.branch
        });
    }

    async createBatchCommit(files: GithubFile[], message: string): Promise<void> {
        if (files.length === 0) return;

        let attempts = 0;
        const MAX_ATTEMPTS = 3;

        while (attempts < MAX_ATTEMPTS) {
            try {
                const { currentCommitSha, baseTreeSha } = await this.getLatestCommitInfo();
                const treeItems = await this.buildTreeItems(files);

                await this.pushNewCommit(treeItems, baseTreeSha, currentCommitSha, message);
                return;
            } catch (error: any) {
                if (error.status === 422 && attempts < MAX_ATTEMPTS - 1) {
                    attempts++;
                    await new Promise(r => setTimeout(r, 2000));
                    continue;
                }
                throw error;
            }
        }
    }

    private async getLatestCommitInfo() {
        const { data: refData } = await this.octokit.rest.git.getRef({
            owner: this.owner,
            repo: this.repo,
            ref: `heads/${this.branch}`
        });

        const currentCommitSha = refData.object.sha;
        const { data: commitData } = await this.octokit.rest.git.getCommit({
            owner: this.owner,
            repo: this.repo,
            commit_sha: currentCommitSha
        });

        return { currentCommitSha, baseTreeSha: commitData.tree.sha };
    }

    private async buildTreeItems(files: GithubFile[]) {
        return Promise.all(files.map(async (file) => {
            if (file.isDeleted) {
                return { path: file.path, mode: '100644' as const, type: 'blob' as const, sha: null };
            }

            const { data: blobData } = await this.octokit.rest.git.createBlob({
                owner: this.owner,
                repo: this.repo,
                content: file.isBinary
                    ? Buffer.from(file.content as ArrayBuffer).toString('base64')
                    : file.content as string,
                encoding: file.isBinary ? 'base64' : 'utf-8'
            });

            return {
                path: file.path,
                mode: '100644' as const,
                type: 'blob' as const,
                sha: blobData.sha
            };
        }));
    }

    private async pushNewCommit(treeItems: any[], baseTreeSha: string, parentSha: string, message: string) {
        const { data: newTree } = await this.octokit.rest.git.createTree({
            owner: this.owner,
            repo: this.repo,
            base_tree: baseTreeSha,
            tree: treeItems
        });

        const { data: newCommit } = await this.octokit.rest.git.createCommit({
            owner: this.owner,
            repo: this.repo,
            message,
            tree: newTree.sha,
            parents: [parentSha]
        });

        await this.octokit.rest.git.updateRef({
            owner: this.owner,
            repo: this.repo,
            ref: `heads/${this.branch}`,
            sha: newCommit.sha
        });
    }

    async getUploadedNotes(): Promise<{ name: string; path: string; sha: string }[]> {
        try {
            const response = await this.octokit.rest.repos.getContent({
                owner: this.owner,
                repo: this.repo,
                path: 'notes',
                ref: this.branch
            });

            if (Array.isArray(response.data)) {
                return response.data
                    .filter((item: any) => item.type === 'file' && item.name.endsWith('.md'))
                    .map((item: any) => ({
                        name: item.name,
                        path: item.path,
                        sha: item.sha
                    }));
            }
            return [];
        } catch (error: any) {
            if (error.status === 404) return [];
            throw error;
        }
    }
}
