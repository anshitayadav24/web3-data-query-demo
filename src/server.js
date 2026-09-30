const express = require("express");
const db = require("./db");
const {
  validateCreateRecord,
  validateQueryParams
} = require("./validation");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));


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
app.get("/records/:id", (req, res) => {
  const record = db
    .prepare("SELECT * FROM records WHERE id = ?")
    .get(req.params.id);

  if (!record) {
    return res.status(404).json({
      error: "RECORD_NOT_FOUND",
      message: "No record exists with the requested id."
    });
  }

  const formattedRecord = formatRecord(record);

  if (formattedRecord.expired) {
    return res.status(410).json({
      error: "RECORD_EXPIRED",
      message: "The requested record has expired.",
      record: formattedRecord
    });
  }

  res.json(formattedRecord);
});
app.get("/records", (req, res) => {
  const validationError = validateQueryParams(req.query);

  if (validationError) {
    return res.status(400).json(validationError);
  }

  const {
    owner_wallet,
    namespace,
    key,
    tag,
    expires_before,
    expires_after,
    include_expired
  } = req.query;

  const conditions = [];
  const params = [];

  if (owner_wallet) {
    conditions.push("owner_wallet = ?");
    params.push(owner_wallet);
  }

  if (namespace) {
    conditions.push("namespace = ?");
    params.push(namespace);
  }

  if (key) {
    conditions.push("key = ?");
    params.push(key);
  }

  if (expires_before) {
    const date = new Date(expires_before);

    if (Number.isNaN(date.getTime())) {
      return res.status(400).json({
        error: "INVALID_QUERY",
        message: "expires_before must be a valid date."
      });
    }

    conditions.push("expires_at IS NOT NULL AND expires_at < ?");
    params.push(date.toISOString());
  }

  if (expires_after) {
    const date = new Date(expires_after);

    if (Number.isNaN(date.getTime())) {
      return res.status(400).json({
        error: "INVALID_QUERY",
        message: "expires_after must be a valid date."
      });
    }

    conditions.push("expires_at IS NOT NULL AND expires_at > ?");
    params.push(date.toISOString());
  }

  if (include_expired !== "true") {
    conditions.push("(expires_at IS NULL OR expires_at > ?)");
    params.push(new Date().toISOString());
  }

  let sql = "SELECT * FROM records";

  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(" AND ")}`;
  }

  sql += " ORDER BY created_at DESC";

  let records = db
    .prepare(sql)
    .all(...params)
    .map(formatRecord);

  if (tag) {
    records = records.filter((record) =>
      record.tags.includes(tag)
    );
  }

  res.json({
    count: records.length,
    records
  });
});
app.delete("/records/:id", (req, res) => {
  const record = db
    .prepare("SELECT * FROM records WHERE id = ?")
    .get(req.params.id);

  if (!record) {
    return res.status(404).json({
      error: "RECORD_NOT_FOUND",
      message: "No record exists with the requested id."
    });
  }

  db.prepare("DELETE FROM records WHERE id = ?").run(req.params.id);

  res.status(204).send();
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
