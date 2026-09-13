import { drizzle } from 'drizzle-orm/sqlite-proxy';
const db = drizzle((sql, params, method) => ({ rows: [] }));
try {
  const result = db.select().from({ t: { id: 'text', n: 'integer' } });
  console.log('test ok');
} catch (e) { console.log('err', e.message); }
