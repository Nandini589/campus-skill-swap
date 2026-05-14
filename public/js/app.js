const API = "/api/swaps";

const form = document.getElementById("swap-form");
const editId = document.getElementById("edit-id");
const submitBtn = document.getElementById("submit-btn");
const cancelEdit = document.getElementById("cancel-edit");
const formStatus = document.getElementById("form-status");
const listStatus = document.getElementById("list-status");
const listEl = document.getElementById("swap-list");
const searchEl = document.getElementById("search");
const sortEl = document.getElementById("sort");
const template = document.getElementById("card-template");

let itemsCache = [];
let searchDebounce = null;

function setFormStatus(message, kind = "") {
  formStatus.textContent = message;
  formStatus.className = `status${kind ? ` ${kind}` : ""}`;
}

function setListStatus(message, kind = "") {
  listStatus.textContent = message;
  listStatus.className = `status${kind ? ` ${kind}` : ""}`;
}

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    ...options,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text || "Invalid response" };
  }
  if (!res.ok) {
    const err = new Error(data?.error || res.statusText || "Request failed");
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function sortItems(list) {
  const mode = sortEl.value;
  const copy = [...list];
  if (mode === "newest") {
    copy.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } else if (mode === "oldest") {
    copy.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  } else if (mode === "az") {
    copy.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
  }
  copy.sort((a, b) => Number(b.pinned) - Number(a.pinned));
  return copy;
}

function clientFilter(list, q) {
  if (!q.trim()) return list;
  const lower = q.trim().toLowerCase();
  return list.filter((x) => {
    const hay = [x.title, x.skillOffered, x.skillWanted].join(" ").toLowerCase();
    return hay.includes(lower);
  });
}

function renderList(serverItems) {
  itemsCache = Array.isArray(serverItems) ? serverItems : [];
  const q = searchEl.value;
  const filtered = clientFilter(itemsCache, q);
  const sorted = sortItems(filtered);

  listEl.innerHTML = "";
  if (!sorted.length) {
    const p = document.createElement("p");
    p.className = "empty-hint";
    p.textContent = itemsCache.length
      ? "No swaps match your search. Try another keyword."
      : "No swaps yet. Add the first one with the form.";
    listEl.appendChild(p);
    return;
  }

  for (const item of sorted) {
    const node = template.content.firstElementChild.cloneNode(true);
    node.classList.toggle("is-pinned", item.pinned);
    node.querySelector(".card-title").textContent = item.title;
    const pinBadge = node.querySelector(".pin-badge");
    pinBadge.hidden = !item.pinned;
    node.querySelector(".offers").textContent = item.skillOffered || "—";
    node.querySelector(".wants").textContent = item.skillWanted || "—";
    node.querySelector(".contact").textContent = item.contactHint || "—";
    node.querySelector(".card-date").textContent = formatDate(item.createdAt);

    const pinBtn = node.querySelector(".toggle-pin");
    pinBtn.textContent = item.pinned ? "Unpin" : "Pin";
    pinBtn.addEventListener("click", () => togglePin(item._id, !item.pinned));

    node.querySelector(".edit").addEventListener("click", () => startEdit(item));
    node.querySelector(".delete").addEventListener("click", () => removeItem(item._id));

    listEl.appendChild(node);
  }
}

async function loadList() {
  setListStatus("Loading…");
  try {
    const q = encodeURIComponent(searchEl.value.trim());
    const data = await fetchJSON(q ? `${API}?q=${q}` : API);
    renderList(data);
    setListStatus(`${data.length} swap(s) loaded.`);
  } catch (e) {
    setListStatus(e.message || "Failed to load", "error");
    listEl.innerHTML = "";
  }
}

function resetForm() {
  form.reset();
  editId.value = "";
  submitBtn.textContent = "Publish swap";
  cancelEdit.hidden = true;
  setFormStatus("");
}

function startEdit(item) {
  editId.value = item._id;
  document.getElementById("title").value = item.title || "";
  document.getElementById("skillOffered").value = item.skillOffered || "";
  document.getElementById("skillWanted").value = item.skillWanted || "";
  document.getElementById("contactHint").value = item.contactHint || "";
  document.getElementById("pinned").checked = Boolean(item.pinned);
  submitBtn.textContent = "Save changes";
  cancelEdit.hidden = false;
  setFormStatus(`Editing: ${item.title}`, "ok");
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    title: document.getElementById("title").value.trim(),
    skillOffered: document.getElementById("skillOffered").value.trim(),
    skillWanted: document.getElementById("skillWanted").value.trim(),
    contactHint: document.getElementById("contactHint").value.trim(),
    pinned: document.getElementById("pinned").checked,
  };
  if (!payload.title) {
    setFormStatus("Title is required.", "error");
    return;
  }
  setFormStatus("Saving…");
  try {
    const id = editId.value;
    if (id) {
      await fetchJSON(`${API}/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
      setFormStatus("Updated.", "ok");
    } else {
      await fetchJSON(API, { method: "POST", body: JSON.stringify(payload) });
      setFormStatus("Published.", "ok");
    }
    resetForm();
    await loadList();
  } catch (err) {
    setFormStatus(err.message || "Save failed", "error");
  }
});

cancelEdit.addEventListener("click", () => {
  resetForm();
});

async function removeItem(id) {
  if (!confirm("Delete this swap? This cannot be undone.")) return;
  setListStatus("Deleting…");
  try {
    await fetchJSON(`${API}/${id}`, { method: "DELETE" });
    await loadList();
  } catch (e) {
    setListStatus(e.message || "Delete failed", "error");
  }
}

async function togglePin(id, pinned) {
  try {
    await fetchJSON(`${API}/${id}`, { method: "PATCH", body: JSON.stringify({ pinned }) });
    await loadList();
  } catch (e) {
    setListStatus(e.message || "Update failed", "error");
  }
}

searchEl.addEventListener("input", () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    loadList();
  }, 280);
});

sortEl.addEventListener("change", () => {
  renderList(itemsCache);
});

loadList();