import {exists, mkdirs, readFile, writeFile} from 'fs-extra';
import path from 'path';
import {z} from 'zod';

import {config} from './config';

const tokenSchema = z.object({
    name: z.string(),
    value: z.string(),
    applications: z.array(z.string())
});

const dataSchema = z.object({
    tokens: z.array(tokenSchema)
});

type Data = z.infer<typeof dataSchema>;
type Token = z.infer<typeof tokenSchema>;

const getDataPath = () => path.resolve(config.manager.path, 'data.json');

const readData = async () => {
    const dataPath = getDataPath();

    if (!(await exists(dataPath))) {
        await writeData({
            tokens: []
        });
    }

    return dataSchema.parse(JSON.parse(await readFile(dataPath, 'utf-8')));
};

const writeData = async (data: Data) => {
    const dataPath = getDataPath();

    await mkdirs(path.dirname(dataPath));
    await writeFile(dataPath, JSON.stringify(data, null, 4));
};

export const getTokens = async () => {
    const data = await readData();

    return data.tokens;
};

export const getToken = async (tokenName: string) => {
    const data = await readData();

    return data.tokens.find((token) => token.name === tokenName);
};

export const getTokenByValue = async (value: string) => {
    const data = await readData();

    return data.tokens.find((token) => token.value === value);
};

export const createToken = async (token: Token) => {
    const data = await readData();

    data.tokens.push(token);

    await writeData(data);

    return token;
};

export const deleteToken = async (tokenName: string) => {
    const data = await readData();

    data.tokens = data.tokens.filter((token) => token.name !== tokenName);

    await writeData(data);
};
