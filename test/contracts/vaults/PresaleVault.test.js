/**
 * Test for PresaleVault
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
const PresaleVault = artifacts.require('./PresaleVault');

const should = require('chai') // eslint-disable-line
    .use(require('chai-as-promised'))
    .use(require('chai-bn')(BN))
    .should();

const SECOND_ROUND_CAP = new BN(cnf.SECOND_ROUND_CAP);                // Cap of the 1st round       
const STO_START_TIME = new BN(cnf.STO_START_TIME);                    // STO start time       
const THOUSAND_ETHER = ONE_ETHER.mul(new BN('1000'));

/**
 * PresaleVault contract
 */
contract('PresaleVault', ([creator, owner, manager1, crowdsale, investor1, investor2, investor3, investor4, randomAccount, wallet]) => { 
    
    let tokenInstance;
    let presaleVaultInstance;

    before(async () => {
        tokenInstance = await IvoToken.deployed();
        presaleVaultInstance = await PresaleVault.new(tokenInstance.address, crowdsale, owner);
    });

    describe('receiveFor', () => {
        before(async () => {
            const addedAmount = SECOND_ROUND_CAP.sub(ONE_ETHER);
            await presaleVaultInstance.receiveFor(investor1, addedAmount, {from: crowdsale});
            new BN(await presaleVaultInstance.totalBalance()).should.be.a.bignumber.that.equals(addedAmount);
        });
        context('when adding a bit more', () => {
            it('fails', async () => {
                await expectThrow(presaleVaultInstance.receiveFor(investor2, THOUSAND_ETHER, {from: crowdsale}));
            });
        });
    });
    describe('updateReleaseTime', () => {
        it('fails', async () => {
            await expectThrow(presaleVaultInstance.updateReleaseTime(STO_START_TIME, {from: owner}));
        });
    });
});
