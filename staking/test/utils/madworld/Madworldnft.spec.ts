import { ethers, waffle } from "hardhat";
import web3 from "web3";
import { Wallet, Signer, utils, BigNumber, Contract } from "ethers";
import { expect } from "chai";
import { deployContract } from "ethereum-waffle";
import { keccak256 } from "ethers/lib/utils";

import { NftStaking, MockERC20, MockERC721 } from "../../../typechain";
import {
  abi as NFTSTAKING_ABI,
  bytecode as NFTSTAKING_BYTECODE,
} from "../../../artifacts/contracts/Madworldnft.sol/NftStaking.json";
import * as ERC20 from "../../../artifacts/contracts/mocks/MockERC20.sol/MockERC20.json";
import * as ERC721 from "../../../artifacts/contracts/mocks/MockNFT.sol/MockERC721.json";
import { increase, increaseTo, latest } from "../time";

const { toWei, fromWei } = web3.utils;

describe("madworld testing !!!", () => {
  let wallets: Wallet[];
  let nft: MockERC721; // NFT collection address
  let token: MockERC20; // ERC20 address
  let madworld: NftStaking;
  let user: Wallet;
  let owner: Wallet;
  let contract: Contract;
  const signer = ethers.Wallet.createRandom();
  const apyStruct = [
    { amount: toWei("2000"), apy: toWei("0.02") },
    { amount: toWei("10000"), apy: toWei("0.05") },
    { amount: toWei("20000"), apy: toWei("0.085") },
    { amount: toWei("40000"), apy: toWei("0.1") },
    { amount: toWei("60000"), apy: toWei("0.115") },
    { amount: toWei("80000"), apy: toWei("0.13") },
    { amount: toWei("100000"), apy: toWei("0.145") },
    { amount: toWei("120000"), apy: toWei("0.16") },
    { amount: toWei("140000"), apy: toWei("0.175") },
  ];

  before("load", async () => {
    wallets = await (ethers as any).getSigners();
    user = wallets[1];
    owner = wallets[0];
  });

  beforeEach(async () => {
    token = ((await deployContract(
      owner as any,
      ERC20,
    )) as unknown) as MockERC20;

    nft = ((await deployContract(
      owner as any,
      ERC721,
    )) as unknown) as MockERC721;

    await token.mint(owner.address, toWei("1000000000000000"));
    madworld = (await waffle.deployContract((owner as unknown) as Signer, {
      bytecode: NFTSTAKING_BYTECODE,
      abi: NFTSTAKING_ABI,
    })) as NftStaking;

    for (let i = 1; i <= 15; i++) {
      await nft.mintUniqueTokenTo(user.address, i);
    }
    await nft.mintUniqueTokenTo(user.address, 16);
    await nft.mintUniqueTokenTo(user.address, 99);
    await nft.mintUniqueTokenTo(user.address, 100);
    await nft.mintUniqueTokenTo(user.address, 222);
    await nft.connect(user).setApprovalForAll(madworld.address, true);

    await token.transfer(user.address, utils.parseEther("1000000000000"));
    await token
      .connect(user)
      .approve(madworld.address, utils.parseEther("1000000000000"));
    await madworld.__Madworld_init();

    await madworld
      .connect(owner)
      .grantRole(keccak256(utils.toUtf8Bytes("ADMIN")), wallets[3].address);
    await madworld.connect(wallets[3]).setSigner(signer.address);

    await madworld
      .connect(owner)
      .addPool(
        "pool 0",
        apyStruct,
        nft.address,
        token.address,
        token.address,
        toWei("100000000000"),
        5,
        10,
        Math.round(Date.now() / 1000),
        Math.round(Date.now() / 1000) + 3.154e7,
      );

    contract = new ethers.Contract(
      madworld.address,
      NFTSTAKING_ABI,
      ethers.provider,
    );
  });

  describe("add, update and get pool data", () => {
    let res: any;
    beforeEach("create pool", async () => {
      res = await madworld
        .connect(owner)
        .addPool(
          "pool 1",
          apyStruct,
          nft.address,
          token.address,
          token.address,
          toWei("100000000000"),
          5,
          10,
          Math.round(Date.now() / 1000),
          Math.round(Date.now() / 1000) + 3.154e7,
        );
    });

    it("add pool invalid join time", async () => {
      await expect(
        madworld
          .connect(owner)
          .addPool(
            "pool 1",
            apyStruct,
            nft.address,
            token.address,
            token.address,
            toWei("100000000000"),
            5,
            10,
            Math.round(Date.now() / 1000) + 3.154e7,
            Math.round(Date.now() / 1000),
          ),
      ).to.revertedWith("MADworld: invalid end join time");
    });

    it("get pool data after added a pool", async () => {
      const eventFilter = contract.filters.AddedPool();
      const events = await contract.queryFilter(
        eventFilter,
        res.blockNumber,
        res.blockNumber,
      );
      expect(events[0].args?.poolId).to.equal(1);
      expect(events[0].args?.name).to.equal("pool 1");
    });
    it("get pool data with no apy struct", async () => {
      await madworld
        .connect(owner)
        .addPool(
          "pool 2",
          [],
          nft.address,
          token.address,
          token.address,
          toWei("100000000000"),
          5,
          10,
          Math.round(Date.now() / 1000),
          Math.round(Date.now() / 1000) + 3.154e7,
        );
      const res = await madworld.getPoolData(2, user.address);
      expect(res._totalStaked).to.equal(toWei("0"));
      expect(res._poolSize).to.equal(toWei("100000000000"));
      expect(res._remaining).to.equal(toWei("100000000000"));
      expect(res._roiMax).to.equal(toWei("0"));
      expect(res._roiMin).to.equal(toWei("0"));
    });
    it("get pool data by user address", async () => {
      const message = ethers.utils.solidityKeccak256(
        [
          "uint256",
          "address",
          "address",
          "uint256[]",
          "uint256[]",
          "uint256[]",
        ],
        [
          1,
          user.address,
          nft.address,
          [1, 2, 14, 15],
          [toWei("40"), toWei("40"), toWei("20000"), toWei("60000")],
          [0, 0, 1, 1],
        ],
      );
      const sig = new web3().eth.accounts.sign(
        message,
        signer._signingKey().privateKey,
      ).signature;
      const StakeCardPayload = {
        _nftAddress: nft.address,
        _user: user.address,
        _ids: [1, 2, 14, 15],
        _prices: [toWei("40"), toWei("40"), toWei("20000"), toWei("60000")],
        _tiers: [0, 0, 1, 1], // 0 - lower, 1 - higher
        _signature: sig,
      };

      await madworld.connect(user).stakeCards(1, StakeCardPayload);
      const res = await madworld.getPoolData(1, owner.address);
      expect(res._roiMin).to.equal(toWei("0.02"));
      expect(res._roiMax).to.equal(toWei("0.175"));
      expect(res._totalStaked).to.equal(toWei("80080"));
      expect(res._remaining).to.equal(toWei("99999919920"));
      expect(res._poolSize).to.equal(toWei("100000000000"));
    });

    it("get pool data", async () => {
      const message = ethers.utils.solidityKeccak256(
        [
          "uint256",
          "address",
          "address",
          "uint256[]",
          "uint256[]",
          "uint256[]",
        ],
        [
          1,
          user.address,
          nft.address,
          [1, 2, 14, 15],
          [toWei("40"), toWei("40"), toWei("20000"), toWei("60000")],
          [0, 0, 1, 1],
        ],
      );
      const sig = new web3().eth.accounts.sign(
        message,
        signer._signingKey().privateKey,
      ).signature;
      const StakeCardPayload = {
        _nftAddress: nft.address,
        _user: user.address,
        _ids: [1, 2, 14, 15],
        _prices: [toWei("40"), toWei("40"), toWei("20000"), toWei("60000")],
        _tiers: [0, 0, 1, 1], // 0 - lower, 1 - higher
        _signature: sig,
      };
      await madworld.connect(user).stakeCards(1, StakeCardPayload);
      const res = await madworld.getPoolData2(1, user.address);
      expect(res._roi).to.equal(toWei("0.145"));
      expect(res._stakedNft).to.equal(4);
      expect(res._userStakedTokens).to.equal(toWei("80080"));
    });

    it("update pool info", async () => {
      const res1 = await madworld.updatePool(0, "name update");

      const eventFilter = contract.filters.UpdatedPool();
      const events = await contract.queryFilter(
        eventFilter,
        res1.blockNumber,
        res1.blockNumber,
      );
      expect(events[0].args?.name).to.equal("name update");
    });

    it("add pool with invalid token", async () => {
      await expect(
        madworld
          .connect(owner)
          .addPool(
            "pool 2",
            apyStruct,
            "0x0000000000000000000000000000000000000000",
            token.address,
            token.address,
            toWei("100"),
            5,
            10,
            Math.round(Date.now() / 1000),
            Math.round(Date.now() / 1000) + 3.154e7,
          ),
      ).to.be.revertedWith("MADworld: _nft can not be zero address");

      await expect(
        madworld
          .connect(owner)
          .addPool(
            "pool 2",
            apyStruct,
            nft.address,
            "0x0000000000000000000000000000000000000000",
            token.address,
            toWei("100"),
            5,
            10,
            Math.round(Date.now() / 1000),
            Math.round(Date.now() / 1000) + 3.154e7,
          ),
      ).to.be.revertedWith("MADworld: _stakingToken can not be zero address");

      await expect(
        madworld
          .connect(owner)
          .addPool(
            "pool 2",
            apyStruct,
            nft.address,
            token.address,
            "0x0000000000000000000000000000000000000000",
            toWei("100"),
            5,
            10,
            Math.round(Date.now() / 1000),
            Math.round(Date.now() / 1000) + 3.154e7,
          ),
      ).to.be.revertedWith("MADworld: _rewardToken can not be zero address");
    });

    it("addPool with role Admin", async () => {
      await expect(
        madworld
          .connect(user)
          .addPool(
            "pool 2",
            apyStruct,
            nft.address,
            token.address,
            token.address,
            toWei("100"),
            5,
            10,
            Math.round(Date.now() / 1000),
            Math.round(Date.now() / 1000) + 3.154e7,
          ),
      ).to.be.reverted;

      await madworld.grantRole(
        keccak256(utils.toUtf8Bytes("ADMIN")),
        user.address,
      );

      const res1 = await madworld
        .connect(user)
        .addPool(
          "pool 2",
          apyStruct,
          nft.address,
          token.address,
          token.address,
          toWei("100"),
          5,
          10,
          Math.round(Date.now() / 1000),
          Math.round(Date.now() / 1000) + 3.154e7,
        );

      const eventFilter2 = contract.filters.SetApyStruct();
      const eventFilter = contract.filters.AddedPool();

      const events2 = await contract.queryFilter(
        eventFilter2,
        res1.blockNumber,
        res1.blockNumber,
      );
      const events = await contract.queryFilter(
        eventFilter,
        res1.blockNumber,
        res1.blockNumber,
      );

      expect(events[0].args?.poolId).to.equal(2);
      expect(events[0].args?.name).to.equal("pool 2");
    });
  });

  describe("stake card", () => {
    it("stake example", async () => {
      const message = ethers.utils.solidityKeccak256(
        [
          "uint256",
          "address",
          "address",
          "uint256[]",
          "uint256[]",
          "uint256[]",
        ],
        [
          0,
          user.address,
          nft.address,
          [1, 2, 13],
          [toWei("40"), toWei("40"), toWei("20000")],
          [0, 0, 1],
        ],
      );
      const sig = new web3().eth.accounts.sign(
        message,
        signer._signingKey().privateKey,
      ).signature;
      const StakeCardPayload = {
        _nftAddress: nft.address,
        _user: user.address,
        _ids: [1, 2, 13],
        _prices: [toWei("40"), toWei("40"), toWei("20000")],
        _tiers: [0, 0, 1], // 0 - lower, 1 - higher
        _signature: sig,
      };
      const res = await madworld.connect(user).stakeCards(0, StakeCardPayload);

      const eventFilter = contract.filters.Staked();
      const events = await contract.queryFilter(
        eventFilter,
        res.blockNumber,
        res.blockNumber,
      );

      expect(events[0].args?.tokenAmount.toString()).to.equal(
        toWei("20080").toString(),
      );
    });

    it("stake less than minimum", async () => {
      const message = ethers.utils.solidityKeccak256(
        [
          "uint256",
          "address",
          "address",
          "uint256[]",
          "uint256[]",
          "uint256[]",
        ],
        [0, user.address, nft.address, [1], [toWei("40")], [0]],
      );
      const sig = new web3().eth.accounts.sign(
        message,
        signer._signingKey().privateKey,
      ).signature;
      const StakeCardPayload = {
        _nftAddress: nft.address,
        _user: user.address,
        _ids: [1],
        _prices: [toWei("40")],
        _tiers: [0], // 0 - lower, 1 - higher
        _signature: sig,
      };
      await expect(
        madworld.connect(user).stakeCards(0, StakeCardPayload),
      ).to.be.revertedWith("total stake less than minimum");
    });

    it("stake high than pool size", async () => {
      await madworld
        .connect(owner)
        .addPool(
          "pool 1",
          apyStruct,
          nft.address,
          token.address,
          token.address,
          toWei("100"),
          5,
          10,
          Math.round(Date.now() / 1000),
          Math.round(Date.now() / 1000) + 3.154e7,
        );
      const message = ethers.utils.solidityKeccak256(
        [
          "uint256",
          "address",
          "address",
          "uint256[]",
          "uint256[]",
          "uint256[]",
        ],
        [
          1,
          user.address,
          nft.address,
          [1, 2, 13],
          [toWei("40"), toWei("40"), toWei("20000")],
          [0, 0, 1],
        ],
      );
      const sig = new web3().eth.accounts.sign(
        message,
        signer._signingKey().privateKey,
      ).signature;
      const StakeCardPayload = {
        _nftAddress: nft.address,
        _user: user.address,
        _ids: [1, 2, 13],
        _prices: [toWei("40"), toWei("40"), toWei("20000")],
        _tiers: [0, 0, 1], // 0 - lower, 1 - higher
        _signature: sig,
      };
      await expect(
        madworld.connect(user).stakeCards(1, StakeCardPayload),
      ).to.be.revertedWith("exceed pool limit");
    });

    it("stake invalid signature", async () => {
      const message = ethers.utils.solidityKeccak256(
        [
          "uint256",
          "address",
          "address",
          "uint256[]",
          "uint256[]",
          "uint256[]",
        ],
        [
          1,
          user.address,
          nft.address,
          [1, 2, 13],
          [toWei("40"), toWei("40"), toWei("20000")],
          [0, 0, 1],
        ],
      );
      const sig = new web3().eth.accounts.sign(
        message,
        signer._signingKey().privateKey,
      ).signature;
      const StakeCardPayload = {
        _nftAddress: nft.address,
        _user: user.address,
        _ids: [1, 2, 13],
        _prices: [toWei("40"), toWei("40"), toWei("20000")],
        _tiers: [0, 0, 1], // 0 - lower, 1 - higher
        _signature: sig,
      };
      await expect(
        madworld.connect(user).stakeCards(0, StakeCardPayload),
      ).to.be.revertedWith("MADworld: invalid signature");
    });

    it("stake invalid user", async () => {
      const message = ethers.utils.solidityKeccak256(
        [
          "uint256",
          "address",
          "address",
          "uint256[]",
          "uint256[]",
          "uint256[]",
        ],
        [
          0,
          wallets[2].address,
          nft.address,
          [1, 2, 13],
          [toWei("40"), toWei("40"), toWei("20000")],
          [0, 0, 1],
        ],
      );
      const sig = new web3().eth.accounts.sign(
        message,
        signer._signingKey().privateKey,
      ).signature;
      const StakeCardPayload = {
        _nftAddress: nft.address,
        _user: wallets[2].address,
        _ids: [1, 2, 13],
        _prices: [toWei("40"), toWei("40"), toWei("20000")],
        _tiers: [0, 0, 1], // 0 - lower, 1 - higher
        _signature: sig,
      };
      await expect(
        madworld.connect(user).stakeCards(0, StakeCardPayload),
      ).to.be.revertedWith("MADworld: invalid user");
    });

    it("stake invalid user", async () => {
      const message = ethers.utils.solidityKeccak256(
        [
          "uint256",
          "address",
          "address",
          "uint256[]",
          "uint256[]",
          "uint256[]",
        ],
        [
          0,
          user.address,
          nft.address,
          [1, 2, 13],
          [toWei("40"), toWei("40"), toWei("20000")],
          [0, 0, 2],
        ],
      );
      const sig = new web3().eth.accounts.sign(
        message,
        signer._signingKey().privateKey,
      ).signature;
      const StakeCardPayload = {
        _nftAddress: nft.address,
        _user: user.address,
        _ids: [1, 2, 13],
        _prices: [toWei("40"), toWei("40"), toWei("20000")],
        _tiers: [0, 0, 2], // 0 - lower, 1 - higher
        _signature: sig,
      };
      await expect(
        madworld.connect(user).stakeCards(0, StakeCardPayload),
      ).to.be.revertedWith("MADworld: invalid tier");
    });

    it("stake invalid start time - end time", async () => {
      const message = ethers.utils.solidityKeccak256(
        [
          "uint256",
          "address",
          "address",
          "uint256[]",
          "uint256[]",
          "uint256[]",
        ],
        [
          1,
          user.address,
          nft.address,
          [1, 2, 13],
          [toWei("40"), toWei("40"), toWei("20000")],
          [0, 0, 1],
        ],
      );
      const sig = new web3().eth.accounts.sign(
        message,
        signer._signingKey().privateKey,
      ).signature;
      const StakeCardPayload = {
        _nftAddress: nft.address,
        _user: user.address,
        _ids: [1, 2, 13],
        _prices: [toWei("40"), toWei("40"), toWei("20000")],
        _tiers: [0, 0, 1], // 0 - lower, 1 - higher
        _signature: sig,
      };

      await madworld
        .connect(owner)
        .addPool(
          "pool 1",
          apyStruct,
          nft.address,
          token.address,
          token.address,
          toWei("100"),
          5,
          10,
          Math.round(Date.now() / 1000) + 5000,
          Math.round(Date.now() / 1000) + 10000,
        );
      await expect(
        madworld.connect(user).stakeCards(1, StakeCardPayload),
      ).to.be.revertedWith("MADworld: pool is not started yet");

      await madworld
        .connect(owner)
        .addPool(
          "pool 2",
          apyStruct,
          nft.address,
          token.address,
          token.address,
          toWei("100"),
          5,
          10,
          Math.round(Date.now() / 1000),
          Math.round(Date.now() / 1000) + 30000,
        );
      await increase(BigNumber.from("50000"));
      await expect(
        madworld.connect(user).stakeCards(2, StakeCardPayload),
      ).to.be.revertedWith("MADworld: pool is already closed");
    });

    it("stake more than limit higher tier card", async () => {
      const message = ethers.utils.solidityKeccak256(
        [
          "uint256",
          "address",
          "address",
          "uint256[]",
          "uint256[]",
          "uint256[]",
        ],
        [
          0,
          user.address,
          nft.address,
          [1, 2, 3, 4, 5, 6, 7],
          [
            toWei("20000"),
            toWei("20000"),
            toWei("20000"),
            toWei("20000"),
            toWei("20000"),
            toWei("20000"),
            toWei("20000"),
          ],
          [1, 1, 1, 1, 1, 1, 1],
        ],
      );
      const sig = new web3().eth.accounts.sign(
        message,
        signer._signingKey().privateKey,
      ).signature;
      const StakeCardPayload = {
        _nftAddress: nft.address,
        _user: user.address,
        _ids: [1, 2, 3, 4, 5, 6, 7],
        _prices: [
          toWei("20000"),
          toWei("20000"),
          toWei("20000"),
          toWei("20000"),
          toWei("20000"),
          toWei("20000"),
          toWei("20000"),
        ],
        _tiers: [1, 1, 1, 1, 1, 1, 1], // 0 - lower, 1 - higher
        _signature: sig,
      };
      await expect(
        madworld.connect(user).stakeCards(0, StakeCardPayload),
      ).to.be.revertedWith("exceed higher tier staking limit");
    });

    it("stake more than limit lower tier card", async () => {
      const message = ethers.utils.solidityKeccak256(
        [
          "uint256",
          "address",
          "address",
          "uint256[]",
          "uint256[]",
          "uint256[]",
        ],
        [
          0,
          user.address,
          nft.address,
          [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
          [
            toWei("40"),
            toWei("40"),
            toWei("40"),
            toWei("40"),
            toWei("40"),
            toWei("40"),
            toWei("40"),
            toWei("40"),
            toWei("40"),
            toWei("40"),
            toWei("40"),
          ],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        ],
      );
      const sig = new web3().eth.accounts.sign(
        message,
        signer._signingKey().privateKey,
      ).signature;
      const StakeCardPayload = {
        _nftAddress: nft.address,
        _user: user.address,
        _ids: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
        _prices: [
          toWei("40"),
          toWei("40"),
          toWei("40"),
          toWei("40"),
          toWei("40"),
          toWei("40"),
          toWei("40"),
          toWei("40"),
          toWei("40"),
          toWei("40"),
          toWei("40"),
        ],
        _tiers: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 0 - lower, 1 - higher
        _signature: sig,
      };
      await expect(
        madworld.connect(user).stakeCards(0, StakeCardPayload),
      ).to.be.revertedWith("exceed lower tier staking limit");
    });

    it("stake but user do not have enough token", async () => {
      await token
        .connect(user)
        .transfer(wallets[3].address, utils.parseEther("1000000000000"));
      const message = ethers.utils.solidityKeccak256(
        [
          "uint256",
          "address",
          "address",
          "uint256[]",
          "uint256[]",
          "uint256[]",
        ],
        [
          0,
          user.address,
          nft.address,
          [1, 2],
          [toWei("20000"), toWei("20000")],
          [0, 1],
        ],
      );
      const sig = new web3().eth.accounts.sign(
        message,
        signer._signingKey().privateKey,
      ).signature;
      const StakeCardPayload = {
        _nftAddress: nft.address,
        _user: user.address,
        _ids: [1, 2],
        _prices: [toWei("20000"), toWei("20000")],
        _tiers: [0, 1], // 0 - lower, 1 - higher
        _signature: sig,
      };
      await expect(
        madworld.connect(user).stakeCards(0, StakeCardPayload),
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });

    it("stake with invalid poolId", async () => {
      const message = ethers.utils.solidityKeccak256(
        [
          "uint256",
          "address",
          "address",
          "uint256[]",
          "uint256[]",
          "uint256[]",
        ],
        [
          10,
          user.address,
          nft.address,
          [1, 2, 3, 13, 12, 15],
          [
            toWei("40"),
            toWei("40"),
            toWei("200"),
            toWei("20000"),
            toWei("20000"),
            toWei("60000"),
          ],
          [0, 0, 0, 1, 1, 1],
        ],
      );
      const sig = new web3().eth.accounts.sign(
        message,
        signer._signingKey().privateKey,
      ).signature;
      const StakeCardPayload = {
        _nftAddress: nft.address,
        _user: user.address,
        _ids: [1, 2, 3, 13, 12, 15],
        _prices: [
          toWei("40"),
          toWei("40"),
          toWei("200"),
          toWei("20000"),
          toWei("20000"),
          toWei("60000"),
        ],
        _tiers: [0, 0, 0, 1, 1, 1], // 0 - lower, 1 - higher
        _signature: sig,
      };
      await expect(
        madworld.connect(user).stakeCards(10, StakeCardPayload),
      ).to.be.revertedWith("MADworld: Pool are not exist");
    });
  });

  describe("withdraw", () => {
    let StakeCardPayload: any;

    beforeEach("stake before withdraw", () => {
      const message = ethers.utils.solidityKeccak256(
        [
          "uint256",
          "address",
          "address",
          "uint256[]",
          "uint256[]",
          "uint256[]",
        ],
        [
          0,
          user.address,
          nft.address,
          [1, 2, 13],
          [toWei("40"), toWei("40"), toWei("20000")],
          [0, 0, 1],
        ],
      );
      const sig = new web3().eth.accounts.sign(
        message,
        signer._signingKey().privateKey,
      ).signature;
      StakeCardPayload = {
        _nftAddress: nft.address,
        _user: user.address,
        _ids: [1, 2, 13],
        _prices: [toWei("40"), toWei("40"), toWei("20000")],
        _tiers: [0, 0, 1], // 0 - lower, 1 - higher
        _signature: sig,
      };
    });

    it("penalty withdraw", async () => {
      await token.transfer(madworld.address, utils.parseEther("1000000000000"));
      await madworld.connect(user).stakeCards(0, StakeCardPayload);

      const res = await madworld.connect(user).withdraw(0, [1, 2, 13]);
      const eventFilter2 = contract.filters.Withdrawn();
      const events2 = await contract.queryFilter(
        eventFilter2,
        res.blockNumber,
        res.blockNumber,
      );
      expect(events2[0].args?.fee.toString()).to.equal(
        toWei("401.6").toString(),
      );
    });

    it("withdraw example", async () => {
      await madworld
        .connect(owner)
        .addPool(
          "pool 1",
          apyStruct,
          nft.address,
          token.address,
          token.address,
          toWei("100000000000"),
          5,
          10,
          Math.round(Date.now() / 1000),
          Math.round(Date.now() / 1000) + 3.154e7,
        );

      const message = ethers.utils.solidityKeccak256(
        [
          "uint256",
          "address",
          "address",
          "uint256[]",
          "uint256[]",
          "uint256[]",
        ],
        [
          1,
          user.address,
          nft.address,
          [1, 2, 3, 13, 12, 15],
          [
            toWei("40"),
            toWei("40"),
            toWei("200"),
            toWei("20000"),
            toWei("20000"),
            toWei("60000"),
          ],
          [0, 0, 0, 1, 1, 1],
        ],
      );
      const sig = new web3().eth.accounts.sign(
        message,
        signer._signingKey().privateKey,
      ).signature;
      const StakeCardPayload = {
        _nftAddress: nft.address,
        _user: user.address,
        _ids: [1, 2, 3, 13, 12, 15],
        _prices: [
          toWei("40"),
          toWei("40"),
          toWei("200"),
          toWei("20000"),
          toWei("20000"),
          toWei("60000"),
        ],
        _tiers: [0, 0, 0, 1, 1, 1], // 0 - lower, 1 - higher
        _signature: sig,
      };
      await madworld.connect(user).stakeCards(1, StakeCardPayload);
      await increase(BigNumber.from("8640000"));
      await expect(
        madworld.connect(user).withdraw(1, [1, 2, 3, 13, 12, 15]),
      ).to.be.revertedWith("MADworld: contract issufficient balance");
      const res = await madworld.connect(user).withdraw(1, [1, 2, 13, 15]);
      const eventFilter2 = contract.filters.Withdrawn();
      const events2 = await contract.queryFilter(
        eventFilter2,
        res.blockNumber,
        res.blockNumber,
      );

      expect(events2[0].args?.fee).to.equal(toWei("0"));
      expect(events2[0].args?.tokenAmount).to.equal(toWei("80080"));
    });

    it("withdraw with invalid nft id", async () => {
      await madworld.connect(user).stakeCards(0, StakeCardPayload);
      await expect(
        madworld.connect(user).withdraw(0, [1, 2, 0]),
      ).to.be.revertedWith("invalid input");
      await expect(
        madworld.connect(user).withdraw(0, [1, 2, 121]),
      ).to.be.revertedWith("token is not staked");
    });

    it("withdraw with nft id which user not own", async () => {
      await madworld.connect(user).stakeCards(0, StakeCardPayload);
      await expect(
        madworld.connect(wallets[2]).withdraw(0, [1, 2, 13]),
      ).to.be.revertedWith("token is not staked");
    });
  });

  describe("utils", () => {
    it("get rewards", async () => {
      await madworld
        .connect(owner)
        .addPool(
          "pool rewards",
          [{ amount: "800", apy: toWei("5000") }],
          nft.address,
          token.address,
          token.address,
          toWei("5000000000000"),
          5,
          10,
          Math.round(Date.now() / 1000),
          Math.round(Date.now() / 1000) + 3.154e7,
        );
      const message = ethers.utils.solidityKeccak256(
        [
          "uint256",
          "address",
          "address",
          "uint256[]",
          "uint256[]",
          "uint256[]",
        ],
        [
          1,
          user.address,
          nft.address,
          [1, 2, 14, 15],
          [toWei("40"), toWei("40"), toWei("20000"), toWei("60000")],
          [0, 0, 1, 1],
        ],
      );
      const sig = new web3().eth.accounts.sign(
        message,
        signer._signingKey().privateKey,
      ).signature;
      const StakeCardPayload = {
        _nftAddress: nft.address,
        _user: user.address,
        _ids: [1, 2, 14, 15],
        _prices: [toWei("40"), toWei("40"), toWei("20000"), toWei("60000")],
        _tiers: [0, 0, 1, 1], // 0 - lower, 1 - higher
        _signature: sig,
      };
      await madworld.connect(user).stakeCards(1, StakeCardPayload);
      await increase(BigNumber.from("5000"));

      const res = await madworld.getReward(1, user.address);
      expect(res.toString().slice(0, -18)).to.equal("63483");

      await madworld.updateUsers(1, [user.address]);
      await expect(
        madworld.updateUsers(1, ["0x0000000000000000000000000000000000000000"]),
      ).to.be.revertedWith("MADworld: _userAddress can not be zero address");

      await madworld.connect(user).update(1);

      const res1 = await madworld.getReward(1, user.address);
      expect(res1.toString().slice(0, -18)).to.equal("");

      await increase(BigNumber.from("5000"));
      const res2 = await madworld.getReward(1, user.address);
      expect(res2.toString().slice(0, -18)).to.equal("63483");
    });
    it("get user cards staked", async () => {
      const message = ethers.utils.solidityKeccak256(
        [
          "uint256",
          "address",
          "address",
          "uint256[]",
          "uint256[]",
          "uint256[]",
        ],
        [
          0,
          user.address,
          nft.address,
          [1, 2, 14, 15],
          [toWei("40"), toWei("40"), toWei("20000"), toWei("60000")],
          [0, 0, 1, 1],
        ],
      );
      const sig = new web3().eth.accounts.sign(
        message,
        signer._signingKey().privateKey,
      ).signature;
      const StakeCardPayload = {
        _nftAddress: nft.address,
        _user: user.address,
        _ids: [1, 2, 14, 15],
        _prices: [toWei("40"), toWei("40"), toWei("20000"), toWei("60000")],
        _tiers: [0, 0, 1, 1], // 0 - lower, 1 - higher
        _signature: sig,
      };
      await madworld.connect(user).stakeCards(0, StakeCardPayload);
      const res = await madworld
        .connect(user)
        .getUserCardsStaked(0, user.address);
      expect(res[1]).to.have.deep.members([
        BigNumber.from("1"),
        BigNumber.from("2"),
      ]);
      expect(res[0]).to.have.deep.members([
        BigNumber.from("14"),
        BigNumber.from("15"),
      ]);
    });

    it("get apy by stake with big amount", async () => {
      const res = await madworld.getApyByStake(0, toWei("5000000"));
      expect(res.toString()).to.equal(toWei("0.175").toString());
    });

    it("set invalid apy", async () => {
      await expect(
        madworld
          .connect(owner)
          .addPool(
            "pool rewards",
            [{ amount: "0", apy: toWei("5000") }],
            nft.address,
            token.address,
            token.address,
            toWei("5000000000000"),
            5,
            10,
            Math.round(Date.now() / 1000),
            Math.round(Date.now() / 1000) + 3.154e7,
          ),
      ).to.revertedWith("MADworld: invalid APY amount");
      await expect(
        madworld
          .connect(owner)
          .addPool(
            "pool rewards",
            [{ amount: "200", apy: toWei("0") }],
            nft.address,
            token.address,
            token.address,
            toWei("5000000000000"),
            5,
            10,
            Math.round(Date.now() / 1000),
            Math.round(Date.now() / 1000) + 3.154e7,
          ),
      ).to.revertedWith("MADworld: invalid APY value");
    });
  });
});
