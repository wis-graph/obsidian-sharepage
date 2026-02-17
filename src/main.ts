import { Plugin, TFile, Notice } from 'obsidian';
import { SharePageSettings, DEFAULT_SETTINGS } from './settings';
import { SharePageSettingTab } from './settings-tab';
import { GitHubService } from './github-service';
import { NotePublisher } from './core/note-publisher';

export default class SharePagePlugin extends Plugin {
    settings: SharePageSettings;

    async onload() {
        console.log('Loading SharePage plugin');

        await this.loadSettings();

        this.addRibbonIcon('github', 'SharePage', () => {
            new Notice('SharePage: Right-click a note or use the command to share');
        });

        this.addCommand({
            id: 'share-note',
            name: 'Share current note to GitHub',
            callback: () => {
                this.shareCurrentNote();
            }
        });

        this.addCommand({
            id: 'update-note',
            name: 'Update current note on GitHub',
            callback: () => {
                this.shareCurrentNote(); // Same logic, just explicit name
            }
        });

        this.addCommand({
            id: 'delete-note',
            name: 'Delete current note from GitHub',
            callback: () => {
                this.deleteCurrentNote();
            }
        });

        this.registerEvent(
            this.app.workspace.on('file-menu', (menu: any, file: any) => {
                if (file instanceof TFile && file.extension === 'md') {
                    menu.addItem((item: any) => {
                        item
                            .setTitle('Share to GitHub')
                            .setIcon('github')
                            .onClick(() => {
                                this.shareNote(file);
                            });
                    });

                    menu.addItem((item: any) => {
                        item
                            .setTitle('Delete from GitHub')
                            .setIcon('trash')
                            .onClick(() => {
                                this.deleteNote(file);
                            });
                    });
                }
            })
        );

        this.addSettingTab(new SharePageSettingTab(this.app, this));
    }

    onunload() {
        console.log('Unloading SharePage plugin');
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

        // Load token from .env if it exists
        try {
            const envPath = `${this.manifest.dir}/.env`;
            if (await this.app.vault.adapter.exists(envPath)) {
                const envContent = await this.app.vault.adapter.read(envPath);
                const match = envContent.match(/GITHUB_TOKEN=(.*)/);
                if (match && match[1]) {
                    this.settings.githubToken = match[1].trim();
                }
            }
        } catch (e) {
            console.error('Failed to load .env file:', e);
        }
    }

    async saveSettings() {
        // Save everything EXCEPT the token to data.json
        const settingsToSave = { ...this.settings };
        delete (settingsToSave as any).githubToken;
        await this.saveData(settingsToSave);

        // Save the token to .env
        try {
            const envPath = `${this.manifest.dir}/.env`;
            const envContent = `GITHUB_TOKEN=${this.settings.githubToken || ''}\n`;
            await this.app.vault.adapter.write(envPath, envContent);
        } catch (e) {
            console.error('Failed to save .env file:', e);
        }
    }

    async shareCurrentNote() {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
            new Notice('No active note found');
            return;
        }

        await this.shareNote(activeFile);
    }

    async deleteCurrentNote() {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
            new Notice('No active note found');
            return;
        }

        await this.deleteNote(activeFile);
    }

    async deleteNote(file: TFile) {
        const publisher = new NotePublisher(this.app, this.settings);
        await publisher.delete(file);
    }

    async shareNote(file: TFile) {
        const publisher = new NotePublisher(this.app, this.settings);
        await publisher.publish(file);
    }
}
