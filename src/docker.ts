import {spawn, SpawnOptions} from 'child_process';
import {Dirent} from 'fs';
import {readdir, readFile} from 'fs-extra';
import path from 'path';
import yaml from 'yaml';

import config from './config';

export const getApplicationNames = async () => {
    // Read application directory
    const result = await readdir(config.applications.path, {
        // @ts-ignore
        withFileTypes: true
    }) as Dirent[];

    // Filter by application files
    const applicationNames = result
        .filter((dirent) => dirent.isFile() && dirent.name.endsWith('.yml'))
        .map((dirent) => dirent.name.substring(0, dirent.name.length - 4))
        .filter((application) => application !== 'common');

    return applicationNames;
};

export const getServiceNames = async (applicationNames: string[]) => {
    let serviceNames = [];

    for (const applicationName of applicationNames) {
        const data = yaml.parse(await readFile(path.resolve(config.applications.path, `${applicationName}.yml`), 'utf8'));

        if (data.services) {
            serviceNames = serviceNames.concat(Object.keys(data.services));
        }
    }

    return serviceNames;
};

export const execute = (command: string, args: string[], forwardInput: boolean = false): Promise<void> => new Promise((resolve, reject) => {
    const p = spawn(command, args, {
        stdio: [forwardInput ? process.stdin : null, process.stdout, process.stderr]
    });
    // if (forwardInput) {
    //     process.stdin.pipe(p.stdin);
    // }
    // p.stdout.pipe(process.stdout);
    // p.stderr.pipe(process.stderr);
    p.on('exit', () => {
        resolve();
    });
    p.on('error', (err) => {
        reject(err);
    });
});

export const getFileArguments = (applicationNames: string[]) => ['common']
    .concat(applicationNames)
    .flatMap((applicationName) => ['-f', path.resolve(config.applications.path, `${applicationName}.yml`)]);

export const executeAction = async (applicationNames: string[], action: string | string[], forwardInput: boolean = false) => {
    const args = getFileArguments(applicationNames).concat(Array.isArray(action) ? action : [action]);

    await execute('docker-compose', args, forwardInput);
};

export const spawnProcess = (command: string, args?: string[], options?: SpawnOptions, readError: boolean = false): Promise<string[]> =>
    new Promise((fulfill, reject) => {
        let lines = [];
        const p = spawn(command, args, options);

        const socket = readError ? p.stderr : p.stdout;

        socket.on('data', (buffer) => {
            const line = buffer.toString('utf8');
            lines = lines.concat(line.split('\n'));
        });

        let fulfilled = false;
        const finish = () => {
            if (!fulfilled) {
                fulfilled = true;
                fulfill(lines);
            }
        };
        socket.on('close', finish);
        p.on('exit', finish);
        p.on('error', (err) => {
            return reject(err);
        });
    });

export const getContainerId = async (applicationName: string, serviceName: string) => {
    const args = getFileArguments([applicationName]).concat(['ps', '-q', serviceName]);

    const output = await spawnProcess('docker-compose', args);

    return output[0];
};
