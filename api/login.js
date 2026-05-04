import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

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
    const { username, password } = request.body;

    if (!username || !password) {
      return response.status(400).json({ error: 'Identifiant et mot de passe requis' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    // Initialize default users and roles if not exists
    try {
      // Ensure nella is admin
      if (!(await redis.hexists('eva-user-roles', 'nella'))) {
        await redis.hset('eva-users', 'nella', 'prime');
        await redis.hset('eva-user-roles', 'nella', 'admin');
      }
      // Ensure maurepas is viewer
      if (!(await redis.hexists('eva-users', 'maurepas'))) {
        await redis.hset('eva-users', 'maurepas', 'frixxion');
        await redis.hset('eva-user-roles', 'maurepas', 'viewer');
      }
    } catch (e) {
      console.error("Redis Init Error:", e);
      return response.status(500).json({ error: "Erreur de base de données" });
    }

    // Get the password from Redis
    const storedPassword = await redis.hget('eva-users', cleanUsername);

    if (storedPassword && storedPassword === cleanPassword) {
      const role = await redis.hget('eva-user-roles', cleanUsername) || 'viewer';
      return response.status(200).json({ success: true, role });
    } else {
      return response.status(401).json({ error: 'Identifiants incorrects' });
    }
  } catch (error) {
    console.error("Login API Error:", error);
    return response.status(500).json({ error: 'Erreur interne du serveur: ' + error.message });
  }
}
