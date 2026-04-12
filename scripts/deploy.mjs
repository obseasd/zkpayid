import hre from "hardhat";

async function main() {
  console.log("Deploying ZKCreditScore to HashKey Chain Testnet...");
  console.log("Network:", hre.network.name);

  const ZKCreditScore = await hre.ethers.getContractFactory("ZKCreditScore");
  const contract = await ZKCreditScore.deploy("0x0000000000000000000000000000000000000001");
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("");
  console.log("=================================");
  console.log("ZKCreditScore deployed to:", address);
  console.log("Explorer:", `https://hashkey.blockscout.com/address/${address}`);
  console.log("=================================");
  console.log("");
  console.log("Next steps:");
  console.log("1. Update lib/chains.ts with contract address");
  console.log("2. Verify contract on Blockscout");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
