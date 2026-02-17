/**
 * Classification Engine for SharePage
 * Ported from sharepage-template/scripts/classifier.js
 */

export class Classifier {
    /**
     * @param metadata - Note frontmatter data
     * @returns - Dashboard section name (e.g., 'YouTube', 'Inbox')
     */
    static determineSection(metadata: Record<string, string>): string {
        if (!metadata) return 'Inbox';

        // Support both 'type' and 'source_type' fields flexibly
        const type = (metadata.type || metadata.source_type || '').toLowerCase().trim();

        // 🟢 Mapping Rules
        if (type === 'youtube') {
            return 'YouTube';
        }

        // Add more rules here as system grows

        // 🔴 Default fallback
        return 'Inbox';
    }
}
