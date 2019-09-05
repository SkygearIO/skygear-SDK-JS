const promisify = require("util").promisify;
const fs = require("fs");

const ClosureCompiler = require("google-closure-compiler").compiler;
const tmp = require("tmp");

import babel from "rollup-plugin-babel";
import commonjs from "rollup-plugin-commonjs";
import json from "rollup-plugin-json";
import resolve from "rollup-plugin-node-resolve";
import replace from "rollup-plugin-replace";

const extensions = [".mjs", ".js", ".jsx", ".ts", ".tsx"];

const writeFileAsync = promisify(fs.writeFile);

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
    include: "node_modules/**",
  }),
  babel({
    extensions,
    exclude: "node_modules/**",
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
        },
      };
    case "web-cjs":
      return {
        plugins,
        input: "packages/skygear-web/src/index.ts",
        output: {
          file: "packages/skygear-web/dist/skygear-web.cjs.js",
          format: "cjs",
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
        },
        external: id => ["node-fetch", "os"].includes(id),
      };
    case "react-native":
      return {
        plugins,
        input: "packages/skygear-react-native/src/index.ts",
        output: {
          file: "packages/skygear-react-native/dist/skygear-react-native.js",
          format: "cjs",
        },
        external: id => /^@react-native-community/.test(id),
      };
    default:
      throw new Error("unknown bundle type: " + configBundleType);
  }
}
