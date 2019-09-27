/**
 * @title Manager Role
 * @dev This contract is developed based on the Manager contract of OpenZeppelin.
 * The key difference is the management of the manager roles is restricted to one owner
 * account. At least one manager should exist in any situation.
 * @author Validity Labs AG <info@validitylabs.org>
 */
// solhint-disable-next-line compiler-fixed, compiler-gt-0_5
pragma solidity ^0.5.0;

import "../../node_modules/openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "../../node_modules/openzeppelin-solidity/contracts/access/Roles.sol";
import "../../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";


contract ManagerRole is Ownable {
    using Roles for Roles.Role;
    using SafeMath for uint256;

    event ManagerAdded(address indexed account);
    event ManagerRemoved(address indexed account);

    Roles.Role private managers;
    uint256 private _numManager;

    constructor() internal {
        _addManager(msg.sender);
        _numManager = 1;
    }

    /**
     * @notice Only manager can take action
     */
    modifier onlyManager() {
        require(isManager(msg.sender), "The account is not a manager");
        _;
    }

    /**
     * @notice This function allows to add managers in batch with control of the number of 
     * interations
     * @param accounts The accounts to be added in batch
     */
    // solhint-disable-next-line
    function addManagers(address[] calldata accounts) external onlyOwner {
        uint256 length = accounts.length;
        require(length <= 256, "too many accounts");
        for (uint256 i = 0; i < length; i++) {
            _addManager(accounts[i]);
        }
    }
    
    /**
     * @notice Add an account to the list of managers,
     * @param account The account address whose manager role needs to be removed.
     */
    function removeManager(address account) external onlyOwner {
        _removeManager(account);
    }

    /**
     * @notice Check if an account is a manager
     * @param account The account to be checked if it has a manager role
     * @return true if the account is a manager. Otherwise, false
     */
    function isManager(address account) public view returns (bool) {
        return managers.has(account);
    }

    /**
     *@notice Get the number of the current managers
     */
    function numManager() public view returns (uint256) {
        return _numManager;
    }

    /**
     * @notice Add an account to the list of managers,
     * @param account The account that needs to tbe added as a manager
     */
    function addManager(address account) public onlyOwner {
        require(account != address(0), "account is zero");
        _addManager(account);
    }

    /**
     * @notice Renounce the manager role
     * @dev This function was not explicitly required in the specs. There should be at
     * least one manager at any time. Therefore, at least two when one manage renounces
     * themselves.
     */
    function renounceManager() public {
        require(_numManager >= 2, "Managers are fewer than 2");
        _removeManager(msg.sender);
    }

    /** OVERRIDE 
    * @notice Allows the current owner to relinquish control of the contract.
    * @dev Renouncing to ownership will leave the contract without an owner.
    * It will not be possible to call the functions with the `onlyOwner`
    * modifier anymore.
    */
    function renounceOwnership() public onlyOwner {
        revert("Cannot renounce ownership");
    }

    /**
     * @notice Internal function to be called when adding a manager
     * @param account The address of the manager-to-be
     */
    function _addManager(address account) internal {
        _numManager = _numManager.add(1);
        managers.add(account);
        emit ManagerAdded(account);
    }

    /**
     * @notice Internal function to remove one account from the manager list
     * @param account The address of the to-be-removed manager
     */
    function _removeManager(address account) internal {
        _numManager = _numManager.sub(1);
        managers.remove(account);
        emit ManagerRemoved(account);
    }
}
