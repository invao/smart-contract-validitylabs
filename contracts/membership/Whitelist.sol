/**
 * @title Whitelist
 * @dev The WhitelistCrowdsale was not included in OZ's release at the moment of the 
 * development of this contract. Therefore, we've developed the Whitelist contract and
 * the WhitelistCrowdsale contract.
 * @author Validity Labs AG <info@validitylabs.org>
 */
// solhint-disable-next-line compiler-fixed, compiler-gt-0_5
pragma solidity ^0.5.0;

import "./PausableManager.sol";
import "../property/ValidAddress.sol";


contract Whitelist is ValidAddress, PausableManager {
    
    bool private _isWhitelisting;
    mapping (address => bool) private _isWhitelisted;

    event AddedWhitelisted(address indexed account);
    event RemovedWhitelisted(address indexed account);

    /**
     * @notice Adding account control, only whitelisted accounts could do certain actions.
     * @dev Whitelisting is enabled by default, There is not even the opportunity to 
     * disable it.
     */
    constructor() internal {
        _isWhitelisting = true;
    }
    
    /**
     * @dev Add an account to the whitelist, calling the corresponding internal function
     * @param account The address of the investor
     */
    function addWhitelisted(address account) external onlyManager {
        _addWhitelisted(account);
    }
    
    /**
     * @notice This function allows to whitelist investors in batch 
     * with control of number of interations
     * @param accounts The accounts to be whitelisted in batch
     */
    // solhint-disable-next-line 
    function addWhitelisteds(address[] calldata accounts) external onlyManager {
        uint256 length = accounts.length;
        require(length <= 256, "too long");
        for (uint256 i = 0; i < length; i++) {
            _addWhitelisted(accounts[i]);
        }
    }

    /**
     * @notice Remove an account from the whitelist, calling the corresponding internal 
     * function
     * @param account The address of the investor that needs to be removed
     */
    function removeWhitelisted(address account) 
        external 
        onlyManager  
    {
        _removeWhitelisted(account);
    }

    /**
     * @notice This function allows to whitelist investors in batch 
     * with control of number of interations
     * @param accounts The accounts to be whitelisted in batch
     */
    // solhint-disable-next-line 
    function removeWhitelisteds(address[] calldata accounts) 
        external 
        onlyManager  
    {
        uint256 length = accounts.length;
        require(length <= 256, "too long");
        for (uint256 i = 0; i < length; i++) {
            _removeWhitelisted(accounts[i]);
        }
    }

    /**
     * @notice Check if an account is whitelisted or not
     * @param account The account to be checked
     * @return true if the account is whitelisted. Otherwise, false.
     */
    function isWhitelisted(address account) public view returns (bool) {
        return _isWhitelisted[account];
    }

    /**
     * @notice Add an investor to the whitelist
     * @param account The address of the investor that has successfully passed KYC
     */
    function _addWhitelisted(address account) 
        internal
        onlyValidAddress(account)
    {
        require(_isWhitelisted[account] == false, "account already whitelisted");
        _isWhitelisted[account] = true;
        emit AddedWhitelisted(account);
    }

    /**
     * @notice Remove an investor from the whitelist
     * @param account The address of the investor that needs to be removed
     */
    function _removeWhitelisted(address account) 
        internal 
        onlyValidAddress(account)
    {
        require(_isWhitelisted[account] == true, "account was not whitelisted");
        _isWhitelisted[account] = false;
        emit RemovedWhitelisted(account);
    }
}