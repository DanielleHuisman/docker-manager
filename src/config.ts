import path from 'path';

const staticPath = process.env.STATIC_PATH ? path.resolve(process.env.STATIC_PATH) : path.join(__dirname, '..', 'static');
const staticExternalUrl = process.env.STATIC_EXTERNAL_URL || 'http://localhost:5000/static';

export const config = {
    port: parseInt(process.env.PORT ?? '', 10) || 5000,
    externalUrl: process.env.EXTERNAL_URL || 'http://localhost:5000',

    session: {
        secret: process.env.SESSION_SECRET || 'superSecretSessionSecret'
    },

    static: {
        serve: process.env.STATIC_SERVE !== 'false',
        maxAge: parseInt(process.env.STATIC_MAX_AGE ?? '', 10) || 30 * 24 * 60 * 60,
        externalUrl: staticExternalUrl,
        path: staticPath
    },

    applications: {
        path: path.resolve(process.env.APPLICATIONS_PATH || '/srv/docker')
    }
};
