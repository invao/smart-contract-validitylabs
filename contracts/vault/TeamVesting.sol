/**
 * @title Vesting contract for the Ivo team
 * @author Validity Labs AG <info@validitylabs.org>
 */
// solhint-disable-next-line compiler-fixed, compiler-gt-0_5
pragma solidity ^0.5.0;

import "./BasicVault.sol";
import "../../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../../node_modules/openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";


contract TeamVesting is BasicVault {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    /*** PRE-DEPLOYMENT CONFIGURED CONSTANTS */
    uint256 private constant ALLOCATION = 13500000 ether;
    // 180 days after the crowdsale starts
    uint256 private constant CLIFF_DURATION = 180 days; 
    // Fixed start time 1 Oct 2018 (1538352000)
    uint256 private constant START_TIME = 1538352000;  
    // Fixed start time 1 Oct 2018 (1538352000) + 180 days of CLIFF_DURATION = 30 March 2019 (1553904000)
    uint256 private constant RELEASE_TIME = 1553904000;  
    // 1080 days of vesting duration
    uint256 private constant VESTING_DURATION = 1080 days;    
    // TODO: update wallet
    address private _teamWallet;  

    /**
     * @notice Create the team vesting vault
     * @dev Upon the creation of the contract, the ownership should be transferred to the 
     * crowdsale contract.
     * @param token The address of the token contract
     * @param crowdsale The address of the crowdsale contract
     * @param newOwner The address of the new owner of this contract.
     * @param teamWallet The address of the wallet of the managing team.
    */
    /* solhint-disable */
    constructor(
        IERC20 token,
        address crowdsale,
        address newOwner,
        address teamWallet
    )
        public
        BasicVault(token, crowdsale, true, START_TIME, RELEASE_TIME)
    {
        // Here the releaseTime is the end of the Cliff
        // set the amount of tokens allocated to the team wallet.
        _teamWallet = teamWallet;
        _receiveFor(_teamWallet, ALLOCATION);
        roleSetup(newOwner);
    }
    /* solhint-enable */

    /** OVERRIDE
    * @notice Transfers tokens held by the vault to beneficiary.
    */
    function release() 
        public 
        isSender(_teamWallet)
        readyToRelease 
    {
        uint256 releasedAmount = getAmountToBeReleased(msg.sender);
        _releaseFor(msg.sender, releasedAmount);
    }

    /** 
     * @return The address of the team wallet
    */
    function teamWallet() public view returns (address) {
        return _teamWallet;
    }

    /** OVERRIDE
    * @notice Transfers tokens held by the vault to beneficiary, who is differnt from the
    * msg.sender
    * @param account The account address for whom the vault releases the IVO token.
    */
    function releaseFor(address account) public readyToRelease {
        require(account == _teamWallet, "account doesn't match");
        uint256 releasedAmount = getAmountToBeReleased(account);
        _releaseFor(account, releasedAmount);
    }

    /** OVERRIDE
     * @notice Adding new beneficiary to the vesting vault
     * @dev Cannot receive any other beneficiary
     * @param beneficiary The actual token owner once it gets released
     * @param value The amount of token associated to the beneficiary
     */
    // solhint-disable-next-line
    function receiveFor(address beneficiary, uint256 value) public {
        revert("cannot call receiceFor");
    }
    
    /**
     * @notice calculate the amount of tokens ready to be released
     * @param account The address of the team wallet
     */
    function getAmountToBeReleased(address account) internal view returns (uint256) {
        uint256 timeFromUpdate = block.timestamp.sub(updateTime());
        if (timeFromUpdate < VESTING_DURATION) {
            return ALLOCATION.mul(timeFromUpdate).div(VESTING_DURATION)
            .sub(ALLOCATION.sub(balanceOf(account)));
        } else {
            return balanceOf(account);
        }
    }
}