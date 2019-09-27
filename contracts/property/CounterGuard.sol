/**
 * @title modifier contract that guards certain properties only triggered once
 * @author Validity Labs AG <info@validitylabs.org>
 */
// solhint-disable-next-line compiler-fixed, compiler-gt-0_5
pragma solidity ^0.5.0;


contract CounterGuard {
    /**
     * @notice Controle if a boolean attribute (false by default) was updated to true.
     * @dev This attribute is designed specifically for recording an action.
     * @param criterion The boolean attribute that records if an action has taken place
     */
    modifier onlyOnce(bool criterion) {
        require(criterion == false, "Already been set");
        _;
    }
}