module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  testEnvironment: "node",
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.spec.ts", "!src/entrypoints/**/*.ts"],
  modulePathIgnorePatterns: ["<rootDir>/dist/"]
};
