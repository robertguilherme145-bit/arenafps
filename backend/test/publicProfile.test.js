import assert from "node:assert/strict";
import test from "node:test";
import { toPublicProfile } from "../src/services/playerWorkspace.service.js";

test("perfil publico so leva campos publicos", () => {
  const profile = toPublicProfile({
    id:7, nome:"Nome Completo", email:"a@b.c", nickname:"LYKROK", avatar:"a.png", banner:"b.png", bio:"oi",
    pais:"BR", estado:"SP", cidade:"Campinas", birth_date:"2000-01-01", languages:["pt"], phone:"+5511999999999",
    whatsapp_opt_in:true, pix_key:"123", pix_key_type:"cpf", created_at:"2026-01-01", links:{ steam:"s" }, preferences:{ theme:"dark" },
    campo_novo_secreto:"x"
  });
  assert.deepEqual(Object.keys(profile).sort(), ["avatar", "banner", "bio", "cidade", "created_at", "estado", "id", "languages", "links", "nickname", "pais"]);
  assert.equal(profile.nickname, "LYKROK");
});
