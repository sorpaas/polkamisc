# Polkamisc

Miscellaneous scripts used for Polkadot validators.

## Installation

Make sure you have `node` and `yarn` installed, then run:

```bash
yarn install
```

You can also use the NixOS build script:

```bash
nix-build .
```

## Commission calculation

This repo contains a simple algorithm for commission calculation, aiming at
dealing with over-subscription problems, and incentivizing nominators to evenly
distribute votes. It first fetches a validator's total nominator stakes (note
that this is different from nominator exposure). Then, it assigns a commission
ranging from 0.5% to 5% based on the total stakes.

To run the algorithm, first fetch necessary validator information.

```bash
./index.js fetch-validators validators.json [era]
```

`[era]` is the current era number. It will fetch from RPC endpoint at
`rpc.polkadot.io`. Note that because the nominator list is huge, this operation
is going to take some time.

Then calculate the commission based on the validator data.

```bash
./index.js commission validators.json [address]
```