import { SharePageSettings } from './settings';
import { ContentManager, GithubFile } from './core/github/content-manager';
import { TemplateUpdater } from './core/github/updater';
import { WorkflowService } from './core/github/workflow-service';

export type { GithubFile };

export class GitHubService {
    private content: ContentManager;
    private updater: TemplateUpdater;
    private workflow: WorkflowService;

    constructor(settings: SharePageSettings) {
        this.content = new ContentManager(settings);
        this.updater = new TemplateUpdater(settings);
        this.workflow = new WorkflowService(settings);
    }

    // --- Content Operations ---
    async getFileContent(path: string) { return this.content.getFileContent(path); }
    async uploadFile(path: string, content: ArrayBuffer, message: string) { return this.content.uploadFile(path, content, message); }
    async deleteFileByPath(path: string) { return this.content.deleteFileByPath(path); }
    async createBatchCommit(files: GithubFile[], message: string) { return this.content.createBatchCommit(files, message); }
    async getUploadedNotes() { return this.content.getUploadedNotes(); }

    // --- Upstream / Update Operations ---
    async getUpstreamStatus(settings?: any) { return this.updater.getUpstreamStatus(); }
    async mergeUpstream(settings?: any) { return this.updater.mergeUpstream(); }
    async forceUpdate(settings?: any) { return this.updater.forceUpdate(); }
    async getTemplateVersion(owner: string, repo: string, branch: string) { return this.updater.getTemplateVersion(owner, repo, branch); }
    async getChangelog(owner: string, repo: string, branch: string) { return this.updater.getChangelog(owner, repo, branch); }
    async getUpstreamInfo() { return this.updater.getUpstreamInfo(); }
    isVersionOlder(current: string, latest: string) { return this.updater.isVersionOlder(current, latest); }

    // --- Workflow / System Operations ---
    async getLatestWorkflowRun() { return this.workflow.getLatestWorkflowRun(); }
    async triggerDeployWorkflow() { return this.workflow.triggerDeployWorkflow(); }
    async triggerRebuild() { return this.workflow.triggerRebuild(); }
    async checkConnection(settings?: any) { return this.workflow.checkConnection(); }
    async getUserRepos() { return this.workflow.getUserRepos(); }
    async fixWorkflowDispatch() { return this.workflow.fixWorkflowDispatch(); }
}
