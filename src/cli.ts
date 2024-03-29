import {copy, ensureDir, pathExists, remove} from 'fs-extra';
import path from 'path';
import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';

import {restart, start, stop, update} from './actions';
import {config} from './config';
import {execute, executeAction, getApplicationNames, getContainerId, getServiceNames} from './docker';

// eslint-disable-next-line @typescript-eslint/no-floating-promises
(async () => {
    console.log('Docker Manager CLI');
    console.log();

    // Ensure the application directory exists
    try {
        await ensureDir(config.applications.path);
    } catch (err) {
        console.error(
            `The application directory (${config.applications.path}) does not exist and could not be created.`
        );
        yargs.exit(1, err as Error);
    }

    // Find applications
    const applicationNames = await getApplicationNames();

    // Hack to pass remaining arguments to exec command
    let normalArguments: string[] = hideBin(process.argv);
    let execArguments: string[] = [];
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
    const argv = await yargs
        .scriptName('docker-manager')
        .choices('application', applicationNames.concat('all'))
        .command('install', 'Install systemd service')
        .command('uninstall', 'Uninstall systemd service')
        .command('list', 'Lists applications')
        .command('services <application>', 'List services of an application', () => {
            yargs.positional('application', {
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
        .command(
            ['status <application> [services..]', 'ps <application> [services..]'],
            'Display status of an application',
            () => {
                yargs
                    .positional('application', {
                        describe: 'Application to display status for'
                    })
                    .positional('services', {
                        describe: 'Services to display status for, displays all if no services are specified',
                        array: true
                    });
            }
        )
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
                .option('color', {
                    describe: 'Produce colored output',
                    default: true,
                    hidden: true
                })
                .option('no-color', {
                    describe: 'Produce monochrome output'
                })
                .option('log-prefix', {
                    describe: 'Print prefix in logs',
                    default: true,
                    hidden: true
                })
                .option('no-log-prefix', {
                    describe: "Don't print prefix in logs"
                })
                .option('tail', {
                    describe: 'Number of lines to show from the end of the logs for each container',
                    number: true
                })
                .option('timestamps', {
                    alias: 't',
                    describe: 'Show timestamps'
                });
        })
        .command(
            'exec <application> <service> <command> [arguments..]',
            'Execute a command in the container of a service',
            () => {
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
            }
        )
        .demandCommand()
        .recommendCommands()
        .strict()
        .help()
        .wrap(120)
        .parse(normalArguments);

    // Handle command aliases
    const aliases = {
        status: 'ps'
    };
    let command = argv._[0];
    if (aliases[command]) {
        command = aliases[command] as string;
    }

    // Handle special arguments
    const isAll = argv.application === 'all';
    const applications = isAll ? applicationNames : [argv.application as string];

    // Handle commands
    switch (command) {
        case 'install': {
            const paths = ['/usr/bin/docker-manager', '/usr/local/bin/docker-manager'];

            // Find location of docker-manager
            let location: string | null = null;
            for (const p of paths) {
                if (await pathExists(p)) {
                    location = p;
                    break;
                }
            }
            if (!location) {
                const message = 'Unable to locate docker-manager location, should be in /usr/bin or /usr/local/bin.';
                console.error(message);
                yargs.exit(1, new Error(message));
                return;
            }

            // Copy systemd service file, enable it and start it
            await copy(
                path.join(__dirname, '..', 'systemd', 'docker-manager.service'),
                '/etc/systemd/system/docker-manager.service'
            );
            await execute('sed', [
                '-i',
                `s|/usr/local/bin/docker-manager|${location}|`,
                '/etc/systemd/system/docker-manager.service'
            ]);
            console.log('Installed docker-manager service to /etc/systemd/system/docker-manager.service');
            await execute('systemctl', ['enable', 'docker-manager']);
            console.log('Enabled docker-manager service');
            await execute('systemctl', ['start', 'docker-manager']);
            console.log('Started docker-manager service');
            break;
        }
        case 'uninstall': {
            if (!(await pathExists('/etc/systemd/system/docker-manager.service'))) {
                const message = 'No systemd service is installed for docker-manager.';
                console.error(message);
                yargs.exit(1, new Error(message));
                return;
            }

            await execute('systemctl', ['stop', 'docker-manager']);
            console.log('Stopped docker-manager service');
            await execute('systemctl', ['disable', 'docker-manager']);
            console.log('Disabled docker-manager service');
            await remove('/etc/systemd/system/docker-manager.service');
            console.log('Unstalled docker-manager service from /etc/systemd/system/docker-manager.service');
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
            await start(applications, argv.services as string[]);
            break;
        }
        case 'stop': {
            const services = argv.services as string[];
            const serviceNames = await getServiceNames(applications);

            await stop(applications, services.length === 0 && !isAll ? serviceNames : services);
            break;
        }
        case 'restart': {
            const services = argv.services as string[];
            const serviceNames = await getServiceNames(applications);

            await restart(applications, services.length === 0 && !isAll ? serviceNames : services);
            break;
        }
        case 'update': {
            await update(applications, argv.services as string[]);
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
            if (!argv.color) {
                args.push('--no-color');
            }
            if (!argv['log-prefix']) {
                args.push('--no-log-prefix');
            }
            if (argv.tail !== undefined && !isNaN(argv.tail as number)) {
                args.push('--tail');
                args.push((argv.tail as number).toString());
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
                const message = 'Please provide a specific application name';
                console.error(message);
                yargs.exit(1, new Error(message));
                return;
            }

            const application = applications[0];
            const service = argv.service as string;

            // Validate service name
            const serviceNames = await getServiceNames(applications);
            if (!serviceNames.includes(service)) {
                const message = `Please provide a correct service name, choices:\n${serviceNames.join(', ')}`;
                console.error(message);
                yargs.exit(1, new Error(message));
                return;
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
            args = args.concat([containerId, argv.command as string]).concat(execArguments);

            // Execute the specified command using Docker
            await execute('docker', args, true, true, false);
        }
    }
})();
