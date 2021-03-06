import { read } from 'fs-jetpack';
import { and, equals } from 'arql-ops';

import { SolarweaveConfig, arweave } from '../Config';
import { ArweaveTransaction } from '../interface/Arweave.interface';
import { Log } from '../util/Log.util';
import { CompressBlock, DecompressBlock } from '../service/Compression.service';

export async function LoadWallet() {
    const key = JSON.parse(read(SolarweaveConfig.credentials));
    return key;
}

export async function GetBalance() {
    const key = await LoadWallet();

    const address = await arweave.wallets.jwkToAddress(key);
    const balance = await arweave.wallets.getBalance(address);

    return { address, balance };
}

export async function SubmitBlockToArweave(transaction: ArweaveTransaction) {
    const key = await LoadWallet();
    const data = SolarweaveConfig.compressed ? await CompressBlock(JSON.stringify(transaction.payload)) : JSON.stringify(transaction.payload);

    let tx = await arweave.createTransaction({ data }, key);

    tx.addTag('database', transaction.tags.database);

    tx.addTag('parentSlot', transaction.tags.parentSlot);
    tx.addTag('slot', transaction.tags.slot);
    tx.addTag('blockhash', transaction.tags.blockhash);
    tx.addTag('compressed', SolarweaveConfig.compressed ? 'true' : 'false');

    for (let i = 0; i < transaction.tags.transactions.length; i++) {
        const solTx = transaction.tags.transactions[i];

        tx.addTag(`tx-${i}-numReadonlySignedAccounts`, solTx.numReadonlySignedAccounts.toString());
        tx.addTag(`tx-${i}-numReadonlyUnsignedAccounts`, solTx.numReadonlyUnsignedAccounts.toString());
        tx.addTag(`tx-${i}-numRequiredSignatures`, solTx.numRequiredSignatures.toString());
    
        for (let ii = 0; ii < solTx.signatures.length; ii++) {
            tx.addTag(`tx-${i}-signature-${ii}`, solTx.signatures[ii]);
        }
    
        for (let ii = 0; ii < solTx.accountKeys.length; ii++) {
            tx.addTag(`tx-${i}-accountKey-${ii}`, solTx.accountKeys[ii]);
        }
        
        for (let ii = 0; ii < solTx.programIdIndex.length; ii++) {
            tx.addTag(`tx-${i}-programIdIndex-${ii}`, solTx.programIdIndex[ii].toString());
        }
    } 

    tx = await CreateBlockIndices(key, tx, transaction);

    await arweave.transactions.sign(tx, key);
    await arweave.transactions.post(tx);

    Log(`Transmitted Solana Block to Arweave with Parent Slot `.green + `#${transaction.tags.parentSlot}`.green.bold);
    Log(`Solana Block Hash: `.green + `${transaction.tags.blockhash}\n`.green.bold);

    return true;
}

export async function CreateBlockIndices(key, tx, transaction: ArweaveTransaction) {
    const blockhash = transaction.tags.blockhash;
    const signatures = [];
    const accountKeys = [];

    for (let i = 0; i < transaction.tags.transactions.length; i++) {
        const solTx = transaction.tags.transactions[i];

        for (let ii = 0; ii < solTx.signatures.length; ii++) {
            if (signatures.indexOf(solTx.signatures[ii]) === -1) {
                signatures.push(solTx.signatures[ii]);
            }
        }
    
        for (let ii = 0; ii < solTx.accountKeys.length; ii++) {
            if (accountKeys.indexOf(solTx.accountKeys[ii]) === -1) {
                accountKeys.push(solTx.accountKeys[ii]);
            }
        }
    }

    for (let i = 0; i < signatures.length; i++) {
        tx.addTag('database', `${transaction.tags.database}-index`);
        tx.addTag('signature', signatures[i]);
    }

    for (let i = 0; i < accountKeys.length; i++) {
        tx.addTag('database', `${transaction.tags.database}-index`);
        tx.addTag('accountKey', accountKeys[i]);
    }

    return tx;
}

export async function RetrieveBlockBySlot(slot: number) {
    const txs = await arweave.arql(
        and(
            equals('database', SolarweaveConfig.database),
            equals('slot', slot.toString()),
        ),
    );
    
    if (txs.length > 0) {
        const data = await arweave.transactions.getData(txs[0], { decode: true, string: true });

        let isBase64 = false;
        let payload = null;

        try {
            payload = JSON.parse(data.toString());
        } catch (error) {
            isBase64 = true;
        }

        if (isBase64) {
            payload = await DecompressBlock(data.toString());
        }

        return payload;
    } else {
        return null;
    }
}

export async function RetrieveBlockByBlockhash(blockhash: string) {
    const txs = await arweave.arql(
        and(
            equals('database', SolarweaveConfig.database),
            equals('blockhash', blockhash),
        ),
    );

    if (txs.length > 0) {
        const data = await arweave.transactions.getData(txs[0], { decode: true, string: true });

        let isBase64 = false;
        let payload = null;

        try {
            payload = JSON.parse(data.toString());
        } catch (error) {
            isBase64 = true;
        }

        if (isBase64) {
            payload = await DecompressBlock(data.toString());
        }

        return payload;
    } else {
        return null;
    }
}