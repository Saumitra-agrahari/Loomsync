import fs from "fs";
import path from "path";

/**
 * Scanner for hard-coded English text in JSX elements.
 * Checks for common hard-coded labels/phrases that should be using `t(...)`.
 */
const targetDirs = ["app", "components"];

function getTsxFiles(dir: string): string[] {
  let files: string[] = [];
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) {
      if (entry !== "api" && entry !== "node_modules" && entry !== ".next") {
        files.push(...getTsxFiles(full));
      }
    } else if (entry.endsWith(".tsx")) {
      files.push(full);
    }
  }
  return files;
}

export function scanForHardcodedText() {
  const allFiles = targetDirs.flatMap(getTsxFiles);
  const suspiciousRegexes = [
    />\s*(Order Board|New Order|Delay Warnings|Sign In|Sign Out|Save|Cancel|Confirm|Dismiss|Offline Mode)\s*</i,
    />\s*(Buyer|Style|Ex-Factory Date|Current Stage|Total Qty|Planned|Target End)\s*</i,
    />\s*(Supervisor Portal|Daily Floor Update|Quantity Made Today|Floor Photo)\s*</i,
  ];

  const findings: Array<{ file: string; line: number; match: string }> = [];

  for (const file of allFiles) {
    const content = fs.readFileSync(file, "utf8");
    const lines = content.split("\n");

    lines.forEach((line, index) => {
      // Ignore comments and script tags
      if (line.includes("//") || line.includes("/*") || line.includes("<script")) return;

      for (const rx of suspiciousRegexes) {
        const m = line.match(rx);
        if (m) {
          findings.push({
            file,
            line: index + 1,
            match: m[1],
          });
        }
      }
    });
  }

  return findings;
}

if (require.main === module) {
  const findings = scanForHardcodedText();
  if (findings.length === 0) {
    console.log("✓ No hard-coded UI strings detected across app/ and components/!");
    process.exit(0);
  } else {
    console.warn(`Found ${findings.length} potential hard-coded UI strings:`);
    findings.forEach((f) => console.warn(`  ${f.file}:${f.line} -> "${f.match}"`));
  }
}
