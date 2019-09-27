/**
 * @title Private sale Vault (Round 1)
 * @author Validity Labs AG <info@validitylabs.org>
 */
// solhint-disable-next-line compiler-fixed, compiler-gt-0_5
pragma solidity ^0.5.0;

import "./BasicVault.sol";
import "../../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../../node_modules/openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";


contract PrivateVault is BasicVault {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    /*** PRE-DEPLOYMENT CONFIGURED CONSTANTS */
    uint256 private constant MAX_ALLOCATION = 22500000 ether;
    uint256 private constant RELEASE_PERIOD = 120 days; // 120 days after the STO ends
    uint256 private constant DEFAULT_RELEASETIME = 9999 days;  // A default time, doesn't really matter

    /**
     * @notice Create the private sale vault
     * @dev Upon the creation of the contract.
     * @param token The address of the token contract
     * @param crowdsale The address of the crowdsale contract
     * @param newOwner The address of the new owner of this contract.
     */
    /* solhint-disable */
    constructor(
        IERC20 token,
        address crowdsale,
        address newOwner
    )
        public
        BasicVault(token, crowdsale, false, DEFAULT_RELEASETIME, DEFAULT_RELEASETIME)
    {
        roleSetup(newOwner);
    }
    /* solhint-enable */

    /**
     * @notice Check if the maximum allocation has been reached
     * @dev Revert if the allocated amount has been reached/exceeded
     * @param value The amount of token to be added.
     */
    modifier capNotReached(uint256 value) {
        require(totalBalance().add(value) <= MAX_ALLOCATION, "Reached the maximum allocation");
        _;
    }

    /** OVERRIDE
     * @notice When the crowdsale is closed, set the release time for this vault
     * @param roundEndTime The actual block.timestamp given by the crowdsale contract.
     * Time when the 1st round ends.
     */
    function updateReleaseTime(uint256 roundEndTime) 
        public 
        onlyCrowdsale
    {
        uint256 realReleaseTime = roundEndTime.add(RELEASE_PERIOD);
        _updateReleaseTime(roundEndTime, realReleaseTime);
    }

    /** OVERRIDE
     * @notice function that could only called by the crowdsale contract..
     * @param beneficiary The actual token owner once it gets released
     * @param value The amount of token associated to the beneficiary
     */
    function receiveFor(address beneficiary, uint256 value)
        public
        onlyCrowdsale
        capNotReached(value)
    {
        _receiveFor(beneficiary, value);
    }
}