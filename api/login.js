import Redis from 'ioredis';

const DEFAULT_USERS = {
  nella: { password: 'prime', role: 'admin' },
  maurepas: { password: 'frixxion', role: 'viewer' }
};

function getRedisClient() {
  // Priorité aux nouvelles variables créées (KV_URL, UPSTASH_REDIS_URL) au cas où une ancienne REDIS_URL traîne
  const url = process.env.KV_URL || process.env.UPSTASH_REDIS_URL || process.env.STORAGE_REDIS_URL || process.env.REDIS_URL;
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
  response.setHeader('Access-Control-Allow-Credentials', true);
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  response.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, password } = request.body || {};

    if (!username || !password) {
      return response.status(400).json({ error: 'Identifiant et mot de passe requis' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

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

    if (redisAvailable) {
      try {
        // Initialize default users and roles if not exists
        if (!(await redis.hexists('eva-user-roles', 'nella'))) {
          await redis.hset('eva-users', 'nella', 'prime');
          await redis.hset('eva-user-roles', 'nella', 'admin');
        }
        if (!(await redis.hexists('eva-users', 'maurepas'))) {
          await redis.hset('eva-users', 'maurepas', 'frixxion');
          await redis.hset('eva-user-roles', 'maurepas', 'viewer');
        }

        // Get the password from Redis
        const storedPassword = await redis.hget('eva-users', cleanUsername);

        if (storedPassword && storedPassword === cleanPassword) {
          const role = (await redis.hget('eva-user-roles', cleanUsername)) || 'viewer';
          return response.status(200).json({ success: true, role });
        } else {
          return response.status(401).json({ error: 'Identifiants incorrects' });
        }
      } catch (err) {
        console.error("Redis query error, falling back to built-in auth:", err.message);
      }
    }

    // Fallback authentication if Redis is asleep, missing, or down
    const defaultUser = DEFAULT_USERS[cleanUsername];
    if (defaultUser && defaultUser.password === cleanPassword) {
      return response.status(200).json({
        success: true,
        role: defaultUser.role,
        note: 'Authentifié avec secours local'
      });
    }

    return response.status(401).json({ error: 'Identifiants incorrects' });
  } catch (error) {
    console.error("Login API Error:", error);
    return response.status(500).json({ error: 'Erreur interne du serveur: ' + error.message });
  }
}
