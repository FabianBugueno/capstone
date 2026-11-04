// Autoverificacion: compara con los valores del prototipo (V=400 V, I=82/85/79 A, fp=0.82, TR 250 kVA 4.5 %)
// Ejecutar: node --experimental-strip-types scripts/calculos.check.ts
import assert from "node:assert/strict";
import { armonicos, calcular, INSTALACION_DEFECTO, leer } from "../src/lib/calculos.ts";

const vfn = 400 / Math.sqrt(3);
const l = leer({ voltaje_l1: vfn, voltaje_l2: vfn, voltaje_l3: vfn, corriente_l1: 82, corriente_l2: 85, corriente_l3: 79, factor_potencia: 0.82, thd: 18.3 })!;
const c = calcular(l, INSTALACION_DEFECTO);
const cerca = (a: number, b: number, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol * Math.abs(b), `${a} != ${b}`);

// Valores de referencia calculados a mano con las formulas de prototipo.html
const I = 82;
const S = (Math.sqrt(3) * 400 * I) / 1000;
cerca(c.S, S);
cerca(c.P, S * 0.82);
cerca(c.Q, S * 0.82 * Math.tan(Math.acos(0.82)));
const Ztr = (0.045 * 400 ** 2) / 250000;
cerca(c.Z_tr, Ztr);
cerca(c.Icc_ori, 400 / (Ztr * Math.sqrt(3)));
cerca(c.fp_fin, 0.95);
assert.ok(c.Qc > 0 && c.Q_fin < c.Q);
assert.equal(c.desbalance, 0);
assert.equal(leer({ voltaje_l1: "220" }), null);
assert.equal(armonicos(10).length, 12);
cerca(armonicos(10).find((h) => h.n === 5)!.pct, 5.5);
console.log("calculos OK");
