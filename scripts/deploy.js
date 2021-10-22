// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const args = [[deployer.address], [10000000000]]

  // We get the contract to deploy
  const UMAD = await hre.ethers.getContractFactory("UMAD");
  const deployed = await UMAD.deploy(...args);

  await deployed.deployed();

  console.log("UMAD deployed to:", deployed.address);

  console.log("Waiting for a min");
  setTimeout(async () => {
    await hre.run("verify:verify", {
      address: deployed.address,
      constructorArguments: args,
    });
  
    console.log("UMAD verified");
  }, 60 * 1000)

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
