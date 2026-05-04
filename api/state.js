import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export default async function handler(request, response) {
  // CORS Headers in case they call it from a different origin locally
  response.setHeader('Access-Control-Allow-Credentials', true);
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  response.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  if (request.method === 'GET') {
    try {
      const state = await redis.get('eva-manager-state');
      const parsedState = state ? JSON.parse(state) : {};
      return response.status(200).json(parsedState);
    } catch (error) {
      console.error("KV GET Error:", error);
      return response.status(500).json({ error: 'Failed to read state' });
    }
  }

  if (request.method === 'POST') {
    try {
      const newState = request.body;
      await redis.set('eva-manager-state', JSON.stringify(newState));
      return response.status(200).json({ success: true });
    } catch (error) {
      console.error("KV SET Error:", error);
      return response.status(500).json({ error: 'Failed to save state' });
    }
  }

  return response.status(405).json({ error: 'Method not allowed' });
}
