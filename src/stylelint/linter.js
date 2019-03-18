import _ from "lodash";
import config from "./config";
import chalk from "chalk";
import fse from "fs-extra";
import path from "path";
import process from "process";
import stylelint from "stylelint";
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

    if (!osfLinterConf.stylelint) {
        console.error(`${chalk.red.bold("\u2716")} Missing stylelint configuration from ${osfLinterPath}!`);
        process.exit(1);
    }

    try {
        let data = await stylelint.lint({
            config: config,
            files: osfLinterConf.stylelint,
            formatter: stylelint.formatters.verbose
        });

        if (data.errored) {
            console.error(data.output);

            if (report) {
                let reportPath = path.resolve(process.cwd(), report);
                if (!fse.existsSync(reportPath)) {
                    fse.ensureDirSync(reportPath);
                }

                let reportFile = path.resolve(reportPath, `StyleLint.${uuid4()}.json`);
                if (fse.existsSync(reportFile)) {
                    console.error(`${chalk.red.bold("\u2716")} reportFile=${reportFile} already exists!`);
                    process.exit(1);
                }

                fse.writeFileSync(
                    reportFile,
                    JSON.stringify(
                        _.flatMap(data.results, result => {
                            let relativePath = path
                                .relative(process.cwd(), result.source)
                                .split(path.sep)
                                .join("/");

                            return _.map(result.warnings, warning => {
                                return {
                                    path: relativePath,
                                    startLine: warning.line,
                                    startColumn: warning.column,
                                    message: `[${warning.severity}] ${warning.text}`
                                };
                            });
                        })
                    )
                );
            }

            process.exit(1);
        }
    } catch (e) {
        console.error(`${chalk.red.bold("\u2716")} Failed to run styleint!`);
        console.error(e);
        process.exit(1);
    }
};
