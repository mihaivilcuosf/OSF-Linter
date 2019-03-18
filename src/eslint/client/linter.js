import _ from "lodash";
import chalk from "chalk";
import config from "./config";
import eslint from "eslint";
import fse from "fs-extra";
import globby from "globby";
import path from "path";
import process from "process";
import uuid4 from "uuid/v4";

export default async report => {
    let osfLinterPath = path.resolve(process.cwd(), "osf-linter.config.js");
    if (!fse.existsSync(osfLinterPath)) {
        console.error(`${chalk.red.bold("\u2716")} ${osfLinterPath} does not exist!`);
        process.exit(1);
    }

    let osfLinterConf;
    try {
        osfLinterConf = await import(osfLinterPath);
    } catch (e) {
        console.error(`${chalk.red.bold("\u2716")} Failed to import ${osfLinterPath}!`);
        console.error(e);
        process.exit(1);
    }

    if (!osfLinterConf) {
        console.error(`${chalk.red.bold("\u2716")} Failed to import ${osfLinterPath}!`);
        process.exit(1);
    }

    if (!osfLinterConf.eslintClient) {
        console.error(`${chalk.red.bold("\u2716")} Missing eslintClient configuration from ${osfLinterPath}!`);
        process.exit(1);
    }

    try {
        let cli = new eslint.CLIEngine({baseConfig: config, useEslintrc: false});
        let files = await globby(osfLinterConf.eslintClient);
        let data = cli.executeOnFiles(files);

        if (data.errorCount > 0 || data.warningCount > 0) {
            let formatter = cli.getFormatter("stylish");
            console.error(formatter(data.results));

            if (report) {
                let reportPath = path.resolve(process.cwd(), report);
                if (!fse.existsSync(reportPath)) {
                    fse.ensureDirSync(reportPath);
                }

                let reportFile = path.resolve(reportPath, `ESLintClient.${uuid4()}.json`);
                if (fse.existsSync(reportFile)) {
                    console.error(`${chalk.red.bold("\u2716")} reportFile=${reportFile} already exists!`);
                    process.exit(1);
                }

                fse.writeFileSync(
                    reportFile,
                    JSON.stringify(
                        _.flatMap(data.results, result => {
                            let relativePath = path
                                .relative(process.cwd(), result.filePath)
                                .split(path.sep)
                                .join("/");

                            return _.map(result.messages, message => {
                                let messageType = "warning";
                                if (message.fatal || message.severity === 2) {
                                    messageType = "error";
                                }

                                return {
                                    path: relativePath,
                                    startLine: message.line,
                                    startColumn: message.column,
                                    endLine: message.endLine,
                                    endColumn: message.endColumn,
                                    message: `[${messageType}] ${message.message} (${message.ruleId})`
                                };
                            });
                        })
                    )
                );
            }

            process.exit(1);
        }
    } catch (e) {
        console.error(`${chalk.red.bold("\u2716")} Failed to run eslintClient!`);
        console.error(e);
        process.exit(1);
    }
};
