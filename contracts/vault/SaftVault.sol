/**
 * @title SAFT Vault
 * @author Validity Labs AG <info@validitylabs.org>
 */
// solhint-disable-next-line compiler-fixed, compiler-gt-0_5
pragma solidity ^0.5.0;

import "./BasicVault.sol";
import "../crowdsale/IIvoCrowdsale.sol";
import "../../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../../node_modules/openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";


contract SaftVault is BasicVault {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    /*** PRE-DEPLOYMENT CONFIGURED CONSTANTS */
    uint256 private constant ALLOCATION = 22500000 ether;
    uint256 private constant RELEASE_PERIOD = 180 days; // 180 days after the starting time of the crowdsale;

    /**
     * @notice Create the SAFT vault
     * @dev Upon the creation of the contract.
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
        BasicVault(token, crowdsale, true, updateTime, updateTime.add(RELEASE_PERIOD))
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
     * @notice Add SAFT investors in batch.
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
            if (block.timestamp <= this.releaseTime()) {
                tokenToBeRecovered.safeTransfer(owner(), balance.sub(ALLOCATION));
            } else {
                tokenToBeRecovered.safeTransfer(owner(), balance.sub(this.totalBalance()));
            }
        } else {
            tokenToBeRecovered.safeTransfer(owner(), balance);
        }
    }

    /** OVERRIDE
     * @notice Managers can add SAFT investors' info to the SAFT vault before the SEED-ROUND
     * sale ends (a.k.a the start of the crowdsale)
     * @param beneficiary The actual token owner once it gets released
     * @param value The amount of token associated to the beneficiary
     */
    function receiveFor(address beneficiary, uint256 value)
        public 
        capNotReached(value)
    {
        require((block.timestamp < this.releaseTime()), "Cannot modifiy anymore");
        super.receiveFor(beneficiary, value);
    }

    /**
     * @notice Directly transfer the ownership to an address of Invao managing team
     * @dev This new owner is also the manage of the contract.
     * @param newOwner The address of the new owner
     */
    function roleSetup(address newOwner) internal {
        addManager(newOwner);
        super.roleSetup(newOwner);
    }
}