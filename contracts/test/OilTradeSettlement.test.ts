import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.getOrCreate();

describe("OilTradeSettlement", function () {
  async function deployFixture() {
    const [deployer, buyer, seller, outsider] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const cashToken = await MockUSDC.deploy();

    const ExampleOilToken = await ethers.getContractFactory("ExampleOilToken");
    const oilToken = await ExampleOilToken.deploy();

    const cashAmount = ethers.parseUnits("1000", 6);
    const oilAmount = ethers.parseUnits("500", 18);
    const durationSeconds = 60;

    const Settlement = await ethers.getContractFactory("OilTradeSettlement");
    const settlement = await Settlement.deploy(
      buyer.address,
      seller.address,
      await cashToken.getAddress(),
      await oilToken.getAddress(),
      cashAmount,
      oilAmount,
      durationSeconds
    );

    await cashToken.mint(buyer.address, cashAmount);
    await oilToken.mint(seller.address, oilAmount);

    await cashToken.connect(buyer).approve(await settlement.getAddress(), cashAmount);
    await oilToken.connect(seller).approve(await settlement.getAddress(), oilAmount);

    return { settlement, cashToken, oilToken, deployer, buyer, seller, outsider, cashAmount, oilAmount };
  }

  it("settles successfully when both legs deposit", async function () {
    const { settlement, cashToken, oilToken, buyer, seller, cashAmount, oilAmount } = await deployFixture();

    await settlement.connect(buyer).deposit();
    await settlement.connect(seller).deposit();
    await settlement.settle();

    expect(await cashToken.balanceOf(seller.address)).to.equal(cashAmount);
    expect(await oilToken.balanceOf(buyer.address)).to.equal(oilAmount);
  });

  it("reverts settle() if only one leg has deposited", async function () {
    const { settlement, buyer } = await deployFixture();

    await settlement.connect(buyer).deposit();
    await expect(settlement.settle()).to.be.revertedWith("Both legs not deposited");
  });

  it("refunds the depositor after the deadline if the other leg never arrives", async function () {
    const { settlement, cashToken, buyer, cashAmount } = await deployFixture();

    await settlement.connect(buyer).deposit();

    await ethers.provider.send("evm_increaseTime", [61]);
    await ethers.provider.send("evm_mine", []);

    await settlement.connect(buyer).refund();
    expect(await cashToken.balanceOf(buyer.address)).to.equal(cashAmount);
  });

  it("reverts deposit() from a non-allowlisted address", async function () {
    const { settlement, outsider } = await deployFixture();

    await expect(settlement.connect(outsider).deposit()).to.be.revertedWith("Not allowlisted");
  });
});
