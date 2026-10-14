'use strict';

function boot(){
  const report = loadGame();
  initUI();
  renderAll();
  if (!checkStorage()){
    toast('⚠ Your browser is blocking local saves on this file. Use <b>Export save</b> to back up, or run the included local server (see README) for automatic saving.', 'bad');
  }
  if (report && (report.value > 0.5 || Object.keys(report.ore).some(k => report.ore[k] > 0.5))){
    showOfflineModal(report);
  }
  startLoop();

  window.addEventListener('beforeunload', () => saveGame());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden'){
      saveGame();
    } else {
      // returning to the tab: grant production for the time away
      const away = (Date.now() - S.lastTick) / 1000;
      const report = applyAwayProduction(away);
      S.lastTick = Date.now();
      if (report) toast(`⛏️ Your miners kept working while you were away (+${fmtCash(report.value)} of ore).`, 'good');
    }
  });
}

if (document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
