import { expect } from "chai";
import { ethers } from "hardhat";
import { parseEther } from "ethers/lib/utils";

describe("MultiSigWallet", () => {
    const MINIMUM_WALLETS = 3;
    let deployer, user, user2, notOwner;
    let wallets;
    let contractFactory, multiSigWallet;
    let initialContractBalance = parseEther("10"); // send this value on deploy
    beforeEach(async () => {
        let signers = await ethers.getSigners();
        deployer = signers[0];
        user = signers[1];
        user2 = signers[2];
        notOwner = signers[6];
        wallets = signers.slice(0, 5).map((signer) => signer.address);
        contractFactory = await ethers.getContractFactory("MultiSigWallet");
        multiSigWallet = await contractFactory.deploy(wallets, 3, { value: initialContractBalance });
    });

    describe("Deployment", () => {
        it("Reverts if number of wallets is less than MINIMUM_WALLETS (3)", async() => {
            let smallWalletSet = [deployer.address, user.address];
            await expect(contractFactory.deploy(smallWalletSet, 2)).to.be.revertedWith(
                "NotEnoughWallets"
            );
        });
        it("Reverts if required approvals is less 50% or less than the number of wallets", async() => {
            await expect(contractFactory.deploy(wallets, 2)).to.be.revertedWith(
                "InvalidNumberOfRequiredApprovals"
            );
        });
        it("Reverts if a sent wallet is invalid (0x0...0)", async() => {
            let zeroWalletAddress = "0x0000000000000000000000000000000000000000";
            let smallWalletSet = [deployer.address, user.address, zeroWalletAddress];
            await expect(contractFactory.deploy(smallWalletSet, 2)).to.be.revertedWith(
                "InvalidWallet"
            );
        });
        it("Reverts if there is a duplicate wallet", async() => {
            let smallWalletSet = [deployer.address, user.address, user.address];
            await expect(contractFactory.deploy(smallWalletSet, 2)).to.be.revertedWith(
                "DuplicateWallet"
            );
        });
        it("Properly creates a isOwner mapping", async() => {
            for(let i = 0; i < wallets.length; i++) {
                expect(await multiSigWallet.isOwner(wallets[i])).to.equal(true);
            }
        });       
    });

    describe("Proposes transaction", () => {
        it("Reverts if not a owner", async() => {
            await expect(multiSigWallet.connect(notOwner).proposeTransaction(deployer.address, parseEther("1"))).to.be.revertedWith(
                "NotOwner"
            );
        });
        it("Reverts if transaction value is higher than the contract balance", async() => {
            await expect(multiSigWallet.proposeTransaction(deployer.address, parseEther("11"))).to.be.revertedWith(
                "NotEnoughBalance"
            );
        });
        it("Creates a transaction", async() => {
            await multiSigWallet.proposeTransaction(deployer.address, parseEther("1"));
            let transaction = await multiSigWallet.transactions(0);
            expect(transaction.to).to.equal(deployer.address);
            expect(transaction.value).to.equal(parseEther("1"));
            expect(transaction.executed).to.equal(false);
        });
        it("Adds the proposer approve to the transaction", async() => {
            await multiSigWallet.proposeTransaction(deployer.address, parseEther("1"));
            expect(await multiSigWallet.hasApproved(1, deployer.address)).to.equal(true);
        })
    });

    describe("Approves transaction", () => {
        it("Reverts if not a owner", async() => {
            await expect(multiSigWallet.connect(notOwner).approveTransaction(1)).to.be.revertedWith(
                "NotOwner"
            );
        });
        it("Reverts if transaction does not exist", async() => {
            await expect(multiSigWallet.approveTransaction(1)).to.be.revertedWith(
                "InvalidTransactionId"
            );
        });
        it("Reverts if the transaction was already approved by owner", async() => {
            // Proposing also approves
            await multiSigWallet.proposeTransaction(deployer.address, parseEther("1"));
            // Trying to approve again
            await expect(multiSigWallet.approveTransaction(1)).to.be.revertedWith(
                "TransactionAlreadyApprovedByOwner"
            );
        });
        it("Adds the approval to the transaction", async() => {
            // Propose transaction and approve with `deployer`
            await multiSigWallet.proposeTransaction(deployer.address, parseEther("1"));
            // Should be false for the `user` before approving
            expect(await multiSigWallet.hasApproved(1, user.address)).to.equal(false);
            // Approve with `user`
            await multiSigWallet.connect(user).approveTransaction(1);
            // Should be true for the `user` after approving
            expect(await multiSigWallet.hasApproved(1, user.address)).to.equal(true);
        });
    });

    describe("Executes transaction", () => {
        beforeEach(async () => {
            // Propose transaction
            await multiSigWallet.proposeTransaction(deployer.address, parseEther("1"));
        });
        it("Reverts if transaction does not exist", async() => {
            await expect(multiSigWallet.executeTransaction(2)).to.be.revertedWith(
                "InvalidTransactionId"
            );
        });
        it("Reverts if the transaction was already executed", async() => {
            // User and user2 approves to reach the required approves
            await multiSigWallet.connect(user).approveTransaction(1);
            await multiSigWallet.connect(user2).approveTransaction(1);
            // Execute transaction
            await multiSigWallet.executeTransaction(1);
            // Trying to execute again
            await expect(multiSigWallet.executeTransaction(1)).to.be.revertedWith(
                "TransactionAlreadyExecuted"
            );
        });
        it("Reverts if transaction does not have enough approvals", async() => {
            await expect(multiSigWallet.executeTransaction(1)).to.be.revertedWith(
                "NotEnoughApprovals"
            );
        });
        it("Successfully moves money from contract to transaction destination", async() => {
            // User and user2 approves to reach the required approves
            await multiSigWallet.connect(user).approveTransaction(1);
            await multiSigWallet.connect(user2).approveTransaction(1);

            let deployerBalanceBefore = await ethers.provider.getBalance(deployer.address);
            let contractBalanceBefore = await ethers.provider.getBalance(multiSigWallet.address);
            await multiSigWallet.connect(user).executeTransaction(1);
            let deployerBalanceAfter = await ethers.provider.getBalance(deployer.address);
            let contractBalanceAfter = await ethers.provider.getBalance(multiSigWallet.address);

            expect(deployerBalanceAfter).to.equal(deployerBalanceBefore.add(parseEther("1")));
            expect(contractBalanceAfter).to.equal(contractBalanceBefore.sub(parseEther("1")));
        });
    });
})