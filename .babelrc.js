module.exports = {
  // allow parcel to inject env vars during buildtime
  presets: [["@babel/preset-env", { targets: { node: "current" } }], "@babel/preset-typescript"],
  plugins: [
    [
      "transform-inline-environment-variables",
      {
        include: ["NODE_ENV", "PAGE_PATH", "BUILD_TIMESTAMP", "NOT_FOUND_PAGE_HTML"],
      },
    ],
  ],
};
