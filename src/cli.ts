#!/usr/bin/env node

import {ensureDir} from 'fs-extra';
import yargs from 'yargs';

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
        .command('list', 'Lists applications')
        .command('start <application>', 'Start an application', () => {
            yargs
                .positional('application', {
                    describe: 'Application to start or "all" to start all applications'
                });
        })
        .command('stop <application>', 'Stop an application', () => {
            yargs
                .positional('application', {
                    describe: 'Application to stop or "all" to stop all applications'
                });
        })
        .command('restart <application>', 'Restart an application', () => {
            yargs
                .positional('application', {
                    describe: 'Application to restart or "all" to restart all applications'
                });
        })
        .command(['status <application>', 'ps <application>'], 'Display status of an application', () => {
            yargs
                .positional('application', {
                    describe: 'Application to display status for'
                });
        })
        .command('services <application>', 'List services of an application', () => {
            yargs
                .positional('application', {
                    describe: 'Application to list services for'
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

    // Handle special arguments
    const applications = argv.application === 'all' ? applicationNames : [argv.application];

    // Handle commands
    switch (argv._[0]) {
        case 'list': {
            console.log('Applications:');
            console.log(applicationNames.join(', '));
            break;
        }
        case 'start': {
            await executeAction(applications, ['up', '-d']);
            break;
        }
        case 'stop': {
            await executeAction(applications, 'down');
            break;
        }
        case 'restart': {
            await executeAction(applications, 'down');
            await executeAction(applications, ['up', '-d']);
            break;
        }
        case 'update': {
            await executeAction(applications, 'pull');
            await executeAction(applications, ['up', '-d']);
            break;
        }
        case 'status':
        case 'ps': {
            await executeAction(applications, 'ps');
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
        case 'top': {
            let args = ['top'];
            if (argv.services) {
                args = args.concat(argv.services as string[]);
            }

            await executeAction(applications, args);
            break;
        }
        case 'images': {
            let args = ['images'];
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
