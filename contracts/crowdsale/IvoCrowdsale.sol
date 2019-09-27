 /**
 * @title INVAO Crowdsale
 * @author Validity Labs AG <info@validitylabs.org>
 */
// solhint-disable-next-line compiler-fixed, compiler-gt-0_5
pragma solidity ^0.5.0;

import "../../node_modules/openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "../../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./IIvoCrowdsale.sol";
import "../vault/IVault.sol";
import "../property/CounterGuard.sol";
import "../property/Reclaimable.sol";
import "./WhitelistCrowdsale.sol";
import "./NonEthPurchasableCrowdsale.sol";
import "./CappedMultiRoundCrowdsale.sol";
import "./PausableCrowdsale.sol";
import "./FinalizableCrowdsale.sol";
import "../../node_modules/openzeppelin-solidity/contracts/crowdsale/emission/MintedCrowdsale.sol";


contract IvoCrowdsale is IIvoCrowdsale, CounterGuard, Reclaimable, MintedCrowdsale, 
    NonEthPurchasableCrowdsale, CappedMultiRoundCrowdsale, WhitelistCrowdsale, 
    PausableCrowdsale, FinalizableCrowdsale {
    /*** PRE-DEPLOYMENT CONFIGURED CONSTANTS */
    uint256 private constant ROUNDS = 3;
    uint256 private constant KYC_AML_RATE_DEDUCTED = 965;
    uint256 private constant KYC_AML_FEE_BASE = 1000;
    bool private _setRole;

    /**
     * @param startingTime The starting time of the crowdsale
     * @param rate Token per wei. This rate is going to be overriden, hence not important.
     * @param initialFiatRate USD per ETH. (As the number on CoinMarketCap.com)
     * Value written in cent.
     * @param wallet The address of the team which receives investors ETH payment.
     * @param token The address of the token.
     */
    /* solhint-disable */
    constructor(
        uint256 startingTime,
        uint256 rate,
        uint256 initialFiatRate,
        address payable wallet, 
        IERC20 token
    ) 
        public
        Crowdsale(rate, wallet, token)
        UpdatableRateCrowdsale(initialFiatRate)
        CappedMultiRoundCrowdsale(startingTime)
        StartingTimedCrowdsale(startingTime) {}
    /* solhint-enable */
    
    /**
     * @notice Batch minting tokens for investors paid with non-ETH
     * @param beneficiaries Recipients of the token purchase
     * @param amounts Amounts of token purchased
     */
    function nonEthPurchases(
        address[] calldata beneficiaries, 
        uint256[] calldata amounts
    ) 
        external
        onlyManager 
    {
        uint256 length = amounts.length;
        require(beneficiaries.length == length, "length !=");
        require(length <= 256, "To long, please consider shorten the array");
        for (uint256 i = 0; i < length; i++) {
            super.nonEthPurchase(beneficiaries[i], amounts[i]);
        }
    }
    
    /** OVERRIDE
     * @notice Allows onlyManager to mint token for beneficiaries.
     * @param beneficiary Recipient of the token purchase
     * @param tokenAmount Amount of token purchased
     */
    function nonEthPurchase(address beneficiary, uint256 tokenAmount) 
        public 
        onlyManager 
    {
        super.nonEthPurchase(beneficiary, tokenAmount);
    }

    /**
     * @notice Allows manager to manually close the round
     */
    function closeCurrentRound() public onlyWhileOpen {
        super.closeCurrentRound();
    }

    /**
     * @notice setup roles and contract addresses for the crowdsale contract
     * @dev This function can only be called once by the owner.
     * @param newOwner The address of the new owner/manager.
     * @param privateVault The address of private sale vault
     * @param presaleVault The address of presale vault.
     * @param reserveVault The address of reverve vault.
     */
    function roleSetup(
        address newOwner,
        IVault privateVault,
        IVault presaleVault,
        IVault reserveVault
    )
        public
        onlyOwner
        onlyOnce(_setRole)
    {
        _setVaults(privateVault, presaleVault, reserveVault);
        addManager(newOwner);
        _removeManager(msg.sender);
        transferOwnership(newOwner);
        _setRole = true;
    }

     /** OVERRIDE
     * @notice Specify the actions in the finalization of the crowdsale. 
     * Add the manager as a token minter and renounce itself the minter role
     * role of the token contract. 
     */
    function finalize() public onlyManager {
        require(this.currentRound() == ROUNDS, "Multi-rounds has not yet completed");
        super.finalize();
        PausableManager(address(token())).unpause();
        ERC20Mintable(address(token())).addMinter(msg.sender);
        ERC20Mintable(address(token())).renounceMinter();
    }

    /*** INTERNAL/PRIVATE ***/    
    /** OVERRIDE
    * @notice Calculate the usable wei after taking out the KYC/AML fee, i.e. 96.5 %
    * @dev Override to extend the way in which ether is converted to tokens.
    * @param weiAmount Value in wei to be converted into tokens
    * @return Number of tokens that can be purchased after deducting the AML/KYC fee.
    */
    function _getTokenAmount(uint256 weiAmount)
        internal
        view 
        returns (uint256)
    {
        uint256 availableWei = weiAmount.mul(KYC_AML_RATE_DEDUCTED).div(KYC_AML_FEE_BASE);
        return super._getTokenAmount(availableWei);
    }
}