import fs from "fs";
import path from "path";
import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
import { execSync } from "child_process";
import path from "path";


const traverse = traverseModule.default;

const SRC_DIR = "../src"; // Adjust to your actual source directory

/**
 * Recursively collect all JS/TS files
 */
function getFiles(dir, files = []) {
  if (!fs.existsSync(dir)) {
    console.warn(`Directory not found: ${dir}`);
    return files;
  }

  for (const file of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, file);

    if (fs.statSync(fullPath).isDirectory()) {
      getFiles(fullPath, files);
    } else if (/\.(js|jsx|ts|tsx)$/.test(file)) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Detect large files/components
 */
function detectLargeComponents(files, threshold = 300) {
  return files
    .map((file) => {
      const loc = fs.readFileSync(file, "utf8").split("\n").length;

      return {
        name: path.basename(file),
        file,
        loc,
      };
    })
    .filter((component) => component.loc > threshold);
}

/**
 * Detect duplicate code using jscpd
 */
function detectDuplicates(srcDir) {
  try {
    execSync(`npx jscpd ${srcDir} --reporters json`, {
      stdio: "inherit",
    });

    const reportPath = path.join(
      process.cwd(),
      "report",
      "jscpd-report.json"
    );

    if (!fs.existsSync(reportPath)) {
      return { error: "JSCPD report not found." };
    }

    const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));

    return report.statistics?.total || {};
  } catch (err) {
    console.error("JSCPD Error:", err.message);
    return { error: err.message };
  }
}

/**
 * Detect files that are never imported
 */
function detectUnusedComponents(files) {
  const importedFiles = new Set();

  files.forEach((file) => {
    try {
      const code = fs.readFileSync(file, "utf8");

      const ast = parse(code, {
        sourceType: "module",
        plugins: [
          "jsx",
          "typescript",
          "classProperties",
          "decorators-legacy",
          "dynamicImport",
        ],
      });

      traverse(ast, {
        ImportDeclaration({ node }) {
          importedFiles.add(path.basename(node.source.value));
        },
      });
    } catch (err) {
      console.warn(`Skipping ${file}: ${err.message}`);
    }
  });

  return files.filter((file) => {
    return !importedFiles.has(path.basename(file));
  });
}

/**
 * Detect bundle performance
 */
function detectPerformance() {
  try {
    const stats = execSync("npx webpack --json", {
      encoding: "utf8",
    });

    const parsed = JSON.parse(stats);

    return {
      bundleSize:
        parsed.assets?.reduce((sum, asset) => sum + asset.size, 0) || 0,

      largestAsset:
        parsed.assets?.sort((a, b) => b.size - a.size)[0] || null,
    };
  } catch (err) {
    console.warn("Webpack stats unavailable.");
    return {
      error: "Webpack stats unavailable",
    };
  }
}

/**
 * Main analysis function
 */
export async function analyzeCodebase(srcDir = SRC_DIR) {
  const files = getFiles(srcDir);

  return {
    totalFiles: files.length,
    largeComponents: detectLargeComponents(files),
    duplicates: detectDuplicates(srcDir),
    unusedComponents: detectUnusedComponents(files),
    performance: detectPerformance(),
  };
}

(async () => {
  try {
    const results = await analyzeCodebase("../src");

    // Ensure backend folder exists
    const reportDir = path.join(process.cwd(), "backend");
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const reportPath = path.join(reportDir, "report.json");
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

    console.log("📊 Technical Debt Report saved to", reportPath);

    if (results.largeComponents.length > 0 || results.duplicates > 0) {
      console.error("❌ Technical debt issues detected!");
      process.exit(1);
    }
  } catch (err) {
    console.error("Analyzer failed:", err);
    process.exit(1);
  }
})();
