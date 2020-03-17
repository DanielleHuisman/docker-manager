import {Context} from '@danielhuisman/koa-base';
import Router from 'koa-router';

const router = new Router<any, Context>();

router.get('/', async (ctx) => {
    return ctx.render('index');
});

export default router;
