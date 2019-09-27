/**
 * Test for IvoCrowdsale - to test other ways of increasing in roundNr.
 *
 * @author Validity Labs AG <info@validitylabs.org>
 */

import {expectThrow, getEvents, BN, getGasCost, ZERO_ADDRESS, ZERO, ONE_ETHER, THREE_HUNDRED_ACCOUNTS, THREE_HUNDRED_VALUE} from '../../helpers/tools';
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

const FIRST_ROUND_CAP = new BN(cnf.FIRST_ROUND_CAP);                // Cap of the 1st round
const ONE = new BN(1);
const TWO = new BN(2);
const ONE_MILLION = new BN('1000000');
const SIX_MILLION_ETHER = ONE_MILLION.mul(new BN('6')).mul(ONE_ETHER);
const STO_START_TIME = new BN(cnf.STO_START_TIME);

/**
 * IvoCrowdsale contract - 2nd part
 */
contract('IvoCrowdsale - 2nd part', ([creator, owner, manager1, manager2, ethInvestor1, ethInvestor2, fiatInvestor1, fiatInvestor2, randomAccount, wallet]) => {
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

        await crowdsaleInstance.addManagers([manager1, manager2], {from: creator});
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
        // await tokenInstance.pause({from: owner});
        await crowdsaleInstance.addWhitelisteds([ethInvestor1, ethInvestor2, fiatInvestor1, fiatInvestor2, randomAccount], {from: manager1});
    });

    describe('when crowdsale starts', () => {
        before(async () => {
            await increaseTo(STO_START_TIME);
        });
        context('when forgetting roleSetup', () => {
            context('try to purchase token with ether', () => {
                it('fails', async () => {
                    await expectThrow(crowdsaleInstance.buyTokens(ethInvestor1, {from: ethInvestor1, value: ONE_MILLION}));
                });
            });
            context('try to purchase token with fiat', () => {
                it('fails,', async () => {
                    await expectThrow(crowdsaleInstance.nonEthPurchase(fiatInvestor1, ONE_MILLION, {from: ethInvestor1}));
                });
            });
        });
        context('finish setup', () => {
            it('roleSetup,', async () => {
                await crowdsaleInstance.roleSetup(
                    owner,
                    privateVaultInstance.address,
                    presaleVaultInstance.address,
                    reserveVaultInstance.address,
                    {from: creator});
            });
        });
    });

    describe('different ways of triggering the round number update', () => {
        context('An ethPurchase that triggers the jump to next round', () => {
            // already has some token minted. There is still one IVO token to be minted to close the first round
            const alreadyMinted = FIRST_ROUND_CAP.sub(ONE_ETHER);
            it('starts with buying some tokens', async () => {
                await crowdsaleInstance.nonEthPurchase(fiatInvestor1, alreadyMinted, {from: manager1});
            });
            it('succeeds in buyTokens', async () => {
                await crowdsaleInstance.buyTokens(ethInvestor1, {from: ethInvestor1, value: ONE_ETHER});
            });
            it('should haved jumped to round two', async () => {
                (new BN(await crowdsaleInstance.currentRound())).should.be.a.bignumber.that.equals(ONE);
            });
        });
        context('A huge amount of fiat purchase that hits the round cap. Directly jumps to the round three', () => {
            let tokenAmount;
            before(async () => {
                tokenAmount = (new BN(await crowdsaleInstance.capOfRound(ONE))).sub(new BN(await crowdsaleInstance.mintedByCrowdsale()));
            });
            it('succeeds in nonETHPurchase', async () => {
                await crowdsaleInstance.nonEthPurchase(fiatInvestor2, tokenAmount, {from: manager1});
            });
        });
        context('A huge amount of fiat purchase that hits the hardcap.', () => {
            before(async () => {
                const mintedTokenAmount = new BN(await crowdsaleInstance.mintedByCrowdsale());
                console.log('minted amount is: ', mintedTokenAmount.toString());
            });
            it('fails when it is too much purchase with ether', async () => {
                await expectThrow(crowdsaleInstance.buyTokens(ethInvestor1, {from: ethInvestor1, value: SIX_MILLION_ETHER}));
            });
        });
    });
});
