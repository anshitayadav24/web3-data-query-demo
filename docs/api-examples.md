# API Examples

Base URL when running locally:

```text
http://localhost:3000
```

## Create a record

```bash
curl -X POST http://localhost:3000/records \
  -H "Content-Type: application/json" \
  -d '{
    "owner_wallet": "0x1111111111111111111111111111111111111111",
    "namespace": "profile",
    "key": "display_name",
    "value": "Alice",
    "tags": ["public", "profile"],
    "ttl_seconds": 3600
  }'
```

Example response:

```json
{
  "id": 1,
  "owner_wallet": "0x1111111111111111111111111111111111111111",
  "namespace": "profile",
  "key": "display_name",
  "value": "Alice",
  "tags": [
    "public",
    "profile"
  ],
  "created_at": "2026-09-30T10:00:00.000Z",
  "expires_at": "2026-09-30T11:00:00.000Z",
  "expired": false
}
```

## Retrieve a record by ID

```bash
curl http://localhost:3000/records/1
```

## Query by wallet

```bash
curl "http://localhost:3000/records?owner_wallet=0x1111111111111111111111111111111111111111"
```

## Query by namespace

```bash
curl "http://localhost:3000/records?namespace=profile"
```

## Query by key

```bash
curl "http://localhost:3000/records?key=display_name"
```

## Query by tag

```bash
curl "http://localhost:3000/records?tag=verified"
```

## Combine filters

```bash
curl "http://localhost:3000/records?namespace=profile&tag=public"
```

## Query records expiring before a date

```bash
curl "http://localhost:3000/records?expires_before=2026-12-31T23:59:59Z"
```

## Query records expiring after a date

```bash
curl "http://localhost:3000/records?expires_after=2026-10-01T00:00:00Z"
```

## Include expired records

Expired records are excluded from normal collection queries by default.

To include them:

```bash
curl "http://localhost:3000/records?include_expired=true"
```

## Delete a record

```bash
curl -X DELETE http://localhost:3000/records/1
```

A successful deletion returns:

```text
204 No Content
```

---

# Error examples

The API uses stable machine-readable error codes so developers can handle failures programmatically.

## INVALID_WALLET

Request:

```bash
curl -X POST http://localhost:3000/records \
  -H "Content-Type: application/json" \
  -d '{
    "owner_wallet": "invalid-wallet",
    "namespace": "profile",
    "key": "display_name",
    "value": "Alice"
  }'
```

Response:

```json
{
  "error": "INVALID_WALLET",
  "message": "owner_wallet must be a valid Ethereum-style wallet address."
}
```

## INVALID_TTL

```json
{
  "error": "INVALID_TTL",
  "message": "ttl_seconds must be a positive integer."
}
```

## INVALID_QUERY

```json
{
  "error": "INVALID_QUERY",
  "message": "Unsupported query parameter: unsupported_filter"
}
```

## RECORD_NOT_FOUND

```json
{
  "error": "RECORD_NOT_FOUND",
  "message": "No record exists with the requested id."
}
```

## RECORD_EXPIRED

```json
{
  "error": "RECORD_EXPIRED",
  "message": "The requested record has expired."
}
```

## Developer experience principle

These examples are intentionally copy-pasteable.

A developer evaluating an API should be able to move from documentation to their first successful create-and-query flow with minimal interpretation. Stable error codes also allow applications to respond to failures without parsing human-readable error messages.
