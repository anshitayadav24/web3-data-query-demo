const ETH_WALLET_REGEX = /^0x[a-fA-F0-9]{40}$/;

function validateCreateRecord(body) {
  const {
    owner_wallet,
    namespace,
    key,
    value,
    tags,
    ttl_seconds
  } = body;

  if (!owner_wallet || !ETH_WALLET_REGEX.test(owner_wallet)) {
    return {
      error: "INVALID_WALLET",
      message: "owner_wallet must be a valid Ethereum-style wallet address."
    };
  }

  if (!namespace || typeof namespace !== "string") {
    return {
      error: "INVALID_QUERY",
      message: "namespace is required and must be a string."
    };
  }

  if (!key || typeof key !== "string") {
    return {
      error: "INVALID_QUERY",
      message: "key is required and must be a string."
    };
  }

  if (value === undefined) {
    return {
      error: "INVALID_QUERY",
      message: "value is required."
    };
  }

  if (tags !== undefined && !Array.isArray(tags)) {
    return {
      error: "INVALID_QUERY",
      message: "tags must be an array."
    };
  }

  if (
    ttl_seconds !== undefined &&
    (!Number.isInteger(ttl_seconds) || ttl_seconds <= 0)
  ) {
    return {
      error: "INVALID_TTL",
      message: "ttl_seconds must be a positive integer."
    };
  }

  return null;
}

function validateQueryParams(query) {
  const allowed = new Set([
    "owner_wallet",
    "namespace",
    "key",
    "tag",
    "expires_before",
    "expires_after",
    "include_expired"
  ]);

  for (const field of Object.keys(query)) {
    if (!allowed.has(field)) {
      return {
        error: "INVALID_QUERY",
        message: `Unsupported query parameter: ${field}`
      };
    }
  }

  return null;
}

module.exports = {
  validateCreateRecord,
  validateQueryParams
};
