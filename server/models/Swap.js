const mongoose = require("mongoose");

const swapSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    skillOffered: { type: String, trim: true, default: "" },
    skillWanted: { type: String, trim: true, default: "" },
    contactHint: { type: String, trim: true, default: "" },
    pinned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Swap", swapSchema);
