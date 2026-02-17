import { Octokit } from 'octokit';
import { SharePageSettings } from '../../settings';

export class GitHubClient {
    protected octokit: Octokit;
    protected settings: SharePageSettings;

    constructor(settings: SharePageSettings) {
        if (!settings.githubToken) {
            throw new Error('GitHub token is required');
        }
        this.settings = settings;
        this.octokit = new Octokit({ auth: settings.githubToken });
    }

    protected get owner() { return this.settings.repoOwner; }
    protected get repo() { return this.settings.repoName; }
    protected get branch() { return this.settings.branch; }

    /**
     * Helper for raw Octokit requests if needed
     */
    async request(route: string, options?: any) {
        return await this.octokit.request(route, {
            owner: this.owner,
            repo: this.repo,
            ...options
        });
    }

    async getRepoDetails() {
        const response = await this.octokit.rest.repos.get({
            owner: this.owner,
            repo: this.repo
        });
        return response.data;
    }
}
