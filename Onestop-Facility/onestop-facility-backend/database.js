const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const DB_FILE = process.env.DB_FILE || path.join(__dirname, "database.sqlite");
const SCHEMA_FILE = path.join(__dirname, "schema.sql");

const db = new sqlite3.Database(DB_FILE, (error) => {
  if (error) {
    console.error("SQLite 연결 실패:", error.message);
  }
});

db.serialize(() => {
  db.run("PRAGMA foreign_keys = ON");
});

function exec(sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      if (error) {
        reject(error);
        return;
      }

      resolve({
        id: this.lastID,
        changes: this.changes,
      });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) reject(error);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) reject(error);
      else resolve(rows);
    });
  });
}

async function initDatabase() {
  const schema = fs.readFileSync(SCHEMA_FILE, "utf8");
  await exec(schema);
}

function closeDatabase() {
  return new Promise((resolve, reject) => {
    db.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

module.exports = {
  db,
  DB_FILE,
  initDatabase,
  closeDatabase,
  exec,
  run,
  get,
  all,
};
