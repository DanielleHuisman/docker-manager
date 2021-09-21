import {startServer, logger} from '@danielhuisman/koa-base';

import {config} from './config';
import {server} from './server';

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
