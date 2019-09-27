/**
 * @title Crowdsale that allows to be purchased with fiat
 * @dev Functionalities in this contract could also be pausable, besides managerOnly
 * @author Validity Labs AG <info@validitylabs.org>
 */
// solhint-disable-next-line compiler-fixed, compiler-gt-0_5
pragma solidity ^0.5.0;

import "../../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../../node_modules/openzeppelin-solidity/contracts/crowdsale/Crowdsale.sol";


contract NonEthPurchasableCrowdsale is Crowdsale {
    event NonEthTokenPurchased(address indexed beneficiary, uint256 tokenAmount);

    /**
     * @notice Allows onlyManager to mint token for beneficiary.
     * @param beneficiary Recipient of the token purchase
     * @param tokenAmount Amount of token purchased
     */
    function nonEthPurchase(address beneficiary, uint256 tokenAmount) 
        public 
    {
        _preValidatePurchase(beneficiary, tokenAmount);
        _processPurchase(beneficiary, tokenAmount);
        emit NonEthTokenPurchased(beneficiary, tokenAmount);
    }
}