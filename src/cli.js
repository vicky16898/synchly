const arg = require('arg');
const constants = require('./utils/constants');
const strings = require('./utils/strings');
const db = require('./database/database');
const remoteSync = require('./remoteSync/remoteSync');
const smtp = require('./smtp/smtp');
const backupScheduler = require('./backupScheduler');
const configstore = require('conf');
const packageJson = require('./../package.json');
const files = require('./utils/files');
const inquirer = require('./inquirer');

const defaultJobName = 'master';

const parseArgumentsIntoOptions = (rawArgs) => {
    const args = arg(
        {
            '--config': String,
            '--disable': String,
            '--debug': Boolean,
            '--disablejob': Boolean,
            '--enable': String,
            '--enablejob': Boolean,
            '--file': String,
            '--help': Boolean,
            '--job': String,
            '--reset': Boolean,
            '--start': Boolean,
            '--stacktrace': Boolean,
            '--version': Boolean,
            '-c': '--config',
            '-d': '--disable',
            '-D': '--debug',
            '-e': '--enable',
            '-f': '--file',
            '-h': '--help',
            '-j': '--job',
            '-r': '--reset',
            '-S': '--stacktrace',
            '-v': '--version',
        },
        {
            argv: rawArgs.slice(2),
        }
    );
    return {
        config: args['--config'],
        disable: args['--disable'],
        debug: args['--stacktrace'] || args['--debug'],
        enable: args['--enable'],
        enablejob: args['--enablejob'],
        disablejob: args['--disablejob'],
        file: args['--file'],
        help: args['--help'],
        job: args['--job'] || defaultJobName,
        reset: args['--reset'],
        start: args['--start'],
        version: args['--version'],
    };
};

const configAllowedArgs = ['db', 'remote-sync', 'smtp'];
const modAllowedArgs = ['remote-sync', 'smtp'];

const confStore = new configstore();

const cli = async (args) => {
    let dbStatus;

    let options;
    try {
        options = parseArgumentsIntoOptions(args);
    } catch (err) {
        console.error(`${err.name}: ${err.message}`);
        console.log(strings.usageInfo);
        return;
    }

    const isDebug = options.debug;
    try {
        if (options.version) {
            console.log(`${constants.PACKAGE_NAME} ${packageJson.version}`);
            return;
        }

        if (options.help) {
            console.log(strings.helpDesc);
            return;
        }

        const jobName = options.job;
        let jobConfStore = new configstore({configName: jobName});
        const jobConfigObj = jobConfStore.store;

        // TODO: allow resetting each job's config
        // TODO: allow deleting all jobs
        if (options.reset) {
            const resetConfirm = await inquirer.askResetConfirmation();
            if (resetConfirm.resetConfirmation) {
                jobConfStore.clear();
                console.log(strings.resetSuccessLog);
                return;
            } else {
                return;
            }
        }

        if (
            !options.start &&
            !options.disable &&
            !options.enable &&
            !options.help &&
            !options.version &&
            !options.config &&
            !options.reset &&
            !options.file &&
            !options.enablejob &&
            !options.disablejob
        ) {
            console.log(strings.usageInfo);
            return;
        }

        if (options.config) {
            if (configAllowedArgs.indexOf(options.config) == -1) {
                console.error(`Unknown or unexpected argument: ${options.config}`);
                console.error(`Allowed arguments are ${configAllowedArgs}`);
            }
        }
        if (!options.config && options.file) {
            console.error(strings.fileWoConfigArg);
            return;
        }

        if (options.enable || options.disable) {
            let givenArg;
            if (options.enable) givenArg = options.enable;
            else givenArg = options.disable;
            if (modAllowedArgs.indexOf(givenArg) == -1) {
                console.error(`Unknown or unexpected argument: ${givenArg}`);
                console.error(`Allowed arguments are ${modAllowedArgs}`);
            }
        }

        if (options.config && options.file) {
            if (options.file.length) {
                if (!files.directoryExists(options.file)) {
                    console.error(`No Such file, '${options.file}'`);
                    return;
                }
                let isFile = files.isFile(options.file);
                if (!isFile) {
                    console.log(`'${options.file}' is a directory.`);
                    return;
                }
            } else {
                return 'Flag --file requires the absolute path of the config init file as an argument.';
            }
        }

        if (options.config == 'db') {
            let dbSetupRes = await db.setupConfig(jobName, isDebug, options.file);
        } else if (options.config == 'remote-sync') {
            let remoteSetupRes = await remoteSync.setupConfig(jobName, isDebug, options.file);
        } else if (options.config == 'smtp') {
            let smtpSetupRes = await smtp.setupConfig(jobName, isDebug, options.file);
        }

        if (options.enable == 'remote-sync') {
            if (!jobConfigObj.remoteSetupComplete) {
                console.log('Finish the remote sync configuration below before enabling');
                let remoteSetupRes = await remoteSync.setupConfig(jobName, isDebug);
                if (remoteSetupRes) {
                    console.log(`Enabling module 'remote-sync'`);
                    jobConfStore.set('remoteSyncEnabled', true);
                    console.log('Success');
                }
            } else if(jobConfigObj.remoteSyncEnabled) {
                console.log(`Module 'remote-sync' already enabled`)
            } else {
                console.log(`Enabling module 'remote-sync'`);
                jobConfStore.set('remoteSyncEnabled', true);
                console.log('Success');
            }
        } else if (options.enable == 'smtp') {
            if (!jobConfigObj.smtpSetupComplete) {
                console.log('Finish the smtp configuration below before enabling');
                let smtpSetupRes = await smtp.setupConfig(jobName, isDebug);
                if (smtpSetupRes) {
                    console.log(`Enabling module 'smtp'`);
                    jobConfStore.set('smtpEnabled', true);
                    console.log('Success');
                }
            } else if(jobConfigObj.smtpEnabled) {
                console.log(`Module 'smtp' already enabled`)
            }  else {
                console.log(`Enabling module 'smtp'`);
                jobConfStore.set('smtpEnabled', true);
                console.log('Success');
            }
        }

        if (options.disable == 'remote-sync') {
            if(!jobConfigObj.remoteSyncEnabled) {
                console.log(`Module 'remote-sync' already disabled`);    
            } else {
                console.log(`Disabling module 'remote-sync'`);
                jobConfStore.set('remoteSyncEnabled', false);
                console.log('Success');
            }
        } else if (options.disable == 'smtp') {
            if(!jobConfigObj.smtpEnabled) {
                console.log(`Module 'smtp' already disabled`);    
            } else {
                console.log(`Disabling module 'smtp'`);
                jobConfStore.set('smtpEnabled', false);
                console.log('Success');
            }
        }

        if (options.enablejob) {
            if (!jobConfigObj.dbSetupComplete) {
                console.log('Finish the db configuration below before enabling a job');
                let dbSetup = await db.setupConfig(jobName, isDebug);
                if (dbSetup) {
                    console.log(`Enabling job '${jobName}`);
                    confStore.set(`${jobName}.enabled`, true);
                    console.log('Success');
                }
            } else if (confStore.get(`${jobName}.enabled`)){
                console.log(`Job '${jobName} already enabled`);
            } else {
                console.log(`Enabling job '${jobName}`);
                confStore.set(`${jobName}.enabled`, true);
                console.log('Success');
            }
        }

        if (options.disablejob) {
            if(!confStore.get(`${jobName}`)) {
                console.error(`Job ${jobName} does not exist!`)
            } else if (!confStore.get(`${jobName}.enabled`)){
                console.log(`Job '${jobName} already disabled`);
            } else {
                console.log(`Disabling job '${jobName}`);
                confStore.set(`${jobName}.enabled`, false);
                console.log('Success');
            }
        }

        // TODO: allow starting all enabled jobs
        if (options.start) {
            const jobNamesConfig = confStore.store;
            let jobNames = [];
            for (let j in jobNamesConfig) {
                if(jobNamesConfig[j].enabled)
                    jobNames.push(j);
            }
            backupScheduler(jobNames, isDebug);
        }
    } catch (err) {
        console.error(`${err.name}: ${err.message}`);
        if (isDebug) {
            console.error('Stacktrace:');
            console.error(err);
        } else {
            console.error(strings.debugModeDesc);
        }
    }
};

module.exports = {
    cli,
};