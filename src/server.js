const express = require("express");
const db = require("./db");
const {
  validateCreateRecord,
  validateQueryParams
} = require("./validation");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    name: "web3-data-query-demo",
    status: "ok",
    message: "Developer-facing data query prototype is running."
  });
});

app.post("/records", (req, res) => {
  const validationError = validateCreateRecord(req.body);

  if (validationError) {
    return res.status(400).json(validationError);
  }

  const {
    owner_wallet,
    namespace,
    key,
    value,
    tags = [],
    ttl_seconds
  } = req.body;

  const createdAt = new Date();
  const expiresAt = ttl_seconds
    ? new Date(createdAt.getTime() + ttl_seconds * 1000)
    : null;

  const statement = db.prepare(`
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

  const result = statement.run(
    owner_wallet,
    namespace,
    key,
    JSON.stringify(value),
    JSON.stringify(tags),
    createdAt.toISOString(),
    expiresAt ? expiresAt.toISOString() : null
  );

  const record = db
    .prepare("SELECT * FROM records WHERE id = ?")
    .get(result.lastInsertRowid);

  res.status(201).json(formatRecord(record));
});

function formatRecord(record) {
  return {
    ...record,
    value: JSON.parse(record.value),
    tags: JSON.parse(record.tags),
    expired:
      record.expires_at !== null &&
      new Date(record.expires_at) <= new Date()
  };
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
