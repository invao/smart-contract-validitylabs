module.exports = {
    port: 8555,
    copyNodeModules: false,
    // compileCommand: '../node_modules/.bin/truffle compile',
    testrpcOptions: '--port 8555 --defaultBalanceEther 10000000 --time 2019-02-15T15:53:00+00:00', //-e or --defaultBalanceEther: Amount of ether to assign each test account. Default is 100.
    // testCommand: '../node_modules/.bin/truffle test --network coverage',
    copyPackages: ['openzeppelin-solidity'],
    norpc: false
};

