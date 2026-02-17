/**
 * Core Logic for SharePage
 * Ported from sharepage-template/scripts/core-logic.js
 */

export class CoreLogic {
    /**
     * Normalizes filenames for consistent encoding (NFC)
     */
    static normalizeName(name: string): string {
        return name.normalize('NFC').replace(/\s+/g, '_');
    }

    /**
     * Basic Frontmatter Parser
     */
    static parseFrontmatter(content: string): { data: Record<string, string>, body: string } {
        const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---/;
        const match = content.match(frontmatterRegex);
        const data: Record<string, string> = {};
        let body = content;

        if (match) {
            body = content.replace(frontmatterRegex, '').trim();
            const yaml = match[1];
            yaml.split('\n').forEach(line => {
                const parts = line.split(':');
                if (parts.length >= 2) {
                    const key = parts[0].trim();
                    const value = parts.slice(1).join(':').trim().replace(/^['"](.*)['"]$/, '$1');
                    data[key] = value;
                }
            });
        }

        return { data, body };
    }

    /**
     * Clean text for metadata (remove markdown links, bold, etc.)
     */
    static cleanMetadataText(text: string): string {
        if (!text) return '';
        return text
            .replace(/\[\[([^\]]+)\]\]/g, '$1') // [[Link]] -> Link
            .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // [Text](Url) -> Text
            .replace(/[#*`~_]/g, '') // Remove formatting characters
            .replace(/\n/g, ' ') // Replace newlines with space
            .trim();
    }

    /**
     * Inject metatags and title into template
     */
    static applyMetadataToTemplate(template: string, metadata: any, domain: string): string {
        const { title, description, pageUrl, ogImage, ogType } = metadata;

        const replacements: Record<string, string> = {
            '{{TITLE}}': title || 'SharePage',
            '{{DESCRIPTION}}': (this.cleanMetadataText(description) || '').replace(/"/g, '&quot;'),
            '{{PAGE_URL}}': pageUrl || domain,
            '{{OG_IMAGE}}': ogImage || (domain + '/images/logo.png'),
            '{{OG_TYPE}}': ogType || 'website',
            '{{DOMAIN}}': domain
        };

        // Ensure absolute URL for local images
        if (replacements['{{OG_IMAGE}}'] && !replacements['{{OG_IMAGE}}'].startsWith('http')) {
            let imgPath = replacements['{{OG_IMAGE}}'];
            if (imgPath.startsWith('/')) imgPath = imgPath.substring(1);
            replacements['{{OG_IMAGE}}'] = `${domain}/${imgPath}`;
        }

        let html = template;
        for (const [placeholder, value] of Object.entries(replacements)) {
            html = html.split(placeholder).join(value);
        }

        return html;
    }

    /**
     * Update Dashboard Content (Add/Remove links)
     */
    static updateDashboardContent(
        dashboardContent: string,
        noteName: string,
        dateStr: string,
        isNew: boolean = true,
        targetSection: string = 'Inbox'
    ): string {
        let currentLines = dashboardContent.split('\n');
        const cleanNoteName = this.normalizeName(noteName.replace(/\.md$/, ''));

        // 1. Find if and where the link exists (Supports both - and * bullets)
        const linkRegex = new RegExp(`^\\s*[-*]\\s*\\[\\[${this.escapeRegExp(cleanNoteName)}(\\|[^\\]]*)?\\]\\]`);
        let existingLineIdx = -1;
        let currentSection = '';

        for (let i = 0; i < currentLines.length; i++) {
            const line = currentLines[i].trim();
            if (line.startsWith('## ')) {
                currentSection = line.substring(3).trim();
            }
            if (linkRegex.test(line)) {
                existingLineIdx = i;
                break;
            }
        }

        const isCorrectSection = currentSection === targetSection;

        // 2. Logic: Move if in wrong section, or Add if new
        if (isNew) {
            if (existingLineIdx !== -1 && !isCorrectSection) {
                // MOVEMENT: Remove from wrong section
                currentLines.splice(existingLineIdx, 1);
                // Recursive call after removal to re-add in correct section
                return this.updateDashboardContent(currentLines.join('\n'), noteName, dateStr, true, targetSection);
            } else if (existingLineIdx === -1) {
                // NEW: Add to target section
                const newLinkLine = `- [[${cleanNoteName}]] ${dateStr}`;
                const sectionHeader = `## ${targetSection}`;
                let sectionIdx = currentLines.findIndex(line => line.trim() === sectionHeader);

                // Fallback to Inbox if target section not found
                if (sectionIdx === -1 && targetSection !== 'Inbox') {
                    sectionIdx = currentLines.findIndex(line => line.trim() === '## Inbox');
                }

                if (sectionIdx !== -1) {
                    currentLines.splice(sectionIdx + 1, 0, newLinkLine);
                } else {
                    currentLines.push('', `## ${targetSection}`, newLinkLine);
                }
            }
        } else {
            // REMOVAL
            if (existingLineIdx !== -1) {
                currentLines.splice(existingLineIdx, 1);
            }
        }

        return currentLines.join('\n');
    }

    private static escapeRegExp(string: string): string {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}
