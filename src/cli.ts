#!/usr/bin/env node

import {ensureDir} from 'fs-extra';
import yargs from 'yargs';

import packageInfo from '../package.json';

import config from './config';
import {getApplicationNames, getServiceNames, executeAction} from './docker';

(async () => {
    console.log('Docker Manager CLI');
    console.log();

    // Ensure the application directory exists
    try {
        await ensureDir(config.applications.path);
    } catch (err) {
        console.error(`The application directory (${config.applications.path}) does not exist and could not be created.`);
        yargs.exit(1, err);
    }

    // Find applications
    const applicationNames = await getApplicationNames();

    // Parse arguments
    const argv = yargs
        .scriptName('docker-manager')
        .choices('application', applicationNames.concat('all'))
        .command('version', 'Displays version information')
        .command('list', 'Lists applications')
        .command('services <application>', 'List services of an application', () => {
            yargs
                .positional('application', {
                    describe: 'Application to list services for'
                });
        })
        .command('start <application> [services..]', 'Start an application', () => {
            yargs
                .positional('application', {
                    describe: 'Application to start or "all" to start all applications'
                })
                .positional('services', {
                    describe: 'Services to start, starts all if no services are specified',
                    array: true
                });
        })
        .command('stop <application> [services..]', 'Stop an application', () => {
            yargs
                .positional('application', {
                    describe: 'Application to stop or "all" to stop all applications'
                })
                .positional('services', {
                    describe: 'Services to stop, stops all if no services are specified',
                    array: true
                });
        })
        .command('restart <application> [services..]', 'Restart an application', () => {
            yargs
                .positional('application', {
                    describe: 'Application to restart or "all" to restart all applications'
                })
                .positional('services', {
                    describe: 'Services to restart, restarts all if no services are specified',
                    array: true
                });
        })
        .command(['status <application> [services..]', 'ps <application> [services..]'], 'Display status of an application', () => {
            yargs
                .positional('application', {
                    describe: 'Application to display status for'
                })
                .positional('services', {
                    describe: 'Services to display status for, displays all if no services are specified',
                    array: true
                });
        })
        .command('top <application> [services..]', 'Display running processes of an application', () => {
            yargs
                .positional('application', {
                    describe: 'Application to display running processes'
                })
                .positional('services', {
                    describe: 'Services to display running processes for, displays all if no services are specified',
                    array: true
                });
        })
        .command('images <application> [services..]', 'Display images of an application', () => {
            yargs
                .positional('application', {
                    describe: 'Application to display images'
                })
                .positional('services', {
                    describe: 'Services to display images for, displays all if no services are specified',
                    array: true
                });
        })
        .command('logs <application> [services..]', 'Display logs of an application', () => {
            yargs
                .positional('application', {
                    describe: 'Application to display logs for'
                })
                .positional('services', {
                    describe: 'Services to display logs for, displays all if no services are specified',
                    array: true
                })
                .option('follow', {
                    alias: 'f',
                    describe: 'Follow log output'
                })
                .option('timestamps', {
                    alias: 't',
                    describe: 'Show timestamps'
                });
        })
        .demandCommand()
        .recommendCommands()
        .strict()
        .help()
        .wrap(120)
        .parse();

    // Handle command aliases
    const aliases = {
        'status': 'ps'
    };
    let command = argv._[0];
    if (aliases[command]) {
        command = aliases[command];
    }

    // Handle special arguments
    const applications = argv.application === 'all' ? applicationNames : [argv.application];

    // Handle commands
    switch (command) {
        case 'version': {
            console.log(`Version: ${packageInfo.version}`);
            break;
        }
        case 'list': {
            console.log('Applications:');
            console.log(applicationNames.join(', '));
            break;
        }
        case 'services': {
            const serviceNames = await getServiceNames(applicationNames);

            if (argv.application === 'all') {
                console.log('Applications:');
                console.log(applicationNames.join(', '));
                console.log();
            }

            console.log('Services:');
            console.log(serviceNames.join(', '));
            break;
        }
        case 'start': {
            let args = [];
            if (argv.services) {
                args = args.concat(argv.services as string[]);
            }

            await executeAction(applications, ['up', '-d'].concat(args));
            break;
        }
        case 'stop': {
            let args = [];
            if (argv.services) {
                args = args.concat(argv.services as string[]);
            }

            if (argv.services) {
                await executeAction(applications, ['rm', '-s', '-f'].concat(args));
            } else {
                await executeAction(applications, ['down'].concat(args));
            }
            break;
        }
        case 'restart': {
            let args = [];
            if (argv.services) {
                args = args.concat(argv.services as string[]);
            }

            if (argv.services) {
                await executeAction(applications, ['rm', '-s', '-f'].concat(args));
            } else {
                await executeAction(applications, ['down'].concat(args));
            }
            await executeAction(applications, ['up', '-d'].concat(args));
            break;
        }
        case 'update': {
            let args = [];
            if (argv.services) {
                args = args.concat(argv.services as string[]);
            }

            await executeAction(applications, ['pull'].concat(args));
            await executeAction(applications, ['up', '-d'].concat(args));
            break;
        }
        case 'ps':
        case 'top':
        case 'images': {
            let args: string[] = [command];
            if (argv.services) {
                args = args.concat(argv.services as string[]);
            }

            await executeAction(applications, args);
            break;
        }
        case 'logs': {
            let args = ['logs'];
            if (argv.follow) {
                args.push('-f');
            }
            if (argv.timestamps) {
                args.push('-t');
            }
            if (argv.services) {
                args = args.concat(argv.services as string[]);
            }

            await executeAction(applications, args);
            break;
        }
    }
})();
