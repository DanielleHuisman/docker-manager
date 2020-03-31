import {executeAction} from './docker';

export const start = async (applications: string[], services?: string[], read: boolean = false) => {
    let args = [];
    if (services) {
        args = args.concat(services);
    }

    await executeAction(applications, ['up', '-d'].concat(args), read);
};

export const stop = async (applications: string[], services?: string[], read: boolean = false) => {
    let args = [];
    if (services) {
        args = args.concat(services);
    }

    if (services) {
        await executeAction(applications, ['rm', '-s', '-f'].concat(args), read);
    } else {
        await executeAction(applications, ['down'].concat(args), read);
    }
};

export const restart = async (applications: string[], services?: string[], read: boolean = false) => {
    let args = [];
    if (services) {
        args = args.concat(services);
    }

    if (services) {
        await executeAction(applications, ['rm', '-s', '-f'].concat(args), read);
    } else {
        await executeAction(applications, ['down'].concat(args), read);
    }
    await executeAction(applications, ['up', '-d'].concat(args), read);
};

export const update = async (applications: string[], services?: string[], read: boolean = false) => {
    let args = [];
    if (services) {
        args = args.concat(services);
    }

    await executeAction(applications, ['pull'].concat(args), read);
    await executeAction(applications, ['up', '-d'].concat(args), read);
};
