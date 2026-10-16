import assert from "node:assert/strict";
import test from "node:test";
import { optionalHttpUrl } from "../src/utils/safeUrl.js";

test("aceita links http e https", () => {
  assert.equal(optionalHttpUrl("https://imgur.com/a/print.png"), "https://imgur.com/a/print.png");
  assert.equal(optionalHttpUrl("http://example.com"), "http://example.com/");
});

test("trata vazio como ausencia de link", () => {
  assert.equal(optionalHttpUrl(""), null);
  assert.equal(optionalHttpUrl("   "), null);
  assert.equal(optionalHttpUrl(undefined), null);
});

test("recusa protocolos que executam codigo ou leem arquivos", () => {
  for (const value of ["javascript:alert(1)", "JaVaScRiPt:alert(1)", " javascript:alert(1)", "data:text/html,<script>alert(1)</script>", "vbscript:msgbox(1)", "file:///etc/passwd"]) {
    assert.throws(() => optionalHttpUrl(value), /URL valida/, value);
  }
});

test("recusa texto que nao e URL", () => {
  assert.throws(() => optionalHttpUrl("print da partida"), /URL valida/);
});
