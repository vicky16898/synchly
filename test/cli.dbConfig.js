const path = require('path');
const cmd = require('../lib/cmd');
const expect = require('chai').expect;
const { EOL } = require('os');
describe('my cli program', () => {
    const cliPath = path.join(__dirname, '../bin/synchly');
    const cliProcess = cmd.create(cliPath, '.'); // this will return a new object { execute }

    it('should print the correct output', async () => {
        const response = await cliProcess.execute( // executes the command!
            [
                '--config',
                'db',
                '--job',
                'test'
            ], // args
            [   
                cmd.DOWN,
                cmd.ENTER,
                'root',
                cmd.ENTER,
                'arno16Dorian',
                cmd.ENTER,
                'localhost',
                cmd.ENTER,
                '3306',
                cmd.ENTER,
                'Witcher',
                cmd.ENTER,
                '/home/arnodorian/dump',
                cmd.ENTER,
                'Yes',
                cmd.ENTER,
                'yes',
                cmd.ENTER,
                cmd.ENTER,
                cmd.ENTER,
                cmd.ENTER,
                cmd.ENTER
            ], // inputs
            {}, // options
        );
        expect(response.trim().split(EOL).pop())
            .to.equal('Success'); // example test to check response is empty string
    });
});