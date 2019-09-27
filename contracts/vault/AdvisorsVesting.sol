/**
 * @title Vesting contract for advisors
 * @author Validity Labs AG <info@validitylabs.org>
 */
// solhint-disable-next-line compiler-fixed, compiler-gt-0_5
pragma solidity ^0.5.0;

import "./BasicVault.sol";
import "../crowdsale/IIvoCrowdsale.sol";
import "../../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../../node_modules/openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";


contract AdvisorsVesting is BasicVault {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    /*** PRE-DEPLOYMENT CONFIGURED CONSTANTS */
    uint256 private constant ALLOCATION = 1500000 ether;
    // 180 days after the crowdsale starts
    uint256 private constant CLIFF_DURATION = 180 days; 
    // A default time, doesn't really matter
    uint256 private constant DEFAULT_RELEASETIME = 9999 days;  
    // 360 days of vesting duration
    uint256 private constant VESTING_DURATION = 360 days;  
    mapping(address=>uint256) private _initialBalances;

    /**
     * @notice Create a vesting vault for investors
     * @dev Upon the creation of the contract, the ownership should be transferred to the 
     * crowdsale contract.
     * @param token The address of the token contract
     * @param crowdsale The address of the crowdsale contract
     * @param updateTime The timestamp before which information is still updatable in this
     * contract
     * @param newOwner The address of the new owner of this contract.
     */
    /* solhint-disable */
    constructor(
        IERC20 token,
        address crowdsale,
        uint256 updateTime,
        address newOwner
    )
        public
        BasicVault(token, crowdsale, true, updateTime, updateTime.add(CLIFF_DURATION))
    {
        require(updateTime == IIvoCrowdsale(crowdsale).startingTime(), "Update time not correct");
        roleSetup(newOwner);
    }
    /* solhint-enable */
    
    /**
     * @notice Check if the maximum allocation has been reached
     * @dev Revert if the allocated amount has been reached/exceeded
     * @param additional The amount of token to be added.
     */
    modifier capNotReached(uint256 additional) {
        require(totalBalance().add(additional) <= ALLOCATION, "exceed the maximum allocation");
        _;
    }

    /**
     * @notice Add advisors in batch.
     * @param amounts Amounts of token purchased
     * @param beneficiaries Recipients of the token purchase
     */
    // solhint-disable-next-line
    function batchReceiveFor(address[] calldata beneficiaries, uint256[] calldata amounts)
        external
    {
        uint256 length = amounts.length;
        require(beneficiaries.length == length, "length !=");
        require(length <= 256, "To long, please consider shorten the array");
        for (uint256 i = 0; i < length; i++) {
            receiveFor(beneficiaries[i], amounts[i]);
        }
    }

    /** OVERRIDE
     * @notice Let token owner to get the other tokens accidentally sent to this token address.
     * @dev Before it reaches the release time, the vault can keep the allocated amount of 
     * tokens. Since INVAO managers could still add SAFT investors during the SEED-ROUND,
     * the allocated amount of tokens stays in the SAFT vault during that period. Once the
     * SEED round ends, this vault can only hold max. totalBalance.
     * @param tokenToBeRecovered address of the token to be recovered.
     */
    function reclaimToken(IERC20 tokenToBeRecovered) external onlyOwner {
        // only if the token is not the IVO token
        uint256 balance = tokenToBeRecovered.balanceOf(address(this));
        if (tokenToBeRecovered == this.token()) {
            if (block.timestamp <= this.updateTime()) {
                tokenToBeRecovered.safeTransfer(owner(), balance.sub(ALLOCATION));
            } else {
                tokenToBeRecovered.safeTransfer(owner(), balance.sub(this.totalBalance()));
            }
        } else {
            tokenToBeRecovered.safeTransfer(owner(), balance);
        }
    }

    /**
     * @notice Give back the balance of a beneficiary before vesting
     * @param beneficiary The address of the beneficiary
     * @return The balance of the beneficiary 
     */
    function initialBalanceOf(address beneficiary) public view returns (uint256) {
        return _initialBalances[beneficiary];
    }

    /**
     * @notice Adding investors to the vesting contract
     * @dev An INVAO manager can do so before the SEED-ROUND sale ends 
     * (a.k.a the start of the crowdsale)
     * @param beneficiary The actual token owner once it gets released
     * @param value The amount of token associated to the beneficiary
     */
    function receiveFor(address beneficiary, uint256 value)
        public 
        capNotReached(value)
    {
        _initialBalances[beneficiary] = _initialBalances[beneficiary].add(value);
        super.receiveFor(beneficiary, value);
    }

    /** OVERRIDE
    * @notice Transfers tokens held by the vault to beneficiary.
    */
    function release() public readyToRelease {
        uint256 releasedAmount = getAmountToBeReleased(msg.sender);
        _releaseFor(msg.sender, releasedAmount);
    }

    /** OVERRIDE
    * @notice Transfers tokens held by the vault to beneficiary, who is differnt from the
    * msg.sender
    * @param account The account address for whom the vault releases the IVO token.
    */
    function releaseFor(address account) public readyToRelease {
        uint256 releasedAmount = getAmountToBeReleased(account);
        _releaseFor(account, releasedAmount);
    }

    /**
     * @notice Directly transfer the ownership to an address of Invao managing team
     * @dev This new owner is also the manage of the contract.
     * @param newOwner The address of the contract's new owner
     */
    function roleSetup(address newOwner) internal {
        addManager(newOwner);
        super.roleSetup(newOwner);
    }

    /**
     * @notice calculate the amount of tokens ready to be released
     * @param account The address of the advisor.
     * @return The amount to be released per account at the moment of calling
     */
    function getAmountToBeReleased(address account) internal view returns (uint256) {
        uint256 timeFromUpdate = block.timestamp.sub(updateTime());
        if (timeFromUpdate < VESTING_DURATION) {
            return _initialBalances[account].mul(timeFromUpdate).div(VESTING_DURATION)
            .sub(_initialBalances[account].sub(balanceOf(account)));
        } else {
            return balanceOf(account);
        }
    }
}