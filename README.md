# Web3 Data Query Demo

A small developer-facing data layer prototype exploring structured records, filtering, TTL/expiry, predictable API errors, and developer experience.

This is intentionally a simple prototype rather than production infrastructure. The goal is to demonstrate product thinking around developer tooling, data models, query behavior, onboarding, and error semantics.

---

## Problem

Developer-facing data products often become difficult to use when the underlying system exposes too much infrastructure complexity.

A developer should be able to answer a few basic questions quickly:

- How do I store a record?
- How do I retrieve it?
- How do I filter data?
- What happens when data expires?
- How do I recover from an invalid request?
- Which fields can I query efficiently?

This prototype explores those questions through a small API and browser-based developer console.

---

## Developer use case

Imagine a developer building an application that needs to store lightweight wallet-linked data such as:

- profile attributes
- game preferences
- reputation signals
- temporary session information
- application-specific metadata

Instead of managing database structure directly, the developer works with a simple record abstraction:

```text
wallet
+ namespace
+ key
+ value
+ tags
+ optional expiry
```

Example:

```json
{
  "owner_wallet": "0x1111111111111111111111111111111111111111",
  "namespace": "profile",
  "key": "display_name",
  "value": "Alice",
  "tags": ["public", "profile"],
  "ttl_seconds": 3600
}
```

---

## Architecture

```text
Developer / Browser
        |
        v
   Express API
        |
        +--> Validation layer
        |
        +--> Query + expiry logic
        |
        v
      SQLite
```

The prototype uses:

- **Node.js**
- **Express**
- **SQLite**
- **Plain HTML / CSS / JavaScript**

The implementation is deliberately lightweight so the product behavior remains easy to understand and modify.

---

## Data model

Each record contains:

| Field | Purpose |
|---|---|
| `id` | Internal record identifier |
| `owner_wallet` | Wallet associated with the record |
| `namespace` | Logical grouping for application data |
| `key` | Identifier within the namespace |
| `value` | Stored value |
| `tags` | Lightweight metadata for filtering |
| `created_at` | Record creation timestamp |
| `expires_at` | Optional expiry timestamp |

Example namespaces could include:

```text
profile
gaming
reputation
session
preferences
```

Namespaces provide a simple way for developers to group application-specific data without requiring separate schemas for each use case.

---

## API

The prototype supports:

```text
POST   /records
GET    /records/:id
GET    /records
DELETE /records/:id
```

### Create a record

```text
POST /records
```

A record can optionally include `ttl_seconds`. If supplied, the API calculates `expires_at` when the record is created.

### Retrieve a record

```text
GET /records/:id
```

The API distinguishes between a record that does not exist and one that existed but has expired.

### Query records

```text
GET /records
```

Supported filters:

```text
owner_wallet
namespace
key
tag
expires_before
expires_after
include_expired
```

Filters can be combined.

### Delete a record

```text
DELETE /records/:id
```

A successful deletion returns:

```text
204 No Content
```

More copy-pasteable examples are available in:

[`docs/api-examples.md`](docs/api-examples.md)

---

## Query behavior

Collection queries exclude expired records by default.

For example:

```text
GET /records?namespace=profile
```

returns active records in the `profile` namespace.

Developers can explicitly include expired data:

```text
GET /records?include_expired=true
```

Multiple filters can be combined:

```text
GET /records?namespace=profile&tag=public
```

Unsupported query parameters return `INVALID_QUERY` rather than being silently ignored.

That choice is deliberate: silent failures make debugging harder and can produce misleading query results.

---

## Expiry / TTL design

Expiry is represented through:

```text
ttl_seconds
```

when a record is created.

Example:

```json
{
  "ttl_seconds": 3600
}
```

The API calculates a concrete `expires_at` timestamp.

This makes the contract clearer because developers can reason about the actual expiry time after creation.

Expired records are:

- excluded from collection queries by default
- available if `include_expired=true`
- returned as `RECORD_EXPIRED` when requested directly by ID

This avoids hidden deletion behavior.

The record still exists in storage, but the API clearly communicates that it is no longer active.

---

## Error model

The API returns stable machine-readable error codes:

| Error | Meaning |
|---|---|
| `INVALID_WALLET` | Wallet format is invalid |
| `INVALID_TTL` | TTL is missing a valid positive integer |
| `INVALID_QUERY` | Query or request parameters are unsupported |
| `RECORD_NOT_FOUND` | No record exists with the requested ID |
| `RECORD_EXPIRED` | The requested record exists but has expired |

Example:

```json
{
  "error": "INVALID_TTL",
  "message": "ttl_seconds must be a positive integer."
}
```

The error code is designed for programmatic handling.

The message is designed for humans.

Applications should be able to react to errors without parsing human-readable text.

---

## Developer experience decisions

### Time to first successful write + query

A developer evaluating the API should be able to:

1. install dependencies
2. run the server
3. copy a sample request
4. create a record
5. query that record

within a few minutes.

The repository therefore includes:

- sample seed data
- curl examples
- a browser interface
- stable errors
- automated tests

### Predictable errors

The API does not silently accept unsupported query parameters.

A typo such as:

```text
?namesapce=profile
```

should produce an error rather than an empty or misleading result set.

### Query discoverability

The initial query model uses a small set of explicit filters rather than a generic query language.

That reduces flexibility, but improves learnability for the prototype.

### Index choices

SQLite indexes are created for:

```text
owner_wallet
namespace
key
expires_at
```

These represent expected high-frequency query paths.

Not every field is indexed automatically.

Index design should follow expected access patterns rather than treating indexing as free.

### Clear expiry semantics

Expiry should not behave like invisible background deletion.

Developers should understand:

- whether a record is active
- when it expires
- whether expired records are queryable
- what happens when an expired record is requested directly

### Avoiding hidden system behavior

The prototype favors explicit API behavior over implicit infrastructure behavior.

Examples include:

- explicit `expires_at`
- explicit `expired` response field
- explicit `include_expired`
- explicit machine-readable errors

### Documentation as part of the product

Developer documentation is not separate from the API experience.

Good examples reduce:

- onboarding time
- implementation mistakes
- support tickets
- repeated clarification questions

---

## Metrics I would track

For a real developer-facing product, I would track both product usage and developer friction.

### Activation

- time to first successful API request
- time to first successful record creation
- time from first write to first successful query
- percentage of developers completing create + query

### Reliability

- API error rate
- error rate by error code
- latency by endpoint
- query failure rate

### Developer friction

- percentage of requests returning `INVALID_QUERY`
- percentage of requests returning `INVALID_WALLET`
- repeated failed requests before success
- documentation page → successful API call conversion

### Retention

- developers returning after first successful session
- active API keys / projects
- repeat write + query usage
- usage across multiple namespaces

### Support signals

- support requests per activated developer
- most common error-related support topics
- documentation searches with no successful follow-up request

---

## Trade-offs

This prototype intentionally makes several simplifications.

### SQLite

SQLite keeps local setup simple and makes the prototype easy to understand.

A production system would likely require a more scalable storage architecture.

### Tags stored as JSON

Tags are stored as serialized JSON.

This keeps the schema lightweight but means tag filtering is currently performed in application code.

At larger scale, tags would likely require normalized storage or database-native indexing.

### Simple wallet validation

Wallet validation checks Ethereum-style address structure:

```text
0x + 40 hexadecimal characters
```

It does not verify that the wallet exists or has on-chain activity.

### No authentication

The prototype does not implement authorization or ownership verification.

Any production system would need clear rules around:

- who can write
- who can update
- who can delete
- whether wallet ownership must be proven

### No pagination

Query results currently return the full matching result set.

A production API would need pagination, limits, and likely cursor-based traversal.

---

## What would change in a decentralized implementation

This prototype uses a conventional local database intentionally.

A decentralized implementation would introduce additional product questions.

### Data placement

Where is the data stored?

Possible considerations include:

- replicated nodes
- content-addressed storage
- decentralized databases
- chain-linked storage commitments

### Ownership and authorization

Wallet association alone is not sufficient proof of authorization.

A decentralized implementation may require signatures proving that a wallet authorized a write or delete operation.

### Data availability

Developers need to understand the guarantees around:

- replication
- persistence
- node availability
- retrieval latency

### Indexing

Centralized SQLite indexes can be created instantly.

Decentralized indexing may introduce:

- indexing delay
- replication cost
- consistency trade-offs
- query limitations

### Expiry

TTL becomes more complex when multiple nodes replicate data.

The system would need clear semantics for:

- who enforces expiry
- whether expired data is physically deleted
- whether historical copies remain available
- how expiry propagates across nodes

### Consistency

Developers may need to understand whether writes are:

- immediately visible
- eventually consistent
- finalized after a consensus or confirmation process

These behaviors should be surfaced as product concepts rather than left as infrastructure details developers discover through failures.

---

## What I would test with developers

I would put the prototype in front of developers and observe whether they can complete core tasks without assistance.

Questions I would test:

- Is the record data model intuitive?
- Do developers understand what a namespace represents?
- Do developers understand expiry before storing data?
- Are the available query filters discoverable?
- Do developers know that expired records are excluded by default?
- Can developers recover from an API error without contacting support?
- Are the error codes meaningful?
- Do the curl examples reduce onboarding time?
- How long does the first successful create + query flow take?
- Which part of the API requires explanation?

I would especially watch for places where developers hesitate.

Those moments often reveal more about developer experience than survey scores.

---

## What this prototype demonstrates

This project is intended to demonstrate:

- developer-facing API product thinking
- database and data-layer product understanding
- structured data modeling
- querying and indexing concepts
- TTL and expiry semantics
- developer onboarding
- documentation design
- error semantics
- hands-on prototyping

It is not intended to represent production-grade decentralized infrastructure or imitate any proprietary implementation.

---

## Running locally

### Requirements

- Node.js
- npm

### Install dependencies

```bash
npm install
```

### Seed sample data

```bash
npm run seed
```

### Start the application

```bash
npm start
```

Then open:

```text
http://localhost:3000
```

The browser interface allows you to create and query records without needing an API client.

### Run tests

```bash
npm test
```

The test suite covers:

- record creation
- record retrieval
- record querying
- deletion
- invalid wallet handling
- invalid TTL handling
- expiry behavior
- invalid query parameters

---

## Repository structure

```text
web3-data-query-demo/
├── docs/
│   └── api-examples.md
├── public/
│   ├── app.js
│   ├── index.html
│   └── styles.css
├── src/
│   ├── db.js
│   ├── seed.js
│   ├── server.js
│   └── validation.js
├── tests/
│   └── records.test.js
├── .gitignore
├── package.json
└── README.md
```

---

## Scope

This project is a lightweight product prototype.

The focus is not infrastructure sophistication. The focus is the developer contract:

**Can a developer understand the data model, make a successful request, query their data, understand expiry, and recover from errors without needing support?**
