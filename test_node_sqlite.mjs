import { DatabaseSync } from 'node:sqlite';
const db = new DatabaseSync(':memory:');
db.exec("CREATE TABLE IF NOT EXISTS t (id text primary key, n integer not null default 0)");
db.exec("INSERT INTO t(id) values ('a')");
const rows = db.prepare("SELECT id, n FROM t").all();
console.log('rows=', JSON.stringify(rows));
console.log('ok');
