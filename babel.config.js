module.exports = function (api) {
  api.cache(true);
  return {
    "presets": [
      "@babel/env",
      "@babel/react",
    ],
    "plugins": [
      "add-module-exports",
      "@babel/plugin-proposal-class-properties",
      "@babel/plugin-proposal-object-rest-spread",
      "@babel/plugin-transform-classes",
      ["@babel/plugin-transform-runtime", {
        "polyfill": false,
        "regenerator": true
      }],
      // Stage 2
      ["@babel/plugin-proposal-decorators", { "legacy": true }],
      "@babel/plugin-proposal-function-sent",
      "@babel/plugin-proposal-export-namespace-from",
      "@babel/plugin-proposal-numeric-separator",
      "@babel/plugin-proposal-throw-expressions"
    ]
  };
};
