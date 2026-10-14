'use strict';

const SUFFIXES = ['K','M','B','T','Qa','Qi','Sx','Sp','Oc','No','Dc','Ud','Dd','Td','Qad','Qid','Sxd','Spd','Ocd','Nod'];

function notationMode(){
  try{ if (typeof S !== 'undefined' && S && S.settings) return S.settings.notation; }catch(e){}
  return 'short';
}

function trimNum(v){
  if (v >= 100) return String(Math.round(v));
  if (v >= 10) return (Math.round(v * 10) / 10).toString();
  return (Math.round(v * 100) / 100).toString();
}

function sciStr(v){
  const e = Math.floor(Math.log10(v));
  const m = v / Math.pow(10, e);
  return m.toFixed(2) + 'e' + e;
}

function fmtNum(v){
  if (!isFinite(v)) return '∞';
  if (v < 0) return '-' + fmtNum(-v);
  if (v < 1000) return trimNum(v);
  if (notationMode() === 'sci') return sciStr(v);
  let tier = Math.floor(Math.log10(v) / 3);
  if (tier - 1 >= SUFFIXES.length) return sciStr(v);
  const m = v / Math.pow(10, tier * 3);
  let ms;
  if (m >= 100) ms = m.toFixed(0);
  else if (m >= 10) ms = m.toFixed(1);
  else ms = m.toFixed(2);
  return ms + SUFFIXES[tier - 1];
}

function fmtInt(v){
  v = Math.floor(v);
  if (v < 0) return '-' + fmtInt(-v);
  if (v < 1e6) return v.toLocaleString('en-US');
  return fmtNum(v);
}

function fmtCash(v){
  const s = fmtNum(v);
  return (s.startsWith('-') ? '-$' : '$') + s.replace('-', '');
}

function fmtRate(v){ return fmtCash(v) + '/s'; }

function fmtOre(v){ return fmtInt(v); }

function fmtTime(sec){
  sec = Math.floor(sec);
  if (sec < 60) return sec + 's';
  const m = Math.floor(sec / 60), s = sec % 60;
  if (m < 60) return m + 'm ' + s + 's';
  const h = Math.floor(m / 60), mm = m % 60;
  if (h < 24) return h + 'h ' + mm + 'm';
  const d = Math.floor(h / 24), hh = h % 24;
  return d + 'd ' + hh + 'h';
}
