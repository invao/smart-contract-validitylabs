/**
 * @title Snapshot Token Interface
 * @dev This is the interface of the ERC20Snapshot
 * @author Validity Labs AG <info@validitylabs.org>
 */
// solhint-disable-next-line compiler-fixed, compiler-gt-0_5
pragma solidity ^0.5.0;


contract IERC20Snapshot {
    /**
     * @notice Return the historical supply of the token at a certain time
     * @param blockNumber The block number of the moment when token supply is queried
     * @return The total supply at "blockNumber"
     */
    function totalSupplyAt(uint256 blockNumber) public view returns (uint256);

    /**
     * @notice Return the historical balance of an account at a certain time
     * @param owner The address of the token holder
     * @param blockNumber The block number of the moment when token supply is queried
     * @return The balance of the queried token holder at "blockNumber"
     */
    function balanceOfAt(address owner, uint256 blockNumber) public view returns (uint256);
}