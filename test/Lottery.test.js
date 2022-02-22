const assert = require('assert');
const expect = require('expect');
const ganache = require('ganache-cli');
const Web3 = require('web3');
const web3 = new Web3(ganache.provider());
const _ = require('lodash');

const { abi, evm } = require('../compile');

const enterPlayer = async (address, valueInEth) => {
    await lottery.methods
          .enter()
          .send({
            from: address,
            value: toWei(valueInEth, 'ether'),
          });
}

let lottery;
let accounts;
let toWei;

beforeEach(async () => {
    accounts = await web3.eth.getAccounts();
    lottery = await new web3.eth.Contract(abi)
    .deploy({ data: evm.bytecode.object })
    .send({ from: accounts[0], gas: '1000000' });
    toWei = web3.utils.toWei; 
})

describe('Lottery Contract', () => {
    it('deploys a contract', async () => {
        assert.ok(lottery.options.address);
    });

    it('manager should be accessable', async () => {
        const manager = await lottery.methods
                        .manager()
                        .call({ from: accounts[0] });

        expect(accounts[0]).toBe(manager);
    });

    it('allows many account to enter', async () => {
        await enterPlayer(accounts[0], '0.02');
        await enterPlayer(accounts[1], '0.02');
        await enterPlayer(accounts[2], '0.02');

        const players = await lottery.methods
            .getPlayers()
            .call({ from: accounts[0] });

        expect(players.length).toBe(3);
        expect(_.isEqual(players, _.take(accounts, 3))).toBeTruthy();
    });
    
    it('allows one account to enter', async () => {
        await enterPlayer(accounts[0], '0.02');

        const players = await lottery.methods
            .getPlayers()
            .call({ from: accounts[0] });

        expect(players.length).toBe(1);
        expect(_.isEqual(players, _.take(accounts, 1))).toBeTruthy();
    });

    it('requires a minimum amount of ethers to enter', async () => {
        let err = undefined;
        try {
            await enterPlayer(accounts[0], '0.01');
        } catch (e) {
            err = e;
        }

        expect(err).toBeDefined();
    });

    it('only manager allowed to call function', async () => {
        let err = undefined;
        try {
            await lottery.methods.pickWinner().call({
                from: accounts[1],
            });
        } catch (e) {
            err = e;
        }

        expect(err).toBeDefined();
    });

    it('winner should get rewards', async () => {        
        await enterPlayer(accounts[1], '0.02');
        const beforeWinning = await web3.eth.getBalance(accounts[1]);

        await lottery.methods.pickWinner()
        .send({ from: accounts[0] });
                
        const afterWinning = await web3.eth.getBalance(accounts[1]);
        expect(beforeWinning < afterWinning).toBeTruthy();
    });
});
