module.exports = {
  istanbulReporter: ["html", "lcov", "text-summary"],
  onCompileComplete: async function (_config) {
    await run("typechain");
  },
  onIstanbulComplete: async function (_config) {},
  providerOptions: {
    mnemonic: process.env.MNEMONIC,
  },
  skipFiles: ["mocks", "test"],
  orderLiterals: true,
};
