const express = require("express");
const Swap = require("../models/Swap");

const router = express.Router();

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

router.get("/", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    const filter = q
      ? {
          $or: [
            { title: new RegExp(escapeRegex(q), "i") },
            { skillOffered: new RegExp(escapeRegex(q), "i") },
            { skillWanted: new RegExp(escapeRegex(q), "i") },
          ],
        }
      : {};
    const items = await Swap.find(filter).sort({ pinned: -1, createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const item = await Swap.findById(req.params.id);
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  } catch (err) {
    res.status(400).json({ error: "Invalid id" });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = req.body || {};
    const item = await Swap.create({
      title: body.title,
      skillOffered: body.skillOffered,
      skillWanted: body.skillWanted,
      contactHint: body.contactHint,
      pinned: Boolean(body.pinned),
    });
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const updates = {};
    const body = req.body || {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.skillOffered !== undefined) updates.skillOffered = body.skillOffered;
    if (body.skillWanted !== undefined) updates.skillWanted = body.skillWanted;
    if (body.contactHint !== undefined) updates.contactHint = body.contactHint;
    if (body.pinned !== undefined) updates.pinned = Boolean(body.pinned);

    const item = await Swap.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const item = await Swap.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true, id: item._id });
  } catch (err) {
    res.status(400).json({ error: "Invalid id" });
  }
});

module.exports = router;