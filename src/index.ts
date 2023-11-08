import {logger, startServer} from '@daniellehuisman/koa-base';

import {config} from './config';
import {server} from './server';

// eslint-disable-next-line @typescript-eslint/no-floating-promises
(async () => {
    try {
        logger.info('Starting Docker Manager...');

        // Start server
        await startServer(config, server);

        logger.info(`External HTTP URL: ${config.externalUrl}`);
        logger.info('Started Docker Manager.');
    } catch (err) {
        logger.error('Failed to start Docker Manager: ');
        logger.error(err);
    }
})();
