const fs = require("fs");
const path = require("path");
const { Extractor, ExtractorConfig } = require("@microsoft/api-extractor");

const projectRoot = path.join(__dirname, "..");

const publishedPackages = ["skygear-web", "skygear-node"];
const packages = ["skygear-core", ...publishedPackages];

const coreDtsPath = path.join(projectRoot, `packages/skygear-core/index.d.ts`);

// Generate index.d.ts
for (const p of packages) {
  const entrypoint = path.join(projectRoot, `packages/${p}/src/index.d.ts`);
  const configObject = ExtractorConfig.loadFile(
    path.join(projectRoot, "api-extractor.json")
  );
  configObject.mainEntryPointFilePath = entrypoint;
  configObject.projectFolder = path.join(projectRoot, `packages/${p}`);
  configObject.dtsRollup.enabled = true;
  configObject.dtsRollup.untrimmedFilePath = path.join(
    projectRoot,
    `packages/${p}/index.d.ts`
  );
  configObject.docModel.apiJsonFilePath = path.join(
    projectRoot,
    `temp/${p}.api.json`
  );

  const extractorConfig = ExtractorConfig.prepare({
    configObject,
    packageJsonFullPath: path.join(projectRoot, `packages/${p}/package.json`),
  });

  const extractorResult = Extractor.invoke(extractorConfig, {
    localBuild: true,
    showVerboseMessages: true,
  });

  if (!extractorResult.succeeded) {
    console.error(
      `API Extractor completed with ${extractorResult.errorCount} errors` +
        ` and ${extractorResult.warningCount} warnings`
    );
    process.exit(1);
  }
}

// Concatenate index.d.ts
for (const p of publishedPackages) {
  const dtsPath = path.join(projectRoot, `packages/${p}/index.d.ts`);
  const lines = fs
    .readFileSync(dtsPath, { encoding: "utf8" })
    .split("\n")
    // Remove lines that reference @skygear/core
    // because we are going to inline its index.d.ts
    .filter(line => !/@skygear\/core/.test(line));
  const content =
    fs.readFileSync(coreDtsPath, { encoding: "utf8" }) + lines.join("\n");
  fs.writeFileSync(dtsPath, content);
}
fs.unlinkSync(coreDtsPath);

// Generate api.json
for (const p of publishedPackages) {
  const entrypoint = path.join(projectRoot, `packages/${p}/index.d.ts`);
  const configObject = ExtractorConfig.loadFile(
    path.join(projectRoot, "api-extractor.json")
  );
  configObject.mainEntryPointFilePath = entrypoint;
  configObject.projectFolder = path.join(projectRoot, `packages/${p}`);
  configObject.docModel.enabled = true;
  configObject.docModel.apiJsonFilePath = path.join(
    projectRoot,
    `temp/${p}.api.json`
  );

  const extractorConfig = ExtractorConfig.prepare({
    configObject,
    packageJsonFullPath: path.join(projectRoot, `packages/${p}/package.json`),
  });

  const extractorResult = Extractor.invoke(extractorConfig, {
    localBuild: true,
    showVerboseMessages: true,
  });

  if (!extractorResult.succeeded) {
    console.error(
      `API Extractor completed with ${extractorResult.errorCount} errors` +
        ` and ${extractorResult.warningCount} warnings`
    );
    process.exit(1);
  }
}
