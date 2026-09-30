const db = require("./db");

const seedRecords = [
  {
    owner_wallet: "0x1111111111111111111111111111111111111111",
    namespace: "profile",
    key: "display_name",
    value: "Alice",
    tags: ["public", "profile"],
    created_at: new Date().toISOString(),
    expires_at: null
  },
  {
    owner_wallet: "0x1111111111111111111111111111111111111111",
    namespace: "gaming",
    key: "favorite_game",
    value: "EtherQuest",
    tags: ["gaming"],
    created_at: new Date().toISOString(),
    expires_at: null
  },
  {
    owner_wallet: "0x2222222222222222222222222222222222222222",
    namespace: "reputation",
    key: "score",
    value: 87,
    tags: ["reputation", "verified"],
    created_at: new Date().toISOString(),
    expires_at: new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    ).toISOString()
  }
];

const insert = db.prepare(`
  INSERT INTO records (
    owner_wallet,
    namespace,
    key,
    value,
    tags,
    created_at,
    expires_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const insertMany = db.transaction((records) => {
  for (const record of records) {
    insert.run(
      record.owner_wallet,
      record.namespace,
      record.key,
      JSON.stringify(record.value),
      JSON.stringify(record.tags),
      record.created_at,
      record.expires_at
    );
  }
});

const existingCount = db
  .prepare("SELECT COUNT(*) AS count FROM records")
  .get().count;

if (existingCount === 0) {
  insertMany(seedRecords);
  console.log("Seed data inserted.");
} else {
  console.log("Database already contains records. Seed skipped.");
}
