/**
 * @title modifier contract that checks if the address is valid
 * @author Validity Labs AG <info@validitylabs.org>
 */
// solhint-disable-next-line compiler-fixed, compiler-gt-0_5
pragma solidity ^0.5.0;


contract ValidAddress {
    /**
     * @notice Check if the address is not zero
     */
    modifier onlyValidAddress(address _address) {
        require(_address != address(0), "Not a valid address");
        _;
    }

    /**
     * @notice Check if the address is not the sender's address
    */
    modifier isSenderNot(address _address) {
        require(_address != msg.sender, "Address is the same as the sender");
        _;
    }

    /**
     * @notice Check if the address is the sender's address
    */
    modifier isSender(address _address) {
        require(_address == msg.sender, "Address is different from the sender");
        _;
    }
}