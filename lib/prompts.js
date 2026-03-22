/**
 * lib/prompts.js
 *
 * Reads skill/SKILL.md and extracts a specific Stage section as a system
 * prompt string.  The section spans from "## Stage N" up to (but not
 * including) the next "## Stage" heading or end-of-file.
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILL_PATH = join(__dirname, "..", "skill", "SKILL.md");

/**
 * Extract the text of Stage N from SKILL.md.
 *
 * @param {number} stage  - Stage number (0–5)
 * @param {string} [skillPath] - Override path to SKILL.md (for testing)
 * @returns {string}       Trimmed stage section text
 * @throws {Error}         If the requested stage is not found
 */
export function extract(stage, skillPath = SKILL_PATH) {
  const raw = readFileSync(skillPath, "utf8");
  const lines = raw.split("\n");

  // Match "## Stage N" — title after the dash may vary
  const startRe = new RegExp(`^## Stage ${stage}\\b`);
  const nextStageRe = /^## Stage \d+/;

  let startIdx = -1;
  let endIdx = lines.length;

  for (let i = 0; i < lines.length; i++) {
    if (startIdx === -1) {
      if (startRe.test(lines[i])) startIdx = i;
    } else {
      if (nextStageRe.test(lines[i])) {
        endIdx = i;
        break;
      }
    }
  }

  if (startIdx === -1) {
    throw new Error(`Stage ${stage} not found in SKILL.md`);
  }

  return lines.slice(startIdx, endIdx).join("\n").trim();
}

/**
 * Build a system prompt for the docs generator (Stage 5).
 * Prepends a brief instruction framing the LLM's role before the raw stage text.
 *
 * @param {number} stage
 * @param {string} [skillPath]
 * @returns {string}
 */
export function systemPrompt(stage, skillPath = SKILL_PATH) {
  const stageText = extract(stage, skillPath);
  return [
    "You are an expert UrsaMU developer and technical writer.",
    "Follow the instructions below EXACTLY. Produce only the requested output",
    "sections — no additional commentary.",
    "",
    stageText,
  ].join("\n");
}
