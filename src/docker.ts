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

export const execute = (command: string, args: string[], options?: SpawnOptions): Promise<void> => new Promise((resolve, reject) => {
    const p = spawn(command, args, options);
    p.stdout.pipe(process.stdout);
    p.stderr.pipe(process.stderr);
    p.on('exit', () => {
        resolve();
    });
    p.on('error', (err) => {
        reject(err);
    });
});

export const executeAction = async (applicationNames: string[], action: string | string[]) => {
    const fileArgs = ['common']
        .concat(applicationNames)
        .flatMap((applicationName) => ['-f', path.resolve(config.applications.path, `${applicationName}.yml`)]);

    const args = fileArgs.concat(Array.isArray(action) ? action : [action]);

    await execute('docker-compose', args);
};
