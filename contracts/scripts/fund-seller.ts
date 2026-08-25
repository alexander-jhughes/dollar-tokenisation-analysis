import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const buyerWallet = new ethers.Wallet(process.env.BUYER_PRIVATE_KEY!, provider);

  const amountToSend = ethers.parseEther("0.02");

  console.log("Buyer balance before:", ethers.formatEther(await provider.getBalance(buyerWallet.address)));

  const tx = await buyerWallet.sendTransaction({
    to: process.env.SELLER_ADDRESS,
    value: amountToSend,
  });

  console.log("Transaction sent, hash:", tx.hash);
  await tx.wait();
  console.log("Confirmed.");

  console.log("Seller balance after:", ethers.formatEther(await provider.getBalance(process.env.SELLER_ADDRESS!)));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
