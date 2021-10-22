#!/usr/bin/env bash

for contract in "UMAD"
do
  npx truffle-flattener contracts/token/ERC20/$contract.sol > dist/$contract.dist.sol
done