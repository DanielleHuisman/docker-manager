import {Context} from '@danielhuisman/koa-base';
import Router from 'koa-router';

import {getApplicationNames, getServiceNames} from './docker';

const router = new Router<any, Context>();

router.get('/', async (ctx) => {
    return ctx.render('index');
});

router.get('/applications', async (ctx) => {
    const applicationNames = await getApplicationNames();
    const serviceNames = {};

    for (const applicationName of applicationNames) {
        serviceNames[applicationName] = await getServiceNames([applicationName]);
    }

    return ctx.render('applications', {
        applicationNames,
        serviceNames
    });
});

export default router;
