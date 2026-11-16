/*
 * El suelo mojado, el viento y los faroles del ritual. El dibujo nunca decide
 * colisiones ni daño. Las huellas tienen un presupuesto fijo; el resto se
 * obtiene de coordenadas y semillas, sin generar objetos por fotograma.
 */
import { TAU, clamp } from './util.js';
import { hash, drawShadow } from './art.js';
import { surfaceAt } from './world.js';
import { RITUAL_RADIUS, RITUAL_LIGHT_RADIUS } from './balance.js';
import { RITES } from './story.js';

export const SCENE_PALETTE = Object.freeze({
  wet: '#101d24', reflection: '#90b9ca', bronze: '#a58b55',
  iron: '#252f35', stone: '#68777c', leaf: '#a78250', safe: '#f2d99b'
});

const MAX_FOOTPRINTS = 48;
const circle = (ctx, x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); };

export class SceneEffects {
  constructor() { this.owner = null; this.footprints = []; this.last = null; this.foot = 0; }

  update(dt, game) {
    const p = game.player;
    if (this.owner !== p) { this.owner = p; this.footprints = []; this.last = {x: p.x, y: p.y}; this.foot = 0; }
    for (const mark of this.footprints) mark.life -= dt;
    this.footprints = this.footprints.filter(mark => mark.life > 0);
    const distance = Math.hypot(p.x - this.last.x, p.y - this.last.y);
    if (game.state !== 'running' || distance > 90 || dt > 0.2) { this.last = {x: p.x, y: p.y}; return; }
    if (distance < 15 || game.dashTime > 0) return;
    const a = Math.atan2(p.y - this.last.y, p.x - this.last.x), side = this.foot++ % 2 ? 1 : -1;
    this.footprints.push({x: p.x + Math.cos(a + Math.PI / 2) * side * 4,
      y: p.y + 8 + Math.sin(a + Math.PI / 2) * side * 4, a, life: 3.8, wet: surfaceAt(p.x, p.y) !== 'hierba'});
    if (this.footprints.length > MAX_FOOTPRINTS) this.footprints.shift();
    this.last = {x: p.x, y: p.y};
  }

  ground(ctx, game, camX, camY) {
    const w = game.width, h = game.height, time = game.options.shake || game.options.flashes ? game.clock : 0;
    ctx.save();
    // Charcos pequeños en las avenidas: aristas de píxel y reflejos horizontales.
    let count = 0;
    for (let gy = Math.floor(camY / 128); gy <= (camY + h) / 128; gy++) {
      for (let gx = Math.floor(camX / 128); gx <= (camX + w) / 128; gx++) {
        if (count >= 28) break;
        const seed = hash(gx, gy, 207), wx = gx * 128 + 24 + seed * 80, wy = gy * 128 + hash(gx, gy, 208) * 104;
        if (seed < 0.24 || surfaceAt(wx, wy) === 'hierba' || Math.hypot(wx, wy) < 104) continue;
        count++;
        const x = Math.round(wx - camX), y = Math.round(wy - camY), r = 11 + Math.round(seed * 16);
        ctx.fillStyle = SCENE_PALETTE.wet; ctx.globalAlpha = 0.74;
        ctx.beginPath(); ctx.moveTo(x - r, y - 2); ctx.lineTo(x - r + 6, y - 6); ctx.lineTo(x + r - 8, y - 7);
        ctx.lineTo(x + r, y - 2); ctx.lineTo(x + r - 3, y + 4); ctx.lineTo(x - r + 8, y + 6); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 0.18; ctx.fillStyle = SCENE_PALETTE.reflection;
        ctx.fillRect(x - r + 8, y - 5, Math.round(r * 0.85), 1); ctx.fillRect(x + 3, y + 3, r - 6, 1);
        const distance = Math.hypot(game.player.x - wx, game.player.y - wy);
        if (game.state !== 'ready' && distance < 160) {
          const strength = (1 - distance / 160) * 0.38;
          ctx.fillStyle = SCENE_PALETTE.safe;
          for (let k = 0; k < 4; k++) {
            ctx.globalAlpha = strength * (1 - k * 0.19);
            ctx.fillRect(x - 3 - k + Math.round(Math.sin(time * 2 + k + seed) * 2), y - 4 + k * 2, 4 + k * 2, 1);
          }
        }
      }
    }
    if (this.owner === game.player) for (const mark of this.footprints) {
      ctx.save(); ctx.translate(Math.round(mark.x - camX), Math.round(mark.y - camY)); ctx.rotate(mark.a);
      ctx.globalAlpha = clamp(mark.life / 3.8, 0, 1) * 0.35;
      ctx.fillStyle = mark.wet ? '#070c10' : '#6b6350'; ctx.fillRect(-3, -1, 6, 3);
      if (mark.wet) { ctx.fillStyle = SCENE_PALETTE.reflection; ctx.globalAlpha *= 0.5; ctx.fillRect(-2, 2, 4, 1); }
      ctx.restore();
    }
    ctx.restore();
  }

  leaves(ctx, game, camX, camY) {
    if (!game.options.shake && !game.options.flashes) return;
    const cell = 180, time = game.clock;
    ctx.save();
    let drawn = 0;
    for (let gy = Math.floor((camY - 100) / cell); gy <= (camY + game.height + 100) / cell; gy++) {
      for (let gx = Math.floor((camX - 100) / cell); gx <= (camX + game.width + 100) / cell; gx++) {
        if (drawn >= 36) break;
        const seed = hash(gx, gy, 219);
        if (seed < 0.32) continue;
        const drift = ((time * (10 + seed * 12) + seed * 430) % (cell * 2)) - cell;
        const x = gx * cell + drift - camX, y = gy * cell + seed * cell + Math.sin(time * 0.7 + seed * 12) * 13 - camY;
        if (x < -10 || x > game.width + 10 || y < -10 || y > game.height + 10) continue;
        drawn++;
        ctx.globalAlpha = 0.25; ctx.fillStyle = '#060b10'; ctx.fillRect(Math.round(x + 3), Math.round(y + 14), 5, 1);
        ctx.globalAlpha = 0.54; ctx.fillStyle = SCENE_PALETTE.leaf;
        ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(Math.sin(time * 2 + seed * 15) * 0.7);
        ctx.fillRect(-2, -1, 5, 2); ctx.fillRect(-1, -2, 2, 4); ctx.restore();
      }
    }
    ctx.restore();
  }

  ritualGround(ctx, ritual, camX, camY) {
    const x = ritual.x - camX, y = ritual.y - camY, near = ritual.progress > 0 && !ritual.lit;
    ctx.save();
    ctx.strokeStyle = ritual.lit ? 'rgba(242,217,155,.23)' : near ? 'rgba(242,217,155,.65)' : 'rgba(144,185,202,.2)';
    ctx.lineWidth = 1; ctx.setLineDash(ritual.lit ? [2, 10] : [3, 7]);
    const radius = ritual.lit ? RITUAL_LIGHT_RADIUS : RITUAL_RADIUS;
    circle(ctx, x, y, radius); ctx.stroke(); ctx.setLineDash([]);
    if (ritual.lit) {
      ctx.fillStyle = 'rgba(242,217,155,.035)'; circle(ctx, x, y, radius); ctx.fill();
      ctx.strokeStyle = 'rgba(242,217,155,.14)'; circle(ctx, x, y, radius - 8); ctx.stroke();
    }
    // Cuatro granos de sal indican el círculo incluso con destellos apagados.
    ctx.fillStyle = ritual.lit ? SCENE_PALETTE.safe : SCENE_PALETTE.stone;
    for (let i = 0; i < 4; i++) { const a = i * TAU / 4; ctx.fillRect(Math.round(x + Math.cos(a) * RITUAL_RADIUS - 1), Math.round(y + Math.sin(a) * RITUAL_RADIUS - 1), 2, 2); }
    if (near) {
      ctx.strokeStyle = SCENE_PALETTE.safe; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(x, y, RITUAL_RADIUS, -Math.PI / 2, -Math.PI / 2 + TAU * ritual.progress); ctx.stroke();
    }
    ctx.restore();
  }

  ritual(ctx, ritual, x, y, layer, clock, flashes) {
    const lit = ritual.lit, progress = ritual.progress || 0;
    ctx.save(); ctx.translate(Math.round(x), Math.round(y));
    if (layer === 'base') {
      drawShadow(ctx, 0, 7, 13, 0.5);
      ctx.fillStyle = '#141a20'; ctx.fillRect(-12, 2, 24, 6); ctx.fillRect(-9, -2, 18, 5);
      ctx.fillStyle = '#526168'; ctx.fillRect(-10, 2, 20, 2); ctx.fillStyle = '#2d3a40'; ctx.fillRect(-7, -2, 14, 4);
      ctx.fillStyle = SCENE_PALETTE.iron; ctx.fillRect(-4, -24, 8, 23); ctx.fillRect(-9, -33, 18, 17);
      ctx.fillStyle = lit ? '#806133' : '#34434a'; ctx.fillRect(-6, -30, 12, 12);
      ctx.fillStyle = '#101a20'; ctx.fillRect(-9, -35, 18, 3); ctx.fillRect(-6, -38, 12, 3); ctx.fillRect(-2, -42, 4, 5);
      ctx.fillStyle = SCENE_PALETTE.bronze; ctx.fillRect(-9, -34, 18, 1); ctx.fillRect(-7, -17, 14, 2);
      ctx.fillStyle = '#728b94'; ctx.fillRect(-6, -29, 2, 9); ctx.fillRect(4, -29, 1, 9);
      ctx.fillStyle = '#060e14'; ctx.fillRect(-8, -31, 2, 15); ctx.fillRect(6, -31, 2, 15);
      ctx.fillStyle = '#899197'; ctx.fillRect(-6, 0, 4, 1);
    } else {
      const strength = lit ? 1 : progress * 0.75;
      if (strength > 0) {
        ctx.globalAlpha = strength;
        ctx.fillStyle = 'rgba(255,176,74,.45)'; ctx.fillRect(-5, -29, 10, 12);
        ctx.fillStyle = '#ffb04a'; ctx.fillRect(-3, -28, 6, 10);
        ctx.fillStyle = '#fff2bc'; ctx.fillRect(-1, -28 - (flashes ? Math.round(Math.sin(clock * 7 + ritual.x) * 1) : 0), 2, 8);
        ctx.fillStyle = SCENE_PALETTE.bronze; ctx.fillRect(-1, -17, 2, 6);
      } else {
        ctx.fillStyle = '#9cbfca'; ctx.globalAlpha = 0.65; ctx.fillRect(-1, -26, 2, 4);
      }
    }
    ctx.restore();
  }

  signals(ctx, game, camX, camY) {
    ctx.save();
    for (const ward of game.wards || []) {
      const x = ward.x - camX, y = ward.y - camY, fade = clamp(ward.life / 0.55, 0, 1);
      ctx.globalAlpha = fade;
      ctx.strokeStyle = '#bee0f2'; ctx.lineWidth = 1.5; circle(ctx, x, y, ward.r); ctx.stroke();
      ctx.strokeStyle = 'rgba(190,224,242,.32)'; circle(ctx, x, y, ward.r - 7); ctx.stroke();
      // Granos de sal inmóviles: el límite real sigue siendo legible sin pulsos.
      for (let i = 0; i < 52; i++) {
        const a = i * TAU / 52, r = ward.r - hash(i, 0, 77) * 6;
        ctx.fillStyle = i % 3 ? '#bee0f2' : '#f4fbff';
        ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r), i % 4 ? 2 : 3, 2);
      }
      ctx.fillStyle = 'rgba(190,224,242,.025)'; circle(ctx, x, y, ward.r - 8); ctx.fill();
    }
    if (game.abilityTime > 0 && game.character !== 'julian') {
      const x = game.player.x - camX, y = game.player.y - camY - 6;
      const matilde = game.character === 'matilde', time = game.options.flashes ? game.clock : 0;
      ctx.globalAlpha = clamp(game.abilityTime * 2, 0, 0.65);
      ctx.strokeStyle = matilde ? '#f2d99b' : '#ffb04a'; ctx.lineWidth = 1;
      const r = matilde ? 52 : 40;
      circle(ctx, x, y, r); ctx.stroke();
      for (let i = 0; i < (matilde ? 12 : 8); i++) {
        const a = i * TAU / (matilde ? 12 : 8) + time * 0.35;
        ctx.save(); ctx.translate(x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.rotate(a);
        ctx.fillStyle = matilde ? '#fff4d8' : '#ffb04a'; ctx.fillRect(-3, -1, 7, 2); ctx.restore();
      }
      if (matilde) { ctx.fillStyle = '#fff4d8'; ctx.fillRect(x - 1, y - 17, 2, 25); ctx.fillRect(x - 8, y - 9, 16, 2); }
    }
    ctx.restore();
  }

  minimap(ctx, game) {
    if (!game.rituals?.length || !['running', 'paused', 'upgrade'].includes(game.state)) return;
    const zoom = game.zoom || 1, width = game.width * zoom, height = game.height * zoom;
    const small = width < 640;
    // En móvil el jefe ocupa esta zona: las flechas del mundo siguen orientando.
    if (small && game.boss?.hp > 0) return;
    const size = small ? 80 : 112, x = width - size - (small ? 14 : 24), y = small ? 114 : height - size - 148;
    if (height < 460) return;
    ctx.save(); ctx.scale(1 / zoom, 1 / zoom); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(7,12,17,.66)'; ctx.fillRect(-8, -19, size + 16, size + 43);
    ctx.strokeStyle = 'rgba(190,224,242,.23)'; ctx.lineWidth = 1; ctx.strokeRect(-8, -19, size + 16, size + 43);
    ctx.font = `${small ? 9 : 10}px 'Alegreya Sans', system-ui, sans-serif`; ctx.textAlign = 'left'; ctx.fillStyle = '#c7bdab';
    ctx.fillText(RITES.mapTitle.toLocaleUpperCase('es'), 0, -6);
    const center = size / 2, unit = size / 1240;
    const point = (wx, wy) => [clamp(center + wx * unit, 2, size - 2), clamp(center + wy * unit, 2, size - 2)];
    ctx.strokeStyle = 'rgba(190,224,242,.13)';
    ctx.beginPath(); ctx.moveTo(center, 0); ctx.lineTo(center, size); ctx.moveTo(0, center); ctx.lineTo(size, center); ctx.stroke();
    ctx.strokeStyle = 'rgba(242,217,155,.15)'; circle(ctx, center, center, size * 0.26); ctx.stroke();
    ctx.fillStyle = '#efe6d4'; ctx.fillRect(center - 1, center - 4, 2, 8); ctx.fillRect(center - 4, center - 2, 8, 2);
    for (const ritual of game.rituals) {
      const [rx, ry] = point(ritual.x, ritual.y);
      ctx.fillStyle = ritual.lit ? '#ffb04a' : '#1c2a32'; ctx.fillRect(rx - 3, ry - 3, 6, 6);
      ctx.strokeStyle = ritual.lit ? '#ffb04a' : '#a5bdc5'; ctx.strokeRect(rx - 3, ry - 3, 6, 6);
    }
    if (game.boss?.hp > 0) {
      const [bx, by] = point(game.boss.x, game.boss.y);
      ctx.fillStyle = '#ff785a'; circle(ctx, bx, by, 3); ctx.fill();
    }
    const [px, py] = point(game.player.x, game.player.y), a = Math.atan2(game.lastMove?.y || 0, game.lastMove?.x || 1);
    ctx.save(); ctx.translate(px, py); ctx.rotate(a); ctx.fillStyle = '#f4fbff';
    ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(-3, -3); ctx.lineTo(-2, 0); ctx.lineTo(-3, 3); ctx.closePath(); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#c7bdab'; ctx.fillText(`${RITES.mapCount} ${game.rituals.filter(r => r.lit).length} / ${game.rituals.length}`, 0, size + 15);
    ctx.restore();
  }
}
