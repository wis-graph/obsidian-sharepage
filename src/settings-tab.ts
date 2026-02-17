import { PluginSettingTab, App, Setting, Notice } from 'obsidian';
import SharePagePlugin from './main';
import { GitHubService } from './github-service';
import { DeleteContentModal } from './delete-content-modal';
import { DeploymentMonitor } from './core/deployment-monitor';

export class SharePageSettingTab extends PluginSettingTab {
    plugin: SharePagePlugin;

    constructor(app: App, plugin: SharePagePlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: 'SharePage Settings' });

        this.renderUpdateSection(containerEl);
        containerEl.createEl('hr');

        this.renderContentManagementSection(containerEl);
        containerEl.createEl('hr');

        this.renderDeploymentSection(containerEl);
        containerEl.createEl('hr');

        this.renderGitHubConfigSection(containerEl);
        containerEl.createEl('hr');

        this.renderCustomStyleSection(containerEl);
        containerEl.createEl('hr');

        this.renderUserGuideSection(containerEl);
    }

    /**
     * 1. Template Sync Section
     */
    private renderUpdateSection(containerEl: HTMLElement) {
        containerEl.createEl('h3', { text: '🔄 Template Sync (Updater)' });

        const versionInfo = containerEl.createDiv({ cls: 'sharepage-version-info' });
        versionInfo.style.marginBottom = '10px';
        versionInfo.style.fontSize = '0.9em';
        versionInfo.style.color = 'var(--text-muted)';
        versionInfo.setText('Current Template Version: Loading...');

        const syncSetting = new Setting(containerEl)
            .setName('Check for Template Updates')
            .setDesc('Keep your GitHub repository up to date with the official SharePage template')
            .addButton((button) =>
                button
                    .setButtonText('Check for Updates')
                    .onClick(() => this.handleVersionCheck(button, versionInfo, syncSetting))
            );

        // Initial Check
        this.handleVersionCheck(null, versionInfo, null, true);
    }

    private async handleVersionCheck(button: any, versionInfo: HTMLElement, syncSetting: Setting | null, silent = false) {
        if (!this.plugin.settings.githubToken || !this.plugin.settings.repoOwner) {
            if (!silent) new Notice('Please configure GitHub settings first');
            return;
        }

        try {
            if (button) {
                button.setDisabled(true);
                button.setButtonText('Checking...');
            }

            const service = new GitHubService(this.plugin.settings);
            const [status, upstream] = await Promise.all([
                service.getUpstreamStatus(),
                service.getUpstreamInfo()
            ]);

            const currentVer = await service.getTemplateVersion(this.plugin.settings.repoOwner, this.plugin.settings.repoName, this.plugin.settings.branch);
            const latestVer = await service.getTemplateVersion(upstream.owner, upstream.repo, upstream.branch);

            const hasNewVersion = service.isVersionOlder(currentVer, latestVer);
            versionInfo.setText(`Current: v${currentVer} | Latest: v${latestVer}`);

            if (syncSetting) {
                this.renderUpdateActions(syncSetting, service, status, hasNewVersion, upstream, currentVer, latestVer);
            }

        } catch (e: any) {
            if (!silent) new Notice('Failed to check updates: ' + e.message);
        } finally {
            if (button) {
                button.setDisabled(false);
                button.setButtonText('Check for Updates');
            }
        }
    }

    private async renderUpdateActions(syncSetting: Setting, service: GitHubService, status: any, hasNewVersion: boolean, upstream: any, currentVer: string, latestVer: string) {
        syncSetting.controlEl.empty();

        if (!hasNewVersion && status.behind_by === 0) {
            syncSetting.addExtraButton(btn => btn.setIcon('check').setTooltip('Up to date'));
            return;
        }

        // Update available or behind upstream
        const changelog = await service.getChangelog(upstream.owner, upstream.repo, upstream.branch);
        if (changelog) {
            const { containerEl } = this;
            const logContainer = containerEl.createDiv({ cls: 'sharepage-changelog' });
            logContainer.style.maxHeight = '200px';
            logContainer.style.overflowY = 'auto';
            logContainer.style.padding = '10px';
            logContainer.style.fontSize = '0.85em';
            logContainer.style.backgroundColor = 'var(--background-secondary)';
            logContainer.style.borderRadius = '4px';
            logContainer.style.marginTop = '10px';
            logContainer.innerHTML = changelog;
        }

        syncSetting.addButton((btn) => btn
            .setButtonText('Update Now (Sync)')
            .setCta()
            .onClick(async () => {
                btn.setDisabled(true);
                btn.setButtonText('Updating...');
                await service.mergeUpstream();
                new Notice('Successfully synced! Verifying deployment...');
                new DeploymentMonitor(service, this.plugin.settings).monitor();
                this.display();
            })
        );

        syncSetting.addButton((btn) => btn
            .setButtonText('Force Update')
            .setWarning()
            .onClick(async () => {
                if (!confirm('Warning: Force update will overwrite core files. Your notes/images are safe. Proceed?')) return;
                btn.setDisabled(true);
                btn.setButtonText('Force Updating...');
                await service.forceUpdate();
                new Notice('Force update completed!');
                new DeploymentMonitor(service, this.plugin.settings).monitor();
                this.display();
            })
        );
    }

    /**
     * 2. Content Management Section
     */
    private renderContentManagementSection(containerEl: HTMLElement) {
        containerEl.createEl('h3', { text: '📂 Content Management' });

        new Setting(containerEl)
            .setName('Manage Uploaded Content')
            .setDesc('View and delete files already uploaded to GitHub')
            .addButton((button) =>
                button
                    .setButtonText('Open Manager')
                    .onClick(() => {
                        new DeleteContentModal(this.app, this.plugin).open();
                    })
            );
    }

    /**
     * 3. Deployment Status Section
     */
    private renderDeploymentSection(containerEl: HTMLElement) {
        containerEl.createEl('h3', { text: '🚀 Deployment Status' });

        const statusSetting = new Setting(containerEl)
            .setName('Latest Build Status')
            .setDesc('Checking GitHub Actions...')
            .addButton((button) =>
                button
                    .setButtonText('Refresh Status')
                    .onClick(() => this.display())
            );

        this.refreshDeploymentStatus(statusSetting);

        // Auto-refresh every 15 seconds while the setting tab is open
        const refreshInterval = window.setInterval(() => {
            if (!statusSetting.settingEl.parentElement) {
                window.clearInterval(refreshInterval);
                return;
            }
            this.refreshDeploymentStatus(statusSetting);
        }, 15000);
    }

    private async refreshDeploymentStatus(setting: Setting) {
        if (!this.plugin.settings.githubToken || !this.plugin.settings.repoOwner) {
            setting.setDesc('GitHub not configured.');
            return;
        }

        try {
            const service = new GitHubService(this.plugin.settings);
            const lastRun = await service.getLatestWorkflowRun();

            if (!lastRun) {
                setting.setDesc('No deployment history found.');
                return;
            }

            const isCompleted = lastRun.status === 'completed';
            const statusText = isCompleted
                ? (lastRun.conclusion === 'success' ? '🟢 Success (Deployed)' : `🔴 Failed (${lastRun.conclusion})`)
                : `🟡 ${lastRun.status}...`;

            setting.setDesc(`Last build: ${statusText} (${new Date(lastRun.updated_at).toLocaleString()})`);

            // Always show 'View Logs' if run exists
            setting.addButton((btn) => btn
                .setButtonText('View Logs')
                .setTooltip('Open GitHub Actions page')
                .onClick(() => window.open(lastRun.html_url))
            );

            if (lastRun.conclusion === 'failure') {
                this.renderRetryAction(setting, service);
            }
        } catch (e: any) {
            setting.setDesc('Error fetching status: ' + e.message);
        }
    }

    private renderRetryAction(setting: Setting, service: GitHubService) {
        setting.addButton((btn) => btn
            .setButtonText('Retry Deploy')
            .setCta()
            .onClick(async () => {
                await this.handleWorkflowRetry(btn, service);
            })
        );
    }

    private async handleWorkflowRetry(btn: any, service: GitHubService) {
        try {
            btn.setDisabled(true);
            await service.triggerDeployWorkflow();
            new Notice('Deployment triggered!');
            setTimeout(() => this.display(), 2000);
        } catch (e: any) {
            if (e.message.includes('workflow_dispatch') && confirm('Workflow trigger is missing. Fix it now?')) {
                btn.setButtonText('Fixing...');
                await service.fixWorkflowDispatch();
                new Notice('Workflow updated! Retrying in 3 seconds...');
                setTimeout(() => btn.click(), 3000);
            } else {
                new Notice('Failed to trigger: ' + e.message);
                btn.setDisabled(false);
            }
        }
    }

    /**
     * 4. GitHub Configuration Section
     */
    private renderGitHubConfigSection(containerEl: HTMLElement) {
        containerEl.createEl('h3', { text: '⚙️ GitHub Configuration' });

        this.renderTokenSetting(containerEl);
        this.renderSoundSetting(containerEl);
        this.renderRepoQuickSelect(containerEl);
        this.renderRepoBasicSettings(containerEl);
        this.renderConnectionTest(containerEl);
    }

    private renderTokenSetting(containerEl: HTMLElement) {
        new Setting(containerEl)
            .setName('GitHub Token')
            .setDesc('Personal Access Token with repo and workflow permissions')
            .addText((text) =>
                text
                    .setPlaceholder('ghp_...')
                    .setValue(this.plugin.settings.githubToken)
                    .onChange(async (value) => {
                        this.plugin.settings.githubToken = value.trim();
                        await this.plugin.saveSettings();
                    })
            )
            .addButton((button) =>
                button
                    .setButtonText('Generate Token')
                    .setTooltip('Open GitHub to create a token')
                    .onClick(() => window.open('https://github.com/settings/tokens/new?scopes=repo,workflow&description=Obsidian%20SharePage'))
            );
    }

    private renderSoundSetting(containerEl: HTMLElement) {
        new Setting(containerEl)
            .setName('Notification Sound')
            .setDesc('Play a sound when deployment is completed successfully')
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.enableSound)
                    .onChange(async (value) => {
                        this.plugin.settings.enableSound = value;
                        await this.plugin.saveSettings();
                    })
            );
    }

    private renderRepoQuickSelect(containerEl: HTMLElement) {
        const repoLoadingSetting = new Setting(containerEl)
            .setName('Quick Repository Select')
            .setDesc('Load your repositories automatically')
            .addButton((button) =>
                button
                    .setButtonText('Load Repositories')
                    .onClick(async () => {
                        if (!this.plugin.settings.githubToken) return new Notice('Token required');
                        try {
                            const service = new GitHubService(this.plugin.settings);
                            const repos = await service.getUserRepos();
                            repoLoadingSetting.controlEl.empty();
                            repoLoadingSetting.addDropdown((dropdown) => {
                                dropdown.addOption('', 'Select a repository...');
                                repos.forEach((repo: string) => dropdown.addOption(repo, repo));
                                dropdown.onChange(async (value) => {
                                    if (!value) return;
                                    const [owner, name] = value.split('/');
                                    this.plugin.settings.repoOwner = owner;
                                    this.plugin.settings.repoName = name;
                                    await this.plugin.saveSettings();
                                    this.display();
                                });
                            });
                        } catch (e: any) {
                            new Notice('Load failed: ' + e.message);
                        }
                    })
            );
    }

    private renderRepoBasicSettings(containerEl: HTMLElement) {
        new Setting(containerEl)
            .setName('Repository Owner')
            .setDesc('Automatically set via Quick Select')
            .addText(text => text
                .setValue(this.plugin.settings.repoOwner)
                .setDisabled(true) // Prevent manual typos
            );

        new Setting(containerEl)
            .setName('Repository Name')
            .setDesc('Automatically set via Quick Select')
            .addText(text => text
                .setValue(this.plugin.settings.repoName)
                .setDisabled(true) // Prevent manual typos
            );

        new Setting(containerEl)
            .setName('Branch')
            .setDesc('Default: main')
            .addText(text => text
                .setPlaceholder('main')
                .setValue(this.plugin.settings.branch)
                .onChange(async v => {
                    this.plugin.settings.branch = v || 'main';
                    await this.plugin.saveSettings();
                })
            );
    }

    private renderConnectionTest(containerEl: HTMLElement) {
        new Setting(containerEl)
            .setName('Test Connection')
            .addButton(button => button.setButtonText('Test').onClick(async () => {
                try {
                    const service = new GitHubService(this.plugin.settings);
                    await service.checkConnection();
                    new Notice('Connection successful!');
                } catch (e: any) {
                    new Notice('Connection failed: ' + e.message);
                }
            }));
    }

    /**
     * 5. Custom Style Section
     */
    private renderCustomStyleSection(containerEl: HTMLElement) {
        containerEl.createEl('h3', { text: '🎨 Custom Style' });

        const cssSetting = new Setting(containerEl)
            .setName('Custom CSS')
            .setDesc('Standard CSS syntax. Supports --color-accent-primary.')
            .addTextArea((text) =>
                text
                    .setPlaceholder('/* Write your CSS here */')
                    .setValue(this.plugin.settings.customCss)
                    .onChange(async (value) => {
                        this.plugin.settings.customCss = value;
                        await this.plugin.saveSettings();
                    })
            );

        cssSetting.controlEl.querySelector('textarea')?.style.setProperty('width', '100%');
        cssSetting.controlEl.querySelector('textarea')?.style.setProperty('height', '150px');

        new Setting(containerEl)
            .setName('Sync Custom Style')
            .addButton((button) =>
                button
                    .setButtonText('Save & Sync Style')
                    .setCta()
                    .onClick(async () => this.handleStyleSync(button))
            );

        // Add Collapsible Guide
        const guideContainer = containerEl.createDiv({ cls: 'sharepage-style-guide-container' });
        guideContainer.style.marginTop = '15px';

        const details = guideContainer.createEl('details');
        details.style.backgroundColor = 'var(--background-secondary)';
        details.style.padding = '10px';
        details.style.borderRadius = '6px';
        details.style.border = '1px solid var(--border-color)';
        details.style.fontSize = '0.9em';

        const summary = details.createEl('summary');
        summary.setText('💡 Quick Style Guide (요약 가이드)');
        summary.style.fontWeight = 'bold';
        summary.style.cursor = 'pointer';
        summary.style.color = 'var(--text-accent)';

        details.createEl('div', {
            text: '나만의 사이트 디자인을 위한 핵심 변수 요약입니다. 자세한 내용은 포크한 레포지토리의 가이드 문서를 참고하세요.',
            cls: 'setting-item-description'
        }).style.margin = '10px 0';

        const pre = details.createEl('pre');
        pre.style.fontSize = '0.85em';
        pre.style.backgroundColor = 'var(--background-primary)';
        pre.style.padding = '10px';
        pre.style.borderRadius = '4px';
        pre.style.overflowX = 'auto';
        pre.innerHTML = `<code>/* 예시: 핵심 변수 변경 */
:root {
  --color-accent-primary: #ff5722; /* 포인트 색상 */
  --text-body-1: 17px;           /* 본문 크기 */
  --text-heading-1: 32px;        /* 제목 크기 */
}

/* 다크모드 전용 설정 */
body.theme-dark {
  --color-surface-base: #121212;
}</code>`;

        const linksDiv = details.createDiv();
        linksDiv.style.marginTop = '10px';
        linksDiv.style.display = 'flex';
        linksDiv.style.flexWrap = 'wrap';
        linksDiv.style.gap = '15px';
        linksDiv.innerHTML = `
            <a href="https://github.com/wis-graph/obsidian-sharepage/blob/main/CUSTOM_STYLE_GUIDE_KR.md" target="_blank">📄 Full Guide (KR)</a>
            <a href="https://github.com/wis-graph/obsidian-sharepage/blob/main/CUSTOM_STYLE_GUIDE.md" target="_blank">📄 Full Guide (EN)</a>
            <a href="https://github.com/wis-graph/sharepage/tree/main/css" target="_blank">🎨 View CSS Source (GitHub)</a>
        `;
    }

    private async handleStyleSync(button: any) {
        if (!this.plugin.settings.githubToken || !this.plugin.settings.repoOwner) {
            return new Notice('Configure GitHub first');
        }

        try {
            button.setDisabled(true).setButtonText('Syncing...');
            const service = new GitHubService(this.plugin.settings);
            const encoder = new TextEncoder();
            const buffer = encoder.encode(this.plugin.settings.customCss).buffer;
            await service.uploadFile('css/custom.css', buffer, 'Update custom styles via Obsidian');
            new Notice('🎨 Custom styles uploaded!');
        } catch (e: any) {
            new Notice('Sync failed: ' + e.message);
        } finally {
            button.setDisabled(false).setButtonText('Save & Sync Style');
        }
    }

    /**
     * 6. User Guide Section
     */
    private renderUserGuideSection(containerEl: HTMLElement) {
        containerEl.createEl('h3', { text: '📖 User Guide' });

        const guideContainer = containerEl.createEl('div', { cls: 'sharepage-guide-container' });
        guideContainer.style.backgroundColor = 'var(--background-secondary)';
        guideContainer.style.padding = '20px';
        guideContainer.style.borderRadius = '8px';
        guideContainer.style.fontSize = '0.92em';
        guideContainer.style.lineHeight = '1.6';
        guideContainer.style.border = '1px solid var(--border-color)';

        guideContainer.innerHTML = `
			<div style="margin-bottom: 20px;">
				<h4 style="margin-top: 0; color: var(--text-accent);">1단계: GitHub 레포지토리 준비 (Repo Setup)</h4>
				<ol>
					<li>GitHub에서 <a href="https://github.com/wis-graph/sharepage" target="_blank">SharePage 템플릿</a> 저장소로 이동하여 <b>Fork</b> 버튼을 눌러 본인의 계정으로 복사합니다.</li>
					<li>본인의 레포지토리에서 <b>Settings > Pages</b> 탭으로 이동합니다.</li>
					<li><b>Build and deployment > Branch</b> 항목에서 <code>main</code> 브랜치와 <code>/(root)</code> 폴더를 선택하고 <b>Save</b> 버튼을 누릅니다.</li>
					<li>상단 <b>Actions</b> 탭으로 이동하여 <span style="color: var(--text-success); font-weight: bold;">"I understand my workflows, go ahead and enable them"</span> 버튼을 클릭하여 활성화합니다.</li>
				</ol>
			</div>

			<div style="margin-bottom: 20px;">
				<h4 style="color: var(--text-accent);">2단계: 플러그인 연결 (Plugin Connection)</h4>
				<ol>
					<li>위의 <b>GitHub Token</b> 섹션에서 'Generate Token'을 클릭하여 <code>repo</code>와 <code>workflow</code> 권한이 체크된 토큰을 생성 후 붙여넣습니다.</li>
					<li><b>Quick Repository Select</b> 섹션에서 'Load Repositories'를 눌러 포크한 레포지토리를 선택합니다.</li>
					<li><b>Test Connection</b> 버튼을 눌러 "Connection successful!" 메시지가 뜨는지 확인합니다.</li>
				</ol>
			</div>

			<div style="margin-bottom: 20px;">
				<h4 style="color: var(--text-accent);">3단계: 노트 게시 및 관리 (Publishing)</h4>
				<ul>
					<li><b>게시:</b> 공유하고 싶은 노트에서 명령 팔레트(<code>Cmd/Ctrl + P</code>)를 열고 <code>SharePage: Share current note</code>를 실행합니다.</li>
					<li><b>삭제:</b> 게시된 노트를 GitHub에서 제거하려면 <code>SharePage: Unshare current note</code>를 실행하거나 'Content Management' 모달을 이용하세요.</li>
					<li><b>스타일:</b> 'Custom Style' 섹션에 CSS를 작성하고 Sync 하면 나만의 디자인을 적용할 수 있습니다.</li>
				</ul>
			</div>

			<div style="margin-bottom: 20px;">
				<h4 style="color: var(--text-accent);">📡 배포 상태 모니터링 (Deployment Status)</h4>
				<p style="margin-bottom: 5px;">GitHub에 변경 결사항이 전달되면 자동으로 사이트 재빌드(GitHub Actions)가 시작됩니다.</p>
				<ul>
					<li><b>언제 작동하나요?</b> 노트 업로드/삭제, 템플릿 업데이트(Sync), 커스텀 스타일 적용 시 즉시 시작됩니다.</li>
					<li><b>확인 방법:</b> 설정 상단의 'Deployment Status'에서 실시간 상태를 볼 수 있습니다.</li>
					<li><b>소요 시간:</b> 약 30초 ~ 1분 정도 소요되며, 완료되어야 웹사이트에 실제 내용이 반영됩니다.</li>
				</ul>
			</div>

			<div style="border-top: 1px solid var(--border-color); padding-top: 15px; margin-top: 15px;">
				<h4 style="color: var(--text-warning);">💡 자주 묻는 질문 (FAQ)</h4>
				<ul style="list-style-type: none; padding-left: 0;">
					<li><b>Q. 공유했는데 페이지가 안 떠요.</b><br>
						A. GitHub 서버에서 사이트를 만드는 중일 수 있습니다. 'Deployment Status'가 🟢 Success가 될 때까지 기다려 주세요.</li>
					<li style="margin-top: 10px;"><b>Q. 템플릿 업데이트는 어떻게 하나요?</b><br>
						A. 'Template Sync' 섹션에서 'Check for Updates'를 누르세요. 새로운 기능이 있다면 버튼 하나로 간단히 동기화할 수 있습니다.</li>
				</ul>
			</div>
		`;
    }
}
