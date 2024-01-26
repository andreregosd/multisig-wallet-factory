# Multi-Signature Wallet Provider

## Overview
This repository contains the smart contracts for a Multi-Signature Wallet Provider built on the Ethereum blockchain. The system is comprised of two contracts: MultiSigFactory and MultiSigWallet.

## How it works
A user or a group of users can create a smart contract multi-signature wallet (or vault). The settings of the vault are the owners's wallets and the required number of approvals to execute a transaction and these settings are defined when the vault is created. The number os wallets should be three or more and the number of required approvals should be more than 50% of the number of wallets.
Any owner of the vault can propose a transaction and this transaction will stay on a pending state until the other owners approve the transaction.

## Contracts
 - MultiSigFactory.sol: This contract follows the factory pattern and is responsible for creating instances of the MultiSigWallet. Users can deploy multi-signature wallets with specific configurations using this factory.

 - MultiSigWallet.sol: The multi-signature wallet contract allows multiple addresses to control a single Ethereum wallet. Transactions from this wallet require approval from a predefined number of owners, providing enhanced security and control.

## Contact
Feel free to report any issues or suggest improvements in the [Issues](https://github.com/andreregosd/multisig-wallet-factory/issues) section.