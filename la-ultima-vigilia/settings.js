/* Un único adaptador entre preferencias guardadas, controles y motores. */
export function bindSettings(game, settings, store, toast) {
  const $ = id => document.getElementById(id);
  const apply = () => {
    game.setOptions({shake: settings.shake, flashes: settings.flashes, numbers: settings.numbers, softDark: settings.softDark});
    game.audio.setMix({music: settings.music, ambience: settings.ambience, effects: settings.effects});
    store.set('settings', settings);
  };
  const syncSound = () => {
    $('soundButton').querySelector('use').setAttribute('href', settings.muted ? '#i-mute' : '#i-sound');
    $('soundButton').setAttribute('aria-label', settings.muted ? 'Activar sonido' : 'Silenciar');
    $('optSound').checked = !settings.muted;
  };
  const setMuted = value => {
    settings.muted = value;
    game.audio.init(); game.setMuted(value);
    syncSound(); apply();
  };
  $('soundButton').addEventListener('click', () => {
    setMuted(!settings.muted);
    toast(settings.muted ? 'Sonido apagado' : 'Sonido encendido');
  });
  $('optSound').addEventListener('change', e => setMuted(!e.target.checked));
  for (const [id, key] of [['optVolume', 'volume'], ['optMusic', 'music'], ['optAmbience', 'ambience'], ['optEffects', 'effects']]) {
    const input = $(id), output = $(id + 'Value');
    const sync = () => { input.value = Math.round(settings[key] * 100); output.value = input.value + ' %'; };
    sync();
    input.addEventListener('input', () => {
      settings[key] = Number(input.value) / 100;
      game.setVolume(settings.volume); sync(); apply();
    });
  }
  for (const [id, key] of [['optShake', 'shake'], ['optFlashes', 'flashes'], ['optNumbers', 'numbers'], ['optSoftDark', 'softDark']]) {
    $(id).checked = settings[key];
    $(id).addEventListener('change', e => { settings[key] = e.target.checked; apply(); });
  }
  game.setVolume(settings.volume);
  game.audio.setMix({music: settings.music, ambience: settings.ambience, effects: settings.effects});
  syncSound();
}
