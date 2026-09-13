import { DatabaseSync } from 'node:sqlite';
const db = new DatabaseSync(':memory:');
db.exec('CREATE TABLE t (id text primary key, n integer)');
db.exec('INSERT INTO t values (?, ?)', ['a', 1]);
const rows = db.prepare('SELECT id, n FROM t').all();
console.log('rows', JSON.stringify(rows));
console.log('ok');
