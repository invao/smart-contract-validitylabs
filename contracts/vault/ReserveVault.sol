/**
 * @title Reserve Vault
 * @author Validity Labs AG <info@validitylabs.org>
 */
// solhint-disable-next-line compiler-fixed, compiler-gt-0_5
pragma solidity ^0.5.0;

import "./BasicVault.sol";
import "../../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../../node_modules/openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";


contract ReserveVault is BasicVault {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    /*** PRE-DEPLOYMENT CONFIGURED CONSTANTS */
    uint256 private constant ALLOCATION = 10000000 ether;
    uint256 private constant RELEASE_PERIOD = 0 days; // End of STO
    uint256 private constant DEFAULT_RELEASETIME = 9999 days;  // A default time, doesn't really matter
    address private constant COMPANY_WALLET = 0x2EE30702c752c9f554dF867dF21D5b7f9865626d;

    /**
     * @notice Create the reserve vault
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
        _receiveFor(COMPANY_WALLET, ALLOCATION);
        roleSetup(newOwner);
    }
    /* solhint-enable */

    /** OVERRIDE
     * @dev When the crowdsale is closed, set the release time for this vault
     * @param crowdsaleEndTime The actual block.timestamp given by the crowdsale contract.
     * Time when the STO (3rd round) ends.
     */
    function updateReleaseTime(uint256 crowdsaleEndTime) 
        public 
        onlyCrowdsale
    {
        uint256 realReleaseTime = crowdsaleEndTime.add(RELEASE_PERIOD);
        _updateReleaseTime(crowdsaleEndTime, realReleaseTime);
    }

    /** OVERRIDE
     * @dev Cannot receive any other beneficiary
     * @param beneficiary The actual token owner once it gets released
     * @param value The amount of token associated to the beneficiary
     */
    // solhint-disable-next-line
    function receiveFor(address beneficiary, uint256 value) public {
        revert("cannot call receiceFor");
    }
}