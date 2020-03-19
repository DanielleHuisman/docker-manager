#!/usr/bin/env node

import {ensureDir} from 'fs-extra';
import yargs from 'yargs';
import {getProcessArgvWithoutBin} from 'yargs/lib/process-argv';

import config from './config';
import {getApplicationNames, getServiceNames, execute, executeAction, getContainerId} from './docker';

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

    // Hack to pass remaining arguments to exec command
    let normalArguments: string[] = getProcessArgvWithoutBin();
    let execArguments = [];
    if (normalArguments.length > 0 && normalArguments[0].toLowerCase() === 'exec') {
        let requiredArgs = 0;
        let i = 1;
        for (; i < normalArguments.length; i++) {
            const arg = normalArguments[i];

            // Skip argument of allowed flags
            if (['-u', '--user', '-e', '--env'].includes(arg.toLowerCase())) {
                i++;
            } else {
                requiredArgs++;
            }

            if (requiredArgs === 4) {
                break;
            }
        }
        execArguments = normalArguments.splice(i);
        normalArguments = normalArguments.slice(0, i);
    }

    // Parse arguments
    const argv = yargs
        .scriptName('docker-manager')
        .choices('application', applicationNames.concat('all'))
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
        .command('update <application> [services..]', 'Update an application', () => {
            yargs
                .positional('application', {
                    describe: 'Application to update or "all" to update all applications'
                })
                .positional('services', {
                    describe: 'Services to update, updates all if no services are specified',
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
        .command('exec <application> <service> <command> [arguments..]', 'Execute a command in the container of a service', () => {
            yargs
                .positional('application', {
                    describe: 'Application of the service'
                })
                .positional('service', {
                    describe: 'Service of the container to execute the command in'
                })
                .positional('command', {
                    describe: 'Command to execute'
                })
                .positional('arguments', {
                    describe: 'Arguments for the command to execute',
                    list: true
                })
                .option('user', {
                    alias: 'u',
                    describe: 'Username of UID (format: <name|uid>[:<group|gid>])'
                })
                .option('env', {
                    alias: 'e',
                    describe: 'Set environment variables',
                    list: true
                });
        })
        .demandCommand()
        .recommendCommands()
        .strict()
        .help()
        .wrap(120)
        .parse(normalArguments);

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
        case 'exec': {
            // Validate application name
            if (applications.length > 1) {
                console.error('Please provide a specific application name');
                yargs.exit(1, null);
            }

            const application = applications[0];
            const service = argv.service as string;

            // Validate service name
            const serviceNames = await getServiceNames(applications);
            if (!serviceNames.includes(service)) {
                console.error('Please provide a correct service name, choices:');
                console.error(serviceNames.join(', '));
                yargs.exit(1, null);
            }

            // Find Docker container ID
            const containerId = await getContainerId(application, service);

            // Construct Docker arguments
            let args = ['exec', '-i', '-t'];
            if (argv.user) {
                args = args.concat(['-u', argv.user as string]);
            }
            if (argv.env) {
                if (Array.isArray(argv.env)) {
                    for (const arg of argv.env as string[]) {
                        args = args.concat(['-e', arg]);
                    }
                } else {
                    args = args.concat(['-e', argv.env as string]);
                }
            }
            args = args
                .concat([containerId, argv.command as string])
                .concat(execArguments);

            // Execute the specified command using Docker
            await execute('docker', args, true);
        }
    }
})();
