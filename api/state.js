import Redis from 'ioredis';

function getRedisClient() {
  const url = process.env.REDIS_URL || process.env.KV_URL || process.env.UPSTASH_REDIS_URL;
  if (!url) return null;
  try {
    return new Redis(url, {
      connectTimeout: 2000,
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      lazyConnect: true,
      retryStrategy: () => null
    });
  } catch (err) {
    console.error("Redis init failed:", err.message);
    return null;
  }
}

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

  const redis = getRedisClient();
  let redisAvailable = false;

  if (redis) {
    try {
      await Promise.race([
        redis.connect(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 2000))
      ]);
      redisAvailable = true;
    } catch (e) {
      console.warn("Redis connection failed or timed out:", e.message);
      try { redis.disconnect(); } catch (_) {}
    }
  }

  if (request.method === 'GET') {
    if (!redisAvailable) {
      return response.status(200).json({});
    }
    try {
      const state = await redis.get('eva-manager-state');
      const parsedState = state ? JSON.parse(state) : {};
      return response.status(200).json(parsedState);
    } catch (error) {
      console.warn("KV GET Error, fallback to empty:", error.message);
      return response.status(200).json({});
    }
  }

  if (request.method === 'POST') {
    if (!redisAvailable) {
      return response.status(200).json({ success: true, saved: false, reason: 'db_offline' });
    }
    try {
      const newState = request.body;
      await redis.set('eva-manager-state', JSON.stringify(newState));
      return response.status(200).json({ success: true, saved: true });
    } catch (error) {
      console.warn("KV SET Error:", error.message);
      return response.status(200).json({ success: true, saved: false, error: error.message });
    }
  }

  return response.status(405).json({ error: 'Method not allowed' });
}
