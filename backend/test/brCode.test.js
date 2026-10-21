import assert from "node:assert/strict";
import test from "node:test";
import { buildPixCode, crc16, normalizePixKey, pixText, pixTxid } from "../src/utils/brCode.js";

test("exemplo oficial do manual do BR Code (Banco Central) bate byte a byte", () => {
  const code = buildPixCode({ key:"123e4567-e12b-12d1-a456-426655440000", name:"Fulano de Tal", city:"BRASILIA" });
  assert.equal(code, "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D");
});

test("com valor e identificador da inscricao", () => {
  const code = buildPixCode({ key:"12345678901", name:"Arena Camp", city:"Sao Paulo", amount:10, txid:"ARENA-INS-42" });
  assert.ok(code.includes("540510.00"));
  assert.ok(code.includes("62140510ARENAINS42"));
  assert.equal(code.slice(-4), crc16(code.slice(0, -4)));
});

test("CRC confere com o valor de referencia do CCITT-FALSE", () => {
  assert.equal(crc16("123456789"), "29B1");
});

test("chaves PIX sao normalizadas por tipo", () => {
  assert.equal(normalizePixKey("cpf", "123.456.789-01"), "12345678901");
  assert.equal(normalizePixKey("cnpj", "12.345.678/0001-90"), "12345678000190");
  assert.equal(normalizePixKey("email", " Arena@Exemplo.com "), "arena@exemplo.com");
  assert.equal(normalizePixKey("telefone", "(11) 98765-4321"), "+5511987654321");
  assert.equal(normalizePixKey("telefone", "+55 11 98765-4321"), "+5511987654321");
  assert.equal(normalizePixKey("aleatoria", "123E4567-E12B-12D1-A456-426655440000"), "123e4567-e12b-12d1-a456-426655440000");
  assert.throws(() => normalizePixKey("cpf", "123"), /11 números/);
  assert.throws(() => normalizePixKey("aleatoria", "abc"), /aleatória inválida/);
  assert.throws(() => normalizePixKey("outro", "x"), /tipo da chave/);
});

test("nome e cidade perdem acento e respeitam o tamanho", () => {
  assert.equal(pixText("São Paulo", 15), "Sao Paulo");
  assert.equal(pixText("Organização Arena Camp eSports Brasil", 25), "Organizacao Arena Camp eS");
  assert.equal(pixTxid("ARENA-INS-42"), "ARENAINS42");
  assert.equal(pixTxid(""), "***");
});

test("faltando dados obrigatorios, explica o que falta", () => {
  assert.throws(() => buildPixCode({ key:"", name:"A", city:"B" }), /Chave PIX/);
  assert.throws(() => buildPixCode({ key:"k", name:"", city:"B" }), /nome/);
  assert.throws(() => buildPixCode({ key:"k", name:"A", city:"" }), /cidade/);
  assert.throws(() => buildPixCode({ key:"k", name:"A", city:"B", amount:-1 }), /Valor/);
});
