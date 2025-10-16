import express from 'express';
import morgan from 'morgan';

import {update} from './actions';
import {isApplication, isService} from './docker';
import {getTokenByValue} from './manager';

const app = express();
app.disable('x-powered-by');
app.use(morgan('combined'));

const authorize = async (applicationName: string, tokenValue: string) => {
    const token = await getTokenByValue(tokenValue);
    if (!token) {
        return false;
    }

    if (!token.applications.includes(applicationName)) {
        return false;
    }

    return true;
};

app.post('/applications/:applicationName/:tokenValue', async (req, res) => {
    const {applicationName, tokenValue} = req.params;

    if (!(await isApplication(applicationName))) {
        res.status(403);
        res.send(null);
        return;
    }

    if (!(await authorize(applicationName, tokenValue))) {
        res.status(403);
        res.send(null);
        return;
    }

    const code = await update([applicationName]);
    if (typeof code !== 'number' || code !== 0) {
        res.status(500);
        res.send(null);
        return;
    }

    res.status(204);
    res.send(null);
});

app.post('/applications/:applicationName/services/:serviceName/:tokenValue', async (req, res) => {
    const {applicationName, serviceName, tokenValue} = req.params;

    if (!(await isApplication(applicationName)) || !(await isService(applicationName, serviceName))) {
        res.status(403);
        res.send(null);
        return;
    }

    if (!(await authorize(applicationName, tokenValue))) {
        res.status(403);
        res.send(null);
        return;
    }

    const code = await update([applicationName], [serviceName]);
    if (typeof code !== 'number' || code !== 0) {
        res.status(500);
        res.send(null);
        return;
    }

    res.status(204);
    res.send(null);
});

app.use((_req, res) => {
    res.status(403);
    res.send(null);
});

export {app};
