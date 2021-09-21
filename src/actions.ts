import {executeAction} from './docker';

export const start = async (applications: string[], services: string[] = [], read: boolean = false) => {
    await executeAction(applications, ['up', '-d'].concat(services), read);
};

export const stop = async (applications: string[], services: string[] = [], read: boolean = false) => {
    if (services.length === 0) {
        await executeAction(applications, ['down'], read);
    } else {
        await executeAction(applications, ['rm', '-s', '-f'].concat(services), read);
    }
};

export const restart = async (applications: string[], services: string[] = [], read: boolean = false) => {
    if (services.length === 0) {
        await executeAction(applications, ['down'], read);
    } else {
        await executeAction(applications, ['rm', '-s', '-f'].concat(services), read);
    }
    await executeAction(applications, ['up', '-d'].concat(services), read);
};

export const update = async (applications: string[], services: string[] = [], read: boolean = false) => {
    await executeAction(applications, ['pull'].concat(services), read);
    await executeAction(applications, ['up', '-d'].concat(services), read);
};

export const actions = {
    start,
    stop,
    restart,
    update
};
