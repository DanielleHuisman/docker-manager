import {createServer} from '@daniellehuisman/koa-base';
import KoaPug from 'koa-pug';
import moment from 'moment';
import path from 'path';

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

export {server, app};
