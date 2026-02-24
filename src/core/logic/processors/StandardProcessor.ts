/**
 * Standard Document Processor
 * Ported from sharepage-template/scripts/processors/standard.js
 */
import { ProcessorUtils } from './ProcessorUtils';
import { CoreLogic } from '../CoreLogic';

export class StandardProcessor {
    static prepareMetadata(data: Record<string, string>, body: string, filename: string) {
        const title = data.title || filename.replace(/\.md$/, '').replace(/_/g, ' ');

        // Extract description
        let description = data.description || data.summary || '';
        if (!description) {
            description = ProcessorUtils.cleanMetadataText(body).substring(0, 150) + '...';
        } else {
            description = ProcessorUtils.cleanMetadataText(description);
        }

        // Extract OG Image
        let ogImage = data.thumbnail || data.url || '';
        if (ogImage.startsWith('[[') && ogImage.endsWith(']]')) {
            ogImage = ogImage.slice(2, -2);
        }

        // Body image fallback
        if (!ogImage) {
            const imageMatch = body.replace(/```[\s\S]*?```/g, '').match(/!\[\[([^\]]+)\]\]/) ||
                body.match(/!\[.*?\]\((.*?)\)/);
            if (imageMatch) ogImage = imageMatch[1];
        }

        // Normalize image filename (spaces to underscores)
        if (ogImage && !ogImage.startsWith('http')) {
            ogImage = `images/${CoreLogic.normalizeName(ogImage)}`;
        }

        return {
            title,
            description,
            ogImage,
            ogType: 'website'
        };
    }
}
