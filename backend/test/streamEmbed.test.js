import assert from "node:assert/strict";
import test from "node:test";
import { normalizeStreamUrl, toEmbed } from "../src/utils/streamEmbed.js";

const host = "arenafps.com.br";

test("Twitch: canal e video", () => {
  assert.deepEqual(toEmbed("https://www.twitch.tv/gaules", host), { platform:"twitch", embedUrl:"https://player.twitch.tv/?channel=gaules&parent=arenafps.com.br&muted=true" });
  assert.deepEqual(toEmbed("twitch.tv/videos/123456", host), { platform:"twitch", embedUrl:"https://player.twitch.tv/?video=123456&parent=arenafps.com.br&muted=true" });
});

test("YouTube: video, link curto, live, embed e canal", () => {
  const video = "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ";
  assert.equal(toEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10", host).embedUrl, video);
  assert.equal(toEmbed("https://youtu.be/dQw4w9WgXcQ", host).embedUrl, video);
  assert.equal(toEmbed("https://www.youtube.com/live/dQw4w9WgXcQ?si=x", host).embedUrl, video);
  assert.equal(toEmbed("https://www.youtube.com/embed/dQw4w9WgXcQ", host).embedUrl, video);
  assert.equal(toEmbed("https://www.youtube.com/channel/UCabcdefghijklmnopqrstuv/live", host).embedUrl, "https://www.youtube-nocookie.com/embed/live_stream?channel=UCabcdefghijklmnopqrstuv");
});

test("Kick: canal", () => {
  assert.deepEqual(toEmbed("https://kick.com/arenacamp", host), { platform:"kick", embedUrl:"https://player.kick.com/arenacamp" });
});

test("o parent da Twitch acompanha o endereco do site", () => {
  assert.match(toEmbed("https://twitch.tv/gaules", "localhost").embedUrl, /parent=localhost/);
});

test("links que nao viram player", () => {
  for (const value of ["https://exemplo.com/live", "https://www.youtube.com/@canal", "https://twitch.tv/", "javascript:alert(1)", "texto"]) assert.equal(toEmbed(value, host), null, value);
});

test("normalizeStreamUrl valida ao salvar", () => {
  assert.equal(normalizeStreamUrl(""), null);
  assert.equal(normalizeStreamUrl("  https://twitch.tv/gaules "), "https://twitch.tv/gaules");
  assert.throws(() => normalizeStreamUrl("https://exemplo.com/live"), /Use um link da Twitch, YouTube ou Kick\./);
  assert.throws(() => normalizeStreamUrl("https://www.youtube.com/@canal"), /Abra a live no YouTube e copie o link do vídeo/);
  assert.throws(() => normalizeStreamUrl("javascript:alert(1)"), /URL/);
});

test("normalizeStreamUrl aceita link colado sem https e continua recusando esquemas perigosos", () => {
  assert.equal(normalizeStreamUrl("twitch.tv/arenacamp"), "https://twitch.tv/arenacamp");
  assert.equal(normalizeStreamUrl("  kick.com/arenacamp "), "https://kick.com/arenacamp");
  assert.equal(normalizeStreamUrl("youtu.be/dQw4w9WgXcQ"), "https://youtu.be/dQw4w9WgXcQ");
  assert.throws(() => normalizeStreamUrl("javascript:alert(1)"));
  assert.throws(() => normalizeStreamUrl("data:text/html,oi"));
  assert.throws(() => normalizeStreamUrl("exemplo.com/live"), /Twitch, YouTube ou Kick/);
});
