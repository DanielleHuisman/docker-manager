import {config} from './config';
import {app} from './server';

try {
    console.log('Starting Docker Manager...');

    // Start server
    app.listen(config.port, config.host, () => {
        console.log(`Server listening on: ${config.host}:${config.port}`);
        console.log('Started Docker Manager.');
    });
} catch (err) {
    console.error('Failed to start Docker Manager:', err);
}
