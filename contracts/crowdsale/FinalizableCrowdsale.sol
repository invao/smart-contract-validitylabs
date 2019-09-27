/**
 * @title Finalizable crowdsale
 * @dev This contract is developed based on OpenZeppelin's FinalizableCrowdsale contract 
 * with a different inherited contract. 
 * @author Validity Labs AG <info@validitylabs.org>
 */
// solhint-disable-next-line compiler-fixed, compiler-gt-0_5
pragma solidity ^0.5.0;

import "../../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./StartingTimedCrowdsale.sol";


/**
 * @title FinalizableCrowdsale
 * @notice Extension of Crowdsale with a one-off finalization action, where one
 * can do extra work after finishing.
 * @dev Slightly different from OZ;s contract, due to the inherited "TimedCrowdsale" 
 * contract
 */
contract FinalizableCrowdsale is StartingTimedCrowdsale {
    using SafeMath for uint256;

    bool private _finalized;

    event CrowdsaleFinalized(address indexed account);

    constructor () internal {
        _finalized = false;
    }

    /**
     * @return true if the crowdsale is finalized, false otherwise.
     */
    function finalized() public view returns (bool) {
        return _finalized;
    }

    /**
     * @notice Must be called after crowdsale ends, to do some extra finalization
     * work. Calls the contract's finalization function.
     * @dev The requirement of endingTimeis removed
     */
    function finalize() public {
        require(!_finalized, "already finalized");

        _finalized = true;

        emit CrowdsaleFinalized(msg.sender);
    }
}