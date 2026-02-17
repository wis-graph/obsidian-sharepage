import { App, Modal, Notice, Setting, ButtonComponent } from 'obsidian';
import { GitHubService } from './github-service';
import SharePagePlugin from './main';
import { DeploymentMonitor } from './core/deployment-monitor';
import { CoreLogic } from './core/logic/CoreLogic';

export class DeleteContentModal extends Modal {
    private plugin: SharePagePlugin;
    private files: { name: string; path: string; sha: string }[] = [];
    private selectedShas: Set<string> = new Set();
    private isLoading = true;
    private listEl: HTMLElement;
    private deleteButton: ButtonComponent;
    private searchQuery = '';

    constructor(app: App, plugin: SharePagePlugin) {
        super(app);
        this.plugin = plugin;
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: 'Manage Uploaded Content' });

        this.renderLoading();
        await this.loadFiles();
    }

    private renderLoading() {
        const { contentEl } = this;
        const loadingContainer = contentEl.createDiv({ cls: 'sharepage-loading-container' });
        loadingContainer.createEl('p', { text: 'Fetching file list from GitHub...' });
        loadingContainer.style.textAlign = 'center';
        loadingContainer.style.padding = '20px';
    }

    private async loadFiles() {
        try {
            const service = new GitHubService(this.plugin.settings);
            this.files = await service.getUploadedNotes();
            this.isLoading = false;
            this.renderFileList();
        } catch (error) {
            new Notice('Failed to load files: ' + error.message);
            this.close();
        }
    }

    private renderFileList() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: 'Manage Uploaded Content' });

        if (this.files.length === 0) {
            contentEl.createEl('p', { text: 'No uploaded notes found in the "notes/" directory.' });
            return;
        }

        contentEl.createEl('p', {
            text: 'Select documents you want to delete from your GitHub repository. This will NOT delete your local Obsidian files.',
            cls: 'setting-item-description'
        });

        // Search Bar
        const searchContainer = contentEl.createDiv({ cls: 'sharepage-search-container' });
        searchContainer.style.marginBottom = '15px';
        const searchInput = searchContainer.createEl('input', {
            type: 'text',
            placeholder: 'Search files...',
            value: this.searchQuery
        });
        searchInput.style.width = '100%';
        searchInput.style.padding = '8px';
        searchInput.style.borderRadius = '4px';
        searchInput.style.border = '1px solid var(--border-color)';
        searchInput.oninput = (e) => {
            this.searchQuery = (e.target as HTMLInputElement).value.toLowerCase();
            this.renderFilteredList();
        };

        this.listEl = contentEl.createDiv({ cls: 'sharepage-file-list' });
        this.listEl.style.maxHeight = '400px';
        this.listEl.style.overflowY = 'auto';
        this.listEl.style.border = '1px solid var(--border-color)';
        this.listEl.style.borderRadius = '4px';
        this.listEl.style.padding = '10px';
        this.listEl.style.marginBottom = '20px';

        this.renderFilteredList();

        const actionContainer = contentEl.createDiv({ cls: 'sharepage-modal-actions' });
        actionContainer.style.display = 'flex';
        actionContainer.style.justifyContent = 'flex-end';
        actionContainer.style.gap = '10px';

        const deleteBtn = new ButtonComponent(actionContainer)
            .setButtonText('Delete Selected')
            .setWarning()
            .setDisabled(true)
            .onClick(() => this.confirmDeletion());

        this.deleteButton = deleteBtn;
        this.updateDeleteButtonState();

        new ButtonComponent(actionContainer)
            .setButtonText('Cancel')
            .onClick(() => this.close());
    }

    private renderFilteredList() {
        if (!this.listEl) return;
        this.listEl.empty();

        const filteredFiles = this.files.filter(file => {
            if (file.name === '_dashboard.md') return false;
            if (!this.searchQuery) return true;

            const displayName = file.name.replace(/\.md$/, '').toLowerCase();
            return displayName.includes(this.searchQuery);
        });

        if (filteredFiles.length === 0) {
            const emptyMsg = this.listEl.createEl('p', { text: 'No matching files found.' });
            emptyMsg.style.textAlign = 'center';
            emptyMsg.style.color = 'var(--text-muted)';
            return;
        }

        filteredFiles.forEach(file => {
            const item = this.listEl.createDiv({ cls: 'sharepage-file-item' });
            item.style.display = 'flex';
            item.style.alignItems = 'center';
            item.style.padding = '8px 0';
            item.style.borderBottom = '1px solid var(--background-modifier-border)';

            const checkbox = item.createEl('input', { type: 'checkbox' });
            checkbox.style.marginRight = '10px';
            checkbox.checked = this.selectedShas.has(file.sha);
            checkbox.onclick = () => {
                if (checkbox.checked) {
                    this.selectedShas.add(file.sha);
                } else {
                    this.selectedShas.delete(file.sha);
                }
                this.updateDeleteButtonState();
            };

            const displayName = file.name.replace(/\.md$/, '');
            const nameSpan = item.createEl('span', { text: displayName });
            nameSpan.style.flexGrow = '1';
        });
    }

    private updateDeleteButtonState() {
        if (this.deleteButton) {
            this.deleteButton.setDisabled(this.selectedShas.size === 0);
            if (this.selectedShas.size > 0) {
                this.deleteButton.setButtonText(`Delete Selected (${this.selectedShas.size})`);
            } else {
                this.deleteButton.setButtonText('Delete Selected');
            }
        }
    }

    private confirmDeletion() {
        const count = this.selectedShas.size;
        if (confirm(`Are you sure you want to delete ${count} file(s) from GitHub? This action cannot be undone.`)) {
            this.executeDeletion();
        }
    }

    private async executeDeletion() {
        this.contentEl.empty();
        this.contentEl.createEl('h2', { text: 'Deleting Files...' });
        const statusEl = this.contentEl.createDiv();
        const progressEl = statusEl.createEl('p', { text: `Connecting to GitHub...` });

        try {
            const service = new GitHubService(this.plugin.settings);
            const startTime = new Date();
            const batchFiles: any[] = [];

            // 1. Fetch latest Dashboard
            progressEl.setText('📥 Fetching latest dashboard...');
            const dashboardFile = await service.getFileContent('notes/_dashboard.md');
            let updatedDashboard = dashboardFile ? dashboardFile.content : '';

            const total = this.selectedShas.size;
            let processed = 0;

            for (const sha of this.selectedShas) {
                const file = this.files.find(f => f.sha === sha);
                if (file) {
                    processed++;
                    progressEl.setText(`Preparing deletion ${processed}/${total}: ${file.name}...`);

                    // A. Queue .md for deletion
                    batchFiles.push({
                        path: file.path,
                        content: null,
                        isDeleted: true
                    });

                    // B. Queue .html for deletion (Immediate sync)
                    const normalizedBase = CoreLogic.normalizeName(file.name.replace(/\.md$/, ''));
                    batchFiles.push({
                        path: `posts/${normalizedBase}.html`,
                        content: null,
                        isDeleted: true
                    });

                    // C. Update Dashboard String
                    if (updatedDashboard) {
                        updatedDashboard = CoreLogic.updateDashboardContent(
                            updatedDashboard,
                            file.name,
                            '',
                            false // isNew = false for removal
                        );
                    }
                }
            }

            // 2. Add updated dashboard to batch
            if (updatedDashboard && updatedDashboard !== dashboardFile?.content) {
                batchFiles.push({
                    path: 'notes/_dashboard.md',
                    content: updatedDashboard
                });
            }

            progressEl.setText(`Committing changes to GitHub (Total ${batchFiles.length} operations)...`);
            await service.createBatchCommit(batchFiles, `chore: delete ${total} notes and cleanup dashboard`);

            // Success screen logic
            this.renderSuccessScreen(service, startTime);

        } catch (error) {
            new Notice('Deletion failed: ' + error.message);
            this.renderFileList();
        }
    }

    private renderSuccessScreen(service: GitHubService, startTime: Date) {
        this.contentEl.empty();
        this.contentEl.createEl('h2', { text: 'Deletion Request Complete' });

        const deployStatusEl = this.contentEl.createDiv({ cls: 'sharepage-deploy-status' });
        deployStatusEl.style.padding = '20px';
        deployStatusEl.style.textAlign = 'center';
        deployStatusEl.style.backgroundColor = 'var(--background-secondary)';
        deployStatusEl.style.borderRadius = '8px';
        deployStatusEl.style.margin = '20px 0';

        const successMsg = deployStatusEl.createDiv({
            text: '📡 Request Sent Successfully'
        });
        successMsg.style.fontSize = '1.2em';
        successMsg.style.fontWeight = 'bold';
        successMsg.style.marginBottom = '10px';

        deployStatusEl.createEl('p', {
            text: 'Your files have been deleted and the dashboard has been updated on GitHub. GitHub Actions will now rebuild your site (~30s - 1min).'
        });

        new Setting(this.contentEl)
            .setName('Background Monitoring')
            .setDesc('Site rebuild will be monitored in the background. A notification will appear when it is live.')
            .addButton(btn => btn
                .setButtonText('Got it!')
                .setCta()
                .onClick(() => {
                    new DeploymentMonitor(service, this.plugin.settings).monitor();
                    this.close();
                }));
    }

    onClose() {
        this.contentEl.empty();
    }
}
