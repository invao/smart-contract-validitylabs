/**
 * @title Crowdsale with updatable exchange rate
 * @dev Functionalities in this contract could also be pausable, besides managerOnly
 * @author Validity Labs AG <info@validitylabs.org>
 */
// solhint-disable-next-line compiler-fixed, compiler-gt-0_5
pragma solidity ^0.5.0;

import "../membership/PausableManager.sol";
import "../../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../../node_modules/openzeppelin-solidity/contracts/crowdsale/Crowdsale.sol";


// @TODO change the pausable manager to other role or the role to be created ->
// whitelisted admin
contract UpdatableRateCrowdsale is PausableManager, Crowdsale {
    using SafeMath for uint256;
    
    /*** PRE-DEPLOYMENT CONFIGURED CONSTANTS */
    // 1 IVO = 0.3213 USD
    uint256 private constant TOKEN_PRICE_USD = 3213;
    uint256 private constant TOKEN_PRICE_BASE = 10000;
    uint256 private constant FIAT_RATE_BASE = 100;

    // This vairable is not goint to override the _rate vairable in OZ's _rate vairable
    // because of the scope/visibility, however, we could override the getter function
    uint256 private _rate;
    // USD to ETH rate, as shown on CoinMarketCap.com
    // _rate = _fiatRate / ((1 - discount) * (TOKEN_PRICE_USD / TOKEN_PRICE_BASE))
    // e.g. If 1 ETH = 110.24 USD, _fiatRate is 11024.
    uint256 private _fiatRate; 

    /**
   * Event for fiat to ETH rate update
   * @param value the fiatrate
   * @param timestamp blocktime of the update
   */
    event UpdatedFiatRate (uint256 value, uint256 timestamp);

    /**
     * @param initialFiatRate The fiat rate (ETH/USD) when crowdsale starts
     * @dev 2 decimals. e.g. If 1 ETH = 110.24 USD, _fiatRate is 11024.
     */
    constructor (uint256 initialFiatRate) internal {
        require(initialFiatRate > 0, "fiat rate is not positive");
        _updateRate(initialFiatRate);
    }

    /**
     * @dev Allow manager to update the exchange rate when necessary.
     */
    function updateRate(uint256 newFiatRate) external onlyManager {
        _updateRate(newFiatRate);
    }

    /** OVERRIDE
    * @return the number of token units a buyer gets per wei.
    */
    function rate() public view returns (uint256) {
        return _rate;
    }

    /**
     * @return the ETH price (in USD) currently used in the crowdsale
     */
    function fiatRate() public view returns (uint256) {
        return _fiatRate;
    }

    /**
    * @notice Calculate the amount of token to be sold based on the amount of wei
    * @dev To be overriden to extend the way in which ether is converted to tokens.
    * @param weiAmount Value in wei to be converted into tokens
    * @return Number of tokens that can be purchased with the specified _weiAmount
    */
    function _getTokenAmount(uint256 weiAmount) internal view returns (uint256) {
        return weiAmount.mul(_rate);
    }

    /**
     * @notice Update the exchange rate when the fiat rate is changed
     * @dev Since we round the _rate now into an integer. There is a loss in purchase
     * E.g. When ETH is at 110.24$, one could have 343.106 IVO with 1 ETH of net 
     * contribution (after deducting the KYC/AML fee) in mainsale. However, only 343 IVO 
     * will be issued, due to the rounding, resulting in a loss of 0.35 $/ETH purchase.
     */
    function _updateRate(uint256 newFiatRate) internal {
        _fiatRate = newFiatRate;
        _rate = _fiatRate.mul(TOKEN_PRICE_BASE).div(TOKEN_PRICE_USD * FIAT_RATE_BASE);
        emit UpdatedFiatRate(_fiatRate, block.timestamp);
    }
}