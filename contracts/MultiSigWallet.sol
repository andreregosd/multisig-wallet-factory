// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

error NotEnoughWallets();
error InvalidNumberOfRequiredApprovals();
error InvalidWallet();
error DuplicateWallet();
error NotEnoughBalance();
error NotOwner();
error InvalidTransactionId();
error TransactionAlreadyApprovedByOwner();
error NotEnoughApprovals();
error TransactionAlreadyExecuted();
error TransferFailed();

contract MultiSigWallet {
    struct Transaction {
        address to;
        uint256 value;
        uint256 approvals;
        bool executed;
    }

    uint constant MINIMUM_WALLETS = 3; // minimum number of wallets
    string private walletName;
    address[] private wallets;
    uint256 private approvalsRequired;
    mapping(address => bool) public isOwner;
    Transaction[] private transactions;
    mapping(uint256 => mapping(address => bool)) public hasApproved; // transaction id => wallet => has approved
    
    event TransactionProposed(address proposedBy, address destination, uint256 amount);
    event TransactionApproved(address confirmedBy, uint256 transactionId);
    event TransactionExecuted(uint256 transactionId);
    event FundsReceived(address, uint);

    modifier onlyOwners() {
        if(!isOwner[msg.sender])
            revert NotOwner();
        _;
    }

    /**
     * Initializes the contract with a set of wallets and the minimum required approvals
     *
     * Requirements:
     *  - `_wallets` should be an array with at least `MINIMUM` valid addresses and no duplicates
     *  - `_approvalsRequired` should be more than 50% of the `_wallets` length
     */
    constructor(string memory _walletName, address[] memory _wallets, uint256 _approvalsRequired) payable {
        if(_wallets.length < MINIMUM_WALLETS)
            revert NotEnoughWallets();

        if(_approvalsRequired <= _wallets.length / 2 || _approvalsRequired > _wallets.length)
            revert InvalidNumberOfRequiredApprovals();

        for(uint i = 0; i < _wallets.length; i++) {
            if(_wallets[i] == address(0))
                revert InvalidWallet();

            if (isOwner[_wallets[i]]) 
                revert DuplicateWallet();

            wallets.push(_wallets[i]);
            isOwner[_wallets[i]] = true;
        }
        walletName = _walletName;
        approvalsRequired = _approvalsRequired;
    }

    function getWalletName() external view returns(string memory) {
        return walletName;
    }

    function getTransactionsLength() external view returns(uint256) {
        return transactions.length;
    }

    function getApprovalsRequired() external view returns(uint256) {
        return approvalsRequired;
    }

    function getTransaction(uint256 index) external view returns(Transaction memory) {
        return transactions[index];
    }

    /**
     * Create a transaction with a value `value` and a destination address `to`.
     * This transaction is added to the storage to be approved by the other wallets `wallets`.
     * 
     * Requirements:
     *  - uses the `onlyOwners` modifier
     *  - `value` should be less or equal to the contract balance.
     *
     * Emits a {TransactionProposed} event.
     */
    function proposeTransaction(address to, uint256 value) external onlyOwners {
        if(value > address(this).balance) {
            revert NotEnoughBalance();
        }

        uint256 transactionId = transactions.length;
        transactions.push(Transaction(to, value, 0, false));
        
        emit TransactionProposed(msg.sender, to, value);
        _approveTransaction(transactionId);
    }

    /**
     * Approves a transaction after some validations by calling a private `_approveTransaction`.
     * 
     * Requirements:
     *  - uses the `onlyOwners` modifier
     *  - `transactionId` should exist.
     *  - reverts if the transaction was already approved by the `msg.sender`
     */
    function approveTransaction(uint256 transactionId) external onlyOwners {
        if(transactionId >= transactions.length) {
            revert InvalidTransactionId();
        }
        if(hasApproved[transactionId][msg.sender]) {
            revert TransactionAlreadyApprovedByOwner();
        }

        _approveTransaction(transactionId);
    }

    /**
     * Approves a transaction without validations.
     * This is a private function that does not have any validations.
     *
     * Emits a {TransactionApproved} event.
     */
    function _approveTransaction(uint256 transactionId) private {
        hasApproved[transactionId][msg.sender] = true;
        transactions[transactionId].approvals++;
        emit TransactionApproved(msg.sender, transactionId);
    }

    /**
     * Execute a transaction if the transaction has enough approvals
     * 
     * Requirements:
     *  - `transactionId` should exist.
     *  - reverts if the transaction was already executed
     *  - reverts if the transaction does not have at least `approvalsRequired` approvals.
     *
     * Emits a {TransactionExecuted} event.
     */
    function executeTransaction(uint256 transactionId) external {
        if(transactionId >= transactions.length) {
            revert InvalidTransactionId();
        }
        
        Transaction memory transaction = transactions[transactionId]; // to save gas
        if(transaction.executed) {
            revert TransactionAlreadyExecuted();
        }

        if(transaction.approvals < approvalsRequired) {
            revert NotEnoughApprovals();
        }

        transactions[transactionId].executed = true;
        (bool success,) = (transaction.to).call{ value : transaction.value }("");
        if(!success) {
            revert TransferFailed();
        }

        emit TransactionExecuted(transactionId);
    }

    receive() external payable {
        emit FundsReceived(msg.sender, msg.value);
    }
}