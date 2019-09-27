/**
 * Test for IvoCrowdsale
 *
 * @author Validity Labs AG <info@validitylabs.org>
 */

import {expectThrow, getEvents, BN, ZERO_ADDRESS, ZERO, ONE_ETHER, THREE_HUNDRED_ACCOUNTS, THREE_HUNDRED_VALUE} from '../../helpers/tools';
import {increase, increaseTo, latest, duration} from '../../helpers/OZ-tools';
import {it} from 'mocha';

const cnf = require('../../../config/contract-ivo.json');
const IvoToken = artifacts.require('./IvoToken');
const IvoCrowdsale = artifacts.require('./IvoCrowdsale');
const PrivateVault = artifacts.require('./PrivateVault');
const PresaleVault = artifacts.require('./PresaleVault');

const SaftVault = artifacts.require('./SaftVault');
const AdvisorsVesting = artifacts.require('./AdvisorsVesting');
const TeamVesting = artifacts.require('./TeamVesting');
const ReserveVault = artifacts.require('./ReserveVault');

const should = require('chai') // eslint-disable-line
    .use(require('chai-as-promised'))
    .use(require('chai-bn')(BN))
    .should();

const {NAME, SYMBOL} = cnf;
const DECIMALS = new BN(cnf.DECIMALS);
const TOTAL_SUPPLY_CAP = new BN(cnf.TOTAL_SUPPLY_CAP);              // 100 million IVO Tokens
const HARD_CAP = new BN(cnf.HARD_CAP);                              // 52.5 million IVO Tokens
const ROUNDS = new BN(cnf.ROUNDS);                                  // 3 rounds of crowdsale
const FIRST_ROUND_CAP = new BN(cnf.FIRST_ROUND_CAP);                // Cap of the 1st round
const SECOND_ROUND_CAP = new BN(cnf.SECOND_ROUND_CAP);              // Cap of the 2nd round
const INITIAL_FIAT_RATE = new BN(cnf.INITIAL_FIAT_RATE);            // 1 ETH = 125.00 USD, thus 12500
const NEW_FIAT_RATE = new BN(cnf.NEW_FIAT_RATE);                    // 1 ETH = 110.24 USD, thus 11024
const INITIAL_RATE = new BN(cnf.INITIAL_RATE);                      // 1 ETH = 389 IVO
const NEW_RATE = new BN(cnf.NEW_RATE);                              // 1 ETH = 343 IVO
const KYC_AML_RATE_DEDUCTED = new BN(cnf.KYC_AML_RATE_DEDUCTED);    // 96.5 %, thus 965
const KYC_AML_FEE_BASE = new BN(cnf.KYC_AML_FEE_BASE);              // 96.5 %, thus 1000
const INITIAL_CAP_OF_ROUND = [FIRST_ROUND_CAP, FIRST_ROUND_CAP.add(SECOND_ROUND_CAP), HARD_CAP];    // Absolut cap
const FIRST_ROUND_DISCOUNT = new BN(cnf.FIRST_ROUND_DISCOUNT);
const SECOND_ROUND_DISCOUNT = new BN(cnf.SECOND_ROUND_DISCOUNT);
const ROUND_DISCOUNT_BASE = new BN(cnf.ROUND_DISCOUNT_BASE);
const DISCOUNT_OF_ROUND = [FIRST_ROUND_DISCOUNT, SECOND_ROUND_DISCOUNT, ROUND_DISCOUNT_BASE];
const ONE = new BN(1);
const TWO = new BN(2);
const THREE = new BN(3);
const ONE_MILLION = new BN('1000000');
const SIX_MILLION_ETHER = ONE_MILLION.mul(new BN('6')).mul(ONE_ETHER);
const STO_START_TIME = new BN(cnf.STO_START_TIME);

const capOfRound = INITIAL_CAP_OF_ROUND;

function calculatePurchaseInRound(_availableWei, _rate, _allInRound) {
    if (!BN.isBN(_availableWei)) {
        _availableWei = new BN(_availableWei);
    }
    if (!BN.isBN(_rate)) {
        _rate = new BN(_rate);
    }
    if (!BN.isBN(_allInRound)) {
        _allInRound = new BN(_allInRound);
    }
    // let discount;
    // if (_allInRound.eq(ZERO)) {
    //     discount = FIRST_ROUND_DISCOUNT;
    // } else if (_allInRound.eq(ONE)) {
    //     discount = SECOND_ROUND_DISCOUNT;
    // } else {
    //     discount = THIRD_ROUND_DISCOUNT;
    //     // roundNum === TWO
    // }
    return new BN((_availableWei).mul(_rate).mul(ROUND_DISCOUNT_BASE).div(DISCOUNT_OF_ROUND[_allInRound]));
}

function calculateAvailableWei(_wei) {
    if (!BN.isBN(_wei)) {
        _wei = new BN(_wei);
    }
    return new BN((_wei).mul(KYC_AML_RATE_DEDUCTED).div(KYC_AML_FEE_BASE));
}

/**
 * IvoCrowdsale contract
 */
contract('IvoCrowdsale', ([creator, owner, manager1, manager2, ethInvestor1, ethInvestor2, fiatInvestor1, fiatInvestor2, randomAccount, wallet]) => {
    let tokenInstance;
    let crowdsaleInstance;
    let privateVaultInstance;
    let presaleVaultInstance;
    let saftVaultInstance;
    let advisorsVestingInstance;
    let teamVestingInstance;
    let reserveVaultInstance;

    before(async () => {
        tokenInstance = await IvoToken.deployed();
        crowdsaleInstance = await IvoCrowdsale.deployed();
        privateVaultInstance = await PrivateVault.deployed();
        presaleVaultInstance = await PresaleVault.deployed();
        saftVaultInstance = await SaftVault.deployed();
        advisorsVestingInstance = await AdvisorsVesting.deployed();
        teamVestingInstance = await TeamVesting.deployed();
        reserveVaultInstance = await ReserveVault.deployed();
    });

    describe('deployment', () => {
        let currentTime;
        before(async () => {
            currentTime = new BN((web3.eth.getBlock('latest')).timestamp);
        });
        context('when the initial rate is not positive', () => {
            it('fails', async () => {
                await expectThrow(IvoCrowdsale.new(STO_START_TIME, ZERO, INITIAL_FIAT_RATE, wallet, tokenInstance.address));
            });
        });
        context('when the initial fiat rate is not positive', () => {
            it('fails', async () => {
                await expectThrow(IvoCrowdsale.new(STO_START_TIME, INITIAL_RATE, ZERO, wallet, tokenInstance.address));
            });
        });
        context('when the startTime is not in the future', () => {
            it('fails', async () => {
                await expectThrow(IvoCrowdsale.new(currentTime, INITIAL_RATE, INITIAL_FIAT_RATE, wallet, tokenInstance.address));
            });
        });
        context('when the wallet is a zero address', () => {
            it('fails', async () => {
                await expectThrow(IvoCrowdsale.new(STO_START_TIME, INITIAL_RATE, INITIAL_FIAT_RATE, ZERO_ADDRESS, tokenInstance.address));
            });
        });
        context('when the token is a zero address', () => {
            it('fails', async () => {
                await expectThrow(IvoCrowdsale.new(STO_START_TIME, INITIAL_RATE, INITIAL_FIAT_RATE, wallet, ZERO_ADDRESS));
            });
        });
        context('when all parameters are provided', () => {
            it('deploys successfully', async () => {
                const anotherCrowdsaleInstance = await IvoCrowdsale.new(STO_START_TIME, INITIAL_RATE, INITIAL_FIAT_RATE, wallet, tokenInstance.address);
                assert.isDefined(anotherCrowdsaleInstance);
            });
        });
    });

    describe('when instantiated', () => {
        it('has the right round', async () => {
            (await crowdsaleInstance.rounds()).should.be.a.bignumber.that.equals(ROUNDS);
        });
        it('has the right rate', async () => {
            (await crowdsaleInstance.rate()).should.be.a.bignumber.that.equals(INITIAL_RATE);
        });
        it('has the right token', async () => {
            (await crowdsaleInstance.token()).should.be.equal(tokenInstance.address);
        });
        it('has nothing minted', async () => {
            (await crowdsaleInstance.mintedByCrowdsale()).should.be.a.bignumber.that.equals(ZERO);
        });
        it('has zero wei raised', async () => {
            (await crowdsaleInstance.weiRaised()).should.be.a.bignumber.that.equals(ZERO);
        });
        it('has a currentRound of zero', async () => {
            (await crowdsaleInstance.currentRound()).should.be.a.bignumber.that.equals(ZERO);
        });
        it('has the correct cap of round', async () => {
            (await crowdsaleInstance.capOfRound(ZERO)).should.be.a.bignumber.that.equals(FIRST_ROUND_CAP);
        });
        it('has the correct currentRoundCap', async () => {
            (await crowdsaleInstance.currentRoundCap()).should.be.a.bignumber.that.equals(FIRST_ROUND_CAP);
        });
        it('has the correct startingTime', async () => {
            (await crowdsaleInstance.startingTime()).should.be.a.bignumber.that.equals(STO_START_TIME);
        });
        it('the creator is the owner', async () => {
            (await crowdsaleInstance.isOwner({from: creator})).should.equal(true);
        });
        it('the cap is set', async () => {
            (await crowdsaleInstance.hardCap()).should.be.a.bignumber.that.equals(HARD_CAP);
        });
        it('crowdsale is paused', async () => {
            (await crowdsaleInstance.paused()).should.equal(false);
        });
        it('crowdsale is started', async () => {
            (await crowdsaleInstance.isStarted()).should.equal(false);
        });
        it('crowdsale is not finalized', async () => {
            (await crowdsaleInstance.finalized()).should.equal(false);
        });
        it('owner has a pausable manager role', async () => {
            (await crowdsaleInstance.isManager(creator)).should.equal(true);
        });
    });

    describe('manager role', () => {
        context('when adding a new manager', () => {
            context('when called by a non-owner/non-manager account', () => {
                it('fails', async () => {
                    await expectThrow(crowdsaleInstance.addManager(manager1, {from: randomAccount}));
                });
            });
            context('when called by an owner account', () => {
                context('when adding a zero address', () => {
                    it('fails', async () => {
                        await expectThrow(crowdsaleInstance.addManager(ZERO_ADDRESS, {from: creator}));
                    });
                });
                context('when called by a non-zero address', () => {
                    before(async () => {
                        await crowdsaleInstance.addManagers([manager1, manager2], {from: creator});
                    });
                    it('fails, because too many accounts provided', async () => {
                        await expectThrow(crowdsaleInstance.addManagers(THREE_HUNDRED_ACCOUNTS, {from: creator}));
                    });
                    it('succeeds', async () => {
                        (await crowdsaleInstance.isManager(manager1)).should.equal(true);
                        (await crowdsaleInstance.isManager(manager2)).should.equal(true);
                        (await crowdsaleInstance.numManager()).should.be.a.bignumber.that.equals(THREE);
                    });
                });
            });
        });
        context('when removing a new manager', () => {
            context('when called by a random account', () => {
                it('fails', async () => {
                    await expectThrow(crowdsaleInstance.removeManager(manager1, {from: randomAccount}));
                });
            });
            context('when called by a manager account', () => {
                it('fails', async () => {
                    await expectThrow(crowdsaleInstance.removeManager(manager1, {from: manager2}));
                });
            });
            context('when called by an owner account', () => {
                context('when removing a zero address', () => {
                    it('fails', async () => {
                        await expectThrow(crowdsaleInstance.removeManager(ZERO_ADDRESS, {from: creator}));
                    });
                });
                context('when removing a non-manager address', () => {
                    it('fails', async () => {
                        await expectThrow(crowdsaleInstance.removeManager(randomAccount, {from: creator}));
                    });
                });
                context('when removing a manager address', () => {
                    it('succeeds', async () => {
                        const tx = await crowdsaleInstance.removeManager(manager2);
                        const events = getEvents(tx, 'ManagerRemoved');
                        (events[0].account).should.equal(manager2);
                    });
                });
            });
        });
        context('when renounce a manager', () => {
            context('when there is more than one manager', () => {
                it('succeeds', async () => {
                    await crowdsaleInstance.renounceManager({from:manager1});
                    (await crowdsaleInstance.numManager()).should.be.a.bignumber.that.equals(ONE);
                });
            });
            context('when there is only one manager', () => {
                it('fails', async () => {
                    await expectThrow(crowdsaleInstance.renounceManager({from:creator}));
                });
            });
        });
    });

    describe('roleSetup', () => {
        before(async () => {
            await tokenInstance.roleSetup(
                owner,
                crowdsaleInstance.address,
                saftVaultInstance.address,
                privateVaultInstance.address,
                presaleVaultInstance.address,
                advisorsVestingInstance.address,
                teamVestingInstance.address,
                reserveVaultInstance.address,
                {from: creator});
        });
        context('when called by a non-owner account', () => {
            it('fails', async () => {
                await expectThrow(crowdsaleInstance.roleSetup(
                    owner,
                    privateVaultInstance.address,
                    presaleVaultInstance.address,
                    reserveVaultInstance.address,
                    {from: randomAccount}
                ));
            });
        });
        context('when called by the owner account', () => {
            context('when providing a zero address', () => {
                it('fails', async () => {
                    await expectThrow(crowdsaleInstance.roleSetup(
                        owner,
                        ZERO_ADDRESS,
                        presaleVaultInstance.address,
                        reserveVaultInstance.address,
                        {from: creator}
                    ));
                });
                it('fails', async () => {
                    await expectThrow(crowdsaleInstance.roleSetup(
                        owner,
                        privateVaultInstance.address,
                        ZERO_ADDRESS,
                        reserveVaultInstance.address,
                        {from: creator}
                    ));
                });
                it('fails', async () => {
                    await expectThrow(crowdsaleInstance.roleSetup(
                        owner,
                        privateVaultInstance.address,
                        presaleVaultInstance.address,
                        ZERO_ADDRESS,
                        {from: creator}
                    ));
                });
            });
            context('when providing correct vault addresses', () => {
                let tx1;
                const events = [];
                // let currentTime;
                before(async () => {
                    tx1 = await crowdsaleInstance.roleSetup(
                        owner,
                        privateVaultInstance.address,
                        presaleVaultInstance.address,
                        reserveVaultInstance.address,
                        {from: creator});
                    events[0] = getEvents(tx1, 'ManagerAdded');
                    events[1] = getEvents(tx1, 'ManagerRemoved');
                    events[2] = getEvents(tx1, 'OwnershipTransferred');
                });
                context('Roles (manager & minter) are properly set', () => {
                    it('transfer successfully the ownership', async () => {
                        (await crowdsaleInstance.owner()).should.be.equal(owner);
                        assert.equal(events[2][0].newOwner, owner, 'address of the new owner does not match');
                    });
                    it('creator does not have a pausable manager role', async () => {
                        (await crowdsaleInstance.isManager(creator)).should.equal(false);
                        assert.equal(events[1][0].account, creator, 'account mismatches');
                    });
                    it('owner has a pausable manager role', async () => {
                        (await crowdsaleInstance.isManager(owner)).should.equal(true);
                        assert.equal(events[0][0].account, owner, 'account mismatches');
                    });
                    it('crowdsale has one manager in total', async () => {
                        (await crowdsaleInstance.numManager()).should.be.a.bignumber.that.equals(ONE);
                    });
                });
            });
        });
        context('when called again by the owner account', () => {
            it('fails', async () => {
                await expectThrow(crowdsaleInstance.roleSetup(
                    owner,
                    privateVaultInstance.address,
                    presaleVaultInstance.address,
                    reserveVaultInstance.address,
                    {from: owner}
                ));
            });
        });
    });

    describe('reserveVault', () => {
        context('when receiveFor', () => {
            it('fails', async () => {
                await expectThrow(reserveVaultInstance.receiveFor(randomAccount, ONE_ETHER, {from: owner}));
            });
        });
    });

    describe('Ownership', () => {
        context('when the new account is zero', () => {
            it('fails', async () => {
                await expectThrow(crowdsaleInstance.transferOwnership(ZERO_ADDRESS, {from: owner}));
            });
        });
        context('when renounce the ownership', () => {
            it('fails', async () => {
                await expectThrow(crowdsaleInstance.renounceOwnership({from: owner}));
            });
            it('still has the old owner', async () => {
                (await crowdsaleInstance.owner()).should.be.equal(owner);
            });
        });
    });

    describe('whitelist buyers', () => {
        before(async () => {
            await crowdsaleInstance.addManagers([manager1, manager2], {from: owner});
        });
        context('add accounts to whitelist', () => {
            context('when called by a non-manager', () => {
                it('fails', async () => {
                    await expectThrow(crowdsaleInstance.addWhitelisted(ethInvestor1, {from: randomAccount}));
                });
            });
            context('when called by a manager', () => {
                context('when adding an account zero', () => {
                    it('fails', async () => {
                        await expectThrow(crowdsaleInstance.addWhitelisted(ZERO_ADDRESS, {from: manager1}));
                    });
                });
                context('when non-zero accounts', () => {
                    it('succeeds', async () => {
                        const tx = await crowdsaleInstance.addWhitelisted(ethInvestor1, {from: manager1});
                        const events = getEvents(tx, 'AddedWhitelisted');
                        assert.equal(events[0].account, ethInvestor1, 'address of the added investor does not match');
                        (await crowdsaleInstance.isWhitelisted(ethInvestor1)).should.equal(true);
                    });
                    it('succeeds in batch', async () => {
                        const tx = await crowdsaleInstance.addWhitelisteds([ethInvestor2, fiatInvestor1, randomAccount], {from: manager2});
                        const events = getEvents(tx, 'AddedWhitelisted');
                        assert.equal(events[0].account, ethInvestor2, 'address of the added investor does not match');
                        assert.equal(events[1].account, fiatInvestor1, 'address of the added investor does not match');
                        assert.equal(events[2].account, randomAccount, 'address of the added investor does not match');
                        (await crowdsaleInstance.isWhitelisted(ethInvestor2)).should.equal(true);
                        (await crowdsaleInstance.isWhitelisted(fiatInvestor1)).should.equal(true);
                        (await crowdsaleInstance.isWhitelisted(randomAccount)).should.equal(true);
                    });
                    it('fails in batch', async () => {
                        await expectThrow(crowdsaleInstance.addWhitelisteds(THREE_HUNDRED_ACCOUNTS, {from: manager1}));
                    });
                });
                context('when adding an existing account', () => {
                    it('fails', async () => {
                        await expectThrow(crowdsaleInstance.addWhitelisted(ethInvestor2, {from: manager1}));
                    });
                });
            });
        });
        context('remove accounts from whitelist', () => {
            context('when called by a non-manager', () => {
                it('fails', async () => {
                    await expectThrow(crowdsaleInstance.removeWhitelisted(ethInvestor1, {from: randomAccount}));
                });
            });
            context('when called by a manager', () => {
                it('fails if removing a zero account', async () => {
                    await expectThrow(crowdsaleInstance.removeWhitelisted(ZERO_ADDRESS, {from: manager1}));
                });
                it('succeeds', async () => {
                    const tx = await crowdsaleInstance.removeWhitelisted(randomAccount, {from: manager1});
                    const events = getEvents(tx, 'RemovedWhitelisted');
                    assert.equal(events[0].account, randomAccount, 'address of the added investor does not match');
                    (await crowdsaleInstance.isWhitelisted(randomAccount)).should.equal(false);
                });
                it('succeeds in batch', async () => {
                    const tx = await crowdsaleInstance.removeWhitelisteds([ethInvestor2, fiatInvestor1], {from: manager2});
                    const events = getEvents(tx, 'RemovedWhitelisted');
                    assert.equal(events[0].account, ethInvestor2, 'address of the added investor does not match');
                    assert.equal(events[1].account, fiatInvestor1, 'address of the added investor does not match');
                    (await crowdsaleInstance.isWhitelisted(ethInvestor2)).should.equal(false);
                    (await crowdsaleInstance.isWhitelisted(fiatInvestor1)).should.equal(false);
                });
                it('fails in batch', async () => {
                    await expectThrow(crowdsaleInstance.removeWhitelisteds(THREE_HUNDRED_ACCOUNTS, {from: manager1}));
                });
                it('fails if removing a non-existing account', async () => {
                    await expectThrow(crowdsaleInstance.removeWhitelisted(randomAccount, {from: manager1}));
                });
            });
        });
    });

    describe('Before crowdsale starts', () => {
        before(async () => {
            (await crowdsaleInstance.isStarted()).should.equal(false);
            (await crowdsaleInstance.currentRound()).should.be.a.bignumber.that.equals(ZERO);
            await crowdsaleInstance.addWhitelisteds([ethInvestor2, fiatInvestor1, fiatInvestor2], {from: manager2});
        });
        context('try to close the round', () => {
            context('A random account cannot do anything', () => {
                it('fails', async () => {
                    await expectThrow(crowdsaleInstance.closeCurrentRound({from: randomAccount}));
                });
            });
            context('Owner cannot do anything', () => {
                it('fails', async () => {
                    await expectThrow(crowdsaleInstance.closeCurrentRound({from: owner}));
                });
            });
            context('Manager cannot do anything', () => {
                it('fails', async () => {
                    await expectThrow(crowdsaleInstance.closeCurrentRound({from: owner}));
                });
            });
        });
        context('try to finalize the contract', () => {
            context('A random account cannot do anything', () => {
                it('fails', async () => {
                    await expectThrow(crowdsaleInstance.finalize({from: randomAccount}));
                });
            });
            context('Owner cannot do anything', () => {
                it('fails', async () => {
                    await expectThrow(crowdsaleInstance.finalize({from: owner}));
                });
            });
            context('Manager cannot do anything', () => {
                it('fails', async () => {
                    await expectThrow(crowdsaleInstance.finalize({from: owner}));
                });
            });
        });
        context('try to purchase token with ether', () => {
            context('for a non-whitelisted account', () => {
                it('fails', async () => {
                    await expectThrow(crowdsaleInstance.buyTokens(randomAccount, {from: ethInvestor1, value: ONE_MILLION}));
                });
            });
            context('for a whitelisted account', () => {
                context('A random account cannot do anything', () => {
                    it('fails', async () => {
                        await expectThrow(crowdsaleInstance.buyTokens(ethInvestor1, {from: randomAccount, value: ONE_MILLION}));
                    });
                });
                context('Owner cannot do anything', () => {
                    it('fails', async () => {
                        await expectThrow(crowdsaleInstance.buyTokens(ethInvestor1, {from: owner, value: ONE_MILLION}));
                    });
                });
                context('Manager cannot do anything', () => {
                    it('fails', async () => {
                        await expectThrow(crowdsaleInstance.buyTokens(ethInvestor1, {from: manager1, value: ONE_MILLION}));
                    });
                });
                context('Whitelisted investor cannot do anything', () => {
                    it('fails', async () => {
                        await expectThrow(crowdsaleInstance.buyTokens(ethInvestor1, {from: ethInvestor1, value: ONE_MILLION}));
                    });
                });
            });
        });
        context('try to purchase token with fiat', () => {
            context('to a non-whitelisted account', () => {
                it('fails', async () => {
                    await expectThrow(crowdsaleInstance.nonEthPurchase(fiatInvestor1, ONE_MILLION, {from: owner}));
                });
            });
            context('to a whitelisted account', () => {
                context('A random account cannot call the function', () => {
                    it('fails', async () => {
                        await expectThrow(crowdsaleInstance.nonEthPurchase(fiatInvestor1, ONE_MILLION, {from: randomAccount}));
                    });
                });
                context('Owner cannot do anything', () => {
                    it('fails', async () => {
                        await expectThrow(crowdsaleInstance.nonEthPurchase(fiatInvestor1, ONE_MILLION, {from: owner}));
                    });
                });
                context('Manager cannot do anything', () => {
                    it('fails', async () => {
                        await expectThrow(crowdsaleInstance.nonEthPurchase(fiatInvestor1, ONE_MILLION, {from: manager1}));
                    });
                });
                context('Whitelisted investor cannot do anything', () => {
                    it('fails,', async () => {
                        await expectThrow(crowdsaleInstance.nonEthPurchase(fiatInvestor1, ONE_MILLION, {from: ethInvestor1}));
                    });
                });
            });
        });
        context('try to pause the contract', () => {
            before(async () => {
                (await crowdsaleInstance.paused()).should.equal(false);
            });
            context('with a random account', () => {
                it('fails', async () => {
                    await expectThrow(crowdsaleInstance.pause({from: randomAccount}));
                });
            });
            context('with the owner account', () => {
                it('succeeds', async () => {
                    const tx = await crowdsaleInstance.pause({from: owner});
                    const events = getEvents(tx, 'BePaused');
                    (events[0].manager).should.equal(owner);
                });
            });
            context('with the manager account, again', () => {
                it('fails', async () => {
                    await expectThrow(crowdsaleInstance.pause({from: manager1}));
                });
            });
        });
        context('try to update rate', () => {
            context('with a random account', () => {
                it('fails', async () => {
                    await expectThrow(crowdsaleInstance.updateRate(NEW_FIAT_RATE, {from: randomAccount}));
                });
            });
            context('with a manager account', () => {
                it('succeeds', async () => {
                    const tx = await crowdsaleInstance.updateRate(NEW_FIAT_RATE, {from: manager1});
                    const events = getEvents(tx, 'UpdatedFiatRate');
                    (new BN(events[0].value)).should.be.a.bignumber.that.equals(NEW_FIAT_RATE);
                });
                it('updates both the rate and the fiatrate', async () => {
                    (await crowdsaleInstance.rate()).should.be.a.bignumber.that.equals(NEW_RATE);
                    (await crowdsaleInstance.fiatRate()).should.be.a.bignumber.that.equals(NEW_FIAT_RATE);
                });
            });
        });
    });

    describe('when crowdsale starts', () => {
        let cumulatedTokenAmount;
        before(async () => {
            await increaseTo(STO_START_TIME);
            (await crowdsaleInstance.isStarted()).should.equal(true);
        });
        context('the crowdsale contract is still paused', () => {
            before(async () => {
                (await crowdsaleInstance.paused()).should.equal(true);
            });
            it('still fails to purchase token', async () => {
                await expectThrow(crowdsaleInstance.buyTokens(ethInvestor1, {from: ethInvestor1, value: ONE_MILLION}));
            });
        });
        context('the crowdsale contract is manually unpaused', async () => {
            before(async () => {
                const tx = await crowdsaleInstance.unpause({from: manager1});
                (await crowdsaleInstance.paused()).should.equal(false);
                const events = getEvents(tx, 'BeUnpaused');
                (events[0].manager).should.equal(manager1);
                (await tokenInstance.isMinter(crowdsaleInstance.address)).should.equal(true);
            });
            it('has nothing minted from the crowdsale contract', async () => {
                (await crowdsaleInstance.mintedByCrowdsale()).should.be.a.bignumber.that.equals(ZERO);
            });
            it('cannot be unpaused another time', async () => {
                await expectThrow(crowdsaleInstance.unpause({from: owner}));
            });
        });
        context('the investor is not whitelisted ', async () => {
            before(async () => {
                (await crowdsaleInstance.isWhitelisted(randomAccount)).should.equal(false);
            });
            it('still fails to purchase token', async () => {
                await expectThrow(crowdsaleInstance.buyTokens(randomAccount, {from: randomAccount, value: ONE_MILLION}));
            });
        });
        context('the investor is whitelisted', async () => {
            context('ethPurchase (small amount)', async () => {
                let tokenAmount;
                let weiAmountAfterKycFee;
                before(async () => {
                    weiAmountAfterKycFee = calculateAvailableWei(ONE_MILLION);
                    tokenAmount = calculatePurchaseInRound(weiAmountAfterKycFee, NEW_RATE, ZERO);
                });
                context('buyTokens', async () => {
                    it('succeeds', async () => {
                        const tx = await crowdsaleInstance.buyTokens(ethInvestor1, {from: ethInvestor1, value: ONE_MILLION});
                        const events = getEvents(tx, 'TokensPurchased');
                        (events[0].purchaser).should.equal(ethInvestor1);
                        (events[0].beneficiary).should.equal(ethInvestor1);
                        (new BN(events[0].value)).should.be.a.bignumber.that.equals(ONE_MILLION);
                        (new BN(events[0].amount)).should.be.a.bignumber.that.equals(tokenAmount);
                    });
                    it('tokens are minted by crowdsale', async () => {
                        cumulatedTokenAmount = tokenAmount;
                        (new BN(await crowdsaleInstance.mintedByCrowdsale())).should.be.a.bignumber.that.equals(cumulatedTokenAmount);
                    });
                    it('private vault should keep the right amount of token in the right address', async () => {
                        (new BN(await privateVaultInstance.totalBalance())).should.be.a.bignumber.that.equals(cumulatedTokenAmount);
                        (new BN(await privateVaultInstance.balanceOf(ethInvestor1))).should.be.a.bignumber.that.equals(tokenAmount);
                    });
                    it('still in round one', async () => {
                        (new BN(await crowdsaleInstance.currentRound())).should.be.a.bignumber.that.equals(ZERO);
                        (tokenAmount).should.be.a.bignumber.that.is.lt(HARD_CAP);
                        (tokenAmount).should.be.a.bignumber.that.is.lt(INITIAL_CAP_OF_ROUND[ZERO]);
                    });
                });
                context('fallback function', async () => {
                    it('succeeds', async () => {
                        const tx = await crowdsaleInstance.sendTransaction({from: ethInvestor2, value: ONE_MILLION});
                        const events = getEvents(tx, 'TokensPurchased');
                        (events[0].purchaser).should.equal(ethInvestor2);
                        (events[0].beneficiary).should.equal(ethInvestor2);
                        (new BN(events[0].value)).should.be.a.bignumber.that.equals(ONE_MILLION);
                        (new BN(events[0].amount)).should.be.a.bignumber.that.equals(tokenAmount);
                    });
                    it('tokens are minted by crowdsale', async () => {
                        cumulatedTokenAmount = new BN(tokenAmount.add(tokenAmount));
                        (new BN(await crowdsaleInstance.mintedByCrowdsale())).should.be.a.bignumber.that.equals(cumulatedTokenAmount);
                    });
                    it('private vault should keep the right amount of token in the right address', async () => {
                        (new BN(await privateVaultInstance.totalBalance())).should.be.a.bignumber.that.equals(cumulatedTokenAmount);
                        (new BN(await privateVaultInstance.balanceOf(ethInvestor2))).should.be.a.bignumber.that.equals(tokenAmount);
                    });
                    it('still in round one', async () => {
                        (new BN(await crowdsaleInstance.currentRound())).should.be.a.bignumber.that.equals(ZERO);
                        (tokenAmount).should.be.a.bignumber.that.is.lt(HARD_CAP);
                        (tokenAmount).should.be.a.bignumber.that.is.lt(INITIAL_CAP_OF_ROUND[ZERO]);
                    });
                });
            });
            context('nonEthPurchase(s)', () => {
                context('when called by a non-manager', () => {
                    before(async () => {
                        (await crowdsaleInstance.isManager(randomAccount)).should.equal(false);
                    });
                    it('fails', async () => {
                        await expectThrow(crowdsaleInstance.nonEthPurchase(fiatInvestor1, ONE_MILLION, {from: randomAccount}));
                    });
                    it('fails', async () => {
                        await expectThrow(crowdsaleInstance.nonEthPurchases([fiatInvestor1, fiatInvestor2], [ONE_MILLION, ONE_MILLION], {from: randomAccount}));
                    });
                });
                context('when called by a manager', () => {
                    before(async () => {
                        (await crowdsaleInstance.isManager(manager2)).should.equal(true);
                    });
                    context('when providing wrong inputs', () => {
                        it('fails, because length does not match', async () => {
                            await expectThrow(crowdsaleInstance.nonEthPurchases([fiatInvestor1, fiatInvestor2], [ONE_MILLION], {from: manager2}));
                        });
                        it('fails, because the input is too long', async () => {
                            await expectThrow(crowdsaleInstance.nonEthPurchases(THREE_HUNDRED_ACCOUNTS, THREE_HUNDRED_VALUE, {from: manager2}));
                        });
                    });
                    context('when providing right inputs', () => {
                        it('succeeds', async () => {
                            const tx = await crowdsaleInstance.nonEthPurchases([fiatInvestor1, fiatInvestor2], [ONE_MILLION, ONE_MILLION], {from: manager1});
                            const events = getEvents(tx, 'NonEthTokenPurchased');
                            (events[0].beneficiary).should.equal(fiatInvestor1);
                            (new BN(events[0].tokenAmount)).should.be.a.bignumber.that.equals(ONE_MILLION);
                            (events[1].beneficiary).should.equal(fiatInvestor2);
                            (new BN(events[1].tokenAmount)).should.be.a.bignumber.that.equals(ONE_MILLION);
                        });
                        it('tokens are minted by crowdsale', async () => {
                            cumulatedTokenAmount = new BN(cumulatedTokenAmount.add(ONE_MILLION).add(ONE_MILLION));
                            (new BN(await crowdsaleInstance.mintedByCrowdsale())).should.be.a.bignumber.that.equals(cumulatedTokenAmount);
                            (new BN(await tokenInstance.balanceOf(privateVaultInstance.address))).should.be.a.bignumber.that.equals(cumulatedTokenAmount);
                        });
                        it('still in round one', async () => {
                            (new BN(await crowdsaleInstance.currentRound())).should.be.a.bignumber.that.equals(ZERO);
                            (cumulatedTokenAmount).should.be.a.bignumber.that.is.lt(HARD_CAP);
                            (cumulatedTokenAmount).should.be.a.bignumber.that.is.lt(INITIAL_CAP_OF_ROUND[ZERO]);
                        });
                        it('private vault should keep the right amount of token in the right address', async () => {
                            (new BN(await privateVaultInstance.totalBalance())).should.be.a.bignumber.that.equals(cumulatedTokenAmount);
                            (new BN(await privateVaultInstance.balanceOf(fiatInvestor1))).should.be.a.bignumber.that.equals(ONE_MILLION);
                        });
                    });
                });
            });
        });

        context('Increase round number', async () => {
            let expectedTokenAmount;
            context('jump to round two', async () => {
                before(async () => {
                    expectedTokenAmount = FIRST_ROUND_CAP.sub(new BN(cumulatedTokenAmount));
                });
                // the following test shall be modified
                context('nonEthPurchase(s)', () => {
                    context('when called by a non-manager', () => {
                        before(async () => {
                            (await crowdsaleInstance.isManager(randomAccount)).should.equal(false);
                        });
                        it('fails', async () => {
                            await expectThrow(crowdsaleInstance.nonEthPurchase(fiatInvestor1, expectedTokenAmount, {from: randomAccount}));
                        });
                        it('fails', async () => {
                            await expectThrow(crowdsaleInstance.nonEthPurchases([fiatInvestor1, fiatInvestor2], [expectedTokenAmount, expectedTokenAmount], {from: randomAccount}));
                        });
                    });
                    context('when called by a manager', () => {
                        before(async () => {
                            (await crowdsaleInstance.isManager(manager2)).should.equal(true);
                        });
                        it('succeeds', async () => {
                            const tx = await crowdsaleInstance.nonEthPurchase(fiatInvestor1, expectedTokenAmount, {from: manager1});
                            const events = getEvents(tx, 'NonEthTokenPurchased');
                            (events[0].beneficiary).should.equal(fiatInvestor1);
                            (new BN(events[0].tokenAmount)).should.be.a.bignumber.that.equals(expectedTokenAmount);
                            console.log('Gas costs:', tx.receipt.gasUsed);
                        });
                        it('tokens are minted by crowdsale', async () => {
                            cumulatedTokenAmount = new BN(cumulatedTokenAmount.add(expectedTokenAmount));
                            (new BN(await crowdsaleInstance.mintedByCrowdsale())).should.be.a.bignumber.that.equals(cumulatedTokenAmount);
                        });
                        it('tokens are minted by crowdsale, where is the error?', async () => {
                            (new BN(await tokenInstance.balanceOf(privateVaultInstance.address))).should.be.a.bignumber.that.equals(FIRST_ROUND_CAP);
                        });
                        it('jumps to round two', async () => {
                            (new BN(await crowdsaleInstance.currentRound())).should.be.a.bignumber.that.equals(ONE);
                            (new BN(await crowdsaleInstance.currentRoundCap())).should.be.a.bignumber.that.equals(INITIAL_CAP_OF_ROUND[ONE]);
                            (cumulatedTokenAmount).should.be.a.bignumber.that.is.lt(HARD_CAP);
                            (cumulatedTokenAmount).should.be.a.bignumber.that.is.gte(INITIAL_CAP_OF_ROUND[ZERO]);
                            (cumulatedTokenAmount).should.be.a.bignumber.that.is.lt(INITIAL_CAP_OF_ROUND[ONE]);
                            (await privateVaultInstance.knownReleaseTime()).should.equal(true);
                        });
                    });
                });
            });
            context('jump to round three', async () => {
                before(async () => {
                    expectedTokenAmount = INITIAL_CAP_OF_ROUND[ONE].sub(new BN(cumulatedTokenAmount)).sub(SIX_MILLION_ETHER);
                    await crowdsaleInstance.nonEthPurchase(fiatInvestor1, expectedTokenAmount, {from: manager1});
                    cumulatedTokenAmount = new BN(cumulatedTokenAmount.add(expectedTokenAmount));
                });
                context('close the round', () => {
                    before(async () => {
                        (new BN(await crowdsaleInstance.currentRound())).should.be.a.bignumber.that.equals(ONE);
                    });
                    context('called by a non-manager', async () => {
                        it('fails', async () => {
                            await expectThrow(crowdsaleInstance.closeCurrentRound({from: fiatInvestor1}));
                        });
                    });
                    context('called by a manager', async () => {
                        it('succeeds', async () => {
                            const tx = await crowdsaleInstance.closeCurrentRound({from: manager2});
                            const events = getEvents(tx, 'RoundStarted');
                            (new BN(events[0].roundNumber)).should.be.a.bignumber.that.equals(TWO);
                        });
                        it('presale vault should keep the right amount of token in the right address', async () => {
                            const newCap = (new BN(await crowdsaleInstance.capOfRound(ONE))).sub(new BN(await crowdsaleInstance.capOfRound(ZERO)));
                            (new BN(await presaleVaultInstance.totalBalance())).should.be.a.bignumber.that.equals(newCap);
                        });
                        it('jump to round three', async () => {
                            (new BN(await crowdsaleInstance.currentRound())).should.be.a.bignumber.that.equals(TWO);
                            (new BN(await crowdsaleInstance.currentRoundCap())).should.be.a.bignumber.that.equals(INITIAL_CAP_OF_ROUND[TWO]);
                            (cumulatedTokenAmount).should.be.a.bignumber.that.is.lt(HARD_CAP);
                            (cumulatedTokenAmount).should.be.a.bignumber.that.is.lt(INITIAL_CAP_OF_ROUND[ONE]);
                            (cumulatedTokenAmount).should.be.a.bignumber.that.is.lt(INITIAL_CAP_OF_ROUND[TWO]);
                            (await presaleVaultInstance.knownReleaseTime()).should.equal(true);
                        });
                    });
                });
            });
            context('jump to the end', async () => {
                before(async () => {
                    expectedTokenAmount = HARD_CAP.sub(new BN(cumulatedTokenAmount));
                });
                // the following test shall be modified
                context('nonEthPurchase(s)', () => {
                    it('succeeds', async () => {
                        const tx = await crowdsaleInstance.nonEthPurchase(fiatInvestor1, expectedTokenAmount, {from: manager2});
                        const events = getEvents(tx, 'NonEthTokenPurchased');
                        (events[0].beneficiary).should.equal(fiatInvestor1);
                        (new BN(events[0].tokenAmount)).should.be.a.bignumber.that.equals(expectedTokenAmount);
                    });
                    it('tokens are minted by crowdsale', async () => {
                        cumulatedTokenAmount = new BN(cumulatedTokenAmount.add(expectedTokenAmount));
                        (new BN(await crowdsaleInstance.mintedByCrowdsale())).should.be.a.bignumber.that.equals(cumulatedTokenAmount);
                    });
                    it('jumps to round three', async () => {
                        (new BN(await crowdsaleInstance.currentRound())).should.be.a.bignumber.that.equals(THREE);
                        (new BN(await crowdsaleInstance.currentRoundCap())).should.be.a.bignumber.that.equals(INITIAL_CAP_OF_ROUND[TWO]);
                        (new BN(await crowdsaleInstance.pricePercentagePerRound(TWO))).should.be.a.bignumber.that.equals(ROUND_DISCOUNT_BASE);
                        (await crowdsaleInstance.hardCapReached()).should.equal(true);
                        (await reserveVaultInstance.knownReleaseTime()).should.equal(true);
                        (cumulatedTokenAmount).should.be.a.bignumber.that.equals(HARD_CAP);
                        (cumulatedTokenAmount).should.be.a.bignumber.that.is.gt(INITIAL_CAP_OF_ROUND[ONE]);
                        (cumulatedTokenAmount).should.be.a.bignumber.that.is.lte(INITIAL_CAP_OF_ROUND[TWO]);
                    });
                    it('fails to close the current round', async () => {
                        await expectThrow(crowdsaleInstance.closeCurrentRound({from: manager1}));
                    });
                });
            });
            context('after reaching the hardcap', async () => {
                before(async () => {
                    (await crowdsaleInstance.finalized()).should.equal(false);
                    // it('token is paused', async () => {
                    (await tokenInstance.paused()).should.equal(true);
                    // });
                });
                it('also reaches the currentRoundCap', async () => {
                    (await crowdsaleInstance.currentRoundCapReached()).should.equal(true);
                });
                it('cannot purchase with fiat anymore', async () => {
                    await expectThrow(crowdsaleInstance.nonEthPurchase(fiatInvestor1, ONE, {from: randomAccount}));
                });
                it('cannot purchase with wei anymore', async () => {
                    await expectThrow(crowdsaleInstance.buyTokens(ethInvestor2, {from: manager1, value: ONE}));
                });
                it('can be finalized', async () => {
                    await crowdsaleInstance.finalize({from: manager1});
                    (await crowdsaleInstance.finalized()).should.equal(true);
                    // const tx = await crowdsaleInstance.finalize({from: manager1});
                    // const events1 = getEvents(tx, 'CrowdsaleFinalized');
                    // (events1[0].account).should.equal(manager1);
                });
            });
            context('cannot be finalized twice', () => {
                it('fails', async () => {
                    await expectThrow(crowdsaleInstance.finalize({from: manager1}));
                });
            });
        });

        context('After finalization', async () => {
            before(async () => {
                (await crowdsaleInstance.finalized()).should.equal(true);
            });
            context('manager is a minter', () => {
                it('is still possible to mint', async () => {
                    (await tokenInstance.isMinter(manager1)).should.equal(true);
                });
            });
        });
    });
});
