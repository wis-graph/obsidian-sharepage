import { GitHubClient } from './github-client';

export class TemplateUpdater extends GitHubClient {
    async getUpstreamStatus(): Promise<{ status: string; behind_by: number }> {
        const repoInfo = await this.octokit.rest.repos.get({
            owner: this.owner,
            repo: this.repo
        });

        const upstreamOwner = repoInfo.data.parent?.owner.login || 'wis-graph';
        const upstreamBranch = repoInfo.data.parent?.default_branch || 'main';
        const basehead = `${upstreamOwner}:${upstreamBranch}...${this.branch}`;

        try {
            const response = await this.octokit.request('GET /repos/{owner}/{repo}/compare/{basehead}', {
                owner: this.owner,
                repo: this.repo,
                basehead: basehead
            });
            return {
                status: response.data.status,
                behind_by: response.data.behind_by
            };
        } catch (error: any) {
            if (error.status === 404) {
                throw new Error(`Upstream comparison failed for ${basehead}. Ensure repo is a fork.`);
            }
            throw error;
        }
    }

    async mergeUpstream(): Promise<void> {
        try {
            await this.octokit.rest.repos.mergeUpstream({
                owner: this.owner,
                repo: this.repo,
                branch: this.branch
            });
        } catch (error: any) {
            if (error.status === 409) {
                throw new Error('Conflict detected. Manual "Force Update" is required.');
            }
            throw error;
        }
    }

    async forceUpdate(): Promise<void> {
        const repoInfo = await this.octokit.rest.repos.get({ owner: this.owner, repo: this.repo });
        if (!repoInfo.data.fork || !repoInfo.data.parent) throw new Error('Not a fork repository.');

        const uOwner = repoInfo.data.parent.owner.login;
        const uRepo = repoInfo.data.parent.name;
        const uBranch = repoInfo.data.parent.default_branch || 'main';

        const uRef = await this.octokit.rest.git.getRef({ owner: uOwner, repo: uRepo, ref: `heads/${uBranch}` });
        const currentRef = await this.octokit.rest.git.getRef({ owner: this.owner, repo: this.repo, ref: `heads/${this.branch}` });

        const uSha = uRef.data.object.sha;
        const cSha = currentRef.data.object.sha;

        const uTree = await this.octokit.rest.git.getTree({ owner: uOwner, repo: uRepo, tree_sha: uSha, recursive: 'true' });
        const cTree = await this.octokit.rest.git.getTree({ owner: this.owner, repo: this.repo, tree_sha: cSha, recursive: 'true' });

        const isProtected = (p: string) => p.startsWith('notes/') || p.startsWith('images/') ||
            ['_home.md', '_sidebar.md', 'favicon.ico', 'CNAME', 'css/custom.css'].includes(p);

        const treeItems: any[] = uTree.data.tree
            .filter((item: any) => item.type === 'blob' && !isProtected(item.path!))
            .map((item: any) => ({ path: item.path!, mode: item.mode, type: item.type, sha: item.sha }));

        const uPaths = new Set(uTree.data.tree.map((i: any) => i.path));
        cTree.data.tree
            .filter((i: any) => i.type === 'blob' && !isProtected(i.path!) && !uPaths.has(i.path!))
            .forEach((i: any) => treeItems.push({ path: i.path!, mode: i.mode, type: i.type, sha: null }));

        if (treeItems.length === 0) return;

        const newTree = await this.octokit.rest.git.createTree({
            owner: this.owner, repo: this.repo, base_tree: cSha, tree: treeItems
        });

        const newCommit = await this.octokit.rest.git.createCommit({
            owner: this.owner,
            repo: this.repo,
            message: 'chore: force update core files (atomic)',
            tree: newTree.data.sha,
            parents: [cSha, uSha]
        });

        await this.octokit.rest.git.updateRef({
            owner: this.owner, repo: this.repo, ref: `heads/${this.branch}`, sha: newCommit.data.sha, force: true
        });
    }

    async getUpstreamInfo(): Promise<{ owner: string; repo: string; branch: string }> {
        const repoData = await this.getRepoDetails();
        return {
            owner: repoData.parent?.owner.login || 'wis-graph',
            repo: repoData.parent?.name || 'sharepage',
            branch: repoData.parent?.default_branch || 'main'
        };
    }

    isVersionOlder(current: string, latest: string): boolean {
        const c = current.replace(/^v/, '').split('.').map(Number);
        const l = latest.replace(/^v/, '').split('.').map(Number);
        for (let i = 0; i < 3; i++) {
            if ((l[i] || 0) > (c[i] || 0)) return true;
            if ((l[i] || 0) < (c[i] || 0)) return false;
        }
        return false;
    }

    async getTemplateVersion(owner: string, repo: string, branch: string): Promise<string> {
        try {
            const refRes = await this.octokit.rest.git.getRef({ owner, repo, ref: `heads/${branch}` });
            const res = await this.octokit.rest.repos.getContent({ owner, repo, path: 'package.json', ref: refRes.data.object.sha });
            const data = res.data as any;
            if (data.content) {
                const pkg = JSON.parse(Buffer.from(data.content, 'base64').toString('utf8'));
                return pkg.version || '0.0.0';
            }
            return '0.0.0';
        } catch { return '0.0.0'; }
    }

    async getChangelog(owner: string, repo: string, branch: string): Promise<string> {
        try {
            const refRes = await this.octokit.rest.git.getRef({ owner, repo, ref: `heads/${branch}` });
            const res = await this.octokit.rest.repos.getContent({ owner, repo, path: 'CHANGELOG.md', ref: refRes.data.object.sha });
            const data = res.data as any;
            return data.content ? Buffer.from(data.content, 'base64').toString('utf8') : '';
        } catch { return ''; }
    }
}
