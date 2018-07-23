module.exports = function (api) {
  api.cache(true);
  return {
    "presets": [
      "@babel/env",
      "@babel/react",
      ["@babel/stage-2", {
        "decoratorsLegacy": true
      }],
      "@babel/typescript"
    ],
    "plugins": [
      "add-module-exports",
      "@babel/plugin-proposal-class-properties",
      "@babel/plugin-proposal-object-rest-spread",
      "@babel/plugin-transform-classes",
      ["@babel/plugin-transform-runtime", {
        "polyfill": false,
        "regenerator": true
      }]
    ]
  };
}


