/**
 * Test for Team vesting
 *
 * @author Validity Labs AG <info@validitylabs.org>
 */

import {
    expectThrow,
    getEvents,
    BN,
    ZERO_ADDRESS,
    ZERO,
    ONE_ETHER,
} from '../../helpers/tools';
import {increaseTo, latest} from '../../helpers/OZ-tools';
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

const should = require("chai") // eslint-disable-line
    .use(require('chai-as-promised'))
    .use(require('chai-bn')(BN))
    .should();

const TOTAL_SUPPLY_CAP = new BN(cnf.TOTAL_SUPPLY_CAP);
const TEAM_VESTING_ALLOCATION = new BN(cnf.TEAM_VESTING_ALLOCATION);
const TEAM_VESTING_START_TIME = new BN(cnf.TEAM_VESTING_START_TIME);
const TEAM_VESTING_CLIFF_TIME = new BN(cnf.TEAM_VESTING_CLIFF_TIME);
const TEAM_VESTING_END_TIME = new BN(cnf.TEAM_VESTING_END_TIME);
const HUNDRED_EIGHTY_DAYS = new BN(cnf.HUNDRED_EIGHTY_DAYS);
const HUNDRED_TWENTY_DAYS = new BN(cnf.HUNDRED_TWENTY_DAYS);
const SIXTY_DAYS = new BN(cnf.SIXTY_DAYS);
const FOUR_HUNDRED_THOUSAND_ETHER = ONE_ETHER.mul(new BN('400000'));

const calculateShouldReceiveAmount = (currentTime, previousBalance) => {
    // 1080 days = 180 days * 6
    return TEAM_VESTING_ALLOCATION.mul(new BN(currentTime).sub(TEAM_VESTING_START_TIME))
        .div(HUNDRED_EIGHTY_DAYS.mul(new BN('6')))
        .sub(TEAM_VESTING_ALLOCATION.sub(new BN(previousBalance)));
};

/**
 * TeamVesting contract
 */
contract(
    'TeamVesting',
    ([
        creator,
        owner,
        randomAccount,
        randomAccount3,
        randomAccount4,
        randomAccount5,
        randomAccount6,
        randomAccount7,
        randomAccount8,
        wallet
    ]) => {
        const TEAM_WALLET = wallet;

        let tokenInstance;
        let crowdsaleInstance;
        let advisorsVestingInstance;
        let privateVaultInstance;
        let presaleVaultInstance;
        let saftVaultInstance;
        let teamVestingInstance;
        let reserveVaultInstance;
        let anotherTokenInstance;
        let anotherTeamVestingInstance;

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
                {from: creator}
            );
        });

        describe('deployment', () => {
            context('when crowdsale is not a valid address', () => {
                it('fails', async () => {
                    await expectThrow(
                        TeamVesting.new(
                            tokenInstance.address,
                            ZERO_ADDRESS,
                            owner,
                            TEAM_WALLET
                        )
                    );
                });
            });
            context(
                'when sender address is not different from the crowdsale address',
                () => {
                    it('fails', async () => {
                        await expectThrow(
                            TeamVesting.new(
                                tokenInstance.address,
                                creator,
                                owner,
                                TEAM_WALLET
                            )
                        );
                    });
                }
            );
            context('when all parameters are provided', () => {
                before(async () => {
                    anotherTokenInstance = await IvoToken.new(
                        'NAME',
                        'SYMBOL',
                        new BN('18'),
                        TOTAL_SUPPLY_CAP
                    );
                });
                it('deploys successfully', async () => {
                    anotherTeamVestingInstance = await TeamVesting.new(
                        anotherTokenInstance.address,
                        crowdsaleInstance.address,
                        owner,
                        TEAM_WALLET
                    );
                });
            });
        });

        describe('when instantiated', () => {
            it('has allocated totalBalance', async () => {
                (await teamVestingInstance.totalBalance()).should.be.a.bignumber.that.equals(
                    TEAM_VESTING_ALLOCATION
                );
            });
            it('has the no updateTime', async () => {
                (await teamVestingInstance.updateTime()).should.be.a.bignumber.that.equals(
                    TEAM_VESTING_START_TIME
                );
            });
            it('has the correct startingTime', async () => {
                (await teamVestingInstance.releaseTime()).should.be.a.bignumber.that.equals(
                    TEAM_VESTING_CLIFF_TIME
                );
            });
            it('knows the releaseTime', async () => {
                (await teamVestingInstance.knownReleaseTime()).should.equal(
                    true
                );
            });
            it('has the token address', async () => {
                (await teamVestingInstance.token()).should.equal(
                    tokenInstance.address
                );
            });
            it('has the crowdsale address', async () => {
                (await teamVestingInstance.crowdsale()).should.equal(
                    crowdsaleInstance.address
                );
            });
            it('has the teamWallet address', async () => {
                (await teamVestingInstance.teamWallet()).should.equal(
                    TEAM_WALLET
                );
            });
            it('the owner has changed', async () => {
                (await teamVestingInstance.isOwner({
                    from: owner
                })).should.equal(true);
            });
            it('the owner does not have a pausable manager role', async () => {
                (await teamVestingInstance.isManager(owner)).should.equal(
                    false
                );
            });
            it('the creator does not have a pausable manager role', async () => {
                (await teamVestingInstance.isManager(creator)).should.equal(
                    false
                );
            });
        });

        describe('add accounts to the list', () => {
            context('when called by a randomAccount', () => {
                it('fails', async () => {
                    await expectThrow(
                        teamVestingInstance.receiveFor(
                            randomAccount,
                            FOUR_HUNDRED_THOUSAND_ETHER,
                            {from: randomAccount}
                        )
                    );
                });
            });
            context('when called by a manager', () => {
                it('fails', async () => {
                    await expectThrow(
                        teamVestingInstance.receiveFor(
                            randomAccount,
                            FOUR_HUNDRED_THOUSAND_ETHER,
                            {from: owner}
                        )
                    );
                });
            });
        });
        // This test case is not applicable, because the team vesting already starts according to the date written in the specs.
        // describe('before release time', () => {
        //     context('when called by a randomAccount', () => {
        //         it('fails', async () => {
        //             await expectThrow(
        //                 teamVestingInstance.release({from: randomAccount})
        //             );
        //         });
        //         it('fails', async () => {
        //             await expectThrow(
        //                 teamVestingInstance.releaseFor(randomAccount, {
        //                     from: randomAccount
        //                 })
        //             );
        //         });
        //     });
        //     context('when called by the team account', () => {
        //         it('fails when the team wallet calls', async () => {
        //             await expectThrow(
        //                 teamVestingInstance.release({from: TEAM_WALLET})
        //             );
        //         });
        //         it('fails when a random account calls', async () => {
        //             await expectThrow(
        //                 teamVestingInstance.releaseFor(TEAM_WALLET, {
        //                     from: randomAccount
        //                 })
        //             );
        //         });
        //     });
        //     context('can reclaim token', () => {
        //         const extraMinted = ONE_ETHER.mul(new BN('10000'));
        //         let shouldHave;
        //         before(async () => {
        //             await anotherTokenInstance.mint(
        //                 anotherTeamVestingInstance.address,
        //                 extraMinted,
        //                 {from: creator}
        //             );
        //             // finishes setup
        //             await anotherTokenInstance.roleSetup(
        //                 owner,
        //                 crowdsaleInstance.address,
        //                 saftVaultInstance.address,
        //                 privateVaultInstance.address,
        //                 presaleVaultInstance.address,
        //                 advisorsVestingInstance.address,
        //                 anotherTeamVestingInstance.address,
        //                 reserveVaultInstance.address,
        //                 {from: creator}
        //             );
        //         });
        //         it('has some tokens', async () => {
        //             shouldHave = new BN(
        //                 await anotherTokenInstance.balanceOf(
        //                     anotherTeamVestingInstance.address
        //                 )
        //             ).sub(extraMinted);
        //         });
        //         it('has the right token', async () => {
        //             (await anotherTeamVestingInstance.token()).should.equal(
        //                 anotherTokenInstance.address
        //             );
        //         });
        //         it('reclaim the extra of the allocation', async () => {
        //             const tx = await anotherTeamVestingInstance.reclaimToken(
        //                 anotherTokenInstance.address,
        //                 {from: owner}
        //             );
        //             // const events = getEvents(tx, 'Transfer');
        //             new BN(
        //                 await anotherTokenInstance.balanceOf(
        //                     anotherTeamVestingInstance.address
        //                 )
        //             ).should.be.a.bignumber.that.equals(shouldHave);
        //         });
        //     });
        // });

        describe('vesting starts, after the cliff and before it ends', () => {
            before(async () => {
                // after 120 days
                await increaseTo(
                    TEAM_VESTING_CLIFF_TIME.add(HUNDRED_TWENTY_DAYS)
                );
            });
            context('120 days after the cliff', () => {
                context('release for', () => {
                    it('fails from a random account', async () => {
                        await expectThrow(
                            teamVestingInstance.releaseFor(randomAccount, {
                                from: randomAccount
                            })
                        );
                    });
                    it('fails for a random account', async () => {
                        await expectThrow(
                            teamVestingInstance.releaseFor(randomAccount, {
                                from: TEAM_WALLET
                            })
                        );
                    });
                });
                context('release()', () => {
                    context('when called by a randomAccount', () => {
                        it('fails', async () => {
                            await expectThrow(
                                teamVestingInstance.release({
                                    from: randomAccount
                                })
                            );
                        });
                        it('fails', async () => {
                            await expectThrow(
                                teamVestingInstance.releaseFor(randomAccount, {
                                    from: randomAccount
                                })
                            );
                        });
                    });
                    context('when called by the team account', () => {
                        // to close the discrepancy in timestamp
                        let shouldReceive;
                        before(async () => {
                            const valueBefore = new BN(
                                await teamVestingInstance.balanceOf(
                                    TEAM_WALLET
                                )
                            );
                            const currentTimestamp = await latest();
                            shouldReceive = calculateShouldReceiveAmount(currentTimestamp, valueBefore.toString());
                        });
                        it('TEAM_WALLET releases ', async () => {
                            const tx = await teamVestingInstance.release({
                                from: TEAM_WALLET
                            });
                            const events = getEvents(tx, 'Released');
                            events[0].owner.should.equal(TEAM_WALLET);
                            events[0].value.should.be.a.bignumber.that.equals(
                                new BN(shouldReceive)
                                // ONE_ETHER.mul(new BN('3750000'))
                            );
                        });
                    });
                });
            });
        });

        describe('vesting starts, after the cliff', () => {
            before(async () => {
                // another 180 days (300 days after the cliff)
                await increaseTo(
                    TEAM_VESTING_CLIFF_TIME.add(HUNDRED_TWENTY_DAYS).add(
                        HUNDRED_EIGHTY_DAYS
                    )
                );
            });
            context('300 days after the cliff', () => {
                // to close the discrepancy in timestamp
                let shouldReceive;
                before(async () => {
                    const valueBefore = new BN(
                        await teamVestingInstance.balanceOf(
                            TEAM_WALLET
                        )
                    );
                    const currentTimestamp = await latest();
                    shouldReceive = calculateShouldReceiveAmount(currentTimestamp, valueBefore.toString());
                });
                it('TEAM_WALLET release ', async () => {
                    const tx = await teamVestingInstance.releaseFor(
                        TEAM_WALLET,
                        {from: randomAccount}
                    );
                    const events = getEvents(tx, 'Released');
                    events[0].owner.should.equal(TEAM_WALLET);
                    events[0].value.should.be.a.bignumber.that.equals(
                        // ONE_ETHER.mul(new BN('2250000'))
                        new BN(shouldReceive)
                    );
                });
            });
            context('can reclaim token', () => {
                let valueBefore;
                let valueAfter;
                before(async () => {
                    valueBefore = new BN(
                        await tokenInstance.balanceOf(
                            teamVestingInstance.address
                        )
                    );
                });
                it('reclaim the extra of the allocation', async () => {
                    const tx = await teamVestingInstance.reclaimToken(
                        tokenInstance.address,
                        {from: owner}
                    );
                    valueAfter = new BN(
                        await tokenInstance.balanceOf(
                            teamVestingInstance.address
                        )
                    );
                    // const events = getEvents(tx, 'Transfer');
                    valueBefore
                        .sub(valueAfter)
                        .should.be.a.bignumber.that.equals(ZERO);
                });
            });
        });
        describe('vesting starts, after the cliff', () => {
            before(async () => {
                await increaseTo(TEAM_VESTING_END_TIME.add(SIXTY_DAYS));
            });
            context('240 days after the cliff', () => {
                // to close the discrepancy in timestamp
                let shouldReceive;
                before(async () => {
                    const valueBefore = new BN(
                        await teamVestingInstance.balanceOf(
                            TEAM_WALLET
                        )
                    );
                    shouldReceive = valueBefore;
                });
                it('TEAM_WALLET release again', async () => {
                    const tx = await teamVestingInstance.release({
                        from: TEAM_WALLET
                    });
                    const events = getEvents(tx, 'Released');
                    events[0].owner.should.equal(TEAM_WALLET);
                    events[0].value.should.be.a.bignumber.that.equals(
                        shouldReceive
                    );
                });
            });
            context('can reclaim other token', () => {
                let newTokenInstance;
                before(async () => {
                    newTokenInstance = await IvoToken.new(
                        'NAME',
                        'SYMBOL',
                        new BN('18'),
                        FOUR_HUNDRED_THOUSAND_ETHER
                    );
                    await newTokenInstance.mint(
                        teamVestingInstance.address,
                        ONE_ETHER
                    );
                    new BN(
                        await newTokenInstance.balanceOf(
                            teamVestingInstance.address
                        )
                    ).should.be.a.bignumber.that.equals(ONE_ETHER);
                });
                it('reclaim the extra of the allocation', async () => {
                    const tx = await teamVestingInstance.reclaimToken(
                        newTokenInstance.address,
                        {from: owner}
                    );
                    // const events = getEvents(tx, 'Transfer');
                    new BN(
                        await newTokenInstance.balanceOf(
                            teamVestingInstance.address
                        )
                    ).should.be.a.bignumber.that.equals(ZERO);
                });
            });
            context('TEAM_WALLET release again', () => {
                it('fails', async () => {
                    await expectThrow(
                        teamVestingInstance.release({from: TEAM_WALLET})
                    );
                });
            });
        });
    }
);
