/**
 * @title Pausable Manager Role
 * @dev This manager can also pause a contract. This contract is developed based on the 
 * Pause contract of OpenZeppelin.
 * @author Validity Labs AG <info@validitylabs.org>
 */
// solhint-disable-next-line compiler-fixed, compiler-gt-0_5
pragma solidity ^0.5.0;

import "./ManagerRole.sol";


contract PausableManager is ManagerRole {

    event BePaused(address manager);
    event BeUnpaused(address manager);

    bool private _paused;   // If the crowdsale contract is paused, controled by the manager...

    constructor() internal {
        _paused = false;
    }

   /**
    * @notice Modifier to make a function callable only when the contract is not paused.
    */
    modifier whenNotPaused() {
        require(!_paused, "not paused");
        _;
    }

    /**
    * @notice Modifier to make a function callable only when the contract is paused.
    */
    modifier whenPaused() {
        require(_paused, "paused");
        _;
    }

    /**
    * @return true if the contract is paused, false otherwise.
    */
    function paused() public view returns(bool) {
        return _paused;
    }

    /**
    * @notice called by the owner to pause, triggers stopped state
    */
    function pause() public onlyManager whenNotPaused {
        _paused = true;
        emit BePaused(msg.sender);
    }

    /**
    * @notice called by the owner to unpause, returns to normal state
    */
    function unpause() public onlyManager whenPaused {
        _paused = false;
        emit BeUnpaused(msg.sender);
    }
}
