/**
 * Test for Advisors vesting
 *
 * @author Validity Labs AG <info@validitylabs.org>
 */

import {expectThrow, getEvents, BN, getGasCost, ZERO_ADDRESS, ZERO, ONE_ETHER, THREE_HUNDRED_ACCOUNTS, THREE_HUNDRED_VALUE} from '../../helpers/tools';
import {increase, increaseTo, latest, duration} from '../../helpers/OZ-tools';
import {it} from 'mocha';
import {SSL_OP_MSIE_SSLV2_RSA_PADDING} from 'constants';
// import {logger as log} from '../../../tools/lib/logger';
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

const STO_START_TIME = new BN(cnf.STO_START_TIME);
const TOTAL_SUPPLY_CAP = new BN(cnf.TOTAL_SUPPLY_CAP);
const ADVISORS_VESTING_ALLOCATION = new BN(cnf.ADVISORS_VESTING_ALLOCATION);
const HUNDRED_EIGHTY_DAYS = new BN(cnf.HUNDRED_EIGHTY_DAYS);
const SIXTY_DAYS = new BN(cnf.SIXTY_DAYS);
const HUNDRED_TWENTY_DAYS = new BN(cnf.HUNDRED_TWENTY_DAYS);
const ONE = new BN('1');
const FOUR_HUNDRED_THOUSAND_ETHER = ONE_ETHER.mul(new BN('400000'));
const ONE_THIRD_OF_FOUR_HUNDRED_THOUSAND_ETHER = FOUR_HUNDRED_THOUSAND_ETHER.div(new BN('3'));
const TWO_THIRD_OF_FOUR_HUNDRED_THOUSAND_ETHER = FOUR_HUNDRED_THOUSAND_ETHER.mul(new BN('2')).div(new BN('3'));

/**
 * AdvisorVesting contract
 */
contract('AdvisorVesting', ([creator, owner, advisor1, advisor2, advisor3, randomAccount]) => {
    let tokenInstance;
    let crowdsaleInstance;
    let advisorsVestingInstance;
    let privateVaultInstance;
    let presaleVaultInstance;
    let saftVaultInstance;
    let teamVestingInstance;
    let reserveVaultInstance;
    let anotherTokenInstance;
    let anotherAdvisorVestingInstance;

    before(async () => {
        tokenInstance = await IvoToken.deployed();
        crowdsaleInstance = await IvoCrowdsale.deployed();
        advisorsVestingInstance = await AdvisorsVesting.deployed();
        privateVaultInstance = await PrivateVault.deployed();
        presaleVaultInstance = await PresaleVault.deployed();
        saftVaultInstance = await SaftVault.deployed();
        teamVestingInstance = await TeamVesting.deployed();
        reserveVaultInstance = await ReserveVault.deployed();

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

    describe('deployment', () => {
        context('when crowdsale is not a valid address', () => {
            it('fails', async () => {
                await expectThrow(AdvisorsVesting.new(tokenInstance.address, ZERO_ADDRESS, STO_START_TIME, owner));
            });
        });
        context('when sender address is not different from the crowdsale address', () => {
            it('fails', async () => {
                await expectThrow(AdvisorsVesting.new(tokenInstance.address, owner, STO_START_TIME, owner));
            });
        });
        context('when the startTime is not the same as that in the crowdsale contract', () => {
            it('fails', async () => {
                await expectThrow(AdvisorsVesting.new(tokenInstance.address, crowdsaleInstance.address, STO_START_TIME.add(new BN('12345')), owner));
            });
        });
        context('when all parameters are provided', () => {
            before(async () => {
                anotherTokenInstance = await IvoToken.new('NAME', 'SYMBOL', new BN('18'), TOTAL_SUPPLY_CAP);
            });
            it('deploys successfully', async () => {
                anotherAdvisorVestingInstance = await AdvisorsVesting.new(anotherTokenInstance.address, crowdsaleInstance.address, STO_START_TIME, owner);
            });
        });
    });

    describe('when instantiated', () => {
        it('has zero totalBalance', async () => {
            (await advisorsVestingInstance.totalBalance()).should.be.a.bignumber.that.equals(ZERO);
        });
        it('has the no updateTime', async () => {
            (await advisorsVestingInstance.updateTime()).should.be.a.bignumber.that.equals(STO_START_TIME);
        });
        it('has the correct startingTime', async () => {
            (await advisorsVestingInstance.releaseTime()).should.be.a.bignumber.that.equals(STO_START_TIME.add(HUNDRED_EIGHTY_DAYS));
        });
        it('knows the releaseTime', async () => {
            (await advisorsVestingInstance.knownReleaseTime()).should.equal(true);
        });
        it('has the token address', async () => {
            (await advisorsVestingInstance.token()).should.equal(tokenInstance.address);
        });
        it('has the crowdsale address', async () => {
            (await advisorsVestingInstance.crowdsale()).should.equal(crowdsaleInstance.address);
        });
        it('the owner has changed', async () => {
            (await advisorsVestingInstance.isOwner({from: owner})).should.equal(true);
        });
        it('the owner has a pausable manager role', async () => {
            (await advisorsVestingInstance.isManager(owner)).should.equal(true);
        });
        it('the creator does not have a pausable manager role', async () => {
            (await advisorsVestingInstance.isManager(creator)).should.equal(false);
        });
    });

    describe('add advisors to the list', () => {
        context('when called by a randomAccount', () => {
            it('fails', async () => {
                await expectThrow(advisorsVestingInstance.receiveFor(advisor1, FOUR_HUNDRED_THOUSAND_ETHER, {from: randomAccount}));
            });
        });
        context('when called by a manager', () => {
            it('succeeds', async () => {
                const tx = await advisorsVestingInstance.receiveFor(advisor1, FOUR_HUNDRED_THOUSAND_ETHER, {from: owner});
                const events = getEvents(tx, 'Received');
                (events[0].owner).should.equal(advisor1);
                (events[0].value).should.be.a.bignumber.that.equals(FOUR_HUNDRED_THOUSAND_ETHER);
            });
            it('succeeds in batch', async () => {
                const tx = await advisorsVestingInstance.batchReceiveFor([advisor2, advisor3], [FOUR_HUNDRED_THOUSAND_ETHER, FOUR_HUNDRED_THOUSAND_ETHER], {from: owner});
                const events = getEvents(tx, 'Received');
                (events[0].owner).should.equal(advisor2);
                (events[0].value).should.be.a.bignumber.that.equals(FOUR_HUNDRED_THOUSAND_ETHER);
                (events[1].owner).should.equal(advisor3);
                (events[1].value).should.be.a.bignumber.that.equals(FOUR_HUNDRED_THOUSAND_ETHER);
            });
        });
        context('when adding too much', () => {
            it('fails', async () => {
                await expectThrow(advisorsVestingInstance.receiveFor(advisor3, FOUR_HUNDRED_THOUSAND_ETHER, {from: owner}));
            });
            it('fails', async () => {
                await expectThrow(advisorsVestingInstance.batchReceiveFor(THREE_HUNDRED_ACCOUNTS, THREE_HUNDRED_VALUE, {from: owner}));
            });
            it('fails', async () => {
                await expectThrow(advisorsVestingInstance.batchReceiveFor(THREE_HUNDRED_ACCOUNTS, [ONE, ONE], {from: owner}));
            });
        });
    });

    describe('before release time', () => {
        it('cannot release', async () => {
            await expectThrow(advisorsVestingInstance.release({from:advisor1}));
        });
        it('cannot releaseFor', async () => {
            await expectThrow(advisorsVestingInstance.releaseFor(advisor2, {from:owner}));
        });
        context('can reclaim token', () => {
            const extraMinted = ONE_ETHER.mul(new BN('10000'));
            let shouldHave;
            before(async () => {
                await anotherTokenInstance.mint(anotherAdvisorVestingInstance.address, extraMinted, {from: creator});
                // finishes setup
                await anotherTokenInstance.roleSetup(
                    owner,
                    crowdsaleInstance.address,
                    saftVaultInstance.address,
                    privateVaultInstance.address,
                    presaleVaultInstance.address,
                    anotherAdvisorVestingInstance.address,
                    teamVestingInstance.address,
                    reserveVaultInstance.address,
                    {from: creator});
            });
            it('has some tokens', async () => {
                shouldHave =  new BN(await anotherTokenInstance.balanceOf(anotherAdvisorVestingInstance.address)).sub(extraMinted);
            });
            it('has the right token', async () => {
                (await anotherAdvisorVestingInstance.token()).should.equal(anotherTokenInstance.address);
            });
            it('reclaim the extra of the allocation', async () => {
                const tx = await anotherAdvisorVestingInstance.reclaimToken(anotherTokenInstance.address, {from:owner});
                // const events = getEvents(tx, 'Transfer');
                (new BN(await anotherTokenInstance.balanceOf(anotherAdvisorVestingInstance.address))).should.be.a.bignumber.that.equals(shouldHave);
            });
        });
    });

    describe('vesting starts, before the cliff', () => {
        before(async () => {
            await increaseTo(STO_START_TIME);
        });
        context('cannot modify advisors info', () => {
            it('still fails to add another advisor', async () => {
                await expectThrow(advisorsVestingInstance.receiveFor(randomAccount, ONE_ETHER, {from: owner}));
            });
            it('still fails to modify advisor list', async () => {
                await expectThrow(advisorsVestingInstance.receiveFor(advisor1, ONE_ETHER, {from: owner}));
            });
        });
    });

    describe('vesting starts, after the cliff', () => {
        before(async () => {
            await increaseTo(STO_START_TIME.add(HUNDRED_EIGHTY_DAYS).add(SIXTY_DAYS));
        });
        context('60 days after thr cliff', () => {
            it('advisor1 releases ', async () => {
                const tx = await advisorsVestingInstance.release({from:advisor1});
                const events = getEvents(tx, 'Released');
                (events[0].owner).should.equal(advisor1);
                // (events[0].value).should.be.a.bignumber.that.equals(ONE_THIRD_OF_FOUR_HUNDRED_THOUSAND_ETHER);
            });
            it('advisor2 releases ', async () => {
                const tx = await advisorsVestingInstance.releaseFor(advisor2, {from:randomAccount});
                const events = getEvents(tx, 'Released');
                (events[0].owner).should.equal(advisor2);
                const timeAfterCliff = new BN((web3.eth.getBlock('latest')).timestamp).sub(STO_START_TIME.add(HUNDRED_EIGHTY_DAYS));
                const amount = FOUR_HUNDRED_THOUSAND_ETHER.mul(timeAfterCliff).div(HUNDRED_EIGHTY_DAYS);
                // (events[0].value).should.be.a.bignumber.that.equals(amount);
                // (events[0].value).should.be.a.bignumber.that.equals(ONE_THIRD_OF_FOUR_HUNDRED_THOUSAND_ETHER.add(new BN('1')));
            });
        });
    });

    describe('vesting starts, after the cliff', () => {
        before(async () => {
            await increaseTo(STO_START_TIME.add(HUNDRED_EIGHTY_DAYS).add(HUNDRED_TWENTY_DAYS));
        });
        context('60 days after the cliff', () => {
            it('advisor1 release again', async () => {
                const tx = await advisorsVestingInstance.release({from:advisor1});
                const events = getEvents(tx, 'Released');
                (events[0].owner).should.equal(advisor1);
                // (events[0].value).should.be.a.bignumber.that.equals(ONE_THIRD_OF_FOUR_HUNDRED_THOUSAND_ETHER);
            });
            it('advisor3 release ', async () => {
                const tx = await advisorsVestingInstance.releaseFor(advisor3, {from:randomAccount});
                const events = getEvents(tx, 'Released');
                (events[0].owner).should.equal(advisor3);
                // (events[0].value).should.be.a.bignumber.that.equals(TWO_THIRD_OF_FOUR_HUNDRED_THOUSAND_ETHER);
            });
        });
        context('can reclaim token', () => {
            let valueBefore;
            let valueAfter;
            before(async () => {
                valueBefore = new BN(await tokenInstance.balanceOf(advisorsVestingInstance.address));
            });
            it('reclaim the extra of the allocation', async () => {
                const tx = await advisorsVestingInstance.reclaimToken(tokenInstance.address, {from:owner});
                valueAfter = new BN(await tokenInstance.balanceOf(advisorsVestingInstance.address));
                // const events = getEvents(tx, 'Transfer');
                (valueBefore.sub(valueAfter)).should.be.a.bignumber.that.equals(ONE_ETHER.mul(new BN('300000')));
            });
        });
    });
    describe('vesting starts, after the cliff', () => {
        before(async () => {
            await increaseTo(STO_START_TIME.add(HUNDRED_EIGHTY_DAYS).add(HUNDRED_EIGHTY_DAYS).add(SIXTY_DAYS));
        });
        context('240 days after the cliff', () => {
            it('advisor2 release again', async () => {
                const tx = await advisorsVestingInstance.release({from:advisor2});
                const events = getEvents(tx, 'Released');
                (events[0].owner).should.equal(advisor2);
                // (events[0].value).should.be.a.bignumber.that.equals(TWO_THIRD_OF_FOUR_HUNDRED_THOUSAND_ETHER);
            });
            it('can check the initialBalance', async () => {
                (await advisorsVestingInstance.initialBalanceOf(advisor2)).should.be.a.bignumber.that.equals(FOUR_HUNDRED_THOUSAND_ETHER);
            });
        });
        context('can reclaim other token', () => {
            let newTokenInstance;
            before(async () => {
                newTokenInstance = await IvoToken.new('NAME', 'SYMBOL', new BN('18'), FOUR_HUNDRED_THOUSAND_ETHER);
                await newTokenInstance.mint(advisorsVestingInstance.address, ONE_ETHER);
                (new BN(await newTokenInstance.balanceOf(advisorsVestingInstance.address))).should.be.a.bignumber.that.equals(ONE_ETHER);
            });
            it('reclaim the extra of the allocation', async () => {
                const tx = await advisorsVestingInstance.reclaimToken(newTokenInstance.address, {from:owner});
                // const events = getEvents(tx, 'Transfer');
                (new BN(await newTokenInstance.balanceOf(advisorsVestingInstance.address))).should.be.a.bignumber.that.equals(ZERO);
            });
        });
    });
});
