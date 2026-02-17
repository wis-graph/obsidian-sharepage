import { Notice } from 'obsidian';
import { GitHubService } from '../github-service';

export class DeploymentMonitor {
    private service: GitHubService;

    constructor(service: GitHubService) {
        this.service = service;
    }

    async monitor(shareUrl?: string) {

        const startTime = new Date();
        let hasStarted = false;
        let attempts = 0;
        const maxAttempts = 20; // 5 minutes (when polling every ~15s on avg)

        console.log('[DeploymentMonitor] Monitoring started at:', startTime.toISOString());

        const poll = async () => {
            attempts++;
            if (attempts > maxAttempts) {
                console.log('[DeploymentMonitor] Timed out');
                new Notice('⚠️ Deployment requires check.', 3000);
                return;
            }

            try {
                const lastRun = await this.service.getLatestWorkflowRun();
                if (!lastRun) {
                    setTimeout(poll, 5000);
                    return;
                }

                const runTime = new Date(lastRun.created_at);
                const status = lastRun.status;
                const conclusion = lastRun.conclusion;

                if (runTime >= startTime || status === 'in_progress' || status === 'queued') {
                    if (!hasStarted && (status === 'in_progress' || status === 'queued')) {
                        hasStarted = true;
                        new Notice('🟡 Deployment in progress...', 3000);
                    }

                    if (status === 'completed') {
                        if (conclusion === 'success') {
                            this.handleSuccess(shareUrl);
                            return;
                        } else if (conclusion === 'failure') {
                            new Notice('🔴 Deployment failed. Check GitHub Actions.', 5000);
                            return;
                        }
                    }
                }

                setTimeout(poll, 5000);
            } catch (e) {
                console.error('[DeploymentMonitor] Polling error:', e);
                setTimeout(poll, 10000);
            }
        };

        // Initial delay - GitHub Actions usually starts in 5-10s
        setTimeout(poll, 10000);
    }


    private handleSuccess(shareUrl?: string) {
        this.playSuccessSound();
        if (shareUrl) {
            new Notice('🟢 Website is now live! URL copied to clipboard.', 6000);
            navigator.clipboard.writeText(shareUrl);
        } else {
            new Notice('🟢 Website updated successfully!', 6000);
        }
    }

    public playSuccessSound() {
        try {
            const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
            const context = new AudioContext();

            const playTone = (freq: number, startTime: number, duration: number) => {
                const osc = context.createOscillator();
                const gain = context.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, startTime);

                gain.gain.setValueAtTime(0, startTime);
                gain.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

                osc.connect(gain);
                gain.connect(context.destination);

                osc.start(startTime);
                osc.stop(startTime + duration);
            };

            // Play a pleasant double chime
            playTone(880, context.currentTime, 0.5); // A5
            playTone(1318.51, context.currentTime + 0.1, 0.6); // E6

        } catch (e) {
            console.error('[DeploymentMonitor] Failed to play sound:', e);
        }
    }
}
