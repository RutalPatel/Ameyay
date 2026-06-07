const Datastore = require('@seald-io/nedb');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

function makeDB(name) {
  const store = new Datastore({ filename: path.join(dataDir, `${name}.db`), autoload: true });
  return {
    find:    (q, p)   => new Promise((res, rej) => p ? store.find(q, p, (e, d) => e ? rej(e) : res(d)) : store.find(q, (e, d) => e ? rej(e) : res(d))),
    findOne: (q, p)   => new Promise((res, rej) => p ? store.findOne(q, p, (e, d) => e ? rej(e) : res(d)) : store.findOne(q, (e, d) => e ? rej(e) : res(d))),
    insert:  (doc)    => new Promise((res, rej) => store.insert(doc, (e, d) => e ? rej(e) : res(d))),
    update:  (q, u, o)=> new Promise((res, rej) => store.update(q, u, o || {}, (e, n) => e ? rej(e) : res(n))),
    remove:  (q, o)   => new Promise((res, rej) => store.remove(q, o || {}, (e, n) => e ? rej(e) : res(n))),
    count:   (q)      => new Promise((res, rej) => store.count(q, (e, n) => e ? rej(e) : res(n))),
    index:   (opts)   => new Promise((res, rej) => store.ensureIndex(opts, (e) => e ? rej(e) : res())),
  };
}

const db = {
  users:    makeDB('users'),
  progress: makeDB('progress'),
  quizzes:  makeDB('quizzes'),
  chats:    makeDB('chats'),
};

// Set up indexes
db.users.index({ fieldName: 'email', unique: true }).catch(() => {});
db.users.index({ fieldName: 'enrollmentId' }).catch(() => {});
db.progress.index({ fieldName: 'userId' }).catch(() => {});
db.quizzes.index({ fieldName: 'userId' }).catch(() => {});
db.chats.index({ fieldName: 'userId' }).catch(() => {});

module.exports = db;
