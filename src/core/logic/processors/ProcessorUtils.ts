/**
 * Common Metadata Utilities
 * Ported from sharepage-template/scripts/processors/utils.js
 */
export const ProcessorUtils = {
    cleanMetadataText: (text: string): string => {
        if (!text) return '';
        return text
            // 1. Handle Obsidian links: [[Page Name|Alias]] -> Alias, [[Page Name]] -> Page Name
            .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
            .replace(/\[\[([^\]]+)\]\]/g, '$1')
            // 2. Formatting cleanup
            .replace(/(\*\*|__|~~|`)(.*?)\1/g, '$2')
            .replace(/(\*|_)(.*?)\1/g, '$2')
            .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
            .replace(/[#*`_~\[\]]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    },

    extractYouTubeId: (text: string): string | null => {
        const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
        const match = text.match(youtubeRegex);
        return match ? match[1] : null;
    }
};
