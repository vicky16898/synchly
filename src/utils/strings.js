const configstore = require('conf');
const utils = require('./utils');

const usageInfo = `usage: synchly [--config module]
usage: synchly [--config module] [--file filepath]
usage: synchly [--disable module] [--debug]
usage: synchly [--enable module] [--stacktrace]
usage: synchly [--help]
usage: synchly [--reset]
usage: synchly [--start]
usage: synchly [--version]`;

const helpDesc = `synchly - automate database backups \n
${usageInfo} \n
Options:
  -c, --config=module           create or update module configuration (db | remote-sync | smtp)
  -d, --disable=module          disable a module (remote-sync | smtp)
  -D, --debug                   prints even more information from CLI operations, used for debugging purposes
  -e, --enable=module           enable a module (remote-sync | smtp)
  -f, --file=filePath           create or update module configuration using the specified file (to be used with --config flag)
  -h, --help                    prints CLI reference information about options and their arguments
      --reset                   reset all the configurations saved
  -S, --stacktrace              prints even more information about errors from CLI operation, used for debugging purposes. If you find a bug, provide output generated with the --stacktrace or --debug flag on when submitting a bug report
      --start                   start synchly instance which logs to stdout and stderr
  -v, --version                 display version information and exit`;

const statusReportTemplate = (jobName, dbSuccess, removedDirs, dbError, remoteSuccess, remoteError) => {

    const jobConfStore = new configstore({configName: jobName});
    const jobConfObj = jobConfStore.store;
    const currentDateString = new Date().toDateString();
    const remoteStatus = jobConfObj.remoteSyncEnabled;
    const dbType = jobConfObj.dbType;
    const dbName = jobConfObj.dbName;
    let retString = '<p>&nbsp;</p>';

    if (dbSuccess) {
        retString += `<p>Backup of ${dbType} database ${dbName} on ${currentDateString} completed successfully.</p>`;

        if (removedDirs.length > 0) {
            removedDirs = removedDirs.map((d) => {
                d = d.replace(constants.DB_BACKUP_DIR_PREFIX, '');
                d = utils.replaceAll(d, '-', '/');
                d = new Date(d);
                return d.toDateString();
            });
            retString += `<p>Removed backup of ${dbType} database ${dbName} on ${removedDirs}.</p>`;
        }

        retString += `<p>&nbsp;</p>
        <h3><strong>Remote-Sync:</strong></h3>`;

        if (remoteStatus) {
            if (remoteSuccess) {
                retString += `<p>Remote sync of local backups to ${jobConfObj.remoteType} completed successfully.</p>`;
            } else {
                retString += `<p><span style="color: #ff0000;">Remote sync of local backups to ${jobConfObj.remoteType} failed.</span></p>
                <p><strong>${remoteError.name}:</strong> ${remoteError.message}</p>
                <p><strong>Stacktrace:</strong></p>
                <p>${remoteError}</p>`;
            }
        } else {
            retString += `<p>Disabled</p>`;
        }
    } else {
        retString += `<p><span style="color: #ff0000;">Backup of ${dbType} database ${dbName} on ${currentDateString} failed</span></p>
        <p><strong>${dbError.name}:</strong> ${dbError.message}</p>
        <p><strong>Stacktrace:</strong></p>
        <p>${dbError}</p>`;
    }

    retString += `<p>&nbsp;</p>
    <p><strong>SMTP:</strong></p>
    <p>Status notifications are sent to the following e-mails:</p>
    <p>${jobConfObj.smtpRecipientMail}</p>`;

    return retString;
};

const statusReportLog = (jobName, dbSuccess, removedDirs, dbError, remoteSuccess, remoteError) => {

    const jobConfStore = new configstore({configName: jobName});
    const jobConfObj = jobConfStore.store;
    const currentDateString = new Date().toDateString();
    const remoteSyncEnabled = jobConfObj.remoteSyncEnabled;
    const smtpEnabled = jobConfObj.smtpEnabled;
    const dbType = jobConfObj.dbType;
    const dbName = jobConfObj.dbName;
    let retString = 'Daily Status Report:\n\n';

    if (dbSuccess) {
        retString += `Backup of ${dbType} database ${dbName} on ${currentDateString} completed successfully.\n`;

        if (removedDirs.length > 0) {
            removedDirs = removedDirs.map((d) => {
                d = d.replace(constants.DB_BACKUP_DIR_PREFIX, '');
                d = utils.replaceAll(d, '-', '/');
                d = new Date(d);
                return d.toDateString();
            });
            retString += `Removed backup of ${dbType} database ${dbName} on ${removedDirs}.\n`;
        }

        retString += `\nRemote-Sync:\n`;

        if (remoteSyncEnabled) {
            if (remoteSuccess) {
                retString += `Remote sync of local backups to ${jobConfObj.remoteType} completed successfully.\n`;
            } else {
                retString += `Remote sync of local backups to ${jobConfObj.remoteType} failed.\n${remoteError.name}: ${remoteError.message}\n`;
                retString += `Stacktrace:\n${remoteError}\n`;
            }
        } else {
            retString += `Disabled\n`;
        }
    } else {
        retString += `Backup of ${dbType} database ${dbName} on ${currentDateString} failed.\n${dbError.name}: ${dbError.message}\n`;
        retString += `Stacktrace:\n${dbError}\n`;
    }

    retString += `\nSMTP:\n`;
    if (smtpEnabled) {
        retString += `Status notifications are sent to the following e-mails:\n${jobConfObj.smtpRecipientMail}\n`;
    } else {
        retString += `Disabled\n`;
    }

    return retString;
};

module.exports = {
    debugModeDesc: 'Re run with --stacktrace or --debug to get more details about the error',
    validNoWarning: 'Please enter a valid number',
    usageInfo,
    helpDesc,
    synchlyStartedDesc: 'synchly waiting to take your backups...',
    statusReportTemplate,
    statusReportLog,
    resetSuccessLog: 'Reset all configurations successfull',
    fileWoConfigArg: 'Use --flag=filePath along with --config=module for initializing the module config using the file',
};
