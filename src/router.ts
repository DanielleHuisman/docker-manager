import {DefaultState} from 'koa';
import {Context} from '@danielhuisman/koa-base';
import Router from 'koa-router';

import * as actions from './actions';
import {getApplicationNames, getServiceNames} from './docker';

const router = new Router<any, Context>();

router.get('/', async (ctx) => {
    // TODO: render sign in screen

    return ctx.redirect('/applications');
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

const checkNames: Router.IMiddleware<DefaultState, Context> = async (ctx, next) => {
    const {applicationName, serviceName} = ctx.params;

    const applicationNames = await getApplicationNames();
    if (applicationName !== 'all' && !applicationNames.includes(applicationName)) {
        return ctx.error(404, `Application not found`);
    }

    const serviceNames = await getServiceNames([applicationName]);
    if (serviceName !== 'all' && !serviceNames.includes(serviceName)) {
        return ctx.error(404, `Service not found`);
    }

    await next();
};

router.get('/applications/:applicationName/:serviceName', checkNames, async (ctx) => {
    const {applicationName, serviceName} = ctx.params;

    return ctx.render('service', {
        applicationName,
        serviceName
    });
});

router.post('/applications/:applicationName/:serviceName', checkNames, async (ctx) => {
    const {applicationName, serviceName} = ctx.params;
    const body = ctx.request.body;

    // Validate action
    if (!body.action || !actions[body.action]) {
        return ctx.error(400, `Unknown action "${body.action}"`);
    }

    // Execute action
    await actions[body.action]([applicationName], serviceName === 'all' ? undefined : [serviceName]);

    // Return to service page
    return ctx.redirect(`/applications/${applicationName}/${serviceName}`);
});

export default router;
