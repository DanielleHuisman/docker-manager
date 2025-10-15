import {config} from './config';
import {app} from './server';

try {
    console.log('Starting Docker Manager...');

    // Start server
    app.listen(config.port, 'localhost', () => {
        console.log(`Server listening on http://localhost:${config.port}.`);
        console.log('Started Docker Manager.');
    });
} catch (err) {
    console.error('Failed to start Docker Manager:', err);
}
