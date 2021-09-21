import path from 'path';

import {createServer} from '@danielhuisman/koa-base';
import {KoaPug} from 'koa-pug';
import moment from 'moment';

import {config} from './config';
import {router} from './router';

const {server, app} = createServer(config);

// Initialize Pug middleware
const pug = new KoaPug({
    viewPath: path.join(__dirname, 'views'),
    locals: {
        moment
    }
});
// @ts-expect-error: KoaPug's Koa has no State or Context type parameters
pug.use(app);

// Add dynamic Pug locals
app.use(async (ctx, next) => {
    pug.locals.currentUrl = ctx.url;
    await next();
});

// Add router
app.use(router.routes());
app.use(router.allowedMethods());

// Handle unknown routes
app.use(async (ctx, next) => {
    ctx.error(404, 'Not found');
    await next();
});

export {
    server,
    app
};
