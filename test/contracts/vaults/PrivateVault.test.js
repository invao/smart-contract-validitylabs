/**
 * Test for PrivateVault
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
const PrivateVault = artifacts.require('./PrivateVault');

const should = require('chai') // eslint-disable-line
    .use(require('chai-as-promised'))
    .use(require('chai-bn')(BN))
    .should();

const FIRST_ROUND_CAP = new BN(cnf.FIRST_ROUND_CAP);                // Cap of the 1st round           
const THOUSAND_ETHER = ONE_ETHER.mul(new BN('1000'));

/**
 * PrivateVault contract
 */
contract('PrivateVault', ([creator, owner, manager1, crowdsale, investor1, investor2, investor3, investor4, randomAccount, wallet]) => { 
    
    let tokenInstance;
    let privateVaultInstance;

    before(async () => {
        tokenInstance = await IvoToken.deployed();
        privateVaultInstance = await PrivateVault.new(tokenInstance.address, crowdsale, owner);
    });

    describe('receiveFor', () => {
        before(async () => {
            const addedAmount = FIRST_ROUND_CAP.sub(ONE_ETHER);
            await privateVaultInstance.receiveFor(investor1, addedAmount, {from: crowdsale});
            new BN(await privateVaultInstance.totalBalance()).should.be.a.bignumber.that.equals(addedAmount);
        });
        context('when adding a bit more', () => {
            it('fails', async () => {
                await expectThrow(privateVaultInstance.receiveFor(investor2, THOUSAND_ETHER, {from: crowdsale}));
            });
        });
    });
});
