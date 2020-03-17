#!/usr/bin/env node

import yargs from 'yargs';

const services = ['test', 'test2'];

const argv = yargs
    .scriptName('docker-manager')
    .choices('service', services)
    .command('start <service>', 'Start a service', () => {
        yargs
            .positional('service', {
                describe: 'Service'
            });
    })
    .command('status <service>', 'Display status of a service', () => {
        yargs
            .positional('service', {
                describe: 'Service'
            });
    })
    .command('logs <service>', 'Display logs of a service', () => {
        yargs
            .positional('service', {
                describe: 'Service'
            })
            .option('follow', {
                alias: 'f',
                describe: 'Follow log output'
            });
    })
    .demandCommand()
    .recommendCommands()
    .strict()
    .help()
    .parse();

console.log(argv);
