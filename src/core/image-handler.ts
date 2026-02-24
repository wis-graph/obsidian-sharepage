import { App, TFile } from 'obsidian';
import { GitHubService, GithubFile } from '../github-service';
import { CoreLogic } from './logic/CoreLogic';

export class ImageHandler {
    private app: App;
    private service: GitHubService;

    constructor(app: App, service: GitHubService) {
        this.app = app;
        this.service = service;
    }

    async collectImagesForUpload(content: string, sourcePath: string): Promise<GithubFile[]> {
        const imageLinks = this.extractImageLinks(content);
        const images: GithubFile[] = [];

        for (const imageName of imageLinks) {
            const file = this.findImageFile(imageName, sourcePath);
            if (!file) continue;

            const buffer = await this.app.vault.readBinary(file);
            const normalizedPath = `images/${CoreLogic.normalizeName(file.name)}`;

            images.push({
                path: normalizedPath,
                content: buffer,
                isBinary: true
            });
        }
        return images;
    }

    async syncImagesWithGitHub(content: string, sourcePath: string): Promise<void> {
        const imageLinks = this.extractImageLinks(content);
        if (imageLinks.length === 0) return;

        console.log(`[ImageHandler] Syncing ${imageLinks.length} images...`);

        for (const imageName of imageLinks) {
            await this.uploadSingleImage(imageName, sourcePath);
        }
    }

    private findImageFile(imageName: string, sourcePath: string): TFile | null {
        const extensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', ''];

        for (const ext of extensions) {
            const linkPath = ext ? imageName + ext : imageName;
            const file = this.app.metadataCache.getFirstLinkpathDest(linkPath, sourcePath);
            if (file) return file;
        }

        console.warn(`[ImageHandler] Image not found: ${imageName}`);
        return null;
    }

    private async uploadSingleImage(imageName: string, sourcePath: string): Promise<void> {
        try {
            const file = this.findImageFile(imageName, sourcePath);
            if (!file) return;

            const buffer = await this.app.vault.readBinary(file);
            const targetPath = `images/${file.name}`;

            await this.service.uploadFile(targetPath, buffer, `Upload image: ${file.name}`);
            console.log(`[ImageHandler] Synced: ${targetPath}`);
        } catch (error: any) {
            console.error(`[ImageHandler] Sync failed for ${imageName}:`, error);
        }
    }

    private extractImageLinks(content: string): string[] {
        const imageRegex = /!\[\[(.*?)\]\]/g;
        const links: string[] = [];
        let match;
        while ((match = imageRegex.exec(content)) !== null) {
            const imageName = match[1].split('|')[0];
            links.push(imageName);
        }
        return links;
    }
}
