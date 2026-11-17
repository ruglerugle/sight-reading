'use strict';
// Recorded piano only: keyboard + score demo. UI sounds, MIDI judgement and stems stay separate.
const WarmPiano = (() => {
  const ROOTS = Array.from({ length: 30 }, (_, i) => 21 + i * 3);
  const LAYERS = [5, 8, 10];
  const MAX_VOICES = 32, MAX_BUFFERS = 36;
  const rootOf = (midi) => Math.min(108, Math.max(21, Math.round((midi - 21) / 3) * 3 + 21));
  const layerOf = (velocity) => velocity < 0.43 ? 5 : velocity > 0.78 ? 10 : 8;
  const releaseOf = (midi) => midi < 60 ? 0.8 : 0.65;

  // Audio-only plan: preserve scoring events, merge ties, clip at selected practice boundaries.
  const plan = (hands, fromBeat, toBeat, beatTime) => {
    const result = [];
    for (const notes of hands) for (let i = 0; i < notes.length; i++) {
      const n = notes[i];
      if (n.rest || n.cont) continue;
      let last = n, end = n.t + n.beats, j = i;
      while (last.tie && notes[j + 1]?.cont) {
        last = notes[++j]; end = last.t + last.beats;
      }
      const start = Math.max(fromBeat, n.t), stop = Math.min(toBeat, end);
      if (stop <= start) continue;
      for (const midi of n.midis) result.push({ midi, time: beatTime(start) - beatTime(fromBeat),
        duration: beatTime(stop) - beatTime(start), offset: beatTime(start) - beatTime(n.t), velocity: Math.max(0, Math.min(1, n.velocity ?? 0.62)) });
    }
    return result.sort((a, b) => a.time - b.time);
  };

  const create = (ctx, out, fallback, base = 'audio/piano/warm-grand/') => {
    const buffers = new Map(), pending = new Map(), failed = new Map(), queue = [];
    const routes = new Map(); let inflight = 0;
    const trim = () => { while (buffers.size > MAX_BUFFERS) buffers.delete(buffers.keys().next().value); };
    const drain = () => {
      while (inflight < 3 && queue.length) {
        const job = queue.shift(); inflight++;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);
        fetch(`${base}${job.key}.mp3`, { signal: controller.signal })
          .then((r) => { if (!r.ok) throw new Error(`piano sample ${r.status}`); return r.arrayBuffer(); })
          .then((b) => ctx.decodeAudioData(b))
          .then((b) => { buffers.set(job.key, b); trim(); job.resolve(true); })
          .catch(() => { failed.set(job.key, Date.now()); job.resolve(false); })
          .finally(() => { clearTimeout(timeout); pending.delete(job.key); inflight--; drain(); });
      }
    };
    const request = (midi, layer = 8) => {
      if (!Number.isFinite(midi) || midi < 21 || midi > 108) return Promise.resolve(false);
      const key = `${rootOf(midi)}-v${layer}`;
      if (buffers.has(key)) return Promise.resolve(true);
      if (pending.has(key)) return pending.get(key);
      if (Date.now() - (failed.get(key) || 0) < 30000) return Promise.resolve(false);
      const promise = new Promise((resolve) => queue.push({ key, resolve }));
      pending.set(key, promise); drain(); return promise;
    };
    const preload = (midis) => {
      // Only the working register; no complete-library decode on phones.
      const roots = [...new Set(midis.filter((m) => m >= 21 && m <= 108).map(rootOf))];
      roots.slice(0, MAX_BUFFERS).forEach((m) => request(m));
    };
    const roomImpulse = () => {
      const ir = ctx.createBuffer(2, Math.ceil(ctx.sampleRate * 0.5), ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = ir.getChannelData(ch);
        [[.017,.065],[.029,.048],[.047,.034],[.073,.024],[.109,.016]].forEach(([t,g]) => { d[Math.floor((t + ch * .004) * ctx.sampleRate)] = g; });
        // Deterministic, extremely quiet diffuse tail; no random timing on notes.
        let seed = 31 + ch;
        for (let t = .13; t < .48; t += .011) {
          seed = (1664525 * seed + 1013904223) >>> 0;
          d[Math.floor(t * ctx.sampleRate)] = ((seed / 4294967296) * 2 - 1) * .008 * Math.exp(-(t - .13) * 10);
        }
      }
      return ir;
    };
    const impulse = roomImpulse();
    const route = (dest) => {
      if (routes.has(dest)) return routes.get(dest);
      const input = ctx.createGain(), mix = ctx.createGain();
      // Sample levels stay relative: no per-file normalization. Headroom for dense chords.
      input.gain.value = 0.48;
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 35;
      const body = ctx.createBiquadFilter(); body.type = 'peaking'; body.frequency.value = 180; body.Q.value = .7; body.gain.value = 1.2;
      const presence = ctx.createBiquadFilter(); presence.type = 'peaking'; presence.frequency.value = 2700; presence.Q.value = .8; presence.gain.value = -1.2;
      const high = ctx.createBiquadFilter(); high.type = 'highshelf'; high.frequency.value = 6500; high.gain.value = -.5;
      input.connect(hp).connect(body).connect(presence).connect(high).connect(mix);
      const roomHP = ctx.createBiquadFilter(); roomHP.type = 'highpass'; roomHP.frequency.value = 250;
      const roomLP = ctx.createBiquadFilter(); roomLP.type = 'lowpass'; roomLP.frequency.value = 4500;
      const room = ctx.createConvolver(); room.normalize = false; room.buffer = impulse;
      high.connect(roomHP).connect(roomLP).connect(room).connect(mix);
      // M/S width +~1 dB, as in approved comparison. Mono still sums to unchanged mid.
      const split = ctx.createChannelSplitter(2), merge = ctx.createChannelMerger(2);
      mix.connect(split); const width = [];
      [[0,0,1.06],[0,1,-.06],[1,0,-.06],[1,1,1.06]].forEach(([a,b,g]) => {
        const node = ctx.createGain(); node.gain.value = g; split.connect(node,a); node.connect(merge,0,b); width.push(node);
      });
      const limiter = ctx.createDynamicsCompressor(); limiter.threshold.value = -9; limiter.knee.value = 6;
      limiter.ratio.value = 8; limiter.attack.value = .003; limiter.release.value = .12;
      merge.connect(limiter).connect(dest);
      const r = { input, voices: new Set(), nodes: [input,hp,body,presence,high,roomHP,roomLP,room,mix,split,merge,limiter,...width] };
      routes.set(dest, r); return r;
    };
    const stopRoute = (dest) => {
      const r = routes.get(dest); if (!r) return;
      for (const voice of r.voices) voice.stop();
      r.voices.clear(); r.nodes.forEach((n) => n.disconnect()); routes.delete(dest);
    };
    const play = (midi, at = ctx.currentTime, dest = out, options = {}) => {
      if (!Number.isFinite(midi)) return null;
      const velocity = Math.max(0, Math.min(1, options.velocity ?? .62));
      const layer = layerOf(velocity), root = rootOf(midi), key = `${root}-v${layer}`;
      request(midi, layer); // Never await a network/decode on a note-on, and never replay a late note.
      let buffer = buffers.get(key), usedKey = key, usedLayer = layer;
      if (!buffer && layer !== 8) { usedKey = `${root}-v8`; buffer = buffers.get(usedKey); usedLayer = 8; }
      if (!buffer || midi < 21 || midi > 108) {
        // Limit audible fallback voices too. They never replay when a sample arrives.
        const r = route(dest);
        for (const voice of r.voices) if (voice.end < ctx.currentTime) { voice.stop(); r.voices.delete(voice); }
        while (r.voices.size >= MAX_VOICES) { const old = r.voices.values().next().value; old.stop(true); r.voices.delete(old); }
        const gain = fallback(midi, at, r.input);
        if (!gain) return null;
        const voice = { end: Math.max(ctx.currentTime, at) + 2.6, stop: (fade = false) => {
          if (fade && at <= ctx.currentTime) {
            gain.gain.cancelScheduledValues(ctx.currentTime);
            gain.gain.setTargetAtTime(.0001, ctx.currentTime, .003);
            setTimeout(() => gain.disconnect(), 15);
          } else gain.disconnect();
        } };
        r.voices.add(voice); return voice;
      }
      buffers.delete(usedKey); buffers.set(usedKey, buffer);
      const r = route(dest), start = Math.max(ctx.currentTime, at);
      for (const voice of r.voices) if (voice.end < ctx.currentTime) { voice.stop(); r.voices.delete(voice); }
      while (r.voices.size >= MAX_VOICES) { const voice = r.voices.values().next().value; voice.stop(true); r.voices.delete(voice); }
      const source = ctx.createBufferSource(); source.buffer = buffer;
      const rate = 2 ** ((midi - root) / 12); source.playbackRate.value = rate;
      const offset = Math.max(0, options.offset || 0);
      if (offset * rate >= buffer.duration - .01) return null; // Already decayed; no fresh attack on resume.
      const duration = Math.max(.03, Math.min(30, options.duration ?? .75)), release = releaseOf(midi);
      const gain = ctx.createGain(), level = ({5:.57,8:.66,10:.8}[usedLayer]) * (midi < 55 ? .9 : 1);
      // A resumed sustain uses its original sample position, not a new hammer strike.
      gain.gain.setValueAtTime(offset ? .0001 : level, start);
      if (offset) gain.gain.linearRampToValueAtTime(level, start + .008);
      gain.gain.setValueAtTime(level, start + duration);
      gain.gain.exponentialRampToValueAtTime(.0001, start + duration + release);
      source.connect(gain).connect(r.input);
      const end = Math.min(start + duration + release + .01, start + buffer.duration / rate - offset);
      const voice = { end, stop: (fade = false) => {
        if (fade && start <= ctx.currentTime) {
          const now = ctx.currentTime;
          gain.gain.cancelScheduledValues(now);
          gain.gain.setTargetAtTime(.0001, now, .003);
          try { source.stop(now + .015); } catch (_) {}
        } else { try { source.stop(); } catch (_) {} source.disconnect(); gain.disconnect(); }
      } };
      r.voices.add(voice); source.onended = () => { r.voices.delete(voice); source.disconnect(); gain.disconnect(); };
      source.start(start, offset * rate); source.stop(end); return voice;
    };
    return { play, preload, request, stopRoute,
      stats: () => ({ buffers: buffers.size, pending: pending.size, routes: routes.size, voices: [...routes.values()].reduce((n,r) => n+r.voices.size,0) }) };
  };
  return { create, plan, rootOf, layerOf, releaseOf, ROOTS, LAYERS };
})();
if (typeof module !== 'undefined') module.exports = WarmPiano;
