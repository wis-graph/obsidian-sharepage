import { readFileSync, writeFileSync } from "fs";

const targetVersion = process.env.npm_package_version;

const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const { minAppVersion } = manifest;

if (minAppVersion !== targetVersion) {
	manifest.minAppVersion = targetVersion;
	writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t"));
}