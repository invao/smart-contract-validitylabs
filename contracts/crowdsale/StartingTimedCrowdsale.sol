/**
 * @title Crowdsale with a limited opening time
 * @dev This contract is developed based on OpenZeppelin's TimedCrowdsale contract 
 * but removing the endTime. As the function `hasEnded()` is public accessible and 
 * necessary to return true when the crowdsale is ready to be finalized, yet no direct
 * link exists between the time and the end, here we take OZ's originalCrowdsale contract
 * and tweak according to the need.
 * @author Validity Labs AG <info@validitylabs.org>
 */
// solhint-disable-next-line compiler-fixed, compiler-gt-0_5
pragma solidity ^0.5.0;

import "../../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../../node_modules/openzeppelin-solidity/contracts/crowdsale/Crowdsale.sol";


contract StartingTimedCrowdsale is Crowdsale {
    using SafeMath for uint256;

    uint256 private _startingTime;

    /**
    * @notice Reverts if not in crowdsale time range.
    */
    modifier onlyWhileOpen {
        require(isStarted(), "Not yet started");
        _;
    }

    /**
    * @notice Constructor, takes crowdsale opening and closing times.
    * @param startingTime Crowdsale opening time
    */
    constructor(uint256 startingTime) internal {
        // solium-disable-next-line security/no-block-members
        require(startingTime >= block.timestamp, "Starting time is in the past");

        _startingTime = startingTime;
    }

    /**
    * @return the crowdsale opening time.
    */
    function startingTime() public view returns(uint256) {
        return _startingTime;
    }

    /**
    * @return true if the crowdsale is open, false otherwise.
    */
    function isStarted() public view returns (bool) {
        // solium-disable-next-line security/no-block-members
        return block.timestamp >= _startingTime;
    }

    /**
    * @notice Extend parent behavior requiring to be within contributing period
    * @param beneficiary Token purchaser
    * @param weiAmount Amount of wei contributed
    */
    function _preValidatePurchase(
        address beneficiary,
        uint256 weiAmount
    )
        internal
        onlyWhileOpen
        view
    {
        super._preValidatePurchase(beneficiary, weiAmount);
    }
}