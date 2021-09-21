import {spawn, SpawnOptions} from 'child_process';
import {Dirent} from 'fs';
import path from 'path';

import {readdir, readFile} from 'fs-extra';
import yaml from 'yaml';

import {config} from './config';

export const getApplicationNames = async () => {
    // Read application directory
    const result = await readdir(config.applications.path, {
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
    let serviceNames: string[] = [];

    for (const applicationName of applicationNames) {
        const data = yaml.parse(await readFile(path.resolve(config.applications.path, `${applicationName}.yml`), 'utf8'));

        if (data.services) {
            serviceNames = serviceNames.concat(Object.keys(data.services));
        }
    }

    return serviceNames;
};

export const execute = (
    command: string,
    args: string[],
    forwardInput: boolean = false,
    forwardOutput: boolean = true
): Promise<void> => new Promise((resolve, reject) => {
    const p = spawn(command, args, {
        stdio: [
            forwardInput ? process.stdin : null,
            forwardOutput ? process.stdout : null,
            forwardOutput ? process.stderr : null
        ]
    });
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

export const executeAction = async (applicationNames: string[], action: string | string[], read: boolean = false) => {
    const args = getFileArguments(applicationNames).concat(Array.isArray(action) ? action : [action]);

    if (read) {
        return await readProcess('docker-composer', args);
    } else {
        return await execute('docker-compose', args, false);
    }
};

export const readProcess = (command: string, args: string[] = [], options: SpawnOptions = {}): Promise<string[]> =>
    new Promise((fulfill, reject) => {
        let lines: string[] = [];
        const p = spawn(command, args, options);

        p.stdout?.on('data', (buffer) => {
            const line = buffer.toString('utf8') as string;
            lines = lines.concat(line.split('\n').map((s) => `[out] ${s}`));
        });

        p.stderr?.on('data', (buffer) => {
            const line = buffer.toString('utf8') as string;
            lines = lines.concat(line.split('\n').map((s) => `[err] ${s}`));
        });

        let fulfilled = false;
        const finish = () => {
            if (!fulfilled) {
                fulfilled = true;
                fulfill(lines);
            }
        };
        p.stdout?.on('close', finish);
        p.stderr?.on('close', finish);
        p.on('exit', finish);
        p.on('error', (err) => {
            return reject(err);
        });
    });

export const spawnProcess = (command: string, args: string[] = [], options: SpawnOptions = {}, readError: boolean = false): Promise<string[]> =>
    new Promise((fulfill, reject) => {
        let lines = [];
        const p = spawn(command, args, options);

        const socket = readError ? p.stderr : p.stdout;

        socket?.on('data', (buffer) => {
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
        socket?.on('close', finish);
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
