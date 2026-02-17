# SharePage Custom Styling Guide (custom.css)

SharePage provides a `css/custom.css` file where users can define their own styles. This guide explains how to change your site's design using the CSS editor in the Obsidian plugin.

---

## 🎨 How it Works

1.  **Priority**: `custom.css` is loaded at the very end of all style sheets. Therefore, you can easily override system defaults using standard CSS syntax.
2.  **Variables**: Colors, sizes, and spacings used throughout the system are defined as CSS variables (`--variable-name`). Changing these values will update the entire site's look and feel.

---

## 1. Changing the Color Theme (Color DNA)

To change the overall color theme, use the `:root` and `body.theme-dark` sections.

```css
/* Light Mode Theme */
:root {
  --color-accent-primary: #ff5722; /* Change accent color to orange */
  --color-accent-hover: #e64a19;
  --color-surface-base: #ffffff;
  --color-text-primary: #1a1a1a;
}

/* Dark Mode Theme */
body.theme-dark {
  --color-accent-primary: #ff7043;
  --color-surface-base: #121212;
  --color-text-primary: #f0f0f0;
}
```

---

## 2. Typography

Improve readability by adjusting font sizes or line heights.

```css
:root {
  --text-body-1: 17px;         /* Increase default body text size */
  --line-height-relaxed: 1.7;  /* Make line height more relaxed */
  --text-heading-2: 28px;      /* Change H2 heading size */
}

/* Apply specific fonts to content area */
.markdown-content {
  font-family: 'Inter', sans-serif;
  letter-spacing: -0.01em;
}
```

---

## 3. Layout & Spacing

Adjust the maximum width of documents or sidebar areas.

```css
/* Adjust content width */
.document-container {
  max-width: 900px; /* Make content area slightly wider */
  padding: 40px;
}

/* Modify Navbar styles */
.navbar {
  border-bottom: 2px solid var(--color-accent-primary);
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
}
```

---

## 4. Customizing Components (Cards & Tags)

Enhance document cards or tags to match your style.

```css
/* Add smooth shadows to cards in dashboard */
.dashboard-card {
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s ease;
}

.dashboard-card:hover {
  transform: translateY(-5px);
}

/* Change tag styles */
.tag-badge {
  background-color: var(--color-surface-muted);
  color: var(--color-accent-primary);
  border: 1px solid var(--color-accent-primary);
}
```

---

## 🚀 Pro Tip: Use Browser DevTools
1. Press `F12` on your live site to open Developer Tools.
2. Select an element (`Ctrl+Shift+C`).
3. Check the variable names used in the `Styles` tab.
4. Copy the variable name to `custom.css`, change the value, and save/push to see it live!
