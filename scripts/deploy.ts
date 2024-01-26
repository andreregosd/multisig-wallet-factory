import { ethers } from "hardhat";

async function main() {
  // Deploy Multisig Wallet Factory
  let multisigFactoryFactory = await ethers.getContractFactory("MultiSigFactory");
  console.log("Deploying Multisig Factory...")
  let multisigFactory = await multisigFactoryFactory.deploy();
  await multisigFactory.deployed();
  console.log(`Deployed contract to: ${multisigFactory.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
