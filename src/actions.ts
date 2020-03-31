import {executeAction} from './docker';

export const start = async (applications: string[], services?: string[], silent: boolean = false) => {
    let args = [];
    if (services) {
        args = args.concat(services);
    }

    await executeAction(applications, ['up', '-d'].concat(args), silent);
};

export const stop = async (applications: string[], services?: string[], silent: boolean = false) => {
    let args = [];
    if (services) {
        args = args.concat(services);
    }

    if (services) {
        await executeAction(applications, ['rm', '-s', '-f'].concat(args), silent);
    } else {
        await executeAction(applications, ['down'].concat(args), silent);
    }
};

export const restart = async (applications: string[], services?: string[], silent: boolean = false) => {
    let args = [];
    if (services) {
        args = args.concat(services);
    }

    if (services) {
        await executeAction(applications, ['rm', '-s', '-f'].concat(args), silent);
    } else {
        await executeAction(applications, ['down'].concat(args), silent);
    }
    await executeAction(applications, ['up', '-d'].concat(args), silent);
};

export const update = async (applications: string[], services?: string[], silent: boolean = false) => {
    let args = [];
    if (services) {
        args = args.concat(services);
    }

    await executeAction(applications, ['pull'].concat(args), silent);
    await executeAction(applications, ['up', '-d'].concat(args), silent);
};
