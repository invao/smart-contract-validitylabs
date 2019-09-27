/**
 * @title Dividend contract for Ivo
 * @author Validity Labs AG <info@validitylabs.org>
 */
// solhint-disable-next-line compiler-fixed, compiler-gt-0_5
pragma solidity ^0.5.0;

import "../property/ValidAddress.sol";
import "./IvoToken.sol";
import "../property/Reclaimable.sol";
import "../../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../../node_modules/openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "../../node_modules/openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";


contract IvoDividends is Reclaimable, ValidAddress {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    struct Dividend {
        uint256 recordDate;    // blocknumber when the deposit was made
        uint256 claimDeadline;  // deadline for claiming the dividend = claimingPeriod + timestamp when deposit was made
        IERC20 payoutToken;     // payout token, which could be different each time.
        uint256 payoutAmount;   // the total amount of tokens deposit
        uint256 claimedAmount;  // the total amount of tokens being claimed
        uint256 totalSupply;    // the total supply of ivo token when deposit was made
        bool recycled;          // If the unclaimed deposit was recycled by the team
        mapping(address=>bool) claimed; // If investors have claimed their dividends.
    }

    // TODO: update wallet
    address private constant TEAM_WALLET = 0xc3d6B6Ce9D3A3f3D0570b97f7e8fcb2a6F7F3082;   
    IvoToken private ivoToken;
    Dividend[] private dividends;
    // Record the balance of each ERC20 token deposited to this contract as dividends.
    mapping(address=>uint256) private totalBalance;

    event DividendDeposited(
        uint256 indexed dividendIndex, 
        address indexed payoutToken, 
        uint256 payoutAmount, 
        uint256 recordDate, 
        uint256 claimPeriod
    );

    event DividendClaimed(
        uint256 indexed dividendIndex, 
        address indexed claimer, 
        uint256 claimedAmount
    );

    event DividendRecycled(
        uint256 indexed dividendIndex, 
        uint256 recordDate, 
        uint256 recycledAmount
    );

    /**
     * @notice Check if the index is valid
     */
    modifier validDividendIndex(uint256 _dividendIndex) {
        require(_dividendIndex < dividends.length, "Such dividend does not exist");
        _;
    } 

    /**
    * @notice initialize the Dividend contract with the IVO Token contract and the new owner
    * @param _ivoToken The token address, of which the holders could claim dividends.
    * @param newOwner The address of the future owner of this contract
    */
    /* solhint-disable */
    constructor(
        address _ivoToken, 
        address newOwner
    ) 
        public 
        onlyValidAddress(_ivoToken)
    {
        ivoToken = IvoToken(_ivoToken);
        transferOwnership(newOwner);
    }
    /* solhint-enable */

    /** OVERRIDE
     * @notice Let token owner to get the other tokens accidentally sent to this token 
     * address. 
     * @dev This dividend contract tracks the type of tokens and the amount of tokens
     * it should keep for distributing tokens. The amount above the recorded amount shall
     * be reclaimed by the owner.
     * @param tokenToBeRecovered address of the token to be recovered.
     */
    function reclaimToken(IERC20 tokenToBeRecovered) external onlyOwner {
        // only if the token is not the IVO token
        uint256 balance = tokenToBeRecovered.balanceOf(address(this));
        tokenToBeRecovered.safeTransfer(owner(), balance.sub(totalBalance[address(tokenToBeRecovered)]));
    }

    /**
    * @notice deposit payoutDividend tokens (ERC20) into this contract
    * @param payoutToken ERC20 address of the token used for payout the current dividend 
    * @param amount uint256 total amount of the ERC20 tokens deposited to payout to all 
    * token holders as of previous block from when this function is included
    * @dev The owner should first call approve(IvoDividendsContractAddress, amount) 
    * in the payoutToken contract
    */
    function depositDividend(IERC20 payoutToken, uint256 claimPeriod, uint256 amount)
        public
        onlyOwner
        onlyValidAddress(address(payoutToken))
    {
        require(amount > 0, "Deposit amount is not positive");
        dividends.push(
            Dividend(
                block.number,
                block.timestamp.add(claimPeriod),
                payoutToken,
                amount,
                0,
                ivoToken.totalSupply(),
                false
            )
        );
        totalBalance[address(payoutToken)] = totalBalance[address(payoutToken)].add(amount);
        payoutToken.safeTransferFrom(msg.sender, address(this), amount);
        emit DividendDeposited((dividends.length).sub(1), address(payoutToken), amount, block.number, claimPeriod);
    }

    /**
     * @notice Token holder claim their dividends
     * @param dividendIndex The index of the deposit dividend to be claimed.
     */
    function claimDividend(uint256 dividendIndex) 
        public 
        validDividendIndex(dividendIndex) 
    {
        Dividend storage dividend = dividends[dividendIndex];
        require(dividend.claimed[msg.sender] == false, "Dividend already claimed");
        require(dividend.recycled == false, "Dividend already recycled");
        require(dividend.claimDeadline >= block.timestamp, "No longer claimable");
        _claimDividend(dividendIndex, msg.sender);
    }

    /**
     * @notice Claim dividends from a startingIndex to all possible dividends
     * @param startingIndex The index from which the loop of claiming dividend starts
     * @dev To claim all dividends from the beginning, set this value to 0.
     * This parameter may help reducing the risk of running out-of-gas due to many loops
     */
    function claimAllDividends(uint256 startingIndex) 
        public 
        validDividendIndex(startingIndex) 
    {
        for (uint256 i = startingIndex; i < dividends.length; i++) {
            Dividend storage dividend = dividends[i];
            if (dividend.claimed[msg.sender] == false 
                && dividend.claimDeadline >= block.timestamp 
                && dividend.recycled == false) {
                _claimDividend(i, msg.sender);
            }
        }
    }

    /**
     * @notice recycle the dividend. Transfer tokens back to the team wallet
     * @param dividendIndex the storage index of the dividend in the pushed array.
     */
    function recycleDividend(uint256 dividendIndex) 
        public
        onlyOwner
        validDividendIndex(dividendIndex)     
    {
        Dividend storage dividend = dividends[dividendIndex];
        require(dividend.recycled == false, "Dividend already recycled");
        require(dividend.claimDeadline < block.timestamp, "Still claimable");

        dividend.recycled = true;
        uint256 recycledAmount = (dividend.payoutAmount).sub(dividend.claimedAmount);
        totalBalance[address(dividend.payoutToken)] = totalBalance[address(dividend.payoutToken)].sub(recycledAmount);
        (dividend.payoutToken).safeTransfer(TEAM_WALLET, recycledAmount);

        emit DividendRecycled(dividendIndex, block.number, recycledAmount);
    }

    /**
    * @notice get dividend info at index
    * @param dividendIndex the storage index of the dividend in the pushed array. 
    * @return recordDate (uint256) of the dividend
    * @return claimDeadline (uint256) of the dividend
    * @return payoutToken (address) of the dividend
    * @return payoutAmount (uint256) of the dividend
    * @return claimedAmount (uint256) of the dividend
    * @return the total supply (uint256) of the dividend
    * @return Whether this dividend was recycled (bool) of the dividend
    */
    function getDividend(uint256 dividendIndex) 
        public
        view 
        validDividendIndex(dividendIndex)
        returns (uint256, uint256, address, uint256, uint256, uint256, bool)
    {
        Dividend memory result = dividends[dividendIndex];
        return (
            result.recordDate,
            result.claimDeadline,
            address(result.payoutToken),
            result.payoutAmount,
            result.claimedAmount,
            result.totalSupply,
            result.recycled);
    }

    /**
     * @notice Internal function that claim the dividend
     * @param dividendIndex the index of the dividend to be claimed
     */
    function _claimDividend(uint256 dividendIndex, address account) internal {
        Dividend storage dividend = dividends[dividendIndex];
        uint256 balance = ivoToken.balanceOfAt(account, dividend.recordDate);
        uint256 claim = balance.mul(dividend.payoutAmount).div(dividend.totalSupply);
        dividend.claimed[account] = true;
        dividend.claimedAmount = (dividend.claimedAmount).add(claim);
        totalBalance[address(dividend.payoutToken)] = totalBalance[address(dividend.payoutToken)].sub(claim);

        (dividend.payoutToken).safeTransfer(account, claim);
        emit DividendClaimed(dividendIndex, account, claim);
    }
}