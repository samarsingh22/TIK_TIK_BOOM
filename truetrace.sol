// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MedChain {

    struct Batch {
        string batchId;
        string drugName;
        string manufactureDate;
        string expiryDate;
        address owner;
        bool recalled;
    }

    mapping(string => Batch) public batches;

    // Regulator address
    address public regulator;

    // Set regulator at deployment
    constructor() {
        regulator = msg.sender;
    }

    // Create new batch (only if not exists)
    function createBatch(
        string memory _batchId,
        string memory _drugName,
        string memory _mfgDate,
        string memory _expDate
    ) public {

        require(bytes(_batchId).length > 0, "Batch ID required");
        require(bytes(batches[_batchId].batchId).length == 0, "Batch already exists");

        batches[_batchId] = Batch(
            _batchId,
            _drugName,
            _mfgDate,
            _expDate,
            msg.sender,
            false
        );
    }

    // Transfer ownership (only current owner)
    function transferBatch(string memory _batchId, address _newOwner) public {

        require(bytes(batches[_batchId].batchId).length != 0, "Batch does not exist");
        require(batches[_batchId].owner == msg.sender, "Not owner");
        require(_newOwner != address(0), "Invalid address");

        batches[_batchId].owner = _newOwner;
    }

    // Recall batch (only regulator)
    function recallBatch(string memory _batchId) public {

        require(bytes(batches[_batchId].batchId).length != 0, "Batch does not exist");
        require(msg.sender == regulator, "Only regulator can recall");

        batches[_batchId].recalled = true;
    }

    // Verify batch details
    function verifyBatch(string memory _batchId)
        public view
        returns (
            string memory batchId,
            string memory drugName,
            string memory manufactureDate,
            string memory expiryDate,
            address owner,
            bool recalled
        )
    {
        require(bytes(batches[_batchId].batchId).length != 0, "Batch does not exist");

        Batch memory b = batches[_batchId];

        return (
            b.batchId,
            b.drugName,
            b.manufactureDate,
            b.expiryDate,
            b.owner,
            b.recalled
        );
    }
}
