import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';

import {app} from './server';

void (async () => {
    try {
        const {host, port} = await yargs
            .scriptName('docker-manager-server')
            .option('host', {
                describe: 'Server host',
                default: 'localhost'
            })
            .option('port', {
                describe: 'Server port',
                default: 59247
            })
            .strict()
            .help()
            .wrap(120)
            .parse(hideBin(process.argv));

        console.log('Starting Docker Manager...');

        app.listen(port, host, () => {
            console.log(`Server listening on ${host}:${port}`);
            console.log('Started Docker Manager.');
        });
    } catch (err) {
        console.error('Failed to start Docker Manager:', err);
    }
})();
