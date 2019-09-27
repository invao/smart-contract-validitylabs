/**
 * Test for Dividend contract
 *
 * @author Validity Labs AG <info@validitylabs.org>
 */

import {expectThrow, getEvents, BN, ZERO_ADDRESS, ZERO, ONE_ETHER, THREE_HUNDRED_ACCOUNTS, THREE_HUNDRED_VALUE} from '../../helpers/tools';
import {increase, increaseTo, latest, duration} from '../../helpers/OZ-tools';
import {it} from 'mocha';

const cnf = require('../../../config/contract-ivo.json');
const IvoToken = artifacts.require('./IvoToken');
const IvoDividends = artifacts.require('./IvoDividends');

const should = require('chai') // eslint-disable-line
    .use(require('chai-as-promised'))
    .use(require('chai-bn')(BN))
    .should();

const STO_START_TIME = new BN(cnf.STO_START_TIME);
const TEN_DAYS = new BN(duration.days(new BN('10')));
const SIXTY_DAYS = new BN(cnf.SIXTY_DAYS);
const NINETY_DAYS = new BN(duration.days(new BN('90')));
const HUNDRED_EIGHTY_DAYS = new BN(cnf.HUNDRED_EIGHTY_DAYS);
const HUNDRED_TWENTY_DAYS = new BN(cnf.HUNDRED_TWENTY_DAYS);
const TWO_HUNDRED_ETHER = ONE_ETHER.mul(new BN('200'));
const TWO_HUNDRED_FIFTY_ETHER = ONE_ETHER.mul(new BN('250'));
const FOUR_HUNDRED_ETHER = ONE_ETHER.mul(new BN('400'));
const EIGHT_HUNDRED_ETHER = ONE_ETHER.mul(new BN('800'));
const THOUSAND_ETHER = ONE_ETHER.mul(new BN('1000'));
const ONE = new BN('1');
const TWO = new BN('2');
const THREE = new BN('3');
const FIVE = new BN('5');
const TWENTY_HUNDRED_ETHER = EIGHT_HUNDRED_ETHER.mul(TWO).add(FOUR_HUNDRED_ETHER);

const TOTAL_SUPPLY_CAP = new BN(cnf.TOTAL_SUPPLY_CAP);

/**
 * IvoDividends contract
 */
contract('IvoDividends', ([creator, owner, investor1, investor2, investor3, randomAccount]) => {
    let tokenInstance;
    let dividendsInstance;

    let payOutTokenInstance1;
    let payOutTokenInstance2;
    let firstDividendDepositBlockNumber;
    let secondDividendDepositBlockNumber;
    let thirdDividendDepositBlockNumber;
    let firstDividendDepositTime;
    let secondDividendDepositTime;
    let thirdDividendDepositTime;

    before(async () => {
        tokenInstance = await IvoToken.deployed();
        dividendsInstance = await IvoDividends.deployed();

        await tokenInstance.mint(investor1, EIGHT_HUNDRED_ETHER);
        await tokenInstance.mint(investor2, EIGHT_HUNDRED_ETHER);
        await tokenInstance.transferOwnership(owner);

        payOutTokenInstance1 = await IvoToken.new('Payout1', 'POO', new BN('18'), TOTAL_SUPPLY_CAP);
        await payOutTokenInstance1.mint(owner, THOUSAND_ETHER);
        await payOutTokenInstance1.mint(owner, THOUSAND_ETHER);

        payOutTokenInstance2 = await IvoToken.new('Payout2', 'POT', new BN('18'), TOTAL_SUPPLY_CAP);
        await payOutTokenInstance2.mint(owner, THOUSAND_ETHER);
    });

    describe('deployment', () => {
        let latestBlock;
        before(async () => {
            latestBlock = new BN(await latest);
        });
        context('when token is not a valid address', () => {
            it('fails', async () => {
                await expectThrow(IvoDividends.new(ZERO_ADDRESS, owner));
            });
        });
        context('when all parameters are provided', () => {
            it('deploys successfully', async () => {
                const anotherInstance = await IvoDividends.new(tokenInstance.address, owner);
            });
        });
        context('check all values', () => {
            it('has a total supply', async () => {
                new BN(await tokenInstance.totalSupply()).should.be.a.bignumber.that.equals(EIGHT_HUNDRED_ETHER.mul(TWO));
                new BN(await tokenInstance.totalSupplyAt(latestBlock)).should.be.a.bignumber.that.equals(EIGHT_HUNDRED_ETHER.mul(TWO));
            });
            it('has balance of investor 1', async () => {
                new BN(await tokenInstance.balanceOf(investor1)).should.be.a.bignumber.that.equals(EIGHT_HUNDRED_ETHER);
                new BN(await tokenInstance.balanceOfAt(investor1, latestBlock)).should.be.a.bignumber.that.equals(EIGHT_HUNDRED_ETHER);
            });
            it('has balance of investor 2', async () => {
                new BN(await tokenInstance.balanceOf(investor2)).should.be.a.bignumber.that.equals(EIGHT_HUNDRED_ETHER);
                new BN(await tokenInstance.balanceOfAt(investor2, latestBlock)).should.be.a.bignumber.that.equals(EIGHT_HUNDRED_ETHER);
            });
            it('has balance of investor 3', async () => {
                new BN(await tokenInstance.balanceOf(investor3)).should.be.a.bignumber.that.equals(ZERO);
                new BN(await tokenInstance.balanceOfAt(investor3, latestBlock)).should.be.a.bignumber.that.equals(ZERO);
            });
        });
    });

    describe('preparation', () => {
        let latestBlock;
        before(async () => {
            await increase(TEN_DAYS);
            new BN(await tokenInstance.balanceOf(investor1)).should.be.a.bignumber.that.equals(EIGHT_HUNDRED_ETHER);
            await tokenInstance.unpause();
            (await tokenInstance.paused()).should.equal(false);
            latestBlock = new BN(await latest);
        });
        context('create more snapshot', () => {
            it('investor2 transfers some money to investor3', async () => {
                const tx = await tokenInstance.transfer(investor3, FOUR_HUNDRED_ETHER, {from: investor1});
                const events = getEvents(tx, 'Transfer');
                (events[0].to).should.equal(investor3);
                (events[0].value).should.be.a.bignumber.that.equals(FOUR_HUNDRED_ETHER);
            });
        });
        context('check all values', () => {
            it('has a total supply', async () => {
                new BN(await tokenInstance.totalSupply()).should.be.a.bignumber.that.equals(EIGHT_HUNDRED_ETHER.mul(TWO));
                new BN(await tokenInstance.totalSupplyAt(latestBlock)).should.be.a.bignumber.that.equals(EIGHT_HUNDRED_ETHER.mul(TWO));
            });
            it('has balance of investor 1', async () => {
                new BN(await tokenInstance.balanceOf(investor1)).should.be.a.bignumber.that.equals(FOUR_HUNDRED_ETHER);
                new BN(await tokenInstance.balanceOfAt(investor1, latestBlock)).should.be.a.bignumber.that.equals(FOUR_HUNDRED_ETHER);
            });
            it('has balance of investor 2', async () => {
                new BN(await tokenInstance.balanceOf(investor2)).should.be.a.bignumber.that.equals(EIGHT_HUNDRED_ETHER);
                new BN(await tokenInstance.balanceOfAt(investor2, latestBlock)).should.be.a.bignumber.that.equals(EIGHT_HUNDRED_ETHER);
            });
            it('has balance of investor 3', async () => {
                new BN(await tokenInstance.balanceOf(investor3)).should.be.a.bignumber.that.equals(FOUR_HUNDRED_ETHER);
                new BN(await tokenInstance.balanceOfAt(investor3, latestBlock)).should.be.a.bignumber.that.equals(FOUR_HUNDRED_ETHER);
            });
        });
        context('owner approve dividend contract', () => {
            it('allows dividend contract to move all THOUSAND_ETH payout token', async () => {
                const tx = await payOutTokenInstance1.approve(dividendsInstance.address, THOUSAND_ETHER, {from: owner});
                const events = getEvents(tx, 'Approval');
                (events[0].owner).should.equal(owner);
                (events[0].spender).should.equal(dividendsInstance.address);
                (events[0].value).should.be.a.bignumber.that.equals(THOUSAND_ETHER);
            });
        });
    });

    describe('first time deposit dividends', () => {
        before(async () => {
            await increase(TEN_DAYS);
        });
        context('wrong inputs', () => {
            it('fails, invalidAddress', async () => {
                await expectThrow(dividendsInstance.depositDividend(ZERO_ADDRESS, SIXTY_DAYS, THOUSAND_ETHER, {from:owner}));
            });
            it('fails, notOwner', async () => {
                await expectThrow(dividendsInstance.depositDividend(payOutTokenInstance1.address, SIXTY_DAYS, THOUSAND_ETHER, {from:randomAccount}));
            });
            it('fails, amount', async () => {
                await expectThrow(dividendsInstance.depositDividend(payOutTokenInstance1.address, SIXTY_DAYS, ZERO, {from:owner}));
            });
        });
        context('right inputs', () => {
            let tx;
            let events;
            before(async () => {
                tx = await dividendsInstance.depositDividend(payOutTokenInstance1.address, SIXTY_DAYS, THOUSAND_ETHER, {from: owner});
            });
            it('succeeds', async () => {
                events = getEvents(tx, 'DividendDeposited');
            });
            it('has the right dividendIndex', async () => {
                new BN(events[0].dividendIndex).should.be.a.bignumber.that.equals(ZERO);
            });
            it('has the right payoutToken', async () => {
                (events[0].payoutToken).should.equal(payOutTokenInstance1.address);
            });
            it('has the right payoutAmount', async () => {
                new BN(events[0].payoutAmount).should.be.a.bignumber.that.equals(THOUSAND_ETHER);
            });
            it('has the right claimPeriod and save the recordDate', async () => {
                new BN(events[0].claimPeriod).should.be.a.bignumber.that.equals(SIXTY_DAYS);
                firstDividendDepositBlockNumber = new BN(events[0].recordDate);
            });
            it('has the right totalSupply', async () => {
                new BN(await tokenInstance.totalSupply()).should.be.a.bignumber.that.equals(new BN(await tokenInstance.totalSupplyAt(firstDividendDepositBlockNumber)));
            });
        });
        context('check all values', () => {
            it('has a total supply', async () => {
                new BN(await tokenInstance.totalSupply()).should.be.a.bignumber.that.equals(EIGHT_HUNDRED_ETHER.mul(TWO));
                new BN(await tokenInstance.totalSupplyAt(firstDividendDepositBlockNumber)).should.be.a.bignumber.that.equals(EIGHT_HUNDRED_ETHER.mul(TWO));
            });
            it('has balance of investor 1', async () => {
                new BN(await tokenInstance.balanceOf(investor1)).should.be.a.bignumber.that.equals(FOUR_HUNDRED_ETHER);
                new BN(await tokenInstance.balanceOfAt(investor1, firstDividendDepositBlockNumber)).should.be.a.bignumber.that.equals(FOUR_HUNDRED_ETHER);
            });
            it('has balance of investor 2', async () => {
                new BN(await tokenInstance.balanceOf(investor2)).should.be.a.bignumber.that.equals(EIGHT_HUNDRED_ETHER);
                new BN(await tokenInstance.balanceOfAt(investor2, firstDividendDepositBlockNumber)).should.be.a.bignumber.that.equals(EIGHT_HUNDRED_ETHER);
            });
            it('has balance of investor 3', async () => {
                new BN(await tokenInstance.balanceOf(investor3)).should.be.a.bignumber.that.equals(FOUR_HUNDRED_ETHER);
                new BN(await tokenInstance.balanceOfAt(investor3, firstDividendDepositBlockNumber)).should.be.a.bignumber.that.equals(FOUR_HUNDRED_ETHER);
            });
        });
    });

    describe('second time deposit dividends', () => {
        before(async () => {
            await increase(TEN_DAYS);
            await payOutTokenInstance2.approve(dividendsInstance.address, THOUSAND_ETHER, {from: owner});
            await tokenInstance.mint(investor3, FOUR_HUNDRED_ETHER);
            await increase(TEN_DAYS);
        });
        context('right inputs', () => {
            let tx;
            before(async () => {
                tx = await dividendsInstance.depositDividend(payOutTokenInstance2.address, HUNDRED_TWENTY_DAYS, THOUSAND_ETHER, {from: owner});
            });
            it('succeeds', async () => {
                const events = getEvents(tx, 'DividendDeposited');
                new BN(events[0].dividendIndex).should.be.a.bignumber.that.equals(ONE);
                (events[0].payoutToken).should.equal(payOutTokenInstance2.address);
                new BN(events[0].payoutAmount).should.be.a.bignumber.that.equals(THOUSAND_ETHER);
                new BN(events[0].claimPeriod).should.be.a.bignumber.that.equals(HUNDRED_TWENTY_DAYS);
                secondDividendDepositBlockNumber = new BN(events[0].recordDate);
            });
        });
        context('check all values', () => {
            it('has a total supply', async () => {
                new BN(await tokenInstance.totalSupply()).should.be.a.bignumber.that.equals(TWENTY_HUNDRED_ETHER);
                new BN(await tokenInstance.totalSupplyAt(secondDividendDepositBlockNumber)).should.be.a.bignumber.that.equals(TWENTY_HUNDRED_ETHER);
            });
            it('has balance of investor 1', async () => {
                new BN(await tokenInstance.balanceOf(investor1)).should.be.a.bignumber.that.equals(FOUR_HUNDRED_ETHER);
                new BN(await tokenInstance.balanceOfAt(investor1, secondDividendDepositBlockNumber)).should.be.a.bignumber.that.equals(FOUR_HUNDRED_ETHER);
            });
            it('has balance of investor 2', async () => {
                new BN(await tokenInstance.balanceOf(investor2)).should.be.a.bignumber.that.equals(EIGHT_HUNDRED_ETHER);
                new BN(await tokenInstance.balanceOfAt(investor2, secondDividendDepositBlockNumber)).should.be.a.bignumber.that.equals(EIGHT_HUNDRED_ETHER);
            });
            it('has balance of investor 3', async () => {
                new BN(await tokenInstance.balanceOf(investor3)).should.be.a.bignumber.that.equals(EIGHT_HUNDRED_ETHER);
                new BN(await tokenInstance.balanceOfAt(investor3, secondDividendDepositBlockNumber)).should.be.a.bignumber.that.equals(EIGHT_HUNDRED_ETHER);
            });
            context('old values are still correct', () => {
                it('has a total supply', async () => {
                    new BN(await tokenInstance.totalSupplyAt(firstDividendDepositBlockNumber)).should.be.a.bignumber.that.equals(EIGHT_HUNDRED_ETHER.mul(TWO));
                });
                it('has balance of investor 1', async () => {
                    new BN(await tokenInstance.balanceOfAt(investor1, firstDividendDepositBlockNumber)).should.be.a.bignumber.that.equals(FOUR_HUNDRED_ETHER);
                });
                it('has balance of investor 2', async () => {
                    new BN(await tokenInstance.balanceOfAt(investor2, firstDividendDepositBlockNumber)).should.be.a.bignumber.that.equals(EIGHT_HUNDRED_ETHER);
                });
                it('has balance of investor 3', async () => {
                    new BN(await tokenInstance.balanceOfAt(investor3, firstDividendDepositBlockNumber)).should.be.a.bignumber.that.equals(FOUR_HUNDRED_ETHER);
                });
            });
        });
        context('getDividends', () => {
            let result;
            it('gets pushed dividends, when there is', async () => {
                result = await dividendsInstance.getDividend(ONE);
                new BN(result[3]).should.be.a.bignumber.that.equals(THOUSAND_ETHER);
                new BN(result[5]).should.be.a.bignumber.that.equals(TWENTY_HUNDRED_ETHER);
            });
            it('cannot get pushed dividends of an invalid index', async () => {
                await expectThrow(dividendsInstance.getDividend(THREE));
            });
        });
        context('try to recycle the dividend', () => {
            it('fails', async () => {
                await expectThrow(dividendsInstance.recycleDividend(ONE, {from: owner}));
            });
        });
    });

    describe('third time deposit dividends', () => {
        before(async () => {
            await increase(TEN_DAYS);
            await payOutTokenInstance1.approve(dividendsInstance.address, THOUSAND_ETHER, {from: owner});
            await tokenInstance.mint(investor1, FOUR_HUNDRED_ETHER.add(EIGHT_HUNDRED_ETHER));
            await increase(TEN_DAYS);
        });
        context('right inputs', () => {
            let tx;
            before(async () => {
                tx = await dividendsInstance.depositDividend(payOutTokenInstance1.address, SIXTY_DAYS, THOUSAND_ETHER, {from: owner});
            });
            it('succeeds', async () => {
                const events = getEvents(tx, 'DividendDeposited');
                new BN(events[0].dividendIndex).should.be.a.bignumber.that.equals(TWO);
                (events[0].payoutToken).should.equal(payOutTokenInstance1.address);
                new BN(events[0].payoutAmount).should.be.a.bignumber.that.equals(THOUSAND_ETHER);
                new BN(events[0].claimPeriod).should.be.a.bignumber.that.equals(SIXTY_DAYS);
                thirdDividendDepositBlockNumber = new BN(events[0].recordDate);
            });
        });
        context('check all values', () => {
            it('has a total supply', async () => {
                new BN(await tokenInstance.totalSupply()).should.be.a.bignumber.that.equals(EIGHT_HUNDRED_ETHER.mul(TWO).mul(TWO));
                new BN(await tokenInstance.totalSupplyAt(thirdDividendDepositBlockNumber)).should.be.a.bignumber.that.equals(EIGHT_HUNDRED_ETHER.mul(TWO).mul(TWO));
            });
            it('has balance of investor 1', async () => {
                new BN(await tokenInstance.balanceOf(investor1)).should.be.a.bignumber.that.equals(EIGHT_HUNDRED_ETHER.mul(TWO));
                new BN(await tokenInstance.balanceOfAt(investor1, thirdDividendDepositBlockNumber)).should.be.a.bignumber.that.equals(EIGHT_HUNDRED_ETHER.mul(TWO));
            });
            it('has balance of investor 2', async () => {
                new BN(await tokenInstance.balanceOf(investor2)).should.be.a.bignumber.that.equals(EIGHT_HUNDRED_ETHER);
                new BN(await tokenInstance.balanceOfAt(investor2, thirdDividendDepositBlockNumber)).should.be.a.bignumber.that.equals(EIGHT_HUNDRED_ETHER);
            });
            it('has balance of investor 3', async () => {
                new BN(await tokenInstance.balanceOf(investor3)).should.be.a.bignumber.that.equals(EIGHT_HUNDRED_ETHER);
                new BN(await tokenInstance.balanceOfAt(investor3, thirdDividendDepositBlockNumber)).should.be.a.bignumber.that.equals(EIGHT_HUNDRED_ETHER);
            });
        });
    });

    describe('dividends are claimable', () => {
        before(async () => {
            console.log('All possible timestamps:');
            console.log('1st timestamp', firstDividendDepositBlockNumber.toString());
            console.log('2nd timestamp', secondDividendDepositBlockNumber.toString());
            console.log('3rd timestamp', thirdDividendDepositBlockNumber.toString());
            console.log('At first round of dividend deposit:');
            console.log('balance of investor 1', new BN(await tokenInstance.balanceOfAt(investor1, firstDividendDepositBlockNumber)).toString());
            console.log('balance of investor 2', new BN(await tokenInstance.balanceOfAt(investor2, firstDividendDepositBlockNumber)).toString());
            console.log('balance of investor 3', new BN(await tokenInstance.balanceOfAt(investor3, firstDividendDepositBlockNumber)).toString());
            console.log('At second round of dividend deposit:');
            console.log('balance of investor 1', new BN(await tokenInstance.balanceOfAt(investor1, secondDividendDepositBlockNumber)).toString());
            console.log('balance of investor 2', new BN(await tokenInstance.balanceOfAt(investor2, secondDividendDepositBlockNumber)).toString());
            console.log('balance of investor 3', new BN(await tokenInstance.balanceOfAt(investor3, secondDividendDepositBlockNumber)).toString());
            console.log('At thrid round of dividend deposit:');
            console.log('balance of investor 1', new BN(await tokenInstance.balanceOfAt(investor1, thirdDividendDepositBlockNumber)).toString());
            console.log('balance of investor 2', new BN(await tokenInstance.balanceOfAt(investor2, thirdDividendDepositBlockNumber)).toString());
            console.log('balance of investor 3', new BN(await tokenInstance.balanceOfAt(investor3, thirdDividendDepositBlockNumber)).toString());
            // new BN(await tokenInstance.balanceOfAt(investor1, firstDividendDepositBlockNumber)).should.be.a.bignumber.that.equals(FOUR_HUNDRED_ETHER);
            // new BN(await tokenInstance.totalSupplyAt(firstDividendDepositBlockNumber)).should.be.a.bignumber.that.equals(EIGHT_HUNDRED_ETHER.mul(TWO));
        });
        context('claim the first dividend', () => {
            context('invalid dividend index', () => {
                it('fails', async () => {
                    await expectThrow(dividendsInstance.claimDividend(FIVE, {from: investor1}));
                });
            });
            context('valid dividend index', () => {
                context('invalid random account calls', () => {
                    it('claims nothing', async () => {
                        const tx = await dividendsInstance.claimDividend(ZERO, {from: randomAccount});
                        const events = getEvents(tx, 'DividendClaimed');
                        (events[0].dividendIndex).should.be.a.bignumber.that.equals(ZERO);
                        (events[0].claimer).should.equal(randomAccount);
                        (events[0].claimedAmount).should.be.a.bignumber.that.equals(ZERO);
                    });
                });
                context('valid investor account calls', () => {
                    it('succeeds', async () => {
                        const tx = await dividendsInstance.claimDividend(ZERO, {from: investor1});
                        const events = getEvents(tx, 'DividendClaimed');
                        (events[0].dividendIndex).should.be.a.bignumber.that.equals(ZERO);
                        (events[0].claimer).should.equal(investor1);
                        (events[0].claimedAmount).should.be.a.bignumber.that.equals(TWO_HUNDRED_FIFTY_ETHER);
                    });
                    it('reaches investor1s account ', async () => {
                        new BN(await payOutTokenInstance1.balanceOf(investor1)).should.be.a.bignumber.that.equals(TWO_HUNDRED_FIFTY_ETHER);
                    });
                    it('cannot release twice ', async () => {
                        await expectThrow(dividendsInstance.claimDividend(ZERO, {from: investor1}));
                    });
                });
            });
        });
        context('check right amount', () => {
            let result;
            it('gets pushed dividends, when there is', async () => {
                result = await dividendsInstance.getDividend(ZERO);
                new BN(result[3]).should.be.a.bignumber.that.equals(THOUSAND_ETHER);
                new BN(result[4]).should.be.a.bignumber.that.equals(TWO_HUNDRED_FIFTY_ETHER);
                new BN(result[5]).should.be.a.bignumber.that.equals(EIGHT_HUNDRED_ETHER.mul(TWO));
            });
        });
        context('can reclaim token', () => {
            let valueBefore;
            let valueAfter;
            before(async () => {
                await payOutTokenInstance1.mint(dividendsInstance.address, FOUR_HUNDRED_ETHER);
                valueBefore = new BN(await payOutTokenInstance1.balanceOf(dividendsInstance.address));
            });
            it('reclaim the extra of the allocation', async () => {
                const tx = await dividendsInstance.reclaimToken(payOutTokenInstance1.address, {from:owner});
                valueAfter = new BN(await payOutTokenInstance1.balanceOf(dividendsInstance.address));
                // the following events cannot be fired.
                // const events = getEvents(tx, 'Transfer');
                // (events[0].value).should.be.a.bignumber.that.equals(FOUR_HUNDRED_ETHER);
                (valueBefore.sub(valueAfter)).should.be.a.bignumber.that.equals(FOUR_HUNDRED_ETHER);
            });
        });
        context('claim all dividends', () => {
            before(async () => {
                new BN(await payOutTokenInstance1.balanceOf(investor2)).should.be.a.bignumber.that.equals(ZERO);
                new BN(await payOutTokenInstance2.balanceOf(investor2)).should.be.a.bignumber.that.equals(ZERO);
            });
            context('invalid dividend index', () => {
                it('fails', async () => {
                    await expectThrow(dividendsInstance.claimAllDividends(FIVE, {from: investor2}));
                });
            });
            context('valid dividend index', () => {
                context('valid investor account calls', () => {
                    let events;
                    it('succeeds', async () => {
                        const tx = await dividendsInstance.claimAllDividends(ZERO, {from: investor2});
                        events = getEvents(tx, 'DividendClaimed');
                    });
                    it('round 0 done', async () => {
                        (events[0].dividendIndex).should.be.a.bignumber.that.equals(ZERO);
                        (events[0].claimer).should.equal(investor2);
                        (events[0].claimedAmount).should.be.a.bignumber.that.equals(TWO_HUNDRED_FIFTY_ETHER.mul(TWO));
                    });
                    it('round 1 done', async () => {
                        (events[1].dividendIndex).should.be.a.bignumber.that.equals(ONE);
                        (events[1].claimer).should.equal(investor2);
                        (events[1].claimedAmount).should.be.a.bignumber.that.equals(FOUR_HUNDRED_ETHER);
                    });
                    it('round 2 done', async () => {
                        (events[2].dividendIndex).should.be.a.bignumber.that.equals(TWO);
                        (events[2].claimer).should.equal(investor2);
                        (events[2].claimedAmount).should.be.a.bignumber.that.equals(TWO_HUNDRED_FIFTY_ETHER);
                    });
                    it('reaches investor2s account ', async () => {
                        new BN(await payOutTokenInstance1.balanceOf(investor2)).should.be.a.bignumber.that.equals(TWO_HUNDRED_FIFTY_ETHER.mul(THREE));
                        new BN(await payOutTokenInstance2.balanceOf(investor2)).should.be.a.bignumber.that.equals(FOUR_HUNDRED_ETHER);
                    });
                });
            });
            context('check right amount', () => {
                let result;
                it('of round 0', async () => {
                    result = await dividendsInstance.getDividend(ZERO);
                    new BN(result[3]).should.be.a.bignumber.that.equals(THOUSAND_ETHER);
                    new BN(result[4]).should.be.a.bignumber.that.equals(TWO_HUNDRED_FIFTY_ETHER.mul(THREE));
                    new BN(result[5]).should.be.a.bignumber.that.equals(EIGHT_HUNDRED_ETHER.mul(TWO));
                });
                it('of round 1', async () => {
                    result = await dividendsInstance.getDividend(ONE);
                    new BN(result[3]).should.be.a.bignumber.that.equals(THOUSAND_ETHER);
                    new BN(result[4]).should.be.a.bignumber.that.equals(FOUR_HUNDRED_ETHER);
                    new BN(result[5]).should.be.a.bignumber.that.equals(TWENTY_HUNDRED_ETHER);
                });
                it('of round 2', async () => {
                    result = await dividendsInstance.getDividend(TWO);
                    new BN(result[3]).should.be.a.bignumber.that.equals(THOUSAND_ETHER);
                    new BN(result[4]).should.be.a.bignumber.that.equals(TWO_HUNDRED_FIFTY_ETHER);
                    new BN(result[5]).should.be.a.bignumber.that.equals(EIGHT_HUNDRED_ETHER.mul(TWO).mul(TWO));
                });
            });
        });
    });
    describe('dividends are no longer claimable', () => {
        before(async () => {
            await increase(NINETY_DAYS);
        });
        context('claim the first dividend', () => {
            context('valid dividend index', () => {
                context('valid investor account calls', () => {
                    it('fails', async () => {
                        await expectThrow(dividendsInstance.claimDividend(ZERO, {from: investor3}));
                    });
                });
            });
        });
        context('can recycle token', () => {
            context('invalid dividend index', () => {
                it('fails', async () => {
                    await expectThrow(dividendsInstance.recycleDividend(FIVE, {from: owner}));
                });
            });
            context('valid dividend index', () => {
                context('invalid random account calls', () => {
                    it('fails', async () => {
                        await expectThrow(dividendsInstance.recycleDividend(TWO, {from: randomAccount}));
                    });
                });
                context('valid owner account calls', () => {
                    it('succeeds', async () => {
                        const tx = await dividendsInstance.recycleDividend(TWO, {from: owner});
                        const events = getEvents(tx, 'DividendRecycled');
                        (events[0].dividendIndex).should.be.a.bignumber.that.equals(TWO);
                        (events[0].recycledAmount).should.be.a.bignumber.that.equals(TWO_HUNDRED_FIFTY_ETHER.mul(THREE));
                    });
                    it('cannot recycle twice ', async () => {
                        await expectThrow(dividendsInstance.recycleDividend(TWO, {from: owner}));
                    });
                });
            });
            context('try to claim the recently recycled dividend', () => {
                it('fails', async () => {
                    await expectThrow(dividendsInstance.claimDividend(TWO, {from: investor3}));
                });
            });
        });
        context('claim all dividends', () => {
            before(async () => {
                console.log('Balance of investor 1:');
                console.log('payOutTokenInstance1', new BN(await payOutTokenInstance1.balanceOf(investor1)).toString());
                console.log('payOutTokenInstance2', new BN(await payOutTokenInstance2.balanceOf(investor1)).toString());
                console.log('Balance of investor 2:');
                console.log('payOutTokenInstance1', new BN(await payOutTokenInstance1.balanceOf(investor2)).toString());
                console.log('payOutTokenInstance2', new BN(await payOutTokenInstance2.balanceOf(investor2)).toString());

                new BN(await payOutTokenInstance1.balanceOf(investor2)).should.be.a.bignumber.that.equals(TWO_HUNDRED_FIFTY_ETHER.mul(THREE));
                new BN(await payOutTokenInstance2.balanceOf(investor2)).should.be.a.bignumber.that.equals(FOUR_HUNDRED_ETHER);
            });
            context('invalid dividend index', () => {
                it('fails', async () => {
                    await expectThrow(dividendsInstance.claimAllDividends(FIVE, {from: investor2}));
                });
            });
            context('valid dividend index', () => {
                context('valid investor account calls', () => {
                    it('succeeds', async () => {
                        const tx = await dividendsInstance.claimAllDividends(ZERO, {from: investor2});
                        // following events cannot be fire, because not claimable.
                        // const events = getEvents(tx, 'DividendClaimed');
                        // (events[0].dividendIndex).should.be.a.bignumber.that.equals(ZERO);
                        // (events[0].claimer).should.equal(investor2);
                        // (events[0].claimedAmount).should.be.a.bignumber.that.equals(TWO_HUNDRED_FIFTY_ETHER.mul(TWO));
                        // (events[1].dividendIndex).should.be.a.bignumber.that.equals(ONE);
                        // (events[1].claimer).should.equal(investor2);
                        // (events[1].claimedAmount).should.be.a.bignumber.that.equals(FOUR_HUNDRED_ETHER);
                        // (events[2].dividendIndex).should.be.a.bignumber.that.equals(TWO);
                        // (events[2].claimer).should.equal(investor2);
                        // (events[2].claimedAmount).should.be.a.bignumber.that.equals(TWO_HUNDRED_FIFTY_ETHER);
                    });
                    it('reaches investor1s account ', async () => {
                        new BN(await payOutTokenInstance1.balanceOf(investor2)).should.be.a.bignumber.that.equals(TWO_HUNDRED_FIFTY_ETHER.mul(THREE));
                        new BN(await payOutTokenInstance2.balanceOf(investor2)).should.be.a.bignumber.that.equals(FOUR_HUNDRED_ETHER);
                    });
                });
            });
        });
    });
});
