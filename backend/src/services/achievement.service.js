import { createAchievementDefinition, findAchievementDefinition, findAchievementDefinitions, savePlayerAchievement, updateAchievementDefinition } from "../models/achievement.model.js";

const METRICS = new Set(["wins", "kills", "mvps", "win_streak", "matches", "global_rank", "headshots", "assists"]);
const TIERS = new Set(["bronze", "prata", "ouro", "diamante", "lendaria"]);

export async function evaluateAchievements(userId, gameId, stats) {
  const definitions = await findAchievementDefinitions(gameId, false);
  return await Promise.all(definitions.map(async (definition) => {
    const rawProgress = Number(stats[definition.metric] ?? 0);
    const target = Number(definition.target);
    const unlocked = definition.comparator === "lte"
      ? rawProgress > 0 && rawProgress <= target
      : rawProgress >= target;
    const displayProgress = definition.comparator === "lte" ? (unlocked ? target : 0) : Math.min(rawProgress, target);
    await savePlayerAchievement(userId, definition.id, rawProgress, unlocked);
    return normalizeAchievement(definition, displayProgress, target, unlocked);
  }));
}

export async function listAchievements(filters = {}) {
  return (await findAchievementDefinitions(filters.game_id || null, true)).map((item) => ({
    ...normalizeAchievement(item, 0, Number(item.target), false),
    id: Number(item.id), game_id: item.game_id ? Number(item.game_id) : null,
    game_name: item.game_name, game_short_name: item.game_short_name,
    metric: item.metric, comparator: item.comparator, icon: item.icon,
    tier: item.tier, xp_reward: Number(item.xp_reward), active: Boolean(item.active),
    players_count: Number(item.players_count), unlocked_count: Number(item.unlocked_count)
  }));
}

export async function createAchievement(user, payload) {
  const input = validateAchievement(payload);
  const id = await createAchievementDefinition({ ...input, created_by: user.id });
  return await findAchievementDefinition(id);
}

export async function updateAchievement(id, payload) {
  const current = await findAchievementDefinition(id);
  if (!current) throw new Error("Conquista nao encontrada.");
  const updated = validateAchievement({ ...current, ...payload });
  await updateAchievementDefinition(id, updated);
  return await findAchievementDefinition(id);
}

function validateAchievement(payload) {
  const metric = String(payload.metric || "");
  const tier = String(payload.tier || "bronze");
  const comparator = payload.comparator === "lte" ? "lte" : "gte";
  if (!METRICS.has(metric)) throw new Error("Metrica de conquista invalida.");
  if (!TIERS.has(tier)) throw new Error("Nivel de conquista invalido.");
  const target = Number(payload.target);
  if (!(target > 0)) throw new Error("A meta deve ser maior que zero.");
  const title = required(payload.title, "Informe o titulo.", 120);
  return {
    game_id: payload.game_id ? Number(payload.game_id) : null,
    code: slug(payload.code || title), title,
    description: required(payload.description, "Informe a descricao.", 500),
    icon: String(payload.icon || "trophy").slice(0, 60), metric, comparator, target, tier,
    xp_reward: Math.max(0, Number(payload.xp_reward || 0)), active: payload.active !== false && payload.active !== 0
  };
}

function normalizeAchievement(item, progress, target, unlocked) {
  return { code: item.code, title: item.title, description: item.description, progress, target, unlocked, tier: item.tier, xp_reward: Number(item.xp_reward), game_id: item.game_id ? Number(item.game_id) : null };
}
function required(value, message, max) { const text = String(value ?? "").trim(); if (!text) throw new Error(message); return text.slice(0, max); }
function slug(value) { return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 80); }
