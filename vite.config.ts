import { defineConfig } from "vite";
import { builtinModules } from "module";

export default defineConfig({
	plugins: [],
	build: {
		outDir: ".",
		emptyOutDir: false,
		lib: {
			entry: "src/main.ts",
			formats: ["cjs"],
			fileName: "main"
		},
		rollupOptions: {
			external: [
				"obsidian",
				"electron",
				"@codemirror/autocomplete",
				"@codemirror/collab",
				"@codemirror/commands",
				"@codemirror/language",
				"@codemirror/lint",
				"@codemirror/search",
				"@codemirror/state",
				"@codemirror/view",
				"@lezer/common",
				"@lezer/highlight",
				"@lezer/lr",
				...builtinModules
			]
		},
		minify: false,
		sourcemap: true
	}
});