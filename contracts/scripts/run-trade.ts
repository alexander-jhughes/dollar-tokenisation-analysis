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
  const buyer = new ethers.Wallet(process.env.BUYER_PRIVATE_KEY!, provider);
  const seller = new ethers.Wallet(process.env.SELLER_PRIVATE_KEY!, provider);

  const cashTokenArtifact = loadArtifact("MockUSDC");
  const oilTokenArtifact = loadArtifact("ExampleOilToken");
  const settlementArtifact = loadArtifact("OilTradeSettlement");

  const cashToken = new ethers.Contract(process.env.CASH_TOKEN_ADDRESS!, cashTokenArtifact.abi, provider);
  const oilToken = new ethers.Contract(process.env.OIL_TOKEN_ADDRESS!, oilTokenArtifact.abi, provider);
  const settlement = new ethers.Contract(process.env.SETTLEMENT_ADDRESS!, settlementArtifact.abi, provider);

  const cashAmount = ethers.parseUnits("1000", 6);
  const oilAmount = ethers.parseUnits("500", 18);

  console.log("Minting tokens...");
  let tx = await cashToken.connect(buyer).mint(buyer.address, cashAmount);
  await tx.wait();
  tx = await oilToken.connect(buyer).mint(seller.address, oilAmount);
  await tx.wait();
  console.log("Minted.");

  console.log("Approving settlement contract...");
  tx = await cashToken.connect(buyer).approve(process.env.SETTLEMENT_ADDRESS, cashAmount);
  await tx.wait();
  tx = await oilToken.connect(seller).approve(process.env.SETTLEMENT_ADDRESS, oilAmount);
  await tx.wait();
  console.log("Approved.");

  console.log("Buyer depositing cash leg...");
  tx = await settlement.connect(buyer).deposit();
  await tx.wait();
  console.log("Cash deposited.");

  console.log("Seller depositing oil leg...");
  tx = await settlement.connect(seller).deposit();
  await tx.wait();
  console.log("Oil deposited.");

  console.log("Settling trade...");
  tx = await settlement.connect(buyer).settle();
  const receipt = await tx.wait();
  console.log("Settled. Transaction hash:", receipt.hash);

  const gasUsed = receipt.gasUsed;
  const gasPrice = receipt.gasPrice;
  const gasCostWei = gasUsed * gasPrice;
  const gasCostEth = ethers.formatEther(gasCostWei);

  console.log("\n--- Settlement gas cost ---");
  console.log("Gas used:", gasUsed.toString());
  console.log("Gas price (wei):", gasPrice.toString());
  console.log("Total cost:", gasCostEth, "ETH");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
