/**
 * @title Vault for private sale, presale, and SAFT
 * @dev Inspired by the TokenTimelock contract of OpenZeppelin
 * @author Validity Labs AG <info@validitylabs.org>
 */
// solhint-disable-next-line compiler-fixed, compiler-gt-0_5
pragma solidity ^0.5.0;

import "../membership/PausableManager.sol";
import "../property/Reclaimable.sol";
import "../property/CounterGuard.sol";
import "../property/ValidAddress.sol";
import "./IVault.sol";
import "../../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../../node_modules/openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";


contract BasicVault is IVault, Reclaimable, CounterGuard, ValidAddress, PausableManager {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    // ERC20 basic token contract being held
    IERC20 private _token;
    // The following info can only been updated by the crowdsale contract.
    // amount of tokens that each beneficiary deposits into this vault
    mapping(address=>uint256) private _balances;
    // what a vault should contain
    uint256 private _totalBalance;
    // timestamp of the possible update
    uint256 private _updateTime;
    // timestamp when token release is enabled
    uint256 private _releaseTime;
    // if the _releaseTime is effective
    bool private _knownReleaseTime;
    address private _crowdsale;

    event Received(address indexed owner, uint256 value);
    event Released(address indexed owner, uint256 value);
    event ReleaseTimeUpdated(address indexed account, uint256 updateTime, uint256 releaseTime);

    /**
     * @notice When timing is correct.
     */
    modifier readyToRelease {
        require(_knownReleaseTime && (block.timestamp >= _releaseTime), "Not ready to release");
        _;
    }

    /**
     * @notice When timing is correct.
     */
    modifier saleNotEnd {
        require(!_knownReleaseTime || (block.timestamp < _updateTime), "Cannot modifiy anymore");
        _;
    }

    /**
     * @notice Only crowdsale contract could take actions
     */
    modifier onlyCrowdsale {
        require(msg.sender == _crowdsale, "The caller is not the crowdsale contract");
        _;
    }
    
    
    /**
     * @notice Create a vault
     * @dev Upon the creation of the contract, the ownership should be transferred to the 
     * crowdsale contract.
     * @param token The address of the token contract
     * @param crowdsale The address of the crowdsale contract
     * @param knownWhenToRelease If the release time is known at creation time
     * @param updateTime The timestamp before which information is still updatable in this
     * contract
     * @param releaseTime The timestamp after which investors could claim their belongings.
     */
    /* solhint-disable */
    constructor(
        IERC20 token,
        address crowdsale,
        bool knownWhenToRelease,
        uint256 updateTime,
        uint256 releaseTime
    )
        public
        onlyValidAddress(crowdsale)
        isSenderNot(crowdsale)
    {
        _token = token;
        _crowdsale = crowdsale;
        _knownReleaseTime = knownWhenToRelease;
        _updateTime = updateTime;
        _releaseTime = releaseTime;
    }
    /* solhint-enable */

    /** OVERRIDE
     * @notice Let token owner to get the other tokens accidentally sent to this token address.
     * @dev This function allows the contract to hold certain amount of IvoToken, of 
     * which the token address is defined in the constructor of the contract.
     * @param tokenToBeRecovered address of the token to be recovered.
     */
    function reclaimToken(IERC20 tokenToBeRecovered) external onlyOwner {
        // only if the token is not the IVO token
        uint256 balance = tokenToBeRecovered.balanceOf(address(this));
        if (tokenToBeRecovered == _token) {
            tokenToBeRecovered.safeTransfer(owner(), balance.sub(_totalBalance));
        } else {
            tokenToBeRecovered.safeTransfer(owner(), balance);
        }
    }

    /**
     * @notice Give back the balance of a beneficiary
     * @param beneficiary The address of the beneficiary
     * @return The balance of the beneficiary 
     */
    function balanceOf(address beneficiary) public view returns (uint256) {
        return _balances[beneficiary];
    }

    /**
     * @return the total amount of token being held in this vault
     */
    function totalBalance() public view returns(uint256) {
        return _totalBalance;
    }

    /**
     * @return the token being held.
     */
    function token() public view returns(IERC20) {
        return _token;
    }

    /**
     * @return the address of the crowdsale contract.
     */
    function crowdsale() public view returns(address) {
        return _crowdsale;
    }

    /**
     * @return the time when the tokens are released.
     */
    function releaseTime() public view returns(uint256) {
        return _releaseTime;
    }

    /**
     * @return the time before when the update is still acceptable.
     */
    function updateTime() public view returns(uint256) {
        return _updateTime;
    }

    /**
     * @return the if the release time is known.
     */
    function knownReleaseTime() public view returns(bool) {
        return _knownReleaseTime;
    }

    /**
     * @notice function called by either crowdsale contract or the token minter, depending
     * on the type of the vault.
     * @param beneficiary The actual token owner once it gets released
     * @param value The amount of token associated to the beneficiary
     */
    function receiveFor(address beneficiary, uint256 value)
        public 
        saleNotEnd
        onlyManager
    {
        _receiveFor(beneficiary, value);
    }

    /**
    * @notice Transfers tokens held by the vault to beneficiary.
    */
    function release() public readyToRelease {
        _releaseFor(msg.sender, _balances[msg.sender]);
    }

    /**
    * @notice Transfers tokens held by the vault to beneficiary, who is differnt from the
    * msg.sender
    * @param account The account address for whom the vault releases the IVO token.
    */
    function releaseFor(address account) public readyToRelease {
        _releaseFor(account, _balances[account]);
    }

    /**
     * @notice Disable the update release time function
     * @dev By default this functionality is banned, only certain vaults can 
     * updateReleaseTime and thus override this function.
     */
     // solhint-disable-next-line
    function updateReleaseTime(uint256 newTime) public {
        revert("cannot update release time");
    }

    /**
     * @notice The vault receives tokens on behalf of an account
     * @param account The account address
     * @param value The acount received
     */
    function _receiveFor(address account, uint256 value) internal {
        _balances[account] = _balances[account].add(value);
        _totalBalance = _totalBalance.add(value);
        emit Received(account, value);
    }

     /**
     * @notice The vault releases tokens on behalf of an account
     * @param account The account address
     * @param amount The amount of token to be released
     */
    function _releaseFor(address account, uint256 amount) internal {
        require(amount > 0 && _balances[account] >= amount, "the account does not have enough amount");

        _balances[account] = _balances[account].sub(amount);
        _totalBalance = _totalBalance.sub(amount);

        _token.safeTransfer(account, amount);
        emit Released(account, amount);
    }

    /**
     * @notice Only updatable when this release time was not set up previously
     * @param newUpdateTime The timestamp before which information is still updatable in this vault
     * @param newReleaseTime The timestamp before which token cannot be retrieved.
     */
    function _updateReleaseTime(uint256 newUpdateTime, uint256 newReleaseTime) 
        internal
        onlyOnce(_knownReleaseTime) 
    {
        _knownReleaseTime = true;
        _updateTime = newUpdateTime;
        _releaseTime = newReleaseTime;
        emit ReleaseTimeUpdated(msg.sender, newUpdateTime, newReleaseTime);
    }

    /**
     * @notice Directly transfer the ownership to an address of Invao managing team
     * This owner does not necessarily be the manage of the contract.
     * @param newOwner The address of the new owner of the contract
     */
    function roleSetup(address newOwner) internal {
        _removeManager(msg.sender);
        transferOwnership(newOwner);
    }
}