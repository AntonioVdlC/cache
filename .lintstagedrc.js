module.exports = {
  "*.ts": [
    // https://github.com/okonet/lint-staged/issues/825
    () => "tsc --noEmit",
    "prettier --write",
    "eslint --fix",
  ],
  "*.js": ["prettier --write", "eslint --fix"],
};
