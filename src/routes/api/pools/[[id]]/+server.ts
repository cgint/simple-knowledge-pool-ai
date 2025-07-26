import type { RequestEvent } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const poolsFilePath = path.join(process.cwd(), 'data', 'pools.json');

interface Pool {
  id: string;
  name: string;
  files: string[];
}

async function getPools(): Promise<Pool[]> {
  try {
    const data = await readFile(poolsFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // If the file doesn't exist, return an empty array
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function savePools(pools: Pool[]) {
  await writeFile(poolsFilePath, JSON.stringify(pools, null, 2));
}

// GET /api/pools - Get all pools
// GET /api/pools/[id] - Get a single pool
export async function GET({ params }: RequestEvent) {
  const pools = await getPools();
  if (params.id) {
    const pool = pools.find(p => p.id === params.id);
    if (pool) {
      return json(pool);
    } else {
      return json({ message: 'Pool not found' }, { status: 404 });
    }
  }
  return json(pools);
}

// POST /api/pools - Create a new pool
export async function POST({ request }: RequestEvent) {
  const { name, files } = await request.json();

  if (!name || !files || !Array.isArray(files)) {
    return json({ message: 'Invalid request body' }, { status: 400 });
  }

  const pools = await getPools();
  const newPool: Pool = {
    id: uuidv4(),
    name,
    files,
  };

  pools.push(newPool);
  await savePools(pools);

  return json(newPool, { status: 201 });
}
