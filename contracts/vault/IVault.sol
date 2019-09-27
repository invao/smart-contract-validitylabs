/*
 * @title Interface for basic vaults
 * @author Validity Labs AG <info@validitylabs.org>
 */
// solhint-disable-next-line compiler-fixed, compiler-gt-0_5
pragma solidity ^0.5.0;


contract IVault {
    /**
     * @notice Adding beneficiary to the vault
     * @param beneficiary The account that receives token
     * @param value The amount of token allocated
     */
    function receiveFor(address beneficiary, uint256 value) public;

    /**
     * @notice Update the releaseTime for vaults
     * @param roundEndTime The new releaseTime
     */
    function updateReleaseTime(uint256 roundEndTime) public;
}