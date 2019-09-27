// import {BigNumber} from '../../test/helpers/tools';

const cnf = require('../../config/contract-ivo.json');
const Snapshots = artifacts.require('./token/Snapshots.sol');
// const Roles = artifacts.require('../../node_modules/openzeppelin-solidity/contracts/access/Roles.sol');
// const SafeMath = artifacts.require('../../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol');
// const SafeERC20 = artifacts.require('../../node_modules/openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol');
const IvoToken = artifacts.require('./token/IvoToken.sol');
const IvoCrowdsale = artifacts.require('./crowdsale/IvoCrowdsale.sol');
const SaftVault = artifacts.require('./vault/SaftVault.sol');
const ReserveVault = artifacts.require('./vault/ReserveVault.sol');
const AdvisorsVesting = artifacts.require('./vault/AdvisorsVesting.sol');
const TeamVesting = artifacts.require('./vault/TeamVesting.sol');
const PrivateVault = artifacts.require('./vault/PrivateVault.sol');
const PresaleVault = artifacts.require('./vault/PresaleVault.sol');
const IvoDividends = artifacts.require('./token/IvoDividends.sol');
const IvoVoting = artifacts.require('./token/IvoVoting.sol');

module.exports = function (deployer, network, accounts) { // eslint-disable-line

    const NEW_OWNER = accounts[1];
    const WALLET = accounts[9];
    const {NAME, SYMBOL, DECIMALS, INITIAL_RATE, INITIAL_FIAT_RATE} = cnf;
    const {STO_START_TIME, SAFT_VAULT_RELEASE_TIME, ADVISORS_VESTING_RELEASE_TIME} = cnf;
    const TOTAL_SUPPLY_CAP = web3.utils.toBN(cnf.TOTAL_SUPPLY_CAP);
    const HARD_CAP = web3.utils.toBN(cnf.HARD_CAP);

    console.log('Total Supply is', TOTAL_SUPPLY_CAP.toString());

    // deploy the token with params from /config/contract-ico.json file
    deployer.deploy(Snapshots).then(() => {
        return Snapshots.deployed().then((snapshotsInstance) => {
            console.log('[ SnapshotsLibraryInstance.address ]:' + snapshotsInstance.address);
            return deployer.link(Snapshots, IvoToken).then(() => {
                return deployer.deploy(IvoToken, NAME, SYMBOL, DECIMALS, TOTAL_SUPPLY_CAP).then(() => {
                    return IvoToken.deployed().then((tokenInstance) => {
                        console.log('[ ivoTokenInstance.address ]: ' + tokenInstance.address);
                        return deployer.deploy(IvoCrowdsale, STO_START_TIME, INITIAL_RATE, INITIAL_FIAT_RATE, WALLET, tokenInstance.address).then(() => {
                            return IvoCrowdsale.deployed().then((ivoCrowdsaleInstance) => {
                                console.log('[ ivoCrowdsaleInstance.address ]:' + ivoCrowdsaleInstance.address);
                                return deployer.deploy(SaftVault, tokenInstance.address, ivoCrowdsaleInstance.address, STO_START_TIME, NEW_OWNER).then(() => {
                                    return SaftVault.deployed().then((saftVaultInstance) => {
                                        console.log('[ saftVaultInstance.address ]:' + saftVaultInstance.address);
                                        return deployer.deploy(ReserveVault, tokenInstance.address, ivoCrowdsaleInstance.address, NEW_OWNER).then(() => {
                                            return ReserveVault.deployed().then((reserveVaultInstance) => {
                                                console.log('[ reserveVaultInstance.address ]:' + reserveVaultInstance.address);
                                                return deployer.deploy(AdvisorsVesting, tokenInstance.address, ivoCrowdsaleInstance.address, STO_START_TIME, NEW_OWNER).then(() => {
                                                    return AdvisorsVesting.deployed().then((advisorsVestingInstance) => {
                                                        console.log('[ advisorsVestingInstance.address ]:' + advisorsVestingInstance.address);
                                                        return deployer.deploy(TeamVesting, tokenInstance.address, ivoCrowdsaleInstance.address, NEW_OWNER, WALLET).then(() => {
                                                            return TeamVesting.deployed().then((teamVestingInstance) => {
                                                                console.log('[ teamVestingInstance.address ]:' + teamVestingInstance.address);
                                                                return deployer.deploy(PrivateVault, tokenInstance.address, ivoCrowdsaleInstance.address, NEW_OWNER).then(() => {
                                                                    return PrivateVault.deployed().then((privateVaultInstance) => {
                                                                        console.log('[ privateVaultInstance.address ]:' + privateVaultInstance.address);
                                                                        return deployer.deploy(PresaleVault, tokenInstance.address, ivoCrowdsaleInstance.address, NEW_OWNER).then(() => {
                                                                            return PresaleVault.deployed().then((presaleVaultInstance) => {
                                                                                console.log('[ presaleVaultInstance.address ]:' + presaleVaultInstance.address);
                                                                                return deployer.deploy(IvoDividends, tokenInstance.address, NEW_OWNER).then(() => {
                                                                                    return IvoDividends.deployed().then((ivoDividendsInstance) => {
                                                                                        console.log('[ ivoDividendsInstance.address ]:' + ivoDividendsInstance.address);
                                                                                        return deployer.deploy(IvoVoting, tokenInstance.address, NEW_OWNER).then(() => {
                                                                                            return IvoVoting.deployed().then((ivoVotingInstance) => {
                                                                                                console.log('[ ivoVotingInstance.address ]:' + ivoVotingInstance.address);
                                                                                            });
                                                                                        });
                                                                                    });
                                                                                });
                                                                            });
                                                                        });
                                                                    });
                                                                });
                                                            });
                                                        });
                                                    });
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
};
