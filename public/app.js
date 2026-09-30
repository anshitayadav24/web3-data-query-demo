const createForm = document.getElementById("create-form");
const createResult = document.getElementById("create-result");

const queryForm = document.getElementById("query-form");
const queryResult = document.getElementById("query-result");

createForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  createResult.textContent = "Sending request...";

  const tags = document
    .getElementById("tags")
    .value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  const ttlValue = document.getElementById("ttl_seconds").value;

  const payload = {
    owner_wallet: document.getElementById("owner_wallet").value.trim(),
    namespace: document.getElementById("namespace").value.trim(),
    key: document.getElementById("key").value.trim(),
    value: document.getElementById("value").value,
    tags
  };

  if (ttlValue) {
    payload.ttl_seconds = Number(ttlValue);
  }

  try {
    const response = await fetch("/records", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    createResult.textContent = JSON.stringify(
      {
        status: response.status,
        ...data
      },
      null,
      2
    );
  } catch (error) {
    createResult.textContent = JSON.stringify(
      {
        error: "NETWORK_ERROR",
        message: error.message
      },
      null,
      2
    );
  }
});

queryForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  queryResult.textContent = "Running query...";

  const params = new URLSearchParams();

  const ownerWallet = document
    .getElementById("query_owner_wallet")
    .value
    .trim();

  const namespace = document
    .getElementById("query_namespace")
    .value
    .trim();

  const key = document
    .getElementById("query_key")
    .value
    .trim();

  const tag = document
    .getElementById("query_tag")
    .value
    .trim();

  const includeExpired =
    document.getElementById("include_expired").checked;

  if (ownerWallet) {
    params.set("owner_wallet", ownerWallet);
  }

  if (namespace) {
    params.set("namespace", namespace);
  }

  if (key) {
    params.set("key", key);
  }

  if (tag) {
    params.set("tag", tag);
  }

  if (includeExpired) {
    params.set("include_expired", "true");
  }

  try {
    const queryString = params.toString();

    const response = await fetch(
      queryString ? `/records?${queryString}` : "/records"
    );

    const data = await response.json();

    queryResult.textContent = JSON.stringify(
      {
        status: response.status,
        ...data
      },
      null,
      2
    );
  } catch (error) {
    queryResult.textContent = JSON.stringify(
      {
        error: "NETWORK_ERROR",
        message: error.message
      },
      null,
      2
    );
  }
});
