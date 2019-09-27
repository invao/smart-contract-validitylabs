/* eslint-disable prefer-destructuring */
const {soliditySha3} = require('web3-utils');

const INTERFACE_ID_LENGTH = 4;

/**
 * @const BigNumber Pointer to web3.BigNumber
 */
// export const BigNumber = web3.BigNumber;
export const BN = web3.utils.BN;

/** COMMONLY USED CONSTANTS */

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
export const MAX_UINT256 = (new BN(2)).pow(new BN(256)).sub(new BN(1));
// export const MAX_UINT256 = new BigNumber(2).pow(256).minus(1);
export const ZERO = new BN(0);
export const ONE_ETHER = (new BN('10')).pow(new BN('18'));

/**
 * @const Network config from JSON file
 */
export const networkConfig = require('../../config/networks.json');

/** COMMONLY USED FUNCTIONS */

/* eslint-disable prefer-destructuring */
export async function expectThrow(promise) {
    try {
        await promise;
    } catch (error) {
    // @TODO: Check jump destination to destinguish between a throw
    //       and an actual invalid jump.
        const invalidOpcode = error.message.search('invalid opcode') >= 0;
        // @TODO: When we contract A calls contract B, and B throws, instead
        //       of an 'invalid jump', we get an 'out of gas' error. How do
        //       we distinguish this from an actual out of gas event? (The
        //       testrpc log actually show an 'invalid jump' event.)
        const outOfGas = error.message.search('out of gas') >= 0;
        const revert = error.message.search('revert') >= 0;
        const nonPayable = error.message.search('non-payable') >= 0;
        assert(
            invalidOpcode || outOfGas || revert || nonPayable,
            'Expected throw, got \'' + error + '\' instead',
        );
        return;
    }
    assert.fail('Expected throw not received');
}

/**
 * Increase N days in testrpc
 *
 * @param {integer} days Number of days
 * @return {integer} Time
 */
export async function waitNDays(days) {
    const daysInSeconds = days * 24 * 60 * 60;

    const time = await web3.currentProvider.send({
        jsonrpc: '2.0',
        method: 'evm_increaseTime',
        params: [daysInSeconds],
        id: 4447
    });

    return time.result;
}

/**
 *  return the total gas cost (units * price) of a transaction
 *
 * @param {result} result result of the transaction
 * @return {BigNumber} gasCost the gas total gas costs from the transaction
 */
export async function getGasCost(result) {
    // Obtain transaction object from the result object
    const tx = await web3.eth.getTransaction(result.tx);

    return tx.gasPrice.mul(result.receipt.gasUsed);
}

/**
 * Defines a EmptyStackException
 *
 * @param {string} message Exception message
 * @returns {undefined}
 */
function EmptyStackException(message) {
    this.message    = message;
    this.name       = 'EmptyStackException';
}

/**
 * Get event from transaction
 *
 * @param {object} tx Transaction object
 * @param {string} event Event searching for
 * @returns {object} Event stack
 */
export function getEvents(tx, event = null) {
    const stack = [];

    tx.logs.forEach((item) => {
        if (event) {
            if (event === item.event) {
                stack.push(item.args);
            }
        } else {
            if (!stack[item.event]) {
                stack[item.event] = [];
            }
            stack[item.event].push(item.args);
        }
    });

    if (Object.keys(stack).length === 0) {
        throw new EmptyStackException('No Events fired');
    }

    return stack;
}

/**
 * Increases testrpc time by the passed duration in seconds
 *
 * @param {object} duration Duration
 * @returns {promise} promise
 */
export default function increaseTime(duration) {
    const now = Date.now();

    return new Promise((resolve, reject) => {
        web3.currentProvider.sendAsync({
            jsonrpc:    '2.0',
            method:     'evm_increaseTime',
            params:     [duration],
            id:         now
        }, (err1) => {
            if (err1) {
                return reject(err1);
            }

            web3.currentProvider.sendAsync({
                jsonrpc: '2.0',
                method: 'evm_mine',
                id: now + 1
            }, (err2, res) => {
                return err2 ? reject(err2) : resolve(res);
            });
        });
    });
}

/**
 * Beware that due to the need of calling two separate testrpc methods and rpc calls overhead
 * it's hard to increase time precisely to a target point so design your test to tolerate
 * small fluctuations from time to time.
 *
 * @param {integer} target Time in seconds
 * @returns {promise} increaseTime() Increase time
 */
export function increaseTimeTo(target) {
    const now = web3.eth.getBlock('latest').timestamp;

    if (target < now) {
        throw Error(`Cannot increase current time(${now}) to a moment in the past(${target})`);
    }

    return increaseTime(target - now);
}

export const duration = {
    seconds: function (val) {
        return val;
    },
    minutes: function (val) {
        return val * this.seconds(60);
    },
    hours: function (val) {
        return val * this.minutes(60);
    },
    days: function (val) {
        return val * this.hours(24);
    },
    weeks: function (val) {
        return val * this.days(7);
    },
    years: function (val) {
        return val * this.days(365);
    }
};

export async function balanceDifference(account, promise) {
    const balanceBefore = web3.eth.getBalance(account);
    await promise();
    const balanceAfter = web3.eth.getBalance(account);
    return balanceAfter.minus(balanceBefore);
}

export function makeInterfaceId(interfaces = []) {
    const interfaceIdBuffer = interfaces
        .map((methodSignature) => soliditySha3(methodSignature)) // keccak256
        .map((h) =>
            Buffer
                .from(h.substring(2), 'hex')
                .slice(0, 4) // bytes4()
        )
        .reduce((memo, bytes) => {
            for (let i = 0; i < INTERFACE_ID_LENGTH; i++) {
                // eslint-disable-next-line operator-assignment
                memo[i] = memo[i] ^ bytes[i]; // xor
            }
            return memo;
        }, Buffer.alloc(INTERFACE_ID_LENGTH));

    return `0x${interfaceIdBuffer.toString('hex')}`;
}

export const THREE_HUNDRED_ACCOUNTS = [
    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    '0x742d35cc6634c0532925a3b844bc454e4438f44e',
    '0x53d284357ec70ce289d6d64134dfac8e511c8a3d',
    '0x4e9ce36e442e55ecd9025b9a6e0d88485d628a67',
    '0x66f820a414680b5bcda5eeca5dea238543f42054',
    '0x61edcdf5bb737adffe5043706e7c5bb1f1a56eea',
    '0xab7c74abc0c4d48d1bdad5dcb26153fc8780f83e',
    '0xbe0eb53f46cd790cd13851d5eff43d12404d33e8',
    '0xdc76cd25977e0a5ae17155770273ad58648900d3',
    '0xe853c56864a2ebe4576a807d26fdc4a0ada51919',
    '0xfca70e67b3f93f679992cd36323eeb5a5370c8e4',
    '0x229b5c097f9b35009ca1321ad2034d4b3d5070f6',
    '0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae',
    '0x267be1c1d684f78cb4f6a176c4911b741e4ffdc0',
    '0x1b3cb81e51011b549d78bf720b0d924ac763a7c2',
    '0x51f9c432a4e59ac86282d6adab4c2eb8919160eb',
    '0x847ed5f2e5dde85ea2b685edab5f1f348fb140ed',
    '0x74660414dfae86b196452497a4332bd0e6611e82',
    '0xa2b4c60a15ebe766ac8fd85c325cc18dc220b576',
    '0xf1ce0a98efbfa3f8ebec2399847b7d88294a634e',
    '0x0c0f476d716b18d40a09876c10768c02dec2ceab',
    '0x2140efd7ba31169c69dfff6cdc66c542f0211825',
    '0xeec606a66edb6f497662ea31b5eb1610da87ab5f',
    '0x75ba02c5baf9cc3e9fe01c51df3cb1437e8690d4',
    '0x3bf86ed8a3153ec933786a02ac090301855e576b',
    '0x7da82c7ab4771ff031b66538d2fb9b0b047f6cf9',
    '0xab5801a7d398351b8be11c439e05c5b3259aec9b',
    '0xa7e4fecddc20d83f36971b67e13f1abc98dfcfa6',
    '0xfbb1b73c4f0bda4f67dca266ce6ef42f520fbb98',
    '0xcea2b9186ece677f9b8ff38dc8ff792e9a9e7f8a',
    '0x850c0224f37f67c471e860375ac8e39fea61e8b0',
    '0x3bfc20f0b9afcace800d73d2191166ff16540258',
    '0x69c6dcc8f83b196605fa1076897af0e7e2b6b044',
    '0x0a4c79ce84202b03e95b7a692e5d728d83c44c76',
    '0x2b6ed29a95753c3ad948348e3e7b1a251080ffb9',
    '0xdb6fd484cfa46eeeb73c71edee823e4812f9e2e1',
    '0x75fddbf107ce88ba66ed7fd8182ee6c3a39e9420',
    '0x35a85499ccf7c8505a88e23017b745c671cc5aaf',
    '0x22650fcf7e175ffe008ea18a90486d7ba0f51e41',
    '0xe3ecccd6c67da25871fc5ff9a32a6f5c379167a6',
    '0xa0e239b0abf4582366adaff486ee268c848c4409',
    '0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be',
    '0xc019139e9a3223f31015a73e13899c73fe64d524',
    '0x1e2fcfd26d36183f1a5d90f0e6296915b02bcb40',
    '0x89ac2d3446e010344faf7c8c55aeab57055d3571',
    '0x0b2708b52b7f248c69c5d43002b243aa249a4aac',
    '0x036b96eea235880a9e82fb128e5f6c107dfe8f57',
    '0x442d1da4e0802257371384bc145fb9f8302c026f',
    '0xba2ed0d772e0ca1f72368e7a610e42397e960946',
    '0x8cf23cd535a240eb0ab8667d24eedbd9eccd5cba',
    '0x851b7f3ab81bd8df354f0d7640efcd7288553419',
    '0xbf3aeb96e164ae67e763d9e050ff124e7c3fdd28',
    '0xaf10cc6c50defff901b535691550d7af208939c5',
    '0xcafe1a77e84698c83ca8931f54a755176ef75f2c',
    '0x04f2894d12662f2728d02b74ea10056c11467dba',
    '0xa646e29877d52b9e2de457eca09c724ff16d0a2b',
    '0x6cc5f688a315f3dc28a7781717a9a798a59fda7b',
    '0xf4a2eff88a408ff4c4550148151c33c93442619e',
    '0x5b5b69f4e0add2df5d2176d7dbd20b4897bc7ec4',
    '0x6812f391fd38375316f6613ee1b46b77ad846c52',
    '0x07ee55aa48bb72dcc6e9d78256648910de513eca',
    '0x9295022fb35b28c65f7efaf678254823d3acbe53',
    '0x3cceb0d443ca4b1320ae4fa60a053eac163ca512',
    '0x82c4824bf7695c459ff5d6bb6263ffde66b94237',
    '0xc78310231aa53bd3d0fea2f8c705c67730929d8f',
    '0x4baf012726cb5ec7dda57bc2770798a38100c44d',
    '0x9c2fc4fc75fa2d7eb5ba9147fa7430756654faa9',
    '0xb20411c403687d1036e05c8a7310a0f218429503',
    '0x9a1ed80ebc9936cee2d3db944ee6bd8d407e7f9f',
    '0xb8cda067fabedd1bb6c11c626862d7255a2414fe',
    '0xb9fa6e54025b4f0829d8e1b42e8b846914659632',
    '0xfd898a0f677e97a9031654fc79a27cb5e31da34a',
    '0x701c484bfb40ac628afa487b6082f084b14af0bd',
    '0xba18ded5e0d604a86428282964ae0bb249ceb9d0',
    '0xfe01a216234f79cfc3bea7513e457c6a9e50250d',
    '0x0c05ec4db907cfb91b2a1a29e7b86688b7568a6d',
    '0xc4cf565a5d25ee2803c9b8e91fc3d7c62e79fe69',
    '0xe04cf52e9fafa3d9bf14c407afff94165ef835f7',
    '0x4b4a011c420b91260a272afd91e54accdafdfc1d',
    '0x77afe94859163abf0b90725d69e904ea91446c7b',
    '0x19d599012788b991ff542f31208bab21ea38403e',
    '0xca582d9655a50e6512045740deb0de3a7ee5281f',
    '0xd05e6bf1a00b5b4c9df909309f19e29af792422b',
    '0x0f00294c6e4c30d9ffc0557fec6c586e6f8c3935',
    '0xeb2b00042ce4522ce2d1aacee6f312d26c4eb9d6',
    '0x7ae92148e79d60a0749fd6de374c8e81dfddf792',
    '0x554f4476825293d4ad20e02b54aca13956acc40a',
    '0x9cf36e93a8e2b1eaaa779d9965f46c90b820048c',
    '0x4756eeebf378046f8dd3cb6fa908d93bfd45f139',
    '0x091933ee1088cdf5daace8baec0997a4e93f0dd6',
    '0xa8dcc0373822b94d7f57326be24ca67bafcaad6b',
    '0xa0efb63be0db8fc11681a598bf351a42a6ff50e0',
    '0x8b83b9c4683aa4ec897c569010f09c6d04608163',
    '0x550cd530bc893fc6d2b4df6bea587f17142ab64e',
    '0x828103b231b39fffce028562412b3c04a4640e64',
    '0x367989c660881e1ca693730f7126fe0ffc0963fb',
    '0xe35b0ef92452c353dbb93775e0df97cedf873c72',
    '0x844ada2ed8ecd77a1a9c72912df0fcb8b8c495a7',
    '0x0518f5bb058f6215a0ff5f4df54dae832d734e04',
    '0x0e86733eab26cfcc04bb1752a62ec88e910b4cf5',
    '0x0ff64c53d295533a37f913bb78be9e2adc78f5fe',
    '0xb8b6fe7f357adeab950ac6c270ce340a46989ce1',
    '0xeddf8eb4984cc27407a568cae1c78a1ddb0c2c1b',
    '0x7145cfedcf479bede20c0a4ba1868c93507d5786',
    '0x3ba25081d3935fcc6788e6220abcace39d58d95d',
    '0x90a9e09501b70570f9b11df2a6d4f047f8630d6d',
    '0x7712bdab7c9559ec64a1f7097f36bc805f51ff1a',
    '0xd65bd7f995bcc3bdb2ea2f8ff7554a61d1bf6e53',
    '0xfc39f0dc7a1c5d5cd1cdf3b460d5fa99a56abf65',
    '0x1ffedd7837bcbc53f91ad4004263deb8e9107540',
    '0x024861e9f89d44d00a7ada4aa89fe03cab9387cd',
    '0xd44023d2710dd7bef797a074ecec4fc74fdd52b2',
    '0x1a71b118ac6c9086f43bcf2bb6ada3393be82a5c',
    '0x657e46adad8be23d569ba3105d7a02124e8def97',
    '0x73263803def2ac8b1f8a42fac6539f5841f4e673',
    '0x6047a74d635262fb73ebce6c12bb6b14b3da70b4',
    '0x78b96178e7ae1ff9adc5d8609e000811657993c8',
    '0x81153b940932f49f42e5719fe9d1ec04e0e5c119',
    '0xce127836a13e235ff191767c290b584417149e71',
    '0x40f0d6fb7c9ddd9cbc1c02a208380c08cf77189b',
    '0x167a9333bf582556f35bd4d16a7e80e191aa6476',
    '0xbfc868b0c0af3885389a2242a2afdb841b78812f',
    '0x2fa9f9efc767650aace0422668444c3ff63e1f8d',
    '0xd57479b8287666b44978255f1677e412d454d4f0',
    '0x840760aed6bbd878c46c5850d3af0a61afcd09c8',
    '0x42ada615203749550a51a0678b8e7d5f853c6a03',
    '0xb5ab08d153218c1a6a5318b14eeb92df0fb168d6',
    '0x0a869d79a7052c7f1b55a8ebabbea3420f0d1e13',
    '0x9a9d870472bee65080e82bf3591f7c91de31a7cc',
    '0xa4a6a282a7fc7f939e01d62d884355d79f5046c1',
    '0x282edab8a933bc1c02649fe3ea2842ecbe9928a7',
    '0xbf4ed7b27f1d666546e30d74d50d173d20bca754',
    '0x246a2ecd9626f9eda55fffbff5216ed417a904f5',
    '0x25924128d7e41e9bd241788645ba1de8ba8dd640',
    '0x2eb08efb9e10d9f56e46938f28c13ecb33f67b15',
    '0xdcd0272462140d0a3ced6c4bf970c7641f08cd2c',
    '0x0117ef7fdb2a5814dff83c50fb799741904cd28d',
    '0xb62ef4c58f3997424b0cceab28811633201706bc',
    '0x47029dc4f3922706bf670d335c45550cff4f6a35',
    '0xdd5234bf64755ca4c07ee4c6529f89548c01a566',
    '0x4ce6b9b77a2e3341c4f94c751cd5c3b2424eb4b2',
    '0x376c3e5547c68bc26240d8dcc6729fff665a4448',
    '0x1e39fbf0c16a20f65613a4ed1baa088a8937b15c',
    '0x3bc643a841915a267ee067b580bd802a66001c1d',
    '0x2125f3189cd5d650d6142b222f20083efc2d05f2',
    '0x07c62a47ebe0fa853bb83375e488896ce71266df',
    '0x00e5c013694c9ee92b76ce6ad7ad3bcc20475d6f',
    '0x21346283a31a5ad10fa64377e77a8900ac12d469',
    '0xe8507b1532fc44e41b48efe45cf4abf92c5767c3',
    '0xddf744374b46aa980ddce4a5aa216478bf925cd1',
    '0x0d0707963952f2fba59dd06f2b425ace40b492fe',
    '0x11a05633e78aabf81cbc84d58e0f8d07fd25c992',
    '0x1c4b70a3968436b9a0a9cf5205c787eb81bb558c',
    '0x692190b4a5d3524b6fed0465e7400c07d09db954',
    '0xdb89045c811549f7eb925ec16f7d0cd7166556b3',
    '0x4eac9ce57af61a6fb1f61f0bf1d8586412be30bc',
    '0x2fd56159f4c8664a1de5c75e430338cfa58cd5b9',
    '0x5657e633be5912c6bab132315609b51aadd01f95',
    '0x4fdd5eb2fb260149a3903859043e962ab89d8ed4',
    '0x40f50e8352d64af0ddda6ad6c94b5774884687c3',
    '0x2d89034424db22c9c555f14692a181b22b17e42c',
    '0x6586ce3d543e0c57b347f0c3b9eeed2f132c104f',
    '0x4b5d3010905e0a2f62cce976d52c4f6eb5e545a5',
    '0x06548a28a6b2dd51ef3c01a9a5a359e026474c2a',
    '0x5104ecc0e330dd1f81b58ac9dbb1a9fbf88a3c85',
    '0x3b7b8e27de33d3ce7961b98d19a52fe79f6c25be',
    '0xe6115b13f9795f7e956502d5074567dab945ce6b',
    '0x0cfb172335b16c87d519cd1475530d20577f5e0e',
    '0x2c06dd922b61514aafedd84488c0c28e6dcf0e99',
    '0x7f3a1e45f67e92c880e573b43379d71ee089db54',
    '0x69d98f38a3ba3dbc01fa5c2c1427d862832f2f70',
    '0x44c2eb90a6d5d74dce8dccbd485cd889f8bc7b6a',
    '0x1cc1c81fd28cd948e94da74fa22fc4182d9ecfec',
    '0xd47ae555e8d869794adf7d1dbb78a7e47ccf811f',
    '0xae3808749e520415fd5184a5ee333b65cc86be8c',
    '0x8c57902b34c5bc3d6ba750d7654f49c0b6187703',
    '0xba3fd3c06e5c670c15d7bc43c935cc02a3cc87d2',
    '0xf3f89dac3145cf4020788c34c20b88e1d4329bd8',
    '0x9d447fcbdb05d1ce3d9b398a1a4ba21b35def209',
    '0x9fc97ce996338b06dd6df8101806ce53ec2e2b48',
    '0xc44bdec8c36c5c68baa2ddf1d431693229726c43',
    '0xb1179589e19db9d41557bbec1cb24ccc2dec1c7f',
    '0xc39cc669a548c661dfa6b5a1eeaa389d1ec53143',
    '0x1b29dd8ff0eb3240238bf97cafd6edea05d5ba82',
    '0x0dbd8de20eed94a5693d57998827fcf68ed2ecf4',
    '0xc8e0c9ba619f64c948b065a70f4085fdbaf9316d',
    '0x6c76bb6843c2ed9a5ad484edc9fecba5cd80b6a0',
    '0xe04a2634ff71461e342bcdc29ed807634e1565c2',
    '0xb7e698183c6735484bcef276ea26125b57846d2c',
    '0xfa4c4df1a902a70bbd1593c13cac9e8e6c26c566',
    '0x03f35f53a2598f9a1c8a452398d08429be70b7fc',
    '0x50bee102a94eb2b1c0aa716a811de35a694e3387',
    '0xef05afdc6fe371cf23b34ab5b8e05775b369bf4a',
    '0x534af382c275aa19dc095bf50c80c8717c86daca',
    '0xb8a2626a015b86d1cf1f8445de0b0c6e65a7afb8',
    '0xd329c11106d696cf5165265a00decfaa0f0878f1',
    '0xced1bc4b58b19f6f4b90557b0bda0ad328f7e4bb',
    '0x54fbd667181db44a28a96b364f294f82f1b0827b',
    '0x6b77702fcb3aae49174b8d1d6064a7cb2a1b3e59',
    '0xd532ebeb6ab531d230b6ad18c93e265ff0101dea',
    '0x25b7231d3a8013ef4deb454e5c561a8b49149390',
    '0x3e962c8bce3c7a7bfbc3ca7a0018e158692ee095',
    '0x30a2ebf10f34c6c4874b0bdd5740690fd2f3b70c',
    '0xe4f4866437513e7e023fb3933ba43045312b7459',
    '0xe7b95e3aefeb28d8a32a46e8c5278721dad39550',
    '0xb3764761e297d6f121e79c32a65829cd1ddb4d32',
    '0x23cb65b3be0be3122355488935400431bad92aeb',
    '0xad6a5bd7ca49281912992be1b726efdef2a91294',
    '0xd73e909cafbbac5db73a01f2d6973154683052c5',
    '0xb46427e2cddecb0bde40bf402361effddd4401e2',
    '0x3052cd6bf951449a984fe4b5a38b46aef9455c8e',
    '0x51fd527c62e40bc1ef62f1269f7f13c994777ee2',
    '0xfdfeb7474b6b104f32599948bb7f8ed81b06def3',
    '0xb74de1a0832c436359018ee3611e3ce42b133471',
    '0x8d95842b0bca501446683be598e12f1c616770c1',
    '0x8033539e873b3f0deaba706dd6d3480e0dd5cb30',
    '0x3f7e77b627676763997344a1ad71acb765fc8ac5',
    '0x8317ab6588b0f6643773fb3049e1e5d93d6002d3',
    '0xdd76b55ee6dafe0c7c978bff69206d476a5b9ce7',
    '0x7831f54b85e1a23ec3f8cfdc388e52832b73399b',
    '0x959ba96529927bf807fc5eb8e594cd77e4b48a87',
    '0x8ebb537dd1428c748a3653130b851009e3f3bfe1',
    '0x1958a0303a15d5d26f75dad4abaae7f84ea9f462',
    '0xdf7d3b7544a9638790609e2b511a83fa7d39b776',
    '0x32be343b94f860124dc4fee278fdcbd38c102d88',
    '0x755cdba6ae4f479f7164792b318b2a06c759833b',
    '0x80845058350b8c3df5c3015d8a717d64b3bf9267',
    '0x1570073bfd8b1b19435fbc79713138e80287fed8',
    '0x689d6140131b2a5eb2fb899b1b180ea23b2b869b',
    '0xb70e68b65e69822e90e2b9a40000ca9cc2a5f05f',
    '0xe825363f3bedabc95b2a9d42dbc73ec7b82b57d3',
    '0x1e143b2588705dfea63a17f2032ca123df995ce0',
    '0x7ef23aae22c1b3c3ecfee1aecbda03ec86784c95',
    '0x8759b0b1d9cba80e3836228dfb982abaa2c48b97',
    '0xa2f6abe26fe0e1c1f2684ab002ed02a59ffbf85a',
    '0x955a27306f1eb21757ccbd8daa2de82675aabc36',
    '0x2b66dd4eb5af85ebfccd4b538e87729fb9556764',
    '0xa5384627f6dcd3440298e2d8b0da9d5f0fcbcef7',
    '0x8b505e2871f7deb7a63895208e8227dcaa1bff05',
    '0xff64a8933e05c9d585ab72db95d207ebee9be5a8',
    '0x9d3937226a367bedce0916f9cee4490d22214c7c',
    '0x0a0fed0ff3495fe93749cde2b692b7e217dc739c',
    '0xcdbf58a9a9b54a2c43800c50c7192946de858321',
    '0x1342a001544b8b7ae4a5d374e33114c66d78bd5f',
    '0xd4914762f9bd566bd0882b71af5439c0476d2ff6',
    '0x5bcd25b6e044b97dfc941b9ec4b617ec10e1abcd',
    '0xa43d2e05ed00c040c8422a88cb8ede921a539f92',
    '0x998a7fd73446cd6532bf3058a270581730b27137',
    '0x693be1ea307e3b3826d34e96336399969898dee8',
    '0xb8d2b921c0ea0ca27266fa63907a079ef25084d0',
    '0x8599cbd5a6a9dcd4b966be387d69775da5e33c6f',
    '0x94133870506af5d0644f41a2ee62cc387b81135e',
    '0xd24400ae8bfebb18ca49be86258a3c749cf46853',
    '0x3cfc056462a06d3d146a2c6e73e5a48ea3798f24',
    '0xd641651ed7e19a04ce536610d75b3dcaf427ad73',
    '0x7c2a289c0523e748c286a37570d2efc16d2c934e',
    '0x6a25f40929a1fe4984f914b9d87e2c461cce369b',
    '0xf5bec430576ff1b82e44ddb5a1c93f6f9d0884f3',
    '0x8e279e54b04327adf57117c19bc3950d7109407c',
    '0x415655297a0f299d13acce68195890200c5d4a8b',
    '0x64c0f718c0db601d392cdc8f6375412e257c7f32',
    '0xb240a3bb14893c35854fff452a540a64af708b6c',
    '0x78a5e89900bd3f81dd71ba869d25fec65261df15',
    '0xb3f060992efa9993006ed06cc6318e8c85f3d5c9',
    '0x7454a7562b0cc0141df9103ca45dd8fc28975366',
    '0xceffc7330317f72957c662d072a5e7d63b9b578c',
    '0x67bb19d5a4f1b9939178d92a09d62444e4a76438',
    '0x00832a758a781055ac19b5f9bf553db8bb9db32d',
    '0xa1750e32227cfc0802b648b103f79ef9a783588c',
    '0xc4427b82d97f1a3ae7cbeff01a938abe56039227',
    '0x50cb0508434b4c68a2c4fde30b02b269d2d5b6bd',
    '0x50bd66bfddf48b8914602bf51c93756731ec51ae',
    '0xc42bcd5617a7bc3324526e6d4cfdb9d11395e4fa',
    '0xebd1d79219ed39223e1540bfabd987f955b039b2',
    '0x5a03703125380cfda804446fdaa3b4064cb6cc0a',
    '0x6220d7a458a68d6a554e5904792049fd2ef6bbcc',
    '0x17021eaebcd51eed93a45a6f81b71c441182e8d2',
    '0x45c0ac102f35384825abb6e4ba70c786e9697ae3',
    '0xea1d686be5e38260cdd50c96ed09c58fffba23cf',
    '0xbd69cbe009973a48edeccd4e4dd9bc5a1f66da46',
    '0x71cdbc5b77c03d855ed1ec61ec5c2d3627c61e78',
    '0x1b0105235f7c8e1b71e681302cc5dd72169f5b7e',
    '0x532d90e829680721a2edb4cdb072ec45dab1333c',
    '0x0d454ce15b3fdea213ceb911346b330e31fbcaff',
    '0x83403a5fbf92c88d35ac77633b29a87716db4ff6',
    '0x34b7b1b28373c4eef868f787a843e5a1871a3cd1',
    '0x3ffbdcb15fd085a342a8ab88162b4842a7a6a354',
    '0xb9db6142c780e8f3ff3fe5e94fc784ae537ca329',
    '0x07f1d450b16e53302931c5362ee0ab41f2978541',
    '0x61687ed007aea3c0409b7c742aa6578c6a9077e7',
    '0x32ee845fb08699fec04e1129c77ba326abf621c7',
    '0xabcdebb0d9c509460eb58ad134b4f57191f640b2',
    '0xfb626333099a91ab677bcd5e9c71bc4dbe0238a8',
    '0xc97b6e3e4301617f617b23120f31303e8ccee606',
    '0x565b8fbf9336bec8fbfb4f78fbf30d7f70d6973b',
    '0x8387dbf85230975a26909c1240f6aea7eb45f9f3',
    '0xe780a56306ba1e6bb331952c22539b858af9f77d',
    '0x7daecd9c1dc04d58a42e6cb0a6d7f94430729f27',
    '0x9dd172097560b0830fb4faeaa0ec73d6cdb2a913',
    '0x6a7b2e0d88867ff15d207c222bebf94fa6ce8397'
];

const FIVE = new BN('5');

export const THREE_HUNDRED_VALUE = [
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE,
    FIVE
];
