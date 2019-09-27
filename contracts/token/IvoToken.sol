/**
 * @title IVO token
 * @author Validity Labs AG <info@validitylabs.org>
 */
// solhint-disable-next-line compiler-fixed, compiler-gt-0_5
pragma solidity ^0.5.0;

import "../property/Reclaimable.sol";
import "../../node_modules/openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";
import "../../node_modules/openzeppelin-solidity/contracts/token/ERC20/ERC20Capped.sol";
import "../../node_modules/openzeppelin-solidity/contracts/token/ERC20/ERC20Burnable.sol";
import "./ERC20Snapshot.sol";
import "../membership/PausableManager.sol";
import "../vault/IVault.sol";
import "../property/CounterGuard.sol";


contract IvoToken is CounterGuard, Reclaimable, ERC20Detailed,
    ERC20Snapshot, ERC20Capped, ERC20Burnable, PausableManager {
    // /* solhint-disable */
    uint256 private constant SAFT_ALLOCATION = 22500000 ether;
    uint256 private constant RESERVE_ALLOCATION = 10000000 ether;
    uint256 private constant ADVISOR_ALLOCATION = 1500000 ether;
    uint256 private constant TEAM_ALLOCATION = 13500000 ether;

    address private _saftVaultAddress;
    address private _reserveVaultAddress;
    address private _advisorVestingAddress;
    address private _teamVestingAddress;
    mapping(address=>bool) private _listOfVaults;
    bool private _setRole;

    /**
     * @notice Constructor of the token contract
     * @param name The complete name of the token: "INVAO token"
     * @param symbol The abbreviation of the token, to be searched for on exchange: "IVO"
     * @param decimals The decimals of the token: 18
     * @param cap The max cap of the token supply: 100000000000000000000000000
     */
    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals,
        uint256 cap
    )
        public
        ERC20Detailed(name, symbol, decimals)
        ERC20Capped(cap) {
            pause();
        }

    /**
     * @notice Pausable transfer function, with exception of letting vaults/vesting
     * contracts transfer tokens to beneficiaries, when beneficiaries claim their token
     * from vaults or vesting contracts.
     * @param to The recipient address
     * @param value The amount of token to be transferred
     */
    function transfer(address to, uint256 value)
        public
        returns (bool)
    {
        require(!this.paused() || _listOfVaults[msg.sender], "The token is paused and you are not a valid vault/vesting contract");
        return super.transfer(to, value);
    }

    /**
     * @notice Pausable transferFrom function
     * @param from The address from which tokens are sent
     * @param to The recipient address
     * @param value The amount of token to be transferred.
     * @return If the transaction was successful in bool.
     */
    function transferFrom(address from, address to, uint256 value) public whenNotPaused returns (bool) {
        return super.transferFrom(from, to, value);
    }

    /**
     * @notice Pausable approve function
     * @param spender The authorized account to spend a certain amount of token on behalf of the holder
     * @param value The amount of token that is allowed to spent
     * @return If the transaction was successful in bool.
     */
    function approve(address spender, uint256 value) public whenNotPaused returns (bool) {
        return super.approve(spender, value);
    }

    /**
     * @notice Pausable increaseAllowance function
     * @param spender The address which will spend the funds.
     * @param addedValue The amount of tokens to increase the allowance by.
     * @return If the action was successful in bool.
     */
    function increaseAllowance(address spender, uint addedValue) public whenNotPaused returns (bool success) {
        return super.increaseAllowance(spender, addedValue);
    }

    /**
     * @notice Pausable decreaseAllowance function
     * @param spender The address which will spend the funds.
     * @param subtractedValue The amount of tokens to decrease the allowance by.
     * @return If the action was successful in bool.
     */
    function decreaseAllowance(address spender, uint subtractedValue) public whenNotPaused returns (bool success) {
        return super.decreaseAllowance(spender, subtractedValue);
    }

    /**
    * @notice setup roles and contract addresses for the new token
    * @param newOwner Address of the owner who is also a manager
    * @param crowdsaleContractAddress crowdsal address: can mint and pause token
    * @param saftVaultAddress Address of the SAFT vault contract.
    * @param privateVaultAddress Address of the private sale vault contract
    * @param presaleVaultAddress Address of the presale vault contract
    * @param advisorVestingAddress Address of the advisor vesting contract.
    * @param teamVestingAddress Address of the team vesting contract.
    * @param reserveVaultAddress Address of the reserve vault contract.
    */
    function roleSetup(
        address newOwner,
        address crowdsaleContractAddress,
        IVault saftVaultAddress,
        IVault privateVaultAddress,
        IVault presaleVaultAddress,
        IVault advisorVestingAddress,
        IVault teamVestingAddress,
        IVault reserveVaultAddress
    )
        public
        onlyOwner
        onlyOnce(_setRole)
    {
        _setRole = true;

        // set vault and vesting contract addresses
        _saftVaultAddress = address(saftVaultAddress);
        _reserveVaultAddress = address(reserveVaultAddress);
        _advisorVestingAddress = address(advisorVestingAddress);
        _teamVestingAddress = address(teamVestingAddress);
        _listOfVaults[_saftVaultAddress] = true;
        _listOfVaults[address(privateVaultAddress)] = true;
        _listOfVaults[address(presaleVaultAddress)] = true;
        _listOfVaults[_advisorVestingAddress] = true;
        _listOfVaults[_teamVestingAddress] = true;

        //After setting adresses of vaults, manager can trigger the allocation of tokens
        // to vaults. No need to mint to the private vault nor the presale vault  because
        // it's been minted dynamicly.
        mint(_saftVaultAddress, SAFT_ALLOCATION);
        mint(_reserveVaultAddress, RESERVE_ALLOCATION);
        mint(_advisorVestingAddress, ADVISOR_ALLOCATION);
        mint(_teamVestingAddress, TEAM_ALLOCATION);

        addManager(newOwner);
        addManager(crowdsaleContractAddress);
        addMinter(crowdsaleContractAddress);
        _removeManager(msg.sender);
        _removeMinter(msg.sender);
        transferOwnership(newOwner);
    }
}