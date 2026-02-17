import { GitHubClient } from './github-client';

export class WorkflowService extends GitHubClient {
  async getLatestWorkflowRun(): Promise<any> {
    try {
      const response = await this.octokit.rest.actions.listWorkflowRunsForRepo({
        owner: this.owner,
        repo: this.repo,
        per_page: 5
      });

      const runs = response.data.workflow_runs;
      const isRelevant = (run: any) => {
        const name = run.name.toLowerCase();
        return name.includes('pages build and deployment') ||
          name.includes('pages-build-deployment') ||
          name.includes('pre-render') ||
          run.path?.includes('deploy.yml');
      };

      const relevantRuns = runs.filter(isRelevant);
      if (relevantRuns.length === 0) return runs[0] || null;

      const latest = relevantRuns[0];

      // Tie-breaker: If there's a 'Pages' run within 60s of the absolute latest run,
      // prefer it as it's the final link in the chain.
      const simultaneousPages = relevantRuns.find((run: any) => {
        const timeDiff = Math.abs(new Date(latest.created_at).getTime() - new Date(run.created_at).getTime());
        return timeDiff < 60000 && run.name.toLowerCase().includes('pages');
      });

      return simultaneousPages || latest;
    } catch { return null; }
  }

  async triggerDeployWorkflow(): Promise<void> {
    await this.octokit.rest.actions.createWorkflowDispatch({
      owner: this.owner,
      repo: this.repo,
      workflow_id: 'deploy.yml',
      ref: this.branch
    });
  }

  async checkConnection(): Promise<void> {
    await this.octokit.rest.repos.get({
      owner: this.owner,
      repo: this.repo
    });
  }

  async getUserRepos(): Promise<string[]> {
    const response = await this.octokit.rest.repos.listForAuthenticatedUser({
      per_page: 100,
      sort: 'updated'
    });
    return response.data.map((repo: any) => repo.full_name);
  }

  async fixWorkflowDispatch(): Promise<void> {
    const content = `name: Auto Pre-render for OG Support

on:
  push:
    branches:
      - main
    paths:
      - 'notes/**/*.md'
      - 'src/index.html'
      - 'scripts/**/*.js'
      - 'js/**/*.js'
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Run Sync Script
        run: |
          npm run build:css
          node scripts/sync.js

      - name: Commit and Push changes
        run: |
          git config --global user.name "github-actions[bot]"
          git config --global user.email "github-actions[bot]@users.noreply.github.com"
          git add index.html 404.html posts/*.html posts/file_index.json css/bundle.css js/**/*.js
          if git diff --staged --quiet; then
            echo "No changes to commit"
          else
            git commit -m "chore: auto-generate static assets for OG support [skip ci]"
            git push origin main
          fi
`;
    await this.octokit.rest.repos.createOrUpdateFileContents({
      owner: this.owner,
      repo: this.repo,
      path: '.github/workflows/deploy.yml',
      message: 'chore: add workflow_dispatch trigger',
      content: Buffer.from(content).toString('base64'),
      branch: this.branch
    });
  }
}
