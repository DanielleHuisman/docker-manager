import path from 'path';

export const config = {
    manager: {
        path: path.resolve(process.env.MANAGER_PATH ?? '/srv/docker-manager')
    },

    applications: {
        path: path.resolve(process.env.APPLICATIONS_PATH ?? '/srv/docker')
    }
};
