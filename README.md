# INVAO Smart Contracts

## Developer Note

### Disclaimer

INVAO smart contracts were initially developed under with Solidity v0.4.24 because the
development started before the testing environment (Truffle) and OpenZeppelin's library
release new versions that support the v0.5.0

Contracts were updated to fit the breaking change of Solidity v0.5.0 on Jan 9.

### Tool-chain Update:

When running the coverage command, the `solidity-coverage` package does not fully support
all syntex of Solidity v5.0+. Keywords such as `calldata`, `payable` are cannot be parsed
properly.
When waiting for the update of the `solidity-coverage` package, the workaround of this issue
is:

1. Replace the content of `/node_modules/solidity-parser-sc/build/parser.js` with code
   written by @maxsam4 at `https://raw.githubusercontent.com/maxsam4/solidity-parser/solidity-0.5/build/parser.js`.
2. This piece of code can also be found at `tools/parser.js` in case online source is updated or unavailable.

## Deployment

0. Deploy Snapshots library and link to the token contract. (In Truffle)
1. Deploy IvoToken contract.
1. Deploy IvoCrowdsale contract with IvoToken contract address and a new account address.
   This account is the new manager.
   The deployer still holds the ownership but is no longer a manager.
1. Deploy SaftVault contract, with addresses of IvoToken and IvoCrowdsale contracts as well as the starting time of the crowdsale.
   The allocated amount will be minted to the vault upon the successful deployment.
   The newly appointed owner of the SaftVault contract is also a manager, who can add add SAFT investors (with the amount of tokens they should receive) to the contract. This contract can have multiple managers.
1. Deploy ReserveVault contract, with addresses of IvoToken and IvoCrowdsale contracts.
   The allocated amount will be minted to the vault upon the successful deployment. This vault does not have manager.
1. Deploy AdvisorsVesting contract, with addresses of IvoToken and IvoCrowdsale contracts and the starting time of the crowdsale.
   The allocated amount will be minted to the vault upon the successful deployment.
   The newly appointed owner of the AdvisorsVesting contract is also a manager, who can add add advisors (with the amount of tokens they should receive) to the contract. This contract can have multiple managers.
1. Deploy TeamVesting contract, with addresses of IvoToken and IvoCrowdsale contracts.
   This vault does not have manager.
1. Deploy PrivateVault contract, with addresses of IvoToken and IvoCrowdsale contracts.
   This vault does not have manager.
1. Deploy Presale contract, with addresses of IvoToken and IvoCrowdsale contracts.
   This vault does not have manager.
1. In IvoToken contract, owner calls roleSetup(). It sets up address, mint tokens to vaults/vesting contracts and transfer ownership to the new owner, who is also a manager. Let the crowdsale contract be a manager and the only minter.
   Also, pause the token contract.
1. In ivoCrowdsale contract, owner calls roleSetup()
1. When the crowdsale finishes, it will unpause the token and add the manager (could be different from the owner) as the minter and renounceMinter for crowdsale contract itself.
1. Maker sure that the **TEAM_WALLET** adress of the IvoDividends smart contract is up-to-date.
1. Deploy the IvoDividends contract with addresses of IvoToken and the address of the new contract owner.
1. Deploy the IvoVoting contract with addresses of IvoToken and the address of the new contract owner.

## Contracts Specifications

###### IVO token

- Standard: ERC20 compliant.
- Name: “INVAO token”.
- Symbol: “IVO”.
- Decimals: 18,
- Total supply: max cap of 100.000.000.
- Ownable: owner account with basic authorization to control certain functions. Includes the option to transfer the ownership of the IVO token contract to different account when needed.
- Mintable: the issuing of tokens will be done through minting. Callable by the minter only. The minter might be the same owner account or a different account.
- Pausable: paused on deployment and remains paused during the sales period. It will be unpaused once the main sale has ended. When paused, transfer and approval of token amounts won’t be possible, this stops the token from being tradable. This functionality is controlled by the pauser only, who might be the same owner account or a different account. The token can also be paused/unpaused during its lifecycle.
- Burnable: token holder can burn a specific amount of tokens. To be called by any holder account.
- Reclaim tokens: allows to recover any ERC20 tokens accidentally sent to this contract. The tokens to be recovered will be sent to the owner of the IVO token contract. The owner account can then send those tokens to the account claiming them. Functionality controlled by the IVO token owner only.
- Snapshots: allow to calculate dividends payments, as well as to check the accounts’ balances when a proposal is open for voting in order to determine the voting power per token holder.

###### Crowdsale

- Start time: To be passed to the constructor on deployment
- Price:
  - 0.3213 CHF per token.
  - USD to ETH rate: manually updatable
- Hard cap: 52.5 million IVO tokens.
- Multi-round: Tokens are sold in three rounds at different discount rate. If the round-cap is not reached yet manager closes the round, the remaining capacity goes to the next round, if applicable.
  - First round (private sale):
    - Cap: 22.500.000 IVO Tokens
    - Discount: 20% (Token Price USD 0.2570)
    - Closing time: when all tokens are sold, or the round is manually closed.
  - Second round (pre-sale):
    - Cap: 15.000.000 IVO tokens
    - Discount: 10% (Token Price USD 0. 2892)
    - Closing time: when all tokens are sold, or the round is manually closed.
  - Third round (main sale):
    - Cap: 15.000.000 IVO tokens
    - Discount: 0% (Token Price USD 0. 3213)
    - Closing time: when all tokens are sold, or the round is manually closed.
- Whitelist: only white-listed accounts could participate in crowdsale.
  - Add address to whitelist: allows a manager to add an investor’s account to the whitelist.
  - Add addresses to whitelist: allows a manager to add investors’ accounts to the whitelist in batches.
  - Remove address from whitelist: allows a manager to remove an account from the whitelist.
  - Remove addresses from whitelist: allows a manager to remove accounts from the whitelist in batches.
- Manager: being able to execute some restricted transactions.
  - Add manager: allows to add an account or accounts with a manager role to have authorisation to execute some restricted transactions.
- Pause/unpause: allows a manager to pause/unpause the contract if required.
- Purchase: allows for the purchase of tokens during STO period. 3.5% of the investment value (msg.value) sent to the contract will be deducted, before calculating the token amount, to cover the KYC/AML cost. This deduction will be applied every time a the function is called.
- Non-Ether purchase: allows to allocate non-ETH investment per investor’s account during the crowdsale. Only a contract’s manager can call this function.
  Batch Non-Eth Purchase: allows to allocate non-ETH investments in batches of investors’ accounts.
- Minting: the issuing of tokens is done through minting, token ownership needs to be transferred to the crowdsale contract. The crowdsale mints on a per-purchase basis during the STO period. It also mints and allocates tokens for:
  - SAFT vault.
  - Private & Presale vault.
  - Advisors vault.
  - Team vesting.
  - Reserve vault.
- Cap reached: enforces the minting of tokens until the cap is reached.
- Finalise: to be called by the manager when either the hard cap has been reached or the manager decides to close. This will make the tokens transferable and tradable (unpause IVO token contract), and transfers token ownership to the original owner.
- Reclaim tokens: allows to recover any ERC20 tokens accidentally sent to this contract. The tokens to be recovered will be sent to the owner of the crowdsale contract. The owner account can then send those tokens to the account claiming them. Functionality controlled by the crowdsale contract owner only.
  > Rounding error:
  > Rounding error exists due to the precision of type defined in Solidity language. The amount of token is calculated with the following formular:
  > `tokenAmountBeforeDiscount = R(valueSent[in Wei] * 965/1000) * R(fiatRate * 10000/(3213 * 100))`
  > Then compare the `tokenAmountBeforeDiscount` with the discounted `maximumAmountOfTokenPerRound`. If the purchase is too large to be settled in one round, roll over to the next round.
  > `tokenAmount = tokenAmountBeforeDiscount * 100 / discountFactor[per Round]`
  > Please note that:
  >
  > - R(): rounding down to the closest integer.
  > - fiatRate: e.g. If 1 ETH = 110.24 USD, fiatRate is 11024
  > - discountFactor[per Round]: round 1 is 80, round 2 is 90, round 3 is 100.

###### SAFT vault

- Allocation: 22.500.000 IVO tokens
- Release time: 180 days immediately CrowdSale has started (Start Crowdsale + 180 days).
- Mechanism: same as “Private & Presale vault”.
  - Manager manually enters the ETH addresses of the SAFT investors so that the tokens can be released directly to the investors.

###### Private & Presale vault (first and second round tokens)

- Release time:
  - Private sale: 120 days immediately after the round has ended (first round closing time + 120 days).
  - Pre-sale: 60 days immediately after round has ended (second round closing time + 60 days).
- Release: transfers the unlocked IVO tokens to the caller of this function after the release time. It checks if the caller has a corresponding token balance to be transferred. To be called by each investor.
- Release for: allows the caller of the function to transfer unlocked IVO tokens to an investor’s account after the release time. The account must be passed as an input to this function. It checks if the passed account has a corresponding token balance to be transferred.
- Get balance: allows the caller of the function to check his/her locked balance in this contract.
- Reclaim tokens: allows to recover any ERC20 tokens accidentally sent to this contract. The tokens to be recovered will be sent to the owner of the vault contract. The owner account can then send those tokens to the account claiming them. Functionality controlled by the vault owner only.

###### Advisors vesting

- Allocation: 1.5 million IVO token.
- Start time: Crowdsale start time.
- Cliff duration: 180 days.
- Vesting duration: 360 days (180 days cliff + 180 remaining vesting days).
- Mechanics: tokens will vest continuously (linear vesting).
  - Manager manually enters the ETH addresses of each advisor so that the tokens can be transferred directly to the advisors.
- Reclaim tokens: allows to recover any ERC20 tokens accidentally sent to this contract. The tokens to be recovered will be sent to the owner of the vault contract. The owner account can then send those tokens to the account claiming them. Functionality controlled by the vault owner only.

##### Team vesting

- Allocation: 13.5 million IVO token.
- Start time: 1 October 2018.
- Cliff duration: 180 days (1 October 2018 + 180 days = 30 March 2019).
- Vesting duration: 1080 days (180 days cliff + 900 days = 15 September 2021).
- Mechanics: tokens will vest continuously (linear vesting).
- Company’s wallet.
- Release: transfers vested tokens to the company’s wallet. After the vesting period all tokens will be released.
- Reclaim tokens: allows to recover any ERC20 tokens accidentally sent to this contract. The tokens to be recovered will be sent to the owner of the team vesting contract. The owner account can then send those tokens to the account claiming them. Functionality controlled by the team vesting contract owner only.

##### Reserve vault

- Allocation: 10 million IVO tokens.
- Release time: STO end time.
- Company’s wallet.
- Release: transfers the unlocked IVO tokens to the company’s wallet once the release time has been reached.
- Reclaim tokens: allows to recover any ERC20 tokens accidentally sent to this contract. The tokens to be recovered will be sent to the owner of the vault contract. The owner account can then send those tokens to the account claiming them. Functionality controlled by the vault owner only.

##### Dividends

- Claiming period: Customizable per dividend. This information is passed to the function when depositing dividend.
- Deposit dividend: allows INVAO to create/add a dividend (any ERC20 token) to the contract. The block number at creation time will correspond to the “record date”. A snapshot of the balances at this block number will be used to compute the payout per token holder. Therefore, the “record date” must be informed in advance to the token holders so they have enough time to transfer the tokens the hold at exchanges to their wallets.
- Claim dividend: transfers the claimed funds to caller of the function. Available only
  within the claiming period.
- Claim all dividends: token holder can claim all dividend payouts with only one call i.e. in one transaction.
- Recycle dividend: allows INVAO to send back unclaimed tokens to its company’s wallet.
- Get dividend: allows anyone to view the dividend’s information such as payout token,
  payout amount, claimed amount, timestamp of dividend creation (when deposit was
  made), INVAO total supply at dividend creation.
- Reclaim tokens: allows to recover any ERC20 tokens accidentally sent to this contract. The tokens to be recovered will be sent to the owner of the contract. The owner account can then send those tokens to the account claiming them. Functionality controlled by the contract owner only.

##### Voting

- Voting duration: in days, manually updatable.
- Voting period: to be calculated as _Proposal creation timestamp + Voting duration_
- Quorum rate: to be passed as an input upon proposal creation, calculated as _Votes in favour / Total votes_.
- Voting power: calculated as the balance of tokens held by an account at the proposal’s creation time.
- Create proposal: allows the creation of a proposal. It requires to pass as an input:
  - Purpose of the proposal
  - Quorum rate
  - Voting duration
- Vote:
  - Allows a token holder to cast a vote as YES or NO. Computes the number of votes in favour and against the proposal.
  - With in the valid voting period, the token holder may change their vote.
- Calculate results: allows anyone to check if a proposal passed or not.
- Reclaim tokens: allows to recover any ERC20 tokens accidentally sent to this contract. The tokens to be recovered will be sent to the owner of the contract. The owner account can then send those tokens to the account claiming them. Functionality controlled by the contract owner only.

## Requirements

The server side scripts requires NodeJS 8 to work properly.
Go to [NVM](https://github.com/creationix/nvm) and follow the installation description.
By running `source ./tools/initShell.sh`, the correct NodeJs version will be activated for the current shell.

NVM supports both Linux and OS X, but that’s not to say that Windows users have to miss out. There is a second project named [nvm-windows](https://github.com/coreybutler/nvm-windows) which offers Windows users the possibility of easily managing Node environments.

**nvmrc support for windows users is not given, please make sure you are using the right Node version (as defined in .nvmrc) for this project!**

Yarn is required to be installed globally to minimize the risk of dependency issues.
Go to [Yarn](https://yarnpkg.com/en/docs/install) and choose the right installer for your system.

For the Rinkeby and MainNet deployment, you need Geth on your machine.
Follow the [installation instructions](https://github.com/ethereum/go-ethereum/wiki/Building-Ethereum) for your OS.

Depending on your system the following components might be already available or have to be provided manually:

- [Python](https://www.python.org/downloads/windows/) 2.7 Version only! Windows users should put python into the PATH by cheking the mark in installation process. The windows build tools contain python, so you don't have to install this manually.
- GIT, should already installed on \*nix systems. Windows users have to install [GIT](http://git-scm.com/download/win) manually.
- On Windows systems, PowerShell is mandatory
- On Windows systems, windows build tools are required (already installed via package.json)
- make (on Ubuntu this is part of the commonly installed `sudo apt-get install build-essential`)
- On OSX the build tools included in XCode are required

## General

Before running the provided scripts, you have to initialize your current terminal via `source ./tools/initShell.sh` for every terminal in use. This will add the current directory to the system PATH variables and must be repeated for time you start a new terminal window from project base directory. Windows users with installed PoserShell should use the script `. .\tools\initShell.ps1` instead.

```
# *nix
cd <project base directory>
source ./tools/initShell.sh

# Win
cd <project base directory>
. .\tools\initShell.ps1
```

**Every command must be executed from within the projects base directory!**

## Setup

Open your terminal and change into your project base directory. From here, install all needed dependencies.

```
yarn install
```

This will install all required dependecies in the directory _node_modules_.

## Compile, migrate, test and coverage

To compile, deploy and test the smart contracts, go into the projects root directory and use the task runner accordingly.

```
# Compile contract
yarn compile

# Migrate contract
yarn migrate

# Test the contract
yarn test

# Run coverage tests
yarn coverage
```

## Infura Testnet Deployment - Ropsten, Rinkeby, & Kovan

create a `.secrets.json` file in the config directory of this project and insert the following with your Infura API key and mnemonic. Double check and make sure that file name is included in the `.gitignore` file list.
**Never commit and push your mnemonics!**

```
{
    "rinkeby": {
        "host": "https://rinkeby.infura.io/<APIKEY>",
        "mnemonic": "<MNEMONIC>"
    }
}
```

## Public net deployment steps

- Run `yarn test` to ensure all is running
- Check config files
  - ./contracts/deployment/contracts/\*.js (from, otherAddresses, ...)
  - ./contracts/config/networks.json (gas, gasPrice)
- Start local test node and unlock fromAccount
- Ensure fromAccount have enought ETH
- Start deployment (`yarn deploy-rinkeby / yarn deploy-mainnet`)
- Verify Contract code on etherscan

## Rinkeby testnet deployment

Start local Rinkeby test node in a separate terminal window and wait for the sync is finished.

```
yarn geth-rinkeby
```

Now you can connect to your local Rinkeby Geth console.

```
geth attach ipc://<PATH>/<TO>/Library/Ethereum/rinkeby/geth.ipc

# e.g.
# geth attach ipc://Users/patrice/Library/Ethereum/rinkeby/geth.ipc
```

Upon setup the node does not contain any private keys and associated accounts. Create an account in the web3 Geth console.

```
web3.personal.newAccount()
```

Press [Enter] twice to skip the password (or set one but then later it has to be provided for unlocking the account).

Read the address and send some Rinkeby Ether to pay for deployment and management transaction fees.

```
web3.eth.accounts
```

You can [obtain Rinkeby testnet Ether](https://www.rinkeby.io/#faucet) from the faucet by pasting your address in social media and pasting the link.

Connect to your rinkeby Geth console and unlock the account for deployment (2700 seconds = 45 minutes).

```
> personal.unlockAccount(web3.eth.accounts[0], "", 2700)
```

Ensure, all config files below `./config/` folder is setup properly. The `from` address will be used for the deployment, usually accounts[0].

After exiting the console by `<STRG> + <D>`, simply run `yarn migrate-rinkeby`.
This may take several minutes to finish.

You can monitor the deployment live via [Rinkeby](https://rinkeby.etherscan.io/address/<YOUR_RINKEBY_ADDRESS>)

After all, your smart contract can be found on etherscan:
https://rinkeby.etherscan.io/address/<REAL_CONTRACT_ADDRESS_HERE>

## MainNet deployment

**This is the production deployment, so please doublecheck all properties in the config files below `config` folder!**

For the MainNet deployment, you need a Geth installation on your machine.
Follow the [installation instructions](https://github.com/ethereum/go-ethereum/wiki/Building-Ethereum) for your OS.

Start local MainNet Ethereum node in a separate terminal window and wait for the sync is finished.

```
geth --syncmode "fast" --rpc
```

Now you can connect to your local MainNet Geth console.

```
geth attach ipc://<PATH>/<TO>/Library/Ethereum/geth.ipc

# e.g.
# geth attach ipc://Users/patrice/Library/Ethereum/geth.ipc
```

While syncing the blockchain, you can monitor the progress by typing `web3.eth.syncing`.
This shows you the highest available block and the current block you are on. If syncing is done, false will be returned. In this case, you can `web3.eth.blockNumber` and compare with the latest BlockNumber on Etherscan.

Upon setup the node does not contain any private keys and associated accounts. Create an account in the web3 Geth console.

```
web3.personal.newAccount("<YOUR_SECURE_PASSWORD>")
```

Enter <YOUR_SECURE_PASSWORD> and Press [Enter] to finish the account creation.

Read the address and send some real Ether to pay for deployment and management transaction fees.

```
web3.eth.accounts
```

Connect to your MainNet Geth console and unlock the account for deployment (240 seconds = 4 minutes).

```
personal.unlockAccount(web3.eth.accounts[0], "<YOUR_SECURE_PASSWORD>", 240)
```

Ensure, all config files below `./config/` folder is setup properly. The `from` address will be used for the deployment, usually accounts[0].

After exiting the console by `<STRG> + <D>`, simply run `yarn migrate-mainnet`.
This may take several minutes to finish.

You can monitor the deployment live via [Etherscan](https://etherscan.io/address/<YOUR_RINKEBY_ADDRESS>)

After all, your smart contract can be found on etherscan:
https://etherscan.io/address/<REAL_CONTRACT_ADDRESS_HERE>

### Contract Verification

The final step for the Rinkeby / MainNet deployment is the contract verificationSmart contract verification.

This can be dome on [Etherscan](https://etherscan.io/address/<REAL_ADDRESS_HERE>) or [Rinkeby Etherscan](https://rinkeby.etherscan.io/address/<REAL_ADDRESS_HERE>).

- Click on the `Contract Creation` link in the `to` column
- Click on the `Contract Code` link

Fill in the following data.

```
Contract Address:       <CONTRACT_ADDRESS>
Contract Name:          <CONTRACT_NAME>
Compiler:               <COMPILER_VERSION>
Optimization:           YES
Solidity Contract Code: <Copy & Paste from ./build/bundle/>
Constructor Arguments:  <ABI from deployment output>
```

Visit [Solc version number](https://github.com/ethereum/solc-bin/tree/gh-pages/bin) page for determining the correct version number for your project.

- Confirm you are not a robot
- Hit `verify and publish` button

Now your smart contract is verified.
