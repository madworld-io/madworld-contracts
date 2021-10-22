const { BN, ether, expectRevert } = require('@openzeppelin/test-helpers');
const {toWei} = require('web3-utils');

var should = require('chai').should();

const { shouldBehaveLikeTokenRecover } = require('eth-token-recover/test/TokenRecover.behaviour');
const { shouldBehaveLikeERC1363 } = require('erc-payable-token/test/token/ERC1363/ERC1363.behaviour');

const { shouldBehaveLikeRoles } = require('./access/behaviours/Roles.behaviour');
const { shouldBehaveLikeERC20 } = require('./behaviours/ERC20.behaviour');
const { shouldBehaveLikeERC20Burnable } = require('./behaviours/ERC20Burnable.behaviour');
const { shouldBehaveLikeERC20Capped } = require('./behaviours/ERC20Capped.behaviour');
const { shouldBehaveLikeERC20Mintable } = require('./behaviours/ERC20Mintable.behaviour');

const UMAD = artifacts.require('UMAD');

contract('UMAD', function ([owner, other, thirdParty]) {
  const _name = 'UMAD';
  const _symbol = 'UMAD';
  const _decimals = new BN(8);
  const _cap = new BN(10000000000).mul(new BN(10).pow(_decimals));
  const _initialSupply = new BN(88888).mul(new BN(10).pow(_decimals));


  context('creating valid token', function () {

    describe('as a UMAD', function () {
      describe('without initial supply', function () {
        beforeEach(async function () {
          this.token = await UMAD.new(
            [owner],
            [0]
          );
        });

        describe('once deployed', function () {
          it('total supply should be equal to zero', async function () {
            (await this.token.totalSupply()).should.be.bignumber.equal(new BN(0));
          });

          it('owner balance should be equal to zero', async function () {
            (await this.token.balanceOf(owner)).should.be.bignumber.equal(new BN(0));
          });
        });
      });

      describe('with initial supply', function () {
        beforeEach(async function () {
          this.token = await UMAD.new(
            [owner],
            [_initialSupply]
          );
        });

        describe('once deployed', function () {
          it('total supply should be equal to initial supply', async function () {
            (await this.token.totalSupply()).should.be.bignumber.equal(_initialSupply);
          });

          it('owner balance should be equal to initial supply', async function () {
            (await this.token.balanceOf(owner)).should.be.bignumber.equal(_initialSupply);
          });
        });
      });
    });
  });

  context('UMAD token behaviours', function () {
    beforeEach(async function () {
      this.token = await UMAD.new(
        [owner],
        [_initialSupply]
      );
    });

    context('like a ERC20', function () {
      shouldBehaveLikeERC20(_name, _symbol, _decimals, _initialSupply, [owner, other, thirdParty]);
    });

    context('like a ERC20Capped', function () {
      beforeEach(async function () {
        // NOTE: burning initial supply to test cap
        await this.token.burn(_initialSupply, { from: owner });
      });
      shouldBehaveLikeERC20Capped(_cap, [owner, other]);
    });

    context('like a ERC20Mintable', function () {
      shouldBehaveLikeERC20Mintable(_initialSupply, [owner, thirdParty]);
    });

    context('like a ERC20Burnable', function () {
      shouldBehaveLikeERC20Burnable(_initialSupply, [owner, thirdParty]);
    });

    context('like a ERC1363', function () {
      shouldBehaveLikeERC1363([owner, other, thirdParty], _initialSupply);
    });

    context('like a UMAD', function () {
      describe('when the sender doesn\'t have minting permission', function () {
        const from = thirdParty;

        it('cannot mint', async function () {
          const amount = new BN(50);

          await expectRevert(
            this.token.mint(thirdParty, amount, { from }),
            'Roles: caller does not have the MINTER role',
          );
        });

        it('cannot finish minting', async function () {
          await expectRevert(
            this.token.finishMinting({ from }),
            'Ownable: caller is not the owner',
          );
        });
      });
    });

    context('like a Roles', function () {
      beforeEach(async function () {
        this.contract = this.token;
      });

      shouldBehaveLikeRoles([owner, other, thirdParty]);
    });

    context('like a TokenRecover', function () {
      beforeEach(async function () {
        this.instance = this.token;
      });

      shouldBehaveLikeTokenRecover([owner, thirdParty]);
    });
  });
});
