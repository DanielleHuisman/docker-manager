import path from 'path';

export const config = {
    port: parseInt(process.env.PORT ?? '', 10) || 3000,

    manager: {
        path: path.resolve(process.env.MANAGER_PATH || '/srv/docker-manager')
    },

    applications: {
        path: path.resolve(process.env.APPLICATIONS_PATH || '/srv/docker')
    }
};
