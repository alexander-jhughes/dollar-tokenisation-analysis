import { ethers } from "ethers";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadArtifact(contractName: string) {
  const artifactPath = path.join(
    __dirname,
    "..",
    "artifacts",
    "contracts",
    `${contractName}.sol`,
    `${contractName}.json`
  );
  return JSON.parse(fs.readFileSync(artifactPath, "utf8"));
}

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const deployer = new ethers.Wallet(process.env.BUYER_PRIVATE_KEY!, provider);

  console.log("Deploying with account:", deployer.address);

  const mockUSDCArtifact = loadArtifact("MockUSDC");
  const MockUSDCFactory = new ethers.ContractFactory(mockUSDCArtifact.abi, mockUSDCArtifact.bytecode, deployer);
  const cashToken = await MockUSDCFactory.deploy();
  await cashToken.waitForDeployment();
  console.log("MockUSDC deployed to:", await cashToken.getAddress());

  const oilTokenArtifact = loadArtifact("ExampleOilToken");
  const OilTokenFactory = new ethers.ContractFactory(oilTokenArtifact.abi, oilTokenArtifact.bytecode, deployer);
  const oilToken = await OilTokenFactory.deploy();
  await oilToken.waitForDeployment();
  console.log("ExampleOilToken deployed to:", await oilToken.getAddress());

  const cashAmount = ethers.parseUnits("1000", 6);
  const oilAmount = ethers.parseUnits("500", 18);
  const durationSeconds = 60;

  const settlementArtifact = loadArtifact("OilTradeSettlement");
  const SettlementFactory = new ethers.ContractFactory(settlementArtifact.abi, settlementArtifact.bytecode, deployer);
  const settlement = await SettlementFactory.deploy(
    process.env.BUYER_ADDRESS,
    process.env.SELLER_ADDRESS,
    await cashToken.getAddress(),
    await oilToken.getAddress(),
    cashAmount,
    oilAmount,
    durationSeconds
  );
  await settlement.waitForDeployment();
  console.log("OilTradeSettlement deployed to:", await settlement.getAddress());

  console.log("\nSave these addresses, we need them for the next script:");
  console.log("CASH_TOKEN_ADDRESS=" + (await cashToken.getAddress()));
  console.log("OIL_TOKEN_ADDRESS=" + (await oilToken.getAddress()));
  console.log("SETTLEMENT_ADDRESS=" + (await settlement.getAddress()));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
