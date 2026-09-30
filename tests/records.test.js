process.env.DB_FILE = ":memory:";

const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");

const app = require("../src/server");

function request(server, options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        port: server.address().port,
        ...options
      },
      (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          resolve({
            status: res.statusCode,
            body: data ? JSON.parse(data) : null
          });
        });
      }
    );

    req.on("error", reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

test("create, retrieve, query, and delete a record", async () => {
  const server = app.listen(0);

  try {
    const payload = {
      owner_wallet: "0x1111111111111111111111111111111111111111",
      namespace: "profile",
      key: "display_name",
      value: "Alice",
      tags: ["public", "profile"],
      ttl_seconds: 3600
    };

    const created = await request(
      server,
      {
        method: "POST",
        path: "/records",
        headers: {
          "Content-Type": "application/json"
        }
      },
      payload
    );

    assert.equal(created.status, 201);
    assert.equal(created.body.namespace, "profile");
    assert.equal(created.body.value, "Alice");

    const recordId = created.body.id;

    const retrieved = await request(server, {
      method: "GET",
      path: `/records/${recordId}`
    });

    assert.equal(retrieved.status, 200);
    assert.equal(retrieved.body.id, recordId);

    const queried = await request(server, {
      method: "GET",
      path: "/records?namespace=profile"
    });

    assert.equal(queried.status, 200);
    assert.equal(queried.body.count, 1);

    const deleted = await request(server, {
      method: "DELETE",
      path: `/records/${recordId}`
    });

    assert.equal(deleted.status, 204);

    const missing = await request(server, {
      method: "GET",
      path: `/records/${recordId}`
    });

    assert.equal(missing.status, 404);
    assert.equal(missing.body.error, "RECORD_NOT_FOUND");
  } finally {
    server.close();
  }
});

test("rejects invalid wallet addresses", async () => {
  const server = app.listen(0);

  try {
    const response = await request(
      server,
      {
        method: "POST",
        path: "/records",
        headers: {
          "Content-Type": "application/json"
        }
      },
      {
        owner_wallet: "not-a-wallet",
        namespace: "profile",
        key: "display_name",
        value: "Alice"
      }
    );

    assert.equal(response.status, 400);
    assert.equal(response.body.error, "INVALID_WALLET");
  } finally {
    server.close();
  }
});

test("rejects invalid TTL values", async () => {
  const server = app.listen(0);

  try {
    const response = await request(
      server,
      {
        method: "POST",
        path: "/records",
        headers: {
          "Content-Type": "application/json"
        }
      },
      {
        owner_wallet: "0x1111111111111111111111111111111111111111",
        namespace: "profile",
        key: "display_name",
        value: "Alice",
        ttl_seconds: 0
      }
    );

    assert.equal(response.status, 400);
    assert.equal(response.body.error, "INVALID_TTL");
  } finally {
    server.close();
  }
});

test("returns RECORD_EXPIRED for expired records", async () => {
  const server = app.listen(0);

  try {
    const created = await request(
      server,
      {
        method: "POST",
        path: "/records",
        headers: {
          "Content-Type": "application/json"
        }
      },
      {
        owner_wallet: "0x2222222222222222222222222222222222222222",
        namespace: "session",
        key: "temporary_access",
        value: true,
        ttl_seconds: 1
      }
    );

    assert.equal(created.status, 201);

    const recordId = created.body.id;

    await new Promise((resolve) => setTimeout(resolve, 1100));

    const response = await request(server, {
      method: "GET",
      path: `/records/${recordId}`
    });

    assert.equal(response.status, 410);
    assert.equal(response.body.error, "RECORD_EXPIRED");
  } finally {
    server.close();
  }
});

test("rejects unsupported query parameters", async () => {
  const server = app.listen(0);

  try {
    const response = await request(server, {
      method: "GET",
      path: "/records?unknown_filter=value"
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.error, "INVALID_QUERY");
  } finally {
    server.close();
  }
});
