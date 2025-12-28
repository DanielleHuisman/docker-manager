import {exists} from 'fs-extra';
import {type SpawnOptions, spawn} from 'node:child_process';
import {readFile, readdir} from 'node:fs/promises';
import path from 'node:path';
import yaml from 'yaml';

import {config} from './config.js';

export const getApplicationNames = async () => {
    // Read application directory
    const result = await readdir(config.applications.path, {
        withFileTypes: true
    });

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
        const data = yaml.parse(
            await readFile(path.resolve(config.applications.path, `${applicationName}.yml`), 'utf8')
        ) as Record<string, unknown>;

        if (data.services) {
            serviceNames = serviceNames.concat(Object.keys(data.services));
        }
    }

    return serviceNames;
};

export const isApplication = async (applicationName: string) =>
    applicationName !== 'common' && (await exists(path.resolve(config.applications.path, `${applicationName}.yml`)));

export const isService = async (applicationName: string, serviceName: string) => {
    const serviceNames = await getServiceNames([applicationName]);
    return serviceNames.includes(serviceName);
};

export const execute = (
    command: string,
    args: string[],
    forwardInput = false,
    forwardOutput = true,
    filterOutput = true
): Promise<number | null> =>
    new Promise((resolve, reject) => {
        try {
            const p = spawn(command, args, {
                stdio: [
                    forwardInput ? process.stdin : 'ignore',
                    forwardOutput ? (filterOutput ? 'pipe' : process.stdout) : 'ignore',
                    forwardOutput ? (filterOutput ? 'pipe' : process.stdout) : 'ignore'
                ]
            });

            if (filterOutput) {
                p.stdout?.setEncoding('utf-8');
                p.stdout?.on('data', (data: string) => {
                    if (!data.includes('Found orphan containers')) {
                        process.stdout.write(data);
                    }
                });
                p.stderr?.setEncoding('utf-8');
                p.stderr?.on('data', (data: string) => {
                    if (!data.includes('Found orphan containers')) {
                        process.stderr.write(data);
                    }
                });
            }

            p.on('exit', (code) => {
                resolve(code);
            });
            p.on('error', (err) => {
                reject(err);
            });
        } catch (err) {
            console.error(err);
        }
    });

export const getFileArguments = (applicationNames: string[]) =>
    ['common']
        .concat(applicationNames)
        .flatMap((applicationName) => ['-f', path.resolve(config.applications.path, `${applicationName}.yml`)]);

export const executeAction = async (
    applicationNames: string[],
    action: string | string[],
    read = false,
    filterOutput = false
) => {
    const args = ['compose'].concat(
        getFileArguments(applicationNames).concat(Array.isArray(action) ? action : [action])
    );

    if (read) {
        return await readProcess('docker', args);
    } else {
        return await execute('docker', args, false, true, filterOutput);
    }
};

export const readProcess = (command: string, args: string[] = [], options: SpawnOptions = {}): Promise<string[]> =>
    new Promise((fulfill, reject) => {
        let lines: string[] = [];
        const p = spawn(command, args, options);

        p.stdout?.on('data', (buffer) => {
            const line = (buffer as Buffer).toString('utf8');
            lines = lines.concat(line.split('\n').map((s) => `[out] ${s}`));
        });

        p.stderr?.on('data', (buffer) => {
            const line = (buffer as Buffer).toString('utf8');
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
            reject(err);
        });
    });

export const spawnProcess = (
    command: string,
    args: string[] = [],
    options: SpawnOptions = {},
    readError = false
): Promise<string[]> =>
    new Promise((fulfill, reject) => {
        let lines: string[] = [];
        const p = spawn(command, args, options);

        const socket = readError ? p.stderr : p.stdout;

        socket?.on('data', (buffer) => {
            const line = (buffer as Buffer).toString('utf8');
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
            reject(err);
        });
    });

export const getContainerId = async (applicationName: string, serviceName: string) => {
    const args = ['compose'].concat(getFileArguments([applicationName]).concat(['ps', '-q', serviceName]));

    const output = await spawnProcess('docker', args);

    return output[0] as string;
};
