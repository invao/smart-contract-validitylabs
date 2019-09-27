/**
 * Test for SAFT vault
 *
 * @author Validity Labs AG <info@validitylabs.org>
 */

import {expectThrow, getEvents, BN, getGasCost, ZERO_ADDRESS, ZERO, ONE_ETHER, THREE_HUNDRED_ACCOUNTS, THREE_HUNDRED_VALUE} from '../../helpers/tools';
import {increase, increaseTo, latest, duration} from '../../helpers/OZ-tools';
import {it} from 'mocha';
import { SSL_OP_MSIE_SSLV2_RSA_PADDING } from 'constants';
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
const SAFT_VAULT_ALLOCATION = new BN(cnf.SAFT_VAULT_ALLOCATION);
const SAFT_VAULT_RELEASE_TIME = new BN(cnf.SAFT_VAULT_RELEASE_TIME);
const SIXTY_DAYS = new BN(cnf.SIXTY_DAYS);
const HUNDRED_EIGHTY_DAYS = new BN(cnf.HUNDRED_EIGHTY_DAYS);
const HUNDRED_TWENTY_DAYS = new BN(cnf.HUNDRED_TWENTY_DAYS);
const FOUR_HUNDRED_THOUSAND_ETHER = ONE_ETHER.mul(new BN('400000'));
const ONE_THIRD_OF_FOUR_HUNDRED_THOUSAND_ETHER = FOUR_HUNDRED_THOUSAND_ETHER.div(new BN('3'));
const TWO_THIRD_OF_FOUR_HUNDRED_THOUSAND_ETHER = FOUR_HUNDRED_THOUSAND_ETHER.mul(new BN('2')).div(new BN('3'));
const ONE = new BN('1');

/**
 * SaftVault contract
 */
contract('SaftVault', ([creator, owner, investor1, investor2, investor3, randomAccount]) => {
    let tokenInstance;
    let crowdsaleInstance;
    let advisorsVestingInstance;
    let privateVaultInstance;
    let presaleVaultInstance;
    let saftVaultInstance;
    let teamVestingInstance;
    let reserveVaultInstance;
    let anotherTokenInstance;
    let anotherSaftVaultInstance;

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
                await expectThrow(SaftVault.new(tokenInstance.address, ZERO_ADDRESS, STO_START_TIME, owner));
            });
        });
        context('when sender address is not different from the crowdsale address', () => {
            it('fails', async () => {
                await expectThrow(SaftVault.new(tokenInstance.address, owner, STO_START_TIME, owner));
            });
        });
        context('when the startTime is not the same as that in the crowdsale contract', () => {
            it('fails', async () => {
                await expectThrow(SaftVault.new(tokenInstance.address, crowdsaleInstance.address, STO_START_TIME.add(new BN('12345')), owner));
            });
        });
        context('when all parameters are provided', () => {
            before(async () => {
                anotherTokenInstance = await IvoToken.new('NAME', 'SYMBOL', new BN('18'), TOTAL_SUPPLY_CAP);        
            });
            it('deploys successfully', async () => {
                anotherSaftVaultInstance = await SaftVault.new(anotherTokenInstance.address, crowdsaleInstance.address, STO_START_TIME, owner);
            });
        });
    });

    describe('when instantiated', () => {
        it('has zero totalBalance', async () => {
            (await saftVaultInstance.totalBalance()).should.be.a.bignumber.that.equals(ZERO);
        });
        it('has the no updateTime', async () => {
            (await saftVaultInstance.updateTime()).should.be.a.bignumber.that.equals(STO_START_TIME);
        });
        it('has the correct startingTime', async () => {
            (await saftVaultInstance.releaseTime()).should.be.a.bignumber.that.equals(SAFT_VAULT_RELEASE_TIME);
        });
        it('knows the releaseTime', async () => {
            (await saftVaultInstance.knownReleaseTime()).should.equal(true);
        });
        it('has the token address', async () => {
            (await saftVaultInstance.token()).should.equal(tokenInstance.address);
        });
        it('has the crowdsale address', async () => {
            (await saftVaultInstance.crowdsale()).should.equal(crowdsaleInstance.address);
        });
        it('the owner has changed', async () => {
            (await saftVaultInstance.isOwner({from: owner})).should.equal(true);
        });
        it('the owner has a pausable manager role', async () => {
            (await saftVaultInstance.isManager(owner)).should.equal(true);
        });
        it('the creator does not have a pausable manager role', async () => {
            (await saftVaultInstance.isManager(creator)).should.equal(false);
        });
        it('cannot update releaseTime', async () => {
            await expectThrow(saftVaultInstance.updateReleaseTime(STO_START_TIME, {from: owner}));
        });
    });

    describe('add investors to the list', () => {
        context('when called by a randomAccount', () => {
            it('fails', async () => {
                await expectThrow(saftVaultInstance.receiveFor(investor1, FOUR_HUNDRED_THOUSAND_ETHER, {from: randomAccount}));
            });
        });
        context('when called by a manager', () => {
            it('succeeds', async () => {
                const tx = await saftVaultInstance.receiveFor(investor1, FOUR_HUNDRED_THOUSAND_ETHER, {from: owner});
                const events = getEvents(tx, 'Received');
                (events[0].owner).should.equal(investor1);
                (events[0].value).should.be.a.bignumber.that.equals(FOUR_HUNDRED_THOUSAND_ETHER);
            });
            it('succeeds in batch', async () => {
                const tx = await saftVaultInstance.batchReceiveFor([investor2, investor3], [FOUR_HUNDRED_THOUSAND_ETHER, FOUR_HUNDRED_THOUSAND_ETHER], {from: owner});
                const events = getEvents(tx, 'Received');
                (events[0].owner).should.equal(investor2);
                (events[0].value).should.be.a.bignumber.that.equals(FOUR_HUNDRED_THOUSAND_ETHER);
                (events[1].owner).should.equal(investor3);
                (events[1].value).should.be.a.bignumber.that.equals(FOUR_HUNDRED_THOUSAND_ETHER);
            });
        });
        context('when adding too much', () => {
            it('fails', async () => {
                await expectThrow(saftVaultInstance.receiveFor(investor3, FOUR_HUNDRED_THOUSAND_ETHER.mul(new BN('100000')), {from: owner}));
            });
            it('fails', async () => {
                await expectThrow(saftVaultInstance.batchReceiveFor(THREE_HUNDRED_ACCOUNTS, THREE_HUNDRED_VALUE, {from: owner}));
            });
            it('fails', async () => {
                await expectThrow(saftVaultInstance.batchReceiveFor(THREE_HUNDRED_ACCOUNTS, [ONE, ONE], {from: owner}));
            });
        });
    }); 

    describe('before releaseTime', () => {
        it('cannot release', async () => {
            await expectThrow(saftVaultInstance.release({from:investor1}));
        });
        it('cannot releaseFor', async () => {
            await expectThrow(saftVaultInstance.releaseFor(investor2, {from:owner}));
        });
        context('can reclaim token', () => {
            const extraMinted = ONE_ETHER.mul(new BN('10000'));
            let shouldHave;
            before(async () => {
                await anotherTokenInstance.mint(anotherSaftVaultInstance.address, extraMinted, {from: creator});
                // finishes setup
                await anotherTokenInstance.roleSetup(
                    owner,
                    crowdsaleInstance.address,
                    anotherSaftVaultInstance.address,
                    privateVaultInstance.address,
                    presaleVaultInstance.address,
                    advisorsVestingInstance.address,
                    teamVestingInstance.address,
                    reserveVaultInstance.address,
                    {from: creator});   
            });
            it('has some tokens', async () => {
                shouldHave =  new BN(await anotherTokenInstance.balanceOf(anotherSaftVaultInstance.address)).sub(extraMinted);
            });
            it('has the right token', async () => {
                (await anotherSaftVaultInstance.token()).should.equal(anotherTokenInstance.address);
            });
            it('reclaim the extra of the allocation', async () => {
                const tx = await anotherSaftVaultInstance.reclaimToken(anotherTokenInstance.address, {from:owner});
                // const events = getEvents(tx, 'Transfer');
                (new BN(await anotherTokenInstance.balanceOf(anotherSaftVaultInstance.address))).should.be.a.bignumber.that.equals(shouldHave);
            });
        });
    });

    describe('after releaseTime', () => {
        before(async () => {
            await increaseTo(SAFT_VAULT_RELEASE_TIME.add(HUNDRED_TWENTY_DAYS));
        });
        context('60 days after the cliff', () => {
            it('fails to add investors', async () => {
                await expectThrow(saftVaultInstance.receiveFor(investor1, FOUR_HUNDRED_THOUSAND_ETHER, {from: owner}));
            });
            it('investor1 release', async () => {
                const tx = await saftVaultInstance.release({from:investor1});
                const events = getEvents(tx, 'Released');
                (events[0].owner).should.equal(investor1);
                // (events[0].value).should.be.a.bignumber.that.equals(ONE_THIRD_OF_FOUR_HUNDRED_THOUSAND_ETHER);
            });
            it('investor3 release ', async () => {
                const tx = await saftVaultInstance.releaseFor(investor3, {from:randomAccount});
                const events = getEvents(tx, 'Released');
                (events[0].owner).should.equal(investor3);
                // (events[0].value).should.be.a.bignumber.that.equals(TWO_THIRD_OF_FOUR_HUNDRED_THOUSAND_ETHER);
            });
        });
        context('can reclaim token', () => {
            let valueBefore;
            let valueAfter;
            before(async () => {
                valueBefore = new BN(await tokenInstance.balanceOf(saftVaultInstance.address));
            });
            it('reclaim the extra of the allocation', async () => {
                const tx = await saftVaultInstance.reclaimToken(tokenInstance.address, {from:owner});
                valueAfter = new BN(await tokenInstance.balanceOf(saftVaultInstance.address));
                // const events = getEvents(tx, 'Transfer');
                (valueBefore.sub(valueAfter)).should.be.a.bignumber.that.equals(new BN(SAFT_VAULT_ALLOCATION.sub(FOUR_HUNDRED_THOUSAND_ETHER.mul(new BN('3')))));
            });
        });
        context('can reclaim other token', () => {
            let newTokenInstance;
            before(async() => {
                newTokenInstance = await IvoToken.new('NAME', 'SYMBOL', new BN('18'), FOUR_HUNDRED_THOUSAND_ETHER);
                await newTokenInstance.mint(saftVaultInstance.address, ONE_ETHER);
                (new BN(await newTokenInstance.balanceOf(saftVaultInstance.address))).should.be.a.bignumber.that.equals(ONE_ETHER);
            });
            it('reclaim the extra of the allocation', async () => {
                const tx = await saftVaultInstance.reclaimToken(newTokenInstance.address, {from:owner});
                // const events = getEvents(tx, 'Transfer');
                (new BN(await newTokenInstance.balanceOf(saftVaultInstance.address))).should.be.a.bignumber.that.equals(ZERO);
            });
        });
    });
});
