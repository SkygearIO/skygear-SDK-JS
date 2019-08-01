var plugins = [
  // TypeScript section begin
  "@babel/plugin-transform-typescript",
  "@babel/plugin-proposal-class-properties",
  // TypeScript section end
  // Inlined preset-env section begin
  // The order is obtained by specifying debug: true
  "@babel/plugin-transform-template-literals",
  "@babel/plugin-transform-literals",
  "@babel/plugin-transform-function-name",
  "@babel/plugin-transform-arrow-functions",
  "@babel/plugin-transform-block-scoped-functions",
  "@babel/plugin-transform-classes",
  "@babel/plugin-transform-object-super",
  "@babel/plugin-transform-shorthand-properties",
  "@babel/plugin-transform-duplicate-keys",
  "@babel/plugin-transform-computed-properties",
  [
    "@babel/plugin-transform-for-of",
    {
      assumeArray: true,
    },
  ],
  "@babel/plugin-transform-sticky-regex",
  "@babel/plugin-transform-dotall-regex",
  "@babel/plugin-transform-unicode-regex",
  [
    "@babel/plugin-transform-spread",
    {
      loose: true,
    },
  ],
  "@babel/plugin-transform-parameters",
  "@babel/plugin-transform-destructuring",
  "@babel/plugin-transform-block-scoping",
  "@babel/plugin-transform-typeof-symbol",
  "@babel/plugin-transform-new-target",
  "@babel/plugin-transform-regenerator",
  "@babel/plugin-transform-exponentiation-operator",
  "@babel/plugin-transform-async-to-generator",
  "@babel/plugin-proposal-async-generator-functions",
  "@babel/plugin-proposal-object-rest-spread",
  "@babel/plugin-proposal-unicode-property-regex",
  "@babel/plugin-proposal-json-strings",
  "@babel/plugin-proposal-optional-catch-binding",
  "@babel/plugin-transform-named-capturing-groups-regex",
  "@babel/plugin-transform-member-expression-literals",
  "@babel/plugin-transform-property-literals",
  "@babel/plugin-transform-reserved-words",
  // Inlined preset-env section end
  // Use tranform-runtime to avoid polluting the global namespace.
  [
    "@babel/plugin-transform-runtime",
    {
      // During test, we do not use module
      // because jest by default does not transform node_modules.
      // useESModules will cause module source code to be loaded,
      // which is not parsable by jest.
      useESModules: process.env.NODE_ENV === "test" ? false : true,
    },
  ],
];

if (process.env.NODE_ENV === "test") {
  plugins.push("@babel/plugin-transform-modules-commonjs");
}

module.exports = {
  plugins,
};
