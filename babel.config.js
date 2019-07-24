module.exports = {
  presets: [
    [
      "@babel/preset-env",
      {
        // targets are not set because we want to apply all transforms
        // targets: {},
        //
        // During test, transform modules so that Jest and Node can
        // execute the code directly.
        // In other cases, keep modules and let the bundler to
        // deal with it.
        modules: process.env.NODE_ENV === "test" ? "auto" : false,
        // debug: true,
      },
    ],
    "@babel/preset-typescript",
  ],
  plugins: [
    // TODO: Remove class-properties once it becomes Stage 4
    "@babel/plugin-proposal-class-properties",
    [
      "@babel/plugin-transform-runtime",
      {
        useESModules: true,
      },
    ],
  ],
};
