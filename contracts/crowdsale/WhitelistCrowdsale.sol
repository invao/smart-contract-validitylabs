/**
 * @title Crowdsale with whitelists
 * @dev The WhitelistCrowdsale was not included in OZ's release at the moment of the 
 * development of this contract. Therefore, we've developed the Whitelist contract and
 * the WhitelistCrowdsale contract.
 * @author Validity Labs AG <info@validitylabs.org>
 */
// solhint-disable-next-line compiler-fixed, compiler-gt-0_5
pragma solidity ^0.5.0;

import "../../node_modules/openzeppelin-solidity/contracts/crowdsale/Crowdsale.sol";
import "../membership/Whitelist.sol";


/**
 * @title WhitelistCrowdsale
 * @dev Crowdsale in which only whitelisted users can contribute.
 */
contract WhitelistCrowdsale is Whitelist, Crowdsale {
    /**
    * @notice Extend parent behavior requiring beneficiary to be whitelisted. 
    * @dev Note that no restriction is imposed on the account sending the transaction.
    * @param _beneficiary Token beneficiary
    * @param _weiAmount Amount of wei contributed
    */
    function _preValidatePurchase(address _beneficiary, uint256 _weiAmount) 
        internal 
        view 
    {
        require(isWhitelisted(_beneficiary), "beneficiary is not whitelisted");
        super._preValidatePurchase(_beneficiary, _weiAmount);
    }
}