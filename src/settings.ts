export interface SharePageSettings {
    githubToken: string;
    repoOwner: string;
    repoName: string;
    branch: string;
    customCss: string;
}

export const DEFAULT_SETTINGS: SharePageSettings = {
    githubToken: '',
    repoOwner: '',
    repoName: '',
    branch: 'main',
    customCss: ''
};
