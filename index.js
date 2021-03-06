#!/usr/bin/env node

// SPDX-License-Identifier: GPL-3.0-or-later
// This file is part of Polkamisc.
//
// Copyright (c) 2021 Wei Tang.
//
// Polkamisc is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Polkamisc is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Polkamisc. If not, see <http://www.gnu.org/licenses/>.

const { ApiPromise, WsProvider } = require('@polkadot/api');
const BN = require('bn.js');
var fs = require('fs');
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')

const fetchValidators = async (filePath) => {
    const wsProvider = new WsProvider("wss://rpc.polkadot.io");
  
    const api = await ApiPromise.create({
      provider: wsProvider,
    });

    const validatorPrefs = await api.query.staking.erasValidatorPrefs.entries(277);
    
    const validators = {};
    for (const pref of validatorPrefs) {
        let commission = parseFloat(pref[1].commission.toString(), 10) / 10000000;
        validators[pref[0].args[1].toString()] = { 
            commission: commission,
            nominationCount: 0,
            nominationTotal: new BN(0),
        };
    }

    const nominators = await api.query.staking.nominators.entries();

    for (const nominator of nominators) {
        const nominatorAddress = nominator[0].args[0].toString();
        const nominatedValidators = JSON.parse(nominator[1].toString()).targets;

        const controllerAddress = await api.query.staking.bonded(nominatorAddress);
        const ledger = await api.query.staking.ledger(controllerAddress.toString());
        let value = new BN(0);
        if (ledger.isSome) {
            value = ledger.value.active.toBn();
        }

        for (const validator in validators) {
            if (nominatedValidators.includes(validator)) {
                validators[validator].nominationCount += 1;
                validators[validator].nominationTotal = validators[validator].nominationTotal.add(value);
            }
        }

        console.log(`Nominator ${nominatorAddress} staked ${value}`);
    }

    fs.writeFileSync(filePath, JSON.stringify(validators), "utf8");
};

const toCsv = async (source, target) => {
    const validators = JSON.parse(fs.readFileSync(source));
    let csvContent = "validator,commission,nominationCount,nominationTotal\n";

    for (const validator in validators) {
        const commission = validators[validator].commission;
        const nominationCount = validators[validator].nominationCount;
        const nominationTotal = new BN(validators[validator].nominationTotal, 16);
        const nominationTotalDot = nominationTotal.div(new BN(10000000000));

        csvContent += `${validator},${commission},${nominationCount},${nominationTotalDot}\n`;
    }

    fs.writeFileSync(target, csvContent, "utf8");
};

const calcCommission = async (file, address) => {
    const validators = JSON.parse(fs.readFileSync(file));
    const validator = validators[address];

    const nominationTotal = new BN(validator.nominationTotal, 16);
    const nominationTotalDot = nominationTotal.div(new BN(10000000000));

    let commission = 0.5;

    if (nominationTotalDot > 50000000) {
        commission = 5;
    } else if (nominationTotalDot > 40000000) {
        commission = 4;
    } else if (nominationTotalDot > 30000000) {
        commission = 3;
    } else if (nominationTotalDot > 20000000) {
        commission = 2;
    } else if (nominationTotalDot > 10000000) {
        commission = 1;
    }

    console.log(`Commission: ${commission}%`);
};

yargs(hideBin(process.argv))
    .command("fetch-validators [file]", "Fetch validators from remote RPC endpoint, and write it to file.", (yargs) => {
        yargs.positional("file", { describe: "File to write to" })
    }, async (argv) => {
        await fetchValidators(argv.file);
        process.exit(0);
    })
    .command("to-csv [source] [target]", "Turn the result of fetched validator data to csv.", (yargs) => {
        yargs
            .positional("source", { describe: "Data source to read from" })
            .positional("target", { describe: "Target csv to write to" })
    }, async (argv) => {
        await toCsv(argv.source, argv.target);
        process.exit(0);
    })
    .command("commission [file] [address]", "Calculate the supposed commission of given address.", (yargs) => {
        yargs
            .positional("file", { describe: "Data source to read from" })
            .positional("address", { describe: "Validator address" })
    }, async (argv) => {
        await calcCommission(argv.file, argv.address);
        process.exit(0);
    })
    .strictCommands()
    .argv