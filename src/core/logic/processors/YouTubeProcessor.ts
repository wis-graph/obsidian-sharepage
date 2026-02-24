/**
 * YouTube Document Processor
 * Ported from sharepage-template/scripts/processors/youtube.js
 */
import { ProcessorUtils } from './ProcessorUtils';
import { CoreLogic } from '../CoreLogic';

export class YouTubeProcessor {
    static prepareMetadata(data: Record<string, string>, body: string, filename: string) {
        const baseTitle = data.title || filename.replace(/\.md$/, '').replace(/_/g, ' ');
        const title = `📺 ${baseTitle}`;

        // Extract description
        let description = data.description || data.summary || '';
        if (!description) {
            description = ProcessorUtils.cleanMetadataText(body).substring(0, 150) + '...';
        } else {
            description = ProcessorUtils.cleanMetadataText(description);
        }

        // YouTube ID extraction
        let ytId = ProcessorUtils.extractYouTubeId(data.thumbnail || data.url || '');
        if (!ytId) {
            ytId = ProcessorUtils.extractYouTubeId(body);
        }

        let ogImage: string;
        if (ytId) {
            ogImage = `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`;
        } else if (data.thumbnail) {
            ogImage = data.thumbnail.startsWith('http') 
                ? data.thumbnail 
                : `images/${CoreLogic.normalizeName(data.thumbnail)}`;
        } else {
            ogImage = '';
        }

        return {
            title,
            description,
            ogImage,
            ogType: 'video.other'
        };
    }
}
