/**
 * @title Interface of IVO Crowdale
 * @author Validity Labs AG <info@validitylabs.org>
 */
// solhint-disable-next-line compiler-fixed, compiler-gt-0_5
pragma solidity ^0.5.0;


contract IIvoCrowdsale {
    /**
     * @return The starting time of the crowdsale.
     */
    function startingTime() public view returns(uint256);
}