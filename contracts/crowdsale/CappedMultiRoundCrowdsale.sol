/**
 * @title Multi-round with cap Crowdsale
 * @author Validity Labs AG <info@validitylabs.org>
 */
// solhint-disable-next-line compiler-fixed, compiler-gt-0_5
pragma solidity ^0.5.0;

import "./UpdatableRateCrowdsale.sol";
import "../vault/IVault.sol";
import "../../node_modules/openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "../../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../../node_modules/openzeppelin-solidity/contracts/crowdsale/Crowdsale.sol";


contract CappedMultiRoundCrowdsale is UpdatableRateCrowdsale {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    /*** PRE-DEPLOYMENT CONFIGURED CONSTANTS */
    uint256 private constant ROUNDS = 3;
    uint256 private constant CAP_ROUND_ONE = 22500000 ether;
    uint256 private constant CAP_ROUND_TWO = 37500000 ether;
    uint256 private constant CAP_ROUND_THREE = 52500000 ether;
    uint256 private constant HARD_CAP = 52500000 ether;
    uint256 private constant PRICE_PERCENTAGE_ROUND_ONE = 80;
    uint256 private constant PRICE_PERCENTAGE_ROUND_TWO = 90;
    uint256 private constant PRICE_PERCENTAGE_ROUND_THREE = 100;
    uint256 private constant PRICE_PERCENTAGE_BASE = 100;

    uint256 private _currentRoundCap;
    uint256 private _mintedByCrowdsale;
    uint256 private _currentRound;
    uint256[ROUNDS] private _capOfRound;
    uint256[ROUNDS] private _pricePercentagePerRound;
    address private privateVaultAddress;
    address private presaleVaultAddress;
    address private reserveVaultAddress;

    /**
     * Event for multi-round logging
     * @param roundNumber number of the current rounnd, starting from 0
     * @param timestamp blocktime of the start of the next block
     */
    event RoundStarted(uint256 indexed roundNumber, uint256 timestamp);

    /**
     * Constructor for the capped multi-round crowdsale
     * @param startingTime Time when the first round starts
     */
    /* solhint-disable */
    constructor (uint256 startingTime) internal {
        // update the private variable as the round number and the discount percentage is not changed.
        _pricePercentagePerRound[0] = PRICE_PERCENTAGE_ROUND_ONE;
        _pricePercentagePerRound[1] = PRICE_PERCENTAGE_ROUND_TWO;
        _pricePercentagePerRound[2] = PRICE_PERCENTAGE_ROUND_THREE;
        // update the milestones
        _capOfRound[0] = CAP_ROUND_ONE;
        _capOfRound[1] = CAP_ROUND_TWO;
        _capOfRound[2] = CAP_ROUND_THREE;
        // initiallization
        _currentRound;
        _currentRoundCap = _capOfRound[_currentRound];
        emit RoundStarted(_currentRound, startingTime);
    }
    /* solhint-enable */
    
    /**
    * @notice Modifier to be executed when multi-round is still going on
    */
    modifier stillInRounds() {
        require(_currentRound < ROUNDS, "Not in rounds");
        _;
    }

    /**
     * @notice Check vault addresses are correcly settled.
     */
     /* solhint-disable */
    modifier vaultAddressesSet() {
        require(privateVaultAddress != address(0) && presaleVaultAddress != address(0) && reserveVaultAddress != address(0), "Vaults are not set");
        _;
    }
    /* solhint-enable */

    /**
    * @return the cap of the crowdsale.
    */
    function hardCap() public pure returns(uint256) {
        return HARD_CAP;
    }

    /**
    * @return the cap of the current round of crowdsale.
    */
    function currentRoundCap() public view returns(uint256) {
        return _currentRoundCap;
    }
    
    /**
    * @return the amount of token issued by the crowdsale.
    */
    function mintedByCrowdsale() public view returns(uint256) {
        return _mintedByCrowdsale;
    }

    /**
    * @return the total round of crowdsales.
    */
    function rounds() public pure returns(uint256) {
        return ROUNDS;
    }

    /**
    * @return the index of current round.
    */
    function currentRound() public view returns(uint256) {
        return _currentRound;
    }

    /**
    * @return the cap of one round (relative value)
    */
    function capOfRound(uint256 index) public view returns(uint256) {
        return _capOfRound[index];
    }

    /**
    * @return the discounted price of the current round
    */
    function pricePercentagePerRound(uint256 index) public view returns(uint256) {
        return _pricePercentagePerRound[index];
    }
    
    /**
    * @notice Checks whether the cap has been reached.
    * @dev These two following functions should not be held because the state should be 
    * reverted, if the condition is met, therefore no more tokens that exceeds the cap
    * shall be minted.
    * @return Whether the cap was reached
    */
    function hardCapReached() public view returns (bool) {
        return _mintedByCrowdsale >= HARD_CAP;
    }

    /**
    * @notice Checks whether the cap has been reached.
    * @return Whether the cap was reached
    */
    function currentRoundCapReached() public view returns (bool) {
        return _mintedByCrowdsale >= _currentRoundCap;
    }

    /**
     * @notice Allows manager to manually close the round
     */
    function closeCurrentRound() public onlyManager stillInRounds {
        _capOfRound[_currentRound] = _mintedByCrowdsale;
        _updateRoundCaps(_currentRound);
    }

    /**
    * @dev Extend parent behavior requiring the crowdsale is in a valid round
    * @param beneficiary Token purchaser
    * @param weiAmount Amount of wei contributed
    */
    function _preValidatePurchase(
        address beneficiary,
        uint256 weiAmount
    )
        internal
        view
        stillInRounds
    {
        super._preValidatePurchase(beneficiary, weiAmount);
    }

    /**
    * @notice Extend parent behavior requiring purchase to respect the max 
    * token cap for crowdsale.
    * @dev If the transaction is about to exceed the hardcap, the crowdsale contract
    * will revert the entire transaction, because the contract will not refund any part
    * of msg.value
    * @param beneficiary Token purchaser
    * @param tokenAmount Amount of tokens purchased
    */
    function _processPurchase(
        address beneficiary,
        uint256 tokenAmount
    )
        internal
    {
        // Check if the hard cap (in IVO) is reached
        // This requirement is actually controlled when calculating the tokenAmount
        // inside _dealWithBigTokenPurchase(). So comment the following ou at the moment
        // require(_mintedByCrowdsale.add(tokenAmount) <= HARD_CAP, "Too many tokens that exceeds the cap");
        // After calculating the generated amount, now update the current round.
        // The following block is to process a purchase with amouts that exceeds the current cap.
        uint256 finalAmount = _mintedByCrowdsale.add(tokenAmount);
        uint256 totalMintedAmount = _mintedByCrowdsale;

        for (uint256 i = _currentRound; i < ROUNDS; i = i.add(1)) {
            if (finalAmount > _capOfRound[i]) {
                sendToCorrectAddress(beneficiary, _capOfRound[i].sub(totalMintedAmount), _currentRound);
                // the rest needs to be dealt in the next round.
                totalMintedAmount = _capOfRound[i];
                _updateRoundCaps(_currentRound);
            } else {
                _mintedByCrowdsale = finalAmount;
                sendToCorrectAddress(beneficiary, finalAmount.sub(totalMintedAmount), _currentRound);
                if (finalAmount == _capOfRound[i]) {
                    _updateRoundCaps(_currentRound);
                }
                break;
            }
        }
    }

    /**
    * @dev Override to extend the way in which ether is converted to tokens.
    * It tokens "discount" into consideration as well as multi-rounds.
    * @param weiAmount Value in wei to be converted into tokens
    * @return Number of tokens that can be purchased with the specified _weiAmount
    */
    function _getTokenAmount(uint256 weiAmount)
        internal view returns (uint256)
    {
        // Here we need to check if all tokens are sold in the same round.
        uint256 tokenAmountBeforeDiscount = super._getTokenAmount(weiAmount);
        uint256 tokenAmountForThisRound;
        uint256 tokenAmountForNextRound;
        uint256 tokenAmount;
        for (uint256 round = _currentRound; round < ROUNDS; round = round.add(1)) {
            (tokenAmountForThisRound, tokenAmountForNextRound) = 
            _dealWithBigTokenPurchase(tokenAmountBeforeDiscount, round);
            tokenAmount = tokenAmount.add(tokenAmountForThisRound);
            if (tokenAmountForNextRound == 0) {
                break;
            } else {
                tokenAmountBeforeDiscount = tokenAmountForNextRound;
            }
        }
        // After three rounds of calculation, there should be no more token to be 
        // purchased in the "next" round. Otherwise, it reaches the hardcap.
        require(tokenAmountForNextRound == 0, "there is still tokens for the next round...");
        return tokenAmount;
    }

    /**
     * @dev Set up addresses for vaults. Should only be called once during.
     * @param privateVault The vault address for private sale
     * @param presaleVault The vault address for presale.
     * @param reserveVault The vault address for reserve.
     */
    function _setVaults(
        IVault privateVault,
        IVault presaleVault,
        IVault reserveVault
    )
        internal
    {
        require(address(privateVault) != address(0), "Not valid address: privateVault");
        require(address(presaleVault) != address(0), "Not valid address: presaleVault");
        require(address(reserveVault) != address(0), "Not valid address: reserveVault");
        privateVaultAddress = address(privateVault);
        presaleVaultAddress = address(presaleVault);
        reserveVaultAddress = address(reserveVault);
    }

    /**
     * @dev When a big token purchase happens, it automatically jumps to the next round if
     * the cap of the current round reaches. 
     * @param tokenAmount The amount of tokens that is converted from wei according to the
     * updatable fiat rate. This amount has not yet taken the discount rate into account.
     * @return The amount of token sold in this round
     * @return The amount of token ready to be sold in the next round.
     */
    function _dealWithBigTokenPurchase(uint256 tokenAmount, uint256 round) 
        private
        view 
        stillInRounds 
        returns (uint256, uint256) 
    {
        // Get the maximum "tokenAmount" that can be issued in the current around with the
        // corresponding discount.
        // maxAmount = (absolut cap of the current round - already issued) * discount
        uint256 maxTokenAmountOfCurrentRound = (_capOfRound[round]
                                                .sub(_mintedByCrowdsale))
                                                .mul(_pricePercentagePerRound[round])
                                                .div(PRICE_PERCENTAGE_BASE);
        if (tokenAmount < maxTokenAmountOfCurrentRound) {
            // this purchase will be settled entirely in the current round
            return (tokenAmount.mul(PRICE_PERCENTAGE_BASE).div(_pricePercentagePerRound[round]), 0);
        } else {
            // need to consider cascading to the next round
            uint256 tokenAmountOfNextRound = tokenAmount.sub(maxTokenAmountOfCurrentRound);
            return (maxTokenAmountOfCurrentRound, tokenAmountOfNextRound);
        }
    }

    /**
     * @dev this function delivers token according to the information of the current round...
     * @param beneficiary The address of the account that should receive tokens in reality
     * @param tokenAmountToBeSent The amount of token sent to the destination addression.
     * @param roundNumber Round number where tokens shall be purchased...
     */
    function sendToCorrectAddress(
        address beneficiary, 
        uint256 tokenAmountToBeSent,
        uint256 roundNumber
    )
        private 
        vaultAddressesSet
    {
        if (roundNumber == 2) {
            // then tokens could be minted directly to holder's account
            // the amount shall be the 
            super._processPurchase(beneficiary, tokenAmountToBeSent);
        } else if (roundNumber == 0) {
            // tokens should be minted to the private sale vault...
            super._processPurchase(privateVaultAddress, tokenAmountToBeSent);
            // update the balance of the corresponding vault
            IVault(privateVaultAddress).receiveFor(beneficiary, tokenAmountToBeSent);
        } else {
            // _currentRound == 1, tokens should be minted to the presale vault
            super._processPurchase(presaleVaultAddress, tokenAmountToBeSent);
            // update the balance of the corresponding vault
            IVault(presaleVaultAddress).receiveFor(beneficiary, tokenAmountToBeSent);
        }
    }

    /**
     * @notice Eachtime, when a manager closes a round or a round_cap is reached, it needs
     * to update the info of the _currentRound, _currentRoundCap, _hardCap and _capPerRound[];
     * @param round currentRound number
     * @dev This function should only be triggered when there is a need of updating all
     * the params. The capPerRound shall be updated with the current mintedValue.
     */
    function _updateRoundCaps(uint256 round) private {
        if (round == 0) {
            // update the releasing time of private sale vault
            IVault(privateVaultAddress).updateReleaseTime(block.timestamp);
            _currentRound = 1;
            _currentRoundCap = _capOfRound[1];
        } else if (round == 1) {
            // update the releasing time of presale vault
            IVault(presaleVaultAddress).updateReleaseTime(block.timestamp);
            _currentRound = 2;
            _currentRoundCap = _capOfRound[2];
        } else {
            // when _currentRound == 2
            IVault(reserveVaultAddress).updateReleaseTime(block.timestamp);
            // finalize the crowdsale
            _currentRound = 3;
            _currentRoundCap = _capOfRound[2];
        }
        emit RoundStarted(_currentRound, block.timestamp);
    }
}