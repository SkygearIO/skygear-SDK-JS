import babel from "rollup-plugin-babel";
import commonjs from "rollup-plugin-commonjs";
import json from "rollup-plugin-json";
import resolve from "rollup-plugin-node-resolve";

const extensions = [".mjs", ".js", ".jsx", ".ts", ".tsx"];

const plugins = [
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
        plugins,
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
    default:
      throw new Error("unknown bundle type: " + configBundleType);
  }
}
