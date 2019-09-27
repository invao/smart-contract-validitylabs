/**
 * Test for Voting contract
 *
 * @author Validity Labs AG <info@validitylabs.org>
 */

import {expectThrow, getEvents, BN, getGasCost, ZERO_ADDRESS, ZERO, ONE_ETHER, THREE_HUNDRED_ACCOUNTS, THREE_HUNDRED_VALUE} from '../../helpers/tools';
import {increase, increaseTo, latest, duration} from '../../helpers/OZ-tools';
import {it} from 'mocha';

const cnf = require('../../../config/contract-ivo.json');
const IvoToken = artifacts.require('./IvoToken');
const IvoVoting = artifacts.require('./IvoVoting');

const should = require('chai') // eslint-disable-line
    .use(require('chai-as-promised'))
    .use(require('chai-bn')(BN))
    .should();

const STO_START_TIME = new BN(cnf.STO_START_TIME);
const TOTAL_SUPPLY_CAP = new BN(cnf.TOTAL_SUPPLY_CAP);
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
const FIFTY = new BN('50');
const TWENTY_HUNDRED_ETHER = EIGHT_HUNDRED_ETHER.mul(TWO).add(FOUR_HUNDRED_ETHER);

/**
 * IvoVoting contract
 */
contract('IvoVoting', ([creator, owner, investor1, investor2, investor3, randomAccount]) => {
    let tokenInstance;
    let votingInstance;
    let firstProposalCreationTime;
    let secondProposalCreationTime;

    before(async () => {
        tokenInstance = await IvoToken.deployed();
        votingInstance = await IvoVoting.deployed();

        await tokenInstance.mint(investor1, EIGHT_HUNDRED_ETHER);
        await tokenInstance.mint(investor2, EIGHT_HUNDRED_ETHER);
        await tokenInstance.transferOwnership(owner);
    });

    describe('deployment', () => {
        let latestBlock;
        before(async () => {
            latestBlock = new BN(await latest);
        });
        context('when token is not a valid address', () => {
            it('fails', async () => {
                await expectThrow(IvoVoting.new(ZERO_ADDRESS, owner));
            });
        });
        context('when all parameters are provided', () => {
            it('deploys successfully', async () => {
                const anotherInstance = await IvoVoting.new(tokenInstance.address, owner);
            });
        });
        context('check all values', () => {
            it('does not have proposals', async () => {
                await expectThrow(votingInstance.getProposal(ONE));
            });
        });
    });

    describe('first time make proposal', () => {
        let events;
        before(async () => {
            await increase(TEN_DAYS);
        });
        context('create the first proposal', () => {
            context('when by a randomAccount', () => {
                it('fails', async () => {
                    await expectThrow(votingInstance.createProposal('first proposal', FIFTY, SIXTY_DAYS, {from: randomAccount}));
                });
            });
            context('when by a token holder', () => {
                it('fails', async () => {
                    await expectThrow(votingInstance.createProposal('first proposal', FIFTY, SIXTY_DAYS, {from: investor1}));
                });
            });
            context('when the owner', () => {
                it('succeeds', async () => {
                    // sixty days
                    const tx = await votingInstance.createProposal('first proposal', FIFTY, (new BN('60')), {from: owner});
                    events = getEvents(tx, 'ProposalCreated');
                    (events[0].creator).should.equal(owner);
                    (events[0].proposalIndex).should.be.a.bignumber.that.equals(ZERO);
                });
            });
        });
        context('getProposal', () => {
            context('invalidIndex', () => {
                it('fails, invalidIndex', async () => {
                    await expectThrow(votingInstance.getProposal(FIVE));
                });
            });
            context('right inputs', () => {
                let result;
                before(async () => {
                    result = await votingInstance.getProposal(ZERO); 
                });
                it('has the right quorum number', async () => {
                    new BN(result[1]).should.be.a.bignumber.that.equals(FIFTY);
                });
                it('notes down the proposal creation time', async () => {
                    firstProposalCreationTime = new BN(result[2]);
                });
                it('has the right voting duration/voting period', async () => {
                    const proposalCreationTimestamp = new BN(events[0].timestamp);
                    new BN(result[3]).should.be.a.bignumber.that.equals(proposalCreationTimestamp.add(SIXTY_DAYS));
                });
                it('has not yet resultRevealed', async () => {
                    (result[4]).should.equal(false);
                });
                it('has not yet result', async () => {
                    (result[5]).should.equal(false);
                });
                it('has zero vote', async () => {
                    new BN(result[6]).should.be.a.bignumber.that.equals(ZERO);
                });
            });
            
        });
    });

    describe('preparation', () => {
        let latestBlock;
        before(async () => {
            await increase(TEN_DAYS);
            new BN(await tokenInstance.balanceOf(investor1)).should.be.a.bignumber.that.equals(EIGHT_HUNDRED_ETHER);
            (await tokenInstance.paused()).should.equal(false);
            latestBlock = new BN(await latest);
        });
        context('create more snapshot', () => {
            it('investor1 transfers some money to investor3', async () => {
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
    }); 
    
    describe('still more snapshots', () => {
        beforeEach(async () => {
            await increase(duration.days(new BN('1')));
        });
        it('investor2 transfers some money to investor3', async () => {
            const tx = await tokenInstance.transfer(investor3, ONE_ETHER, {from: investor2});
            const events = getEvents(tx, 'Transfer');
            (events[0].to).should.equal(investor3);
            (events[0].value).should.be.a.bignumber.that.equals(ONE_ETHER);
        });
        it('investor3 transfers some money to investor2', async () => {
            const tx = await tokenInstance.transfer(investor2, ONE_ETHER, {from: investor3});
            const events = getEvents(tx, 'Transfer');
            (events[0].to).should.equal(investor2);
            (events[0].value).should.be.a.bignumber.that.equals(ONE_ETHER);
        });
        it('investor2 transfers some money to investor1', async () => {
            const tx = await tokenInstance.transfer(investor1, ONE_ETHER, {from: investor2});
            const events = getEvents(tx, 'Transfer');
            (events[0].to).should.equal(investor1);
            (events[0].value).should.be.a.bignumber.that.equals(ONE_ETHER);
        });
        it('investor1 transfers some money to investor2', async () => {
            const tx = await tokenInstance.transfer(investor2, ONE_ETHER, {from: investor1});
            const events = getEvents(tx, 'Transfer');
            (events[0].to).should.equal(investor2);
            (events[0].value).should.be.a.bignumber.that.equals(ONE_ETHER);
        });
    }); 

    describe('second time make proposal', () => {
        let events;
        before(async () => {
            await increase(TEN_DAYS);
        });
        context('create the second proposal', () => {
            context('when by the owner', () => {
                it('succeeds', async () => {
                    // sixty days
                    const tx = await votingInstance.createProposal('second proposal', FIFTY, FIFTY, {from: owner});
                    events = getEvents(tx, 'ProposalCreated');
                    (events[0].creator).should.equal(owner);
                    (events[0].proposalIndex).should.be.a.bignumber.that.equals(ONE);
                });
            });
        });
        context('getProposal', () => {
            context('invalidIndex', () => {
                it('fails, invalidIndex', async () => {
                    await expectThrow(votingInstance.getProposal(FIVE));
                });
            });
            context('right inputs', () => {
                let result;
                before(async () => {
                    result = await votingInstance.getProposal(ONE); 
                });
                it('has the right quorum number', async () => {
                    new BN(result[1]).should.be.a.bignumber.that.equals(FIFTY);
                });
                it('notes down the proposal creation time', async () => {
                    secondProposalCreationTime = new BN(result[2]);
                });
                it('has the right voting duration/voting period', async () => {
                    const proposalCreationTimestamp = new BN(events[0].timestamp);
                    new BN(result[3]).should.be.a.bignumber.that.equals(proposalCreationTimestamp.add(duration.days(FIFTY)));
                });
                it('has not yet resultRevealed', async () => {
                    (result[4]).should.equal(false);
                });
                it('has not yet result', async () => {
                    (result[5]).should.equal(false);
                });
                it('has zero vote', async () => {
                    new BN(result[6]).should.be.a.bignumber.that.equals(ZERO);
                });
            });
        });
    });

    describe('castVote for the second proposal', () => {
        context('right voting power', () => {
            it('investor1', async () => {
                new BN(await tokenInstance.balanceOfAt(investor1, secondProposalCreationTime)).should.be.a.bignumber.that.equals(FOUR_HUNDRED_ETHER);
            });
            it('investor2', async () => {
                new BN(await tokenInstance.balanceOfAt(investor2, secondProposalCreationTime)).should.be.a.bignumber.that.equals(EIGHT_HUNDRED_ETHER);
            });
            it('investor3', async () => {
                new BN(await tokenInstance.balanceOfAt(investor3, secondProposalCreationTime)).should.be.a.bignumber.that.equals(FOUR_HUNDRED_ETHER);
            });
        });
        context('right inputs -> Yes, yes, yes', () => {
            let tx1;
            let tx2;
            let tx3;
            before(async () => {
                tx1 = await votingInstance.castVote(ONE, true, {from: investor1}); 
                tx2 = await votingInstance.castVote(ONE, true, {from: investor2}); 
                tx3 = await votingInstance.castVote(ONE, true, {from: investor3}); 
            });
            it('investor1 succeeds in voting', async () => {
                const events = getEvents(tx1, 'ProposalVoted');
                (events[0].account).should.equal(investor1);
                new BN(events[0].proposalIndex).should.be.a.bignumber.that.equals(ONE);
            });
            it('investor2 succeeds in voting', async () => {
                const events = getEvents(tx2, 'ProposalVoted');
                (events[0].account).should.equal(investor2);
                new BN(events[0].proposalIndex).should.be.a.bignumber.that.equals(ONE);
            });
            it('investor2 succeeds in voting', async () => {
                const events = getEvents(tx3, 'ProposalVoted');
                (events[0].account).should.equal(investor3);
                new BN(events[0].proposalIndex).should.be.a.bignumber.that.equals(ONE);
            });
        });
        context('changed minds -> No, yes, yes', () => {
            let tx1;
            before(async () => {
                tx1 = await votingInstance.castVote(ONE, false, {from: investor1}); 
            });
            it('investor1 succeeds in voting', async () => {
                const events = getEvents(tx1, 'ProposalVoted');
                (events[0].account).should.equal(investor1);
                new BN(events[0].proposalIndex).should.be.a.bignumber.that.equals(ONE);
            });
        });
    });

    describe('castVote for the first proposal', () => {
        context('right voting power', () => {
            it('investor1', async () => {
                new BN(await tokenInstance.balanceOfAt(investor1, firstProposalCreationTime)).should.be.a.bignumber.that.equals(EIGHT_HUNDRED_ETHER);
            });
            it('investor2', async () => {
                new BN(await tokenInstance.balanceOfAt(investor2, firstProposalCreationTime)).should.be.a.bignumber.that.equals(EIGHT_HUNDRED_ETHER);
            });
            it('investor3', async () => {
                new BN(await tokenInstance.balanceOfAt(investor3, firstProposalCreationTime)).should.be.a.bignumber.that.equals(ZERO);
            });
        });
        context('wrong inputs', () => {
            it('fails with wrong proposal index', async () => {
                await expectThrow(votingInstance.castVote(FIVE, true, {from: investor1}));
            });
            it('fails with randomAccount', async () => {
                await expectThrow(votingInstance.castVote(ZERO, true, {from: randomAccount}));
            });
            it('fails with investor3, because it has no token when proposal was created', async () => {
                await expectThrow(votingInstance.castVote(ZERO, true, {from: investor3}));
            });
        });
        context('right inputs -> Yes, no', () => {
            let tx1;
            let tx2;
            before(async () => {
                tx1 = await votingInstance.castVote(ZERO, true, {from: investor1}); 
                tx2 = await votingInstance.castVote(ZERO, false, {from: investor2}); 
            });
            it('succeeds in voting yes', async () => {
                const events = getEvents(tx1, 'ProposalVoted');
                (events[0].account).should.equal(investor1);
                new BN(events[0].proposalIndex).should.be.a.bignumber.that.equals(ZERO);
            });
            it('succeeds', async () => {
                const events = getEvents(tx2, 'ProposalVoted');
                (events[0].account).should.equal(investor2);
                new BN(events[0].proposalIndex).should.be.a.bignumber.that.equals(ZERO);
            });
        });
    });

    describe('calculateResults for the first proposal', () => {
        before(async () => {
            await increase(TEN_DAYS);
        });
        context('random proposalIndex', () => {
            it('fails', async () => {
                await expectThrow(votingInstance.calculateResults(FIVE, {from: owner}))
            });
        });
        context('Voting is still open', () => {
            it('fails', async () => {
                await expectThrow(votingInstance.calculateResults(ZERO, {from: owner}))
            });
        });
        context('Voting period is closed', () => {
            before(async () => {
                await increase(SIXTY_DAYS);
            });
            context('Voting is impossible', () => {
                it('fails', async () => {
                    await expectThrow(votingInstance.castVote(ZERO, true, {from:investor1}))
                });
            });
            context('calculateResults', () => {
                it('succeeds', async () => {
                    await votingInstance.calculateResults(ZERO, {from: owner}); 
                });
            });
            context('succeeds', () => {
                let result;
                before(async () => {
                    result = await votingInstance.getProposal(ZERO); 
                });
                it('has the right quorum number', async () => {
                    new BN(result[1]).should.be.a.bignumber.that.equals(FIFTY);
                });
                it('has not yet resultRevealed', async () => {
                    (result[4]).should.equal(true);
                });
                it('has the result as false', async () => {
                    (result[5]).should.equal(false);
                });
                it('has 2 votes', async () => {
                    new BN(result[6]).should.be.a.bignumber.that.equals(TWO);
                });
            });
            context('calculateResults again', () => {
                it('fails', async () => {
                    await expectThrow(votingInstance.calculateResults(ZERO, {from:owner}))
                });
            });
        });
    });

    describe('calculateResults for the second proposal', () => {
        context('Voting period is closed', () => {
            before(async () => {
                await increase(SIXTY_DAYS);
                await votingInstance.calculateResults(ONE, {from: owner}); 
            });
            context('succeeds', () => {
                let result;
                before(async () => {
                    result = await votingInstance.getProposal(ONE); 
                });
                it('has the right quorum number', async () => {
                    new BN(result[1]).should.be.a.bignumber.that.equals(FIFTY);
                });
                it('has not yet resultRevealed', async () => {
                    (result[4]).should.equal(true);
                });
                it('has the result as false', async () => {
                    (result[5]).should.equal(true);
                });
                it('has 3 votes', async () => {
                    new BN(result[6]).should.be.a.bignumber.that.equals(THREE);
                });
            });
        });
    });
});
