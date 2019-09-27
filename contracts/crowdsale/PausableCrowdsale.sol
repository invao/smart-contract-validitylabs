/**
 * @title Crowdsale with check on pausible
 * @dev Functionalities in this contract could also be pausable, besides managerOnly
 * This contract is similar to OpenZeppelin's PausableCrowdsale, yet with different 
 * contract inherited
 * @author Validity Labs AG <info@validitylabs.org>
 */
// solhint-disable-next-line compiler-fixed, compiler-gt-0_5
pragma solidity ^0.5.0;

import "../membership/PausableManager.sol";
import "../../node_modules/openzeppelin-solidity/contracts/crowdsale/Crowdsale.sol";


contract PausableCrowdsale is PausableManager, Crowdsale {

    /**
     * @notice Validation of an incoming purchase.
     * @dev Use require statements to revert state when conditions are not met. Adding
     * the validation that the crowdsale must not be paused.
     * @param _beneficiary Address performing the token purchase
     * @param _weiAmount Value in wei involved in the purchase
     */
    function _preValidatePurchase(
        address _beneficiary, 
        uint256 _weiAmount
    )
        internal 
        view 
        whenNotPaused 
    {
        return super._preValidatePurchase(_beneficiary, _weiAmount);
    }

}