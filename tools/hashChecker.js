const sha3      = require('web3-utils').sha3;
const fs        = require('fs');
const assert    = require('assert');

// Valid hashes using Keccak-256

const contracts = {
    Crowdsale       : fs.readFileSync('node_modules/openzeppelin-solidity/contracts/crowdsale/Crowdsale.sol'),
    ERC20Mintable   : fs.readFileSync('node_modules/openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol'),
    ERC20Pausable   : fs.readFileSync('node_modules/openzeppelin-solidity/contracts/token/ERC20/ERC20Pausable.sol'),
    Pausable        : fs.readFileSync('node_modules/openzeppelin-solidity/contracts/lifecycle/Pausable.sol'),
    Ownable         : fs.readFileSync('node_modules/openzeppelin-solidity/contracts/ownership/Ownable.sol'),
    ERC20           : fs.readFileSync('node_modules/openzeppelin-solidity/contracts/token/ERC20/ERC20.sol'),
    IERC20          : fs.readFileSync('node_modules/openzeppelin-solidity/contracts/token/ERC20/IERC20.sol'),
    SafeMath        : fs.readFileSync('node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol'),
    TokenVesting    : fs.readFileSync('node_modules/openzeppelin-solidity/contracts/drafts/TokenVesting.sol')
};

const hashes = {
    Crowdsale     : '0x8347d09dc704fcd85e048f30bb17d8ec8c0f2bcea7287651fd9f8d1a3d3be24f',
    ERC20Mintable : '0xc4ca2883e0b0743604143952024c250bb13737ad54bb666b117efdcb766fe3a8',
    ERC20Pausable : '0x37b840977505e5f6d74bc8fa3d0217facc7913d0ecf064da3e3b26494acd37de',
    Pausable      : '0x3b0ed31deeba7e3c6cfbbe8092a6b427084ee390800a06acdea5c17c8185d606',
    Ownable       : '0x980de387a1a020a498f53d00f89fecebb12c949a17e8f160093c0303ede2b786',
    ERC20         : '0xba431353cb4fe70777ac026231eb5468e41aa1e81240a2b8136917acc5fff4dc',
    IERC20        : '0x079c4e23ee448f529e43bfa3c4e8fb4be52cd0318ee923a276835bedf45b93d8',
    SafeMath      : '0x965012d27b4262d7a41f5028cbb30c51ebd9ecd4be8fb30380aaa7a3c64fbc8b',
    TokenVesting  : '0x72be2faa60fb08f2d56976e20ce80a2cd8fb71f980eef55d853d6e6836c92d5b'
};

const js = {
    Parser          : fs.readFileSync('node_modules/solidity-parser-sc/build/parser.js')
};

const jsHash = {
    Parser        : '0x68dee0e46cdbea35e98ba56e3bfe8f3799e22496f21532ed6dcaf35677adf29d'
};

Object.keys(contracts).forEach((key) => {
    try {
        assert.equal(sha3(contracts[key]), hashes[key], 'Hash mismatch: ' + key);
    } catch (error) {
        console.log(error.message + ' - Zeppelin Framework');
        console.log(key + ': ' + sha3(contracts[key]));
    }
});

Object.keys(js).forEach((key) => {
    try {
        assert.equal(sha3(js[key]), jsHash[key], 'Hash mismatch: ' + key);
    } catch (error) {
        console.log(error.message + ' - Javascript file');
        console.log(key + ': ' + sha3(js[key]));
    }
});
