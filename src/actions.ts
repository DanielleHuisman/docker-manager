import {executeAction} from './docker';

export const start = async (applications: string[], services: string[] = [], read: boolean = false) => {
    return await executeAction(applications, ['up', '-d'].concat(services), read, true);
};

export const stop = async (applications: string[], services: string[] = [], read: boolean = false) => {
    if (services.length === 0) {
        return await executeAction(applications, ['down'], read, true);
    } else {
        return await executeAction(applications, ['rm', '-s', '-f'].concat(services), read, true);
    }
};

export const restart = async (applications: string[], services: string[] = [], read: boolean = false) => {
    const code = await stop(applications, services, read);
    if (!read && typeof code === 'number' && code !== 0) {
        return code;
    }

    return await start(applications, services, read);
};

export const update = async (applications: string[], services: string[] = [], read: boolean = false) => {
    const code = await executeAction(applications, ['pull'].concat(services), read, false);
    if (!read && typeof code === 'number' && code !== 0) {
        return code;
    }

    return await start(applications, services, read);
};

export const actions = {
    start,
    stop,
    restart,
    update
};
