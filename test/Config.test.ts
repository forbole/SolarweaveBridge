import { equal } from 'assert';
import { arweave, SolarweaveConfig, UpdateConfig } from '../src/Config';

describe('Config Tests', () => {
    it('Should have a valid Arweave Object', () => {
        equal(arweave !== null, true);
    });

    it('Verify the contents of Solarweave Config', () => {
        equal(SolarweaveConfig.rpc_version, '2.0');
        equal(SolarweaveConfig.database, 'solarweave-devnet');
        equal(SolarweaveConfig.url, 'https://devnet.solana.com');
        equal(SolarweaveConfig.credentials, '.arweave.creds.json');
        equal(SolarweaveConfig.local, false);
        equal(SolarweaveConfig.localFile, 'solarweave.cache.json');
        equal(SolarweaveConfig.console, true);
        equal(SolarweaveConfig.compressed, true);
        equal(SolarweaveConfig.parallelize, 1);
        equal(SolarweaveConfig.benchmark, false);
        equal(SolarweaveConfig.verify, true);
    });

    it('Should be able to update the Solarweave Config', () => {
        UpdateConfig(
            '2.0',
            'solarweave-devnet',
            'https://devnet.solana.com',
            '.arweave.creds.json',
            false,
            'solarweave.cache.json',
            true,
            true,
            1,
            false,
            true
        );
    });
});