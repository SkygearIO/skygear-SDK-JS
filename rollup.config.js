import { readFileSync, writeFile } from "fs";
import { promisify } from "util";
import babel from "rollup-plugin-babel";
import commonjs from "rollup-plugin-commonjs";
import json from "rollup-plugin-json";
import resolve from "rollup-plugin-node-resolve";
import replace from "rollup-plugin-replace";

const ClosureCompiler = require("google-closure-compiler").compiler;
const tmp = require("tmp");
const getBuiltins = require("builtins");

const extensions = [".mjs", ".js", ".jsx", ".ts", ".tsx"];

const writeFileAsync = promisify(writeFile);

function compile(flags) {
  return new Promise((resolve, reject) => {
    const compiler = new ClosureCompiler(flags);
    compiler.run((exitCode, stdout, stderr) => {
      if (exitCode === 0) {
        resolve(stdout);
      } else {
        reject(new Error(stderr));
      }
    });
  });
}

function closure(flags) {
  return {
    name: "plugin-google-closure-compiler",
    async renderChunk(code) {
      const inputFile = tmp.fileSync();
      const tempPath = inputFile.name;
      flags = Object.assign({}, flags, { js: tempPath });
      await writeFileAsync(tempPath, code, "utf8");
      const compiledCode = await compile(flags);
      inputFile.removeCallback();
      return { code: compiledCode };
    },
  };
}

const closurePlugin = closure({
  compilation_level: "SIMPLE",
  language_in: "ECMASCRIPT5_STRICT",
  language_out: "ECMASCRIPT5_STRICT",
  env: "CUSTOM",
  warning_level: "VERBOSE",
  apply_input_source_maps: false,
  use_types_for_optimization: false,
  process_common_js_modules: false,
  rewrite_polyfills: false,
  inject_libraries: false,
  jscomp_off: "undefinedVars",
});

const plugins = [
  replace({
    values: {
      "process.env.SKYGEAR_VERSION": JSON.stringify(
        process.env.SKYGEAR_VERSION || "VERSION"
      ),
    },
  }),
  resolve({
    extensions,
  }),
  commonjs({
    include: ["node_modules/**", "packages/**/node_modules/**"],
  }),
  babel({
    extensions,
    exclude: ["node_modules/**", "packages/**/node_modules/**"],
    runtimeHelpers: true,
  }),
  json({
    preferConst: true,
    indent: "  ",
  }),
];

// This function is the external function of rollup configuration.
// The effect is to tell rollup to treat @babel/* depdendencies as external.
// The main purpose to is debug bundle content.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function makeBabelExternal(id) {
  return /^@babel/.test(id);
}

function makeNodeExternal() {
  const nodePackageJSONString = readFileSync(
    "packages/skygear-node-client/package.json",
    { encoding: "utf8" }
  );
  const nodePackageJSON = JSON.parse(nodePackageJSONString);

  const peerDeps = Object.keys(nodePackageJSON["peerDependencies"] || {});
  if (peerDeps.length > 0) {
    throw new Error(
      "@skygear/node-client should not have any peerDependencies"
    );
  }

  const deps = Object.keys(nodePackageJSON["dependencies"] || {});
  const builtins = getBuiltins();

  function external(id) {
    return deps.indexOf(id) >= 0 || builtins.indexOf(id) >= 0;
  }

  return external;
}

function makeReactNativeExternal() {
  const reactNativePackageJSONString = readFileSync(
    "packages/skygear-react-native/package.json",
    { encoding: "utf8" }
  );
  const reactNativePackageJSON = JSON.parse(reactNativePackageJSONString);

  const deps = Object.keys(reactNativePackageJSON["dependencies"] || {});
  if (deps.length > 0) {
    throw new Error("@skygear/react-native should not have any depdendencies");
  }

  const peerDeps = Object.keys(
    reactNativePackageJSON["peerDependencies"] || []
  );

  function external(id) {
    return peerDeps.indexOf(id) >= 0;
  }

  return external;
}

export default function makeConfig(commandLineArgs) {
  const configBundleType = commandLineArgs.configBundleType;
  switch (configBundleType) {
    case "web-script":
      return {
        plugins: plugins.concat([closurePlugin]),
        input: "packages/skygear-web/src/index.iife.ts",
        output: {
          file: "packages/skygear-web/dist/skygear-web.iife.js",
          format: "iife",
          name: "skygear",
          exports: "default",
        },
      };
    case "web-cjs":
      return {
        plugins,
        input: "packages/skygear-web/src/index.ts",
        output: {
          file: "packages/skygear-web/dist/skygear-web.cjs.js",
          format: "cjs",
          exports: "named",
        },
        // external: makeBabelExternal,
      };
    case "web-module":
      return {
        plugins,
        input: "packages/skygear-web/src/index.ts",
        output: {
          file: "packages/skygear-web/dist/skygear-web.module.js",
          format: "esm",
        },
        // external: makeBabelExternal,
      };
    case "node-client":
      return {
        plugins,
        input: "packages/skygear-node-client/src/index.ts",
        output: {
          file: "packages/skygear-node-client/dist/skygear-node-client.js",
          format: "cjs",
          exports: "named",
        },
        external: makeNodeExternal(),
      };
    case "react-native":
      return {
        plugins,
        input: "packages/skygear-react-native/src/index.ts",
        output: {
          file: "packages/skygear-react-native/dist/skygear-react-native.js",
          format: "cjs",
          exports: "named",
        },
        external: makeReactNativeExternal(),
      };
    default:
      throw new Error("unknown bundle type: " + configBundleType);
  }
}
