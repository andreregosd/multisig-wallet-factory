// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import './MultiSigWallet.sol';

contract MultiSigFactory {
    mapping(address => address[]) private multisigsByWallet;
    
    event MultisigWalletCreated(address createdBy);

    constructor() {}

    /**
     * Creates a multisig. All the validations are made on the MultiSigWallet's constructor
     * 
     * Emits a {MultisigWalletCreated} event.
     */
    function createMultisigWallet(string memory walletName, address[] memory wallets, uint256 approvalsRequired) external {
        MultiSigWallet multiSigWallet = new MultiSigWallet(walletName, wallets, approvalsRequired);
        for (uint256 i = 0; i < wallets.length; i++) {
            multisigsByWallet[wallets[i]].push(address(multiSigWallet));
        }

        emit MultisigWalletCreated(msg.sender);
    }

    function getMultisigsBySender() external view returns(address[] memory) {
        return multisigsByWallet[msg.sender];
    }    
}