/**
 * Test for IvoToken
 *
 * @author Validity Labs AG <info@validitylabs.org>
 */

import {expectThrow, getEvents, BN, ZERO_ADDRESS} from '../../helpers/tools';
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

/**
 * IvoToken contract
 */
contract('IvoToken', ([creator, owner, minter, manager, tokenHolder1, tokenHolder2, anotherAccount, randomAccount]) => {
    const {NAME, SYMBOL} = cnf;
    const DECIMALS = new BN(cnf.DECIMALS);
    const ZERO = new BN(0);
    const TOTAL_SUPPLY_CAP = new BN(cnf.TOTAL_SUPPLY_CAP);                          // 100 million IVO Tokens
    const SAFT_VAULT_ALLOCATION = new BN(cnf.SAFT_VAULT_ALLOCATION);                // 22.5 million IVO Tokens
    const ADVISORS_VESTING_ALLOCATION = new BN(cnf.ADVISORS_VESTING_ALLOCATION);    // 1.5 million IVO Tokens
    const TEAM_VESTING_ALLOCATION = new BN(cnf.TEAM_VESTING_ALLOCATION);            // 13.5 million IVO Tokens
    const RESERVE_VAULT_ALLOCATION = new BN(cnf.RESERVE_VAULT_ALLOCATION);          // 10 million IVO Tokens
    const INITIAL_SUPPLY = SAFT_VAULT_ALLOCATION.add(ADVISORS_VESTING_ALLOCATION).add(TEAM_VESTING_ALLOCATION).add(RESERVE_VAULT_ALLOCATION);
    const HARD_CAP = TOTAL_SUPPLY_CAP.sub(INITIAL_SUPPLY);                          //  52.5 million IVO Tokens.
    const SENT_AMOUNT = (new BN(20)).mul((new BN(10)).pow(new BN(24)));                    // small amount to test transfers
    const REST_OF_AMOUNT = HARD_CAP.sub(SENT_AMOUNT);                    // small amount to test transfers

    let tokenInstance;
    let crowdsaleInstance;
    let privateVaultInstance;
    let presaleVaultInstance;
    let saftVaultInstance;
    let advisorsVestingInstance;
    let teamVestingInstance;
    let reserveVaultInstance;

    before(async () => {
        crowdsaleInstance = await IvoCrowdsale.deployed();
        privateVaultInstance = await PrivateVault.deployed();
        presaleVaultInstance = await PresaleVault.deployed();
        saftVaultInstance = await SaftVault.deployed();
        advisorsVestingInstance = await AdvisorsVesting.deployed();
        teamVestingInstance = await TeamVesting.deployed();
        reserveVaultInstance = await ReserveVault.deployed();
    });

    describe('deployment', () => {
        context('when the cap is not larger than zero', () => {
            it('fails', async () => {
                await expectThrow(IvoToken.new(NAME, SYMBOL, DECIMALS, ZERO));
            });
        });
        context('when all parameters are provided', () => {
            it('deploys successfully', async () => {
                tokenInstance = await IvoToken.new(NAME, SYMBOL, DECIMALS, TOTAL_SUPPLY_CAP);
                assert.isDefined(tokenInstance);
            });
        });
    });

    describe('when instantiated', () => {
        it('has the right name', async () => {
            (await tokenInstance.name()).should.be.equal(NAME);
        });
        it('has the right symbol', async () => {
            (await tokenInstance.symbol()).should.be.equal(SYMBOL);
        });
        it('has the right decimals', async () => {
            (await tokenInstance.decimals()).should.be.a.bignumber.that.equals(DECIMALS);
        });
        it('has a total supply of zero', async () => {
            (await tokenInstance.totalSupply()).should.be.a.bignumber.that.equals(ZERO);
        });
        it('the creator is the owner', async () => {
            (await tokenInstance.isOwner({from: creator})).should.equal(true);
        });
        it('the cap is set', async () => {
            (await tokenInstance.cap()).should.be.a.bignumber.that.equals(TOTAL_SUPPLY_CAP);
        });
        it('token is paused', async () => {
            (await tokenInstance.paused()).should.equal(true);
        });
        it('owner has a minter role', async () => {
            (await tokenInstance.isMinter(creator)).should.equal(true);
        });
        it('owner has a pausable manager role', async () => {
            (await tokenInstance.isManager(creator)).should.equal(true);
        });
    });

    describe('manager role', () => {
        context('when adding a new manager', () => {
            context('when adding an invalid manager', () => {
                it('fails', async () => {
                    await expectThrow(tokenInstance.addManager(ZERO_ADDRESS, {from: creator}));
                });
            });
            context('when adding a valid manager', () => {
                context('when called by a non-owner/non-manager account', () => {
                    it('fails', async () => {
                        await expectThrow(tokenInstance.addManager(manager, {from: randomAccount}));
                    });
                });
                context('when called by an owner account', () => {
                    before(async () => {
                        await tokenInstance.addManager(manager, {from: creator});
                    });
                    it('succeeds', async () => {
                        (await tokenInstance.isManager(manager)).should.equal(true);
                        (await tokenInstance.numManager()).should.be.a.bignumber.that.equals(new BN(2));
                    });
                });
            });
        });
        context('when renounce a manager', () => {
            context('when there is more than one manager', () => {
                it('succeeds', async () => {
                    await tokenInstance.renounceManager({from:manager});
                    (await tokenInstance.numManager()).should.be.a.bignumber.that.equals(new BN(1));
                });
            });
            context('when there is only one manager', () => {
                it('fails', async () => {
                    await expectThrow(tokenInstance.renounceManager({from:creator}));
                });
            });
        });
    });

    describe('minter role', () => {
        context('when adding a new minter', () => {
            context('when called by a non-minter account', () => {
                it('fails', async () => {
                    await expectThrow(tokenInstance.addMinter(minter, {from: randomAccount}));
                });
            });
            context('when called by a minter account', () => {
                before(async () => {
                    (await tokenInstance.isMinter(creator)).should.equal(true);
                    await tokenInstance.addMinter(minter, {from: creator});
                });
                it('succeeds', async () => {
                    (await tokenInstance.isMinter(minter)).should.equal(true);
                });
            });
        });
        context('when renounce a minter', () => {
            it('succeeds', async () => {
                await tokenInstance.renounceMinter({from:minter});
                (await tokenInstance.isMinter(minter)).should.equal(false);
            });
        });
        describe('add another minter for futher test', () => {
            before(async () => {
                await tokenInstance.addMinter(minter, {from: creator});
            });
            it('succeeds', async () => {
                (await tokenInstance.isMinter(minter)).should.equal(true);
            });
        });
    });

    describe('provides all required addresses to the contract with roleSetup', () => {
        context('when called by a non-owner account', () => {
            it('fails', async () => {
                await expectThrow(tokenInstance.roleSetup(
                    owner,
                    crowdsaleInstance.address,
                    saftVaultInstance.address,
                    privateVaultInstance.address,
                    presaleVaultInstance.address,
                    advisorsVestingInstance.address,
                    teamVestingInstance.address,
                    reserveVaultInstance.address,
                    {from: randomAccount}
                ));
            });
        });
        context('when called by the owner account', () => {
            context('when providing all correct vault addresses', () => {
                let tx1;
                const events = [];
                // let currentTime;
                before(async () => {
                    tx1 = await tokenInstance.roleSetup(
                        owner,
                        crowdsaleInstance.address,
                        saftVaultInstance.address,
                        privateVaultInstance.address,
                        presaleVaultInstance.address,
                        advisorsVestingInstance.address,
                        teamVestingInstance.address,
                        reserveVaultInstance.address,
                        {from: creator});
                    events[0] = getEvents(tx1, 'Transfer');
                    events[1] = getEvents(tx1, 'ManagerAdded');
                    events[2] = getEvents(tx1, 'ManagerRemoved');
                    events[3] = getEvents(tx1, 'MinterAdded');
                    events[4] = getEvents(tx1, 'MinterRemoved');
                    events[5] = getEvents(tx1, 'OwnershipTransferred');
                    // events[7] = getEvents(tx1, 'AccountSnapshotCreated');
                    // currentTime = new BN((await web3.eth.getBlock(tx1.blockNumber)).timestamp);
                    // console.log('Current timestamp is', currentTime);
                });
                context('Tokens are properly minted to vaults', () => {
                    it('has a total supply of 47.5 million', async () => {
                        (await tokenInstance.totalSupply()).should.be.a.bignumber.that.equals(INITIAL_SUPPLY);
                    });
                    it('mints to SAFT vault', async () => {
                        (await tokenInstance.balanceOf(saftVaultInstance.address)).should.be.a.bignumber.that.equals(SAFT_VAULT_ALLOCATION);
                        (events[0][0].from).should.equal(ZERO_ADDRESS);
                        assert.equal(events[0][0].from, ZERO_ADDRESS, 'from account of the mint method is not ZERO_ADDRESS');
                        assert.equal(events[0][0].to, saftVaultInstance.address, 'to account of the mint method is wrong');
                        (events[0][0].value).should.be.a.bignumber.that.equals(SAFT_VAULT_ALLOCATION);
                        // assert.equal(events[7][0].account, saftVaultInstance.address, 'to account of the mint method is wrong');
                        // (events[7][0].blockNumber).should.be.a.bignumber.that.equals(currentTime);
                        // (events[7][0].value).should.be.a.bignumber.that.equals(SAFT_VAULT_ALLOCATION);
                    });
                    it('mints to the reserve vault', async () => {
                        (await tokenInstance.balanceOf(reserveVaultInstance.address)).should.be.a.bignumber.that.equals(RESERVE_VAULT_ALLOCATION);
                        assert.equal(events[0][1].from, ZERO_ADDRESS, 'from account of the mint method is not ZERO_ADDRESS');
                        assert.equal(events[0][1].to, reserveVaultInstance.address, 'to account of the mint method is wrong');
                        (events[0][1].value).should.be.a.bignumber.that.equals(RESERVE_VAULT_ALLOCATION);
                        // assert.equal(events[7][1].account, reserveVaultInstance.address, 'to account of the mint method is wrong');
                        // (events[7][1].blockNumber).should.be.a.bignumber.that.equals(currentTime);
                        // (events[7][1].value).should.be.a.bignumber.that.equals(RESERVE_VAULT_ALLOCATION);
                    });
                    it('mints to the advisors vesting vault', async () => {
                        (await tokenInstance.balanceOf(advisorsVestingInstance.address)).should.be.a.bignumber.that.equals(ADVISORS_VESTING_ALLOCATION);
                        assert.equal(events[0][2].from, ZERO_ADDRESS, 'from account of the mint method is not ZERO_ADDRESS');
                        assert.equal(events[0][2].to, advisorsVestingInstance.address, 'to account of the mint method is wrong');
                        (events[0][2].value).should.be.a.bignumber.that.equals(ADVISORS_VESTING_ALLOCATION);
                        // assert.equal(events[7][2].account, advisorsVestingInstance.address, 'to account of the mint method is wrong');
                        // (events[7][2].blockNumber).should.be.a.bignumber.that.equals(currentTime);
                        // (events[7][2].value).should.be.a.bignumber.that.equals(ADVISORS_VESTING_ALLOCATION);
                    });
                    it('mints to the team vesting vault', async () => {
                        (await tokenInstance.balanceOf(teamVestingInstance.address)).should.be.a.bignumber.that.equals(TEAM_VESTING_ALLOCATION);
                        assert.equal(events[0][3].from, ZERO_ADDRESS, 'from account of the mint method is not ZERO_ADDRESS');
                        assert.equal(events[0][3].to, teamVestingInstance.address, 'to account of the mint method is wrong');
                        (events[0][3].value).should.be.a.bignumber.that.equals(TEAM_VESTING_ALLOCATION);
                        // assert.equal(events[7][3].account, teamVestingInstance.address, 'to account of the mint method is wrong');
                        // (events[7][3].blockNumber).should.be.a.bignumber.that.equals(currentTime);
                        // (events[7][3].value).should.be.a.bignumber.that.equals(TEAM_VESTING_ALLOCATION);
                    });
                    it('mints nothing to private and presale vault', async () => {
                        (await tokenInstance.balanceOf(privateVaultInstance.address)).should.be.a.bignumber.that.equals(ZERO);
                        (await tokenInstance.balanceOf(presaleVaultInstance.address)).should.be.a.bignumber.that.equals(ZERO);
                    });
                });
                context('Roles (manager & minter) are properly set', () => {
                    it('transfer successfully the ownership', async () => {
                        (await tokenInstance.owner()).should.be.equal(owner);
                        assert.equal(events[5][0].newOwner, owner, 'address of the new owner does not match');
                    });
                    it('creator does not have a minter role', async () => {
                        (await tokenInstance.isMinter(creator)).should.equal(false);
                        assert.equal(events[4][0].account, creator, 'account mismatches');
                    });
                    it('creator does not have a pausable manager role', async () => {
                        (await tokenInstance.isManager(creator)).should.equal(false);
                        assert.equal(events[2][0].account, creator, 'account mismatches');
                    });
                    it('owner does not have a minter role', async () => {
                        (await tokenInstance.isMinter(owner)).should.equal(false);
                    });
                    it('owner has a pausable manager role', async () => {
                        (await tokenInstance.isManager(owner)).should.equal(true);
                        assert.equal(events[1][0].account, owner, 'account mismatches');
                    });
                    it('crowdsale has a minter manager role', async () => {
                        (await tokenInstance.isMinter(crowdsaleInstance.address)).should.equal(true);
                        assert.equal(events[3][0].account, crowdsaleInstance.address, 'account mismatches');
                    });
                    it('crowdsale has a pausable manager role', async () => {
                        (await tokenInstance.isManager(crowdsaleInstance.address)).should.equal(true);
                        assert.equal(events[1][1].account, crowdsaleInstance.address, 'account mismatches');
                    });
                    it('token has two managers in total', async () => {
                        (await tokenInstance.numManager()).should.be.a.bignumber.that.equals(new BN(2));
                    });
                });
            });
        });
        context('when called again by the owner account', () => {
            it('fails', async () => {
                await expectThrow(tokenInstance.roleSetup(
                    randomAccount,
                    crowdsaleInstance.address,
                    saftVaultInstance.address,
                    privateVaultInstance.address,
                    presaleVaultInstance.address,
                    advisorsVestingInstance.address,
                    teamVestingInstance.address,
                    reserveVaultInstance.address,
                    {from: owner}
                ));
            });
        });
    });

    describe('Ownership', () => {
        context('when the new account is zero', () => {
            it('fails', async () => {
                await expectThrow(tokenInstance.transferOwnership(ZERO_ADDRESS, {from: owner}));
            });
        });
        context('when renounce the ownership', () => {
            it('fails', async () => {
                await expectThrow(tokenInstance.renounceOwnership({from: owner}));
            });
            it('still has the old owner', async () => {
                (await tokenInstance.owner()).should.be.equal(owner);
            });
        });
    });

    describe('mint', () => {
        context('when called by a non-minter account', () => {
            it('fails', async () => {
                await expectThrow(tokenInstance.mint(tokenHolder1, HARD_CAP, {from: randomAccount}));
            });
        });

        context('when called by a minter account', () => {
            context('when exceeding the cap', () => {
                it('fails', async () => {
                    const largeSupply = HARD_CAP.add(new BN('1'));
                    await expectThrow(tokenInstance.mint(tokenHolder1, largeSupply, {from: minter}));
                });
            });

            context('when not exceding the cap', () => {
                context('when recipient is zero address', () => {
                    it('fails', async () => {
                        await expectThrow(tokenInstance.mint(ZERO_ADDRESS, HARD_CAP, {from: minter}));
                    });
                });
                context('when recipient address is not zero', () => {
                    let tx;
                    // let currentTime;
                    before(async () => {
                        tx = await tokenInstance.mint(tokenHolder1, HARD_CAP, {from: minter});
                        // currentTime = new BN((await web3.eth.getBlock(tx.blockNumber))).timestamp);
                    });
                    it('mints requested amount', async () => {
                        (await tokenInstance.totalSupply()).should.be.a.bignumber.that.equals(TOTAL_SUPPLY_CAP);
                    });

                    it('emits a transfer event', async () => {
                        const transferEvents = await getEvents(tx, 'Transfer');
                        transferEvents[0].from.should.be.equal(ZERO_ADDRESS);
                        transferEvents[0].to.should.be.equal(tokenHolder1);
                        transferEvents[0].value.should.be.a.bignumber.that.equals(HARD_CAP);
                    });
                    it('emits snapshot events', async () => {
                        const snapshotEvents = [];
                        snapshotEvents[0] = getEvents(tx, 'AccountSnapshotCreated');
                        (snapshotEvents[0][0].value).should.be.a.bignumber.that.equals(HARD_CAP);
                        snapshotEvents[1] = getEvents(tx, 'TotalSupplySnapshotCreated');
                        (snapshotEvents[1][0].value).should.be.a.bignumber.that.equals(TOTAL_SUPPLY_CAP);
                    });
                });
            });
        });
    });

    describe('transfer', () => {
        context('when paused', () => {
            before(async () => {
                await tokenInstance.pause({from: owner});
                (await tokenInstance.paused()).should.equal(true);
            });
            it('fails', async () => {
                await expectThrow(tokenInstance.transfer(tokenHolder2, HARD_CAP, {from: tokenHolder1}));
                (await tokenInstance.balanceOf(tokenHolder2)).should.be.a.bignumber.that.equals(ZERO);
            });
        });

        context('when unpaused', () => {
            before(async () => {
                await tokenInstance.unpause({from: owner});
            });

            context('when the sender does not have enough balance', () => {
                it('fails', async () => {
                    await expectThrow(tokenInstance.transfer(tokenHolder2, HARD_CAP, {from: anotherAccount}));
                    (await tokenInstance.balanceOf(tokenHolder2)).should.be.a.bignumber.that.equals(ZERO);
                });
            });

            context('when the sender has enough balance', () => {
                context('when recipient is zero address', () => {
                    it('fails', async () => {
                        await expectThrow(tokenInstance.transfer(ZERO_ADDRESS, HARD_CAP, {from: tokenHolder1}));
                        (await tokenInstance.balanceOf(ZERO_ADDRESS)).should.be.a.bignumber.that.equals(ZERO);
                    });
                });

                context('when recipient is different to zero address', () => {
                    let tx;
                    before(async () => {
                        tx = await tokenInstance.transfer(tokenHolder2, HARD_CAP, {from: tokenHolder1});
                    });
                    it('transfers requested amount', async () => {
                        (await tokenInstance.balanceOf(tokenHolder1)).should.be.a.bignumber.that.equals(ZERO);
                        (await tokenInstance.balanceOf(tokenHolder2)).should.be.a.bignumber.that.equals(HARD_CAP);
                    });

                    it('emits a transfer event', async () => {
                        const transferEvents = getEvents(tx, 'Transfer');

                        transferEvents[0].from.should.be.equal(tokenHolder1);
                        transferEvents[0].to.should.be.equal(tokenHolder2);
                        transferEvents[0].value.should.be.a.bignumber.that.equals(HARD_CAP);
                    });
                    it('emits snapshot events', async () => {
                        const snapshotEvents = [];
                        snapshotEvents[0] = getEvents(tx, 'AccountSnapshotCreated');
                        (snapshotEvents[0][0].value).should.be.a.bignumber.that.equals(ZERO);
                        (snapshotEvents[0][1].value).should.be.a.bignumber.that.equals(HARD_CAP);
                    });
                });
            });
        });
    });

    describe('approve', () => {
        context('when paused', () => {
            it('fails', async () => {
                await tokenInstance.pause({from: owner});

                await expectThrow(tokenInstance.approve(anotherAccount, HARD_CAP, {from: tokenHolder2}));
            });
        });

        context('when unpaused', () => {
            before(async () => {
                await tokenInstance.unpause({from: owner});
            });

            context('when spender is zero address', () => {
                it('fails', async () => {
                    await expectThrow(tokenInstance.approve(ZERO_ADDRESS, HARD_CAP, {from: tokenHolder2}));
                    (await tokenInstance.allowance(tokenHolder2, ZERO_ADDRESS)).should.be.a.bignumber.that.equals(ZERO);
                });
            });

            context('when spender is different to zero address', () => {
                let tx;
                before(async () => {
                    tx = await tokenInstance.approve(anotherAccount, HARD_CAP, {from: tokenHolder2});
                });

                it('approves the requested amount', async () => {
                    (await tokenInstance.allowance(tokenHolder2, anotherAccount)).should.be.a.bignumber.that.equals(HARD_CAP);
                });

                it('emits an approval event', async () => {
                    const events = getEvents(tx);
                    events.Approval[0].owner.should.be.equal(tokenHolder2);
                    events.Approval[0].spender.should.be.equal(anotherAccount);
                    events.Approval[0].value.should.be.a.bignumber.that.equals(HARD_CAP);
                });
            });
        });
    });

    describe('transferFrom', () => {
        context('when paused', () => {
            it('fails', async () => {
                await tokenInstance.pause({from: owner});

                await expectThrow(tokenInstance.transferFrom(tokenHolder2, tokenHolder1, SENT_AMOUNT, {from: anotherAccount}));
            });
        });

        context('when unpaused', () => {
            before(async () => {
                await tokenInstance.unpause({from: owner});
            });

            context('when spender does not have enough approved balance', () => {
                it('fails', async () => {
                    const largeAmount =  HARD_CAP.add(new BN(1));
                    await expectThrow(tokenInstance.transferFrom(tokenHolder2, tokenHolder1, largeAmount, {from: anotherAccount}));
                });
            });

            context('when spender has enough approved balance', () => {
                let tx;
                before(async () => {
                    tx = await tokenInstance.transferFrom(tokenHolder2, tokenHolder1, SENT_AMOUNT, {from: anotherAccount});
                });

                it('transfers the requested amount', async () => {
                    (await tokenInstance.allowance(tokenHolder2, anotherAccount)).should.be.a.bignumber.that.equals(REST_OF_AMOUNT);

                    (await tokenInstance.balanceOf(tokenHolder2)).should.be.a.bignumber.that.equals(REST_OF_AMOUNT);
                    (await tokenInstance.balanceOf(tokenHolder1)).should.be.a.bignumber.that.equals(SENT_AMOUNT);
                });

                it('emits a transfer event', async () => {
                    const transferEvents = getEvents(tx, 'Transfer');
                    transferEvents[0].from.should.be.equal(tokenHolder2);
                    transferEvents[0].to.should.be.equal(tokenHolder1);
                    transferEvents[0].value.should.be.a.bignumber.that.equals(SENT_AMOUNT);
                });
                it('emits snapshot events', async () => {
                    const snapshotEvents = [];
                    snapshotEvents[0] = getEvents(tx, 'AccountSnapshotCreated');
                    (snapshotEvents[0][0].value).should.be.a.bignumber.that.equals(REST_OF_AMOUNT);
                    (snapshotEvents[0][1].value).should.be.a.bignumber.that.equals(SENT_AMOUNT);
                });
            });
        });
    });

    describe('increaseAllowance', () => {
        context('when paused', () => {
            it('fails', async () => {
                await tokenInstance.pause({from: owner});

                await expectThrow(tokenInstance.increaseAllowance(anotherAccount, 1, {from: tokenHolder2}));
            });
        });

        context('when unpaused', () => {
            context('when spender is zero address', () => {
                it('fails', async () => {
                    await expectThrow(tokenInstance.increaseAllowance(ZERO_ADDRESS, 1, {from: tokenHolder2}));
                });
            });

            context('when spender is different to zero address', () => {
                let tx;
                const newAmount = REST_OF_AMOUNT.add(new BN(1));
                before(async () => {
                    await tokenInstance.unpause({from: owner});
                    tx = await tokenInstance.increaseAllowance(anotherAccount, 1, {from: tokenHolder2});
                });
                it('increases allowance', async () => {
                    (await tokenInstance.allowance(tokenHolder2, anotherAccount)).should.be.a.bignumber.that.equals(newAmount);
                });
                it('emits an approval event', async () => {
                    const approvalEvents = getEvents(tx, 'Approval');
                    (approvalEvents[0].owner).should.be.equal(tokenHolder2);
                    (approvalEvents[0].spender).should.be.equal(anotherAccount);
                    (approvalEvents[0].value).should.be.a.bignumber.that.equals(newAmount);
                });
            });
        });
    });

    describe('decreaseAllowance', () => {
        context('when paused', () => {
            it('fails', async () => {
                await tokenInstance.pause({from: owner});

                await expectThrow(tokenInstance.decreaseAllowance(anotherAccount, 1, {from: tokenHolder2}));
            });
        });

        context('when unpaused', () => {
            context('when spender is zero address', () => {
                it('fails', async () => {
                    await expectThrow(tokenInstance.decreaseAllowance(ZERO_ADDRESS, 1, {from: tokenHolder2}));
                });
            });

            context('when spender is different to zero address', () => {
                let tx;
                before(async () => {
                    await tokenInstance.unpause({from: owner});
                    tx = await tokenInstance.decreaseAllowance(anotherAccount, 1, {from: tokenHolder2});
                });
                it('decreases allowance', async () => {
                    (await tokenInstance.allowance(tokenHolder2, anotherAccount)).should.be.a.bignumber.that.equals(REST_OF_AMOUNT);
                });
                it('emits an approval event', async () => {
                    const approvalEvents = getEvents(tx, 'Approval');
                    approvalEvents[0].owner.should.be.equal(tokenHolder2);
                    approvalEvents[0].spender.should.be.equal(anotherAccount);
                    approvalEvents[0].value.should.be.a.bignumber.that.equals(REST_OF_AMOUNT);
                });
            });
        });
    });

    describe('burn', () => {
        context('when the amount to burn is greater than the balance', () => {
            it('fails', async () => {
                await expectThrow(tokenInstance.burn(HARD_CAP, {from: tokenHolder1}));
            });
        });

        context('when the amount to burn is not greater than the balance', () => {
            let tx;
            before(async () => {
                tx = await tokenInstance.burn(SENT_AMOUNT, {from: tokenHolder1});
            });

            it('burns the requested amount', async () => {
                (await tokenInstance.totalSupply()).should.be.a.bignumber.that.equals(REST_OF_AMOUNT.add(INITIAL_SUPPLY));

                (await tokenInstance.balanceOf(tokenHolder1)).should.be.a.bignumber.that.equals(ZERO);
            });

            it('emits a transfer event', async () => {
                const transferEvents = getEvents(tx, 'Transfer');
                transferEvents[0].from.should.be.equal(tokenHolder1);
                transferEvents[0].to.should.be.equal(ZERO_ADDRESS);
                transferEvents[0].value.should.be.a.bignumber.that.equals(SENT_AMOUNT);
            });

            it('emits snapshot events', async () => {
                const snapshotEvents = [];
                snapshotEvents[0] = getEvents(tx, 'AccountSnapshotCreated');
                (snapshotEvents[0][0].value).should.be.a.bignumber.that.equals(ZERO);
                snapshotEvents[1] = getEvents(tx, 'TotalSupplySnapshotCreated');
                (snapshotEvents[1][0].value).should.be.a.bignumber.that.equals(TOTAL_SUPPLY_CAP.sub(SENT_AMOUNT));
            });
        });
    });

    describe('reclaimToken', () => {
        context('IVO token accidentally received IVO token', () => {
            before(async () => {
                await tokenInstance.transfer(tokenInstance.address, REST_OF_AMOUNT, {from: tokenHolder2});
            });
            context('when called by a non-owner account', () => {
                it('fails', async () => {
                    await expectThrow(tokenInstance.reclaimToken(tokenInstance.address, {from: anotherAccount}));
                });
            });
            context('when called by the owner account', () => {
                before(async () => {
                    await tokenInstance.reclaimToken(tokenInstance.address, {from: owner});
                });
                it('recovers tokens successfully', async () => {
                    (await tokenInstance.balanceOf(owner)).should.be.a.bignumber.that.equals(REST_OF_AMOUNT);
                    (await tokenInstance.balanceOf(tokenInstance.address)).should.be.a.bignumber.that.equals(ZERO);
                });
            });
        });
        context('IVO token accidentally received another token', () => {
            let anotherTokenInstance;
            before(async () => {
                anotherTokenInstance = await IvoToken.new('NAME', 'SYMBOL', DECIMALS, HARD_CAP, {from: creator});

                await anotherTokenInstance.mint(anotherAccount, SENT_AMOUNT, {from: creator});
                await anotherTokenInstance.transfer(tokenInstance.address, SENT_AMOUNT, {from: anotherAccount});
            });
            context('when called by a non-owner account', () => {
                it('fails', async () => {
                    await expectThrow(tokenInstance.reclaimToken(anotherTokenInstance.address, {from: anotherAccount}));
                });
            });
            context('when called by the owner account', () => {
                before(async () => {
                    await tokenInstance.reclaimToken(anotherTokenInstance.address, {from: owner});
                });
                it('recovers tokens successfully', async () => {
                    (await anotherTokenInstance.balanceOf(owner)).should.be.a.bignumber.that.equals(SENT_AMOUNT);
                    (await anotherTokenInstance.balanceOf(tokenInstance.address)).should.be.a.bignumber.that.equals(ZERO);
                });
            });
        });
    });
});
