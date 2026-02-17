import { App, TFile, Notice } from 'obsidian';
import { SharePageSettings } from '../settings';
import { GitHubService } from '../github-service';
import { ImageHandler } from './image-handler';
import { DeploymentMonitor } from './deployment-monitor';
import { CoreLogic } from './logic/CoreLogic';
import { Classifier } from './logic/Classifier';
import { StandardProcessor } from './logic/processors/StandardProcessor';
import { YouTubeProcessor } from './logic/processors/YouTubeProcessor';

export class NotePublisher {
    private app: App;
    private settings: SharePageSettings;
    private service: GitHubService;

    constructor(app: App, settings: SharePageSettings) {
        this.app = app;
        this.settings = settings;
        this.service = new GitHubService(settings);
    }

    async share(file: TFile): Promise<void> {
        if (!this.isValidConfiguration()) return;

        try {
            new Notice('📡 Preparing to share...', 2000);

            const content = await this.app.vault.read(file);
            const metadata = this.getNoteMetadata(file);

            // 1. Fetch
            new Notice('📥 Fetching system files...', 2000);
            const { template, dashboard } = await this.fetchRequiredFiles();

            // 2. Render & Update Logic
            new Notice('🧠 Processing content...', 2000);
            const html = this.renderNoteHtml(content, template, metadata);
            const updatedDashboard = this.updateDashboard(content, dashboard, `${metadata.webFriendlyName}.md`);

            // 3. Prepare Batch
            const batch = await this.prepareUploadBatch(content, html, updatedDashboard, metadata);

            // 4. Atomic Upload
            new Notice(`📤 Sharing ${batch.length} files...`, 3000);
            await this.service.createBatchCommit(batch, `Share: ${file.name} (Hybrid Render)`);

            // 5. Cleanup & Follow-up
            await this.updateLocalFrontmatter(file, metadata.shareUrl);
            this.finalizeShare(metadata.shareUrl);
        } catch (error: any) {
            this.handleShareError(error);
        }
    }

    private async fetchRequiredFiles() {
        const [templateFile, dashboardFile] = await Promise.all([
            this.service.getFileContent('src/index.html'),
            this.service.getFileContent('notes/_dashboard.md')
        ]);

        if (!templateFile) throw new Error('src/index.html not found on GitHub.');

        return {
            template: templateFile.content,
            dashboard: dashboardFile?.content || '## Inbox\n'
        };
    }

    private renderNoteHtml(content: string, template: string, metadata: any): string {
        const { data, body } = CoreLogic.parseFrontmatter(content);
        const docType = (data.type || data.source_type || 'standard').toLowerCase();
        const mdFilename = `${metadata.webFriendlyName}.md`;

        const processor = docType === 'youtube' ? YouTubeProcessor : StandardProcessor;
        const processResult = processor.prepareMetadata(data, body, mdFilename);

        return CoreLogic.applyMetadataToTemplate(template, {
            ...processResult,
            pageUrl: metadata.shareUrl
        }, metadata.domain);
    }

    private updateDashboard(content: string, dashboardText: string, mdFilename: string): string {
        const { data } = CoreLogic.parseFrontmatter(content);
        const section = Classifier.determineSection(data);
        const today = new Date().toISOString().split('T')[0];

        return CoreLogic.updateDashboardContent(dashboardText, mdFilename, today, true, section);
    }

    private async prepareUploadBatch(content: string, html: string, dashboard: string, metadata: any) {
        const batch: any[] = [
            { path: metadata.targetPath, content },
            { path: `posts/${metadata.webFriendlyName}.html`, content: html },
            { path: 'notes/_dashboard.md', content: dashboard }
        ];

        const imageHandler = new ImageHandler(this.app, this.service);
        const images = await imageHandler.collectImagesForUpload(content);
        batch.push(...images);

        return batch;
    }

    private finalizeShare(shareUrl: string) {
        new Notice(`📤 Content uploaded! Site rebuilding...`, 5000);
        // We still copy the URL for convenience, as it's the target destination
        navigator.clipboard.writeText(shareUrl);
        new DeploymentMonitor(this.service).monitor(shareUrl);
    }

    private handleShareError(error: any) {
        console.error('[NotePublisher] Share failed:', error);
        new Notice(`Error: ${error.message}`);
    }

    // --- Legacy Bridge / Domain Renaming ---
    async publish(file: TFile): Promise<void> {
        return this.share(file);
    }

    async unshare(file: TFile): Promise<void> {
        if (!this.isValidConfiguration()) return;

        try {
            const { webFriendlyName, targetPath } = this.getNoteMetadata(file);
            new Notice(`📡 Preparing to unshare: ${file.name}...`, 2000);

            // 1. Fetch Dashboard
            const dashboardFile = await this.service.getFileContent('notes/_dashboard.md');
            const dashboardContent = dashboardFile?.content || '';

            // 2. Prepare Batch
            const batch: any[] = [
                { path: targetPath, isDeleted: true }, // Delete MD
                { path: `posts/${webFriendlyName}.html`, isDeleted: true } // Delete HTML
            ];

            // 3. Update Dashboard Logic
            if (dashboardContent) {
                const updatedDashboard = CoreLogic.updateDashboardContent(
                    dashboardContent,
                    `${webFriendlyName}.md`,
                    '',
                    false // isNew = false for removal
                );

                if (updatedDashboard !== dashboardContent) {
                    batch.push({
                        path: 'notes/_dashboard.md',
                        content: updatedDashboard
                    });
                }
            }

            // 4. Atomic Commit
            new Notice(`📤 Deleting files and updating dashboard...`, 3000);
            await this.service.createBatchCommit(batch, `Unshare: ${file.name}`);

            this.finalizeUnshare(file);
        } catch (error: any) {
            this.handleShareError(error);
        }
    }

    private finalizeUnshare(file: TFile) {
        new Notice('Note deleted! Deployment refresh starting.', 6000);
        new DeploymentMonitor(this.service).monitor();

        this.app.fileManager.processFrontMatter(file, (front) => {
            delete front['sharepage_updated'];
            delete front['sharepage_url'];
        });
    }

    async delete(file: TFile): Promise<void> {
        return this.unshare(file);
    }

    private isValidConfiguration(): boolean {
        if (!this.settings.githubToken) {
            new Notice('Please configure GitHub token in settings');
            return false;
        }
        if (!this.settings.repoOwner || !this.settings.repoName) {
            new Notice('Please configure GitHub repository in settings');
            return false;
        }
        return true;
    }

    private getNoteMetadata(file: TFile) {
        const noteName = file.name.replace('.md', '');
        const normalizedBase = CoreLogic.normalizeName(noteName);

        // Both MD and HTML should use the normalized name (with underscores)
        const targetPath = `notes/${normalizedBase}.md`;

        const owner = this.settings.repoOwner.toLowerCase();
        const repo = this.settings.repoName.toLowerCase();

        const domain = repo === `${owner}.github.io`
            ? `https://${owner}.github.io`
            : `https://${owner}.github.io/${repo}`;

        const shareUrl = `${domain}/posts/${normalizedBase}`;

        return { webFriendlyName: normalizedBase, targetPath, shareUrl, domain };
    }

    private async updateLocalFrontmatter(file: TFile, shareUrl: string) {
        await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
            frontmatter['sharepage_updated'] = new Date().toLocaleString();
            frontmatter['sharepage_url'] = shareUrl;
        });
    }
}
