module.exports = {
  roots: ["./src"],
  transform: {
    "^.+\\.tsx?$": "ts-jest"
  },
  coveragePathIgnorePatterns: ["./logger.ts"]
};
