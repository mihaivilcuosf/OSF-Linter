#!/usr/bin/env node

import process from "process";
import yargs from "yargs";
import chalk from "chalk";
import eslintServer from "../eslint/server/linter";
import eslintClient from "../eslint/client/linter";
import stylelint from "../stylelint/linter";

const argv = yargs
    .usage("Usage: $0 [options]")
    .describe("l", "Linter type (eslintServer|eslintClient|stylelint)")
    .describe("r", "Report path")
    .demandOption(["l"])
    .alias("l", "linter")
    .alias("r", "report")
    .alias("v", "version")
    .alias("h", "help")
    .help("h")
    .argv;

switch (argv.l) {
    case "eslintServer":
        eslintServer(argv.r);
        break;

    case "eslintClient":
        eslintClient(argv.r);
        break;

    case "stylelint":
        stylelint(argv.r);
        break;

    default:
        console.error(`${chalk.red.bold("\u2716")} Invalid value for linter type!`);
        process.exit(1);
}
