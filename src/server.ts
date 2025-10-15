import express, {type Request} from 'express';
import morgan from 'morgan';

import {update} from './actions';
import {isApplication, isService} from './docker';
import {getTokenByValue} from './manager';

const app = express();
app.disable('x-powered-by');
app.use(morgan('combined'));

const authorize = async (req: Request, applicationName: string) => {
    const authorization = req.get('authorization');
    if (!authorization || !authorization.startsWith('Bearer ')) {
        return false;
    }

    const token = await getTokenByValue(authorization.substring(7));
    if (!token) {
        return false;
    }

    if (!token.applications.includes(applicationName)) {
        return false;
    }

    return true;
};

app.post('/applications/:applicationName', async (req, res) => {
    const {applicationName} = req.params;

    if (!(await isApplication(applicationName))) {
        res.status(403);
        res.send(null);
        return;
    }

    if (!(await authorize(req, applicationName))) {
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

app.post('/applications/:applicationName/services/:serviceName', async (req, res) => {
    const {applicationName, serviceName} = req.params;

    if (!(await isApplication(applicationName)) || !(await isService(applicationName, serviceName))) {
        res.status(403);
        res.send(null);
        return;
    }

    if (!(await authorize(req, applicationName))) {
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
