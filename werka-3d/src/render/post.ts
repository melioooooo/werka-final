// Post stack: render -> soft bloom (half res) -> grade (split toning, S-curve, sun shafts,
// tilt-shift edge blur, vignette, tone map + sRGB in the same pass). Low keeps the grade, drops bloom/tilt.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const Grade = {
  uniforms: {
    tDiffuse: { value: null },
    uShadow: { value: new THREE.Color('#4f9fb8') }, // teal shadows
    uHigh: { value: new THREE.Color('#ffe2b0') }, // warm highlights
    uSat: { value: 1.0 },
    uVig: { value: 0.34 },
    uRays: { value: 0 }, // 0..1 soft sun shafts from the top-left, daytime only
    uTime: { value: 0 },
    uTilt: { value: 1 }, // 0..1 tilt-shift blur strength at the top/bottom edges
    uTiltQ: { value: 1 }, // quality gate for the tilt blur (0 on Low)
    uTexel: { value: new THREE.Vector2(1 / 1280, 1 / 800) },
  },
  vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform vec3 uShadow; uniform vec3 uHigh; uniform float uSat; uniform float uVig;
    uniform float uRays; uniform float uTime; uniform float uTilt; uniform float uTiltQ; uniform vec2 uTexel;
    varying vec2 vUv;
    void main() {
      vec4 src = texture2D(tDiffuse, vUv);
      vec3 c = src.rgb;
      // Tilt-shift: blur grows toward the top and bottom of the frame (miniature, layered depth).
      float e = smoothstep(0.3, 0.52, abs(vUv.y - 0.5)) * uTilt * uTiltQ;
      if (e > 0.01) {
        vec3 acc = c; float wsum = 1.0;
        for (int i = 0; i < 8; i++) {
          float a = float(i) * 0.785398;
          vec2 o = vec2(cos(a), sin(a)) * uTexel * 2.2 * e;
          acc += texture2D(tDiffuse, vUv + o).rgb + texture2D(tDiffuse, vUv + o * 2.2).rgb;
          wsum += 2.0;
        }
        c = acc / wsum;
      }
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, uSat);
      vec3 tint = mix(uShadow, uHigh, smoothstep(0.03, 0.55, l));
      c *= mix(vec3(1.0), tint, 0.42) * 1.08;
      c += uShadow * 0.035 * (1.0 - smoothstep(0.0, 0.25, l)); // lift crushed shadows toward teal
      // S-curve on luminance only: value contrast without crushing the weak channels (per-channel went neon).
      float lc = min(dot(c, vec3(0.2126, 0.7152, 0.0722)), 1.0);
      c *= mix(1.0, lc * (3.0 - 2.0 * lc), 0.35);
      vec2 o = vUv - vec2(-0.15, 1.25);
      float ang = atan(o.y, o.x);
      float bands = 0.5 + 0.5 * sin(ang * 23.0 + sin(ang * 7.0 + uTime * 0.15) * 2.0);
      bands *= 0.5 + 0.5 * sin(ang * 11.0 - uTime * 0.08);
      c += uHigh * bands * smoothstep(1.6, 0.2, length(o)) * uRays * 0.18;
      float v = smoothstep(0.9, 0.28, length((vUv - 0.5) * vec2(1.15, 1.0)));
      c *= mix(1.0 - uVig, 1.0, v);
      gl_FragColor = vec4(c, src.a);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
};

export function buildPost(renderer: THREE.WebGLRenderer, msaa: number) {
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: msaa });
  const composer = new EffectComposer(renderer, target);
  const render = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.32, 0.5, 1.0);
  const grade = new ShaderPass(Grade);
  composer.addPass(render);
  composer.addPass(bloom);
  composer.addPass(grade);

  let enabled = true;
  const setSize = (w: number, h: number, pr: number) => {
    composer.setPixelRatio(pr);
    composer.setSize(w, h);
    bloom.resolution.set(w / 2, h / 2);
    grade.uniforms.uTexel.value.set(1 / (w * pr), 1 / (h * pr));
  };
  const draw = (scene: THREE.Scene, camera: THREE.Camera) => {
    if (!enabled) { renderer.render(scene, camera); return; }
    render.scene = scene;
    render.camera = camera;
    composer.render();
  };
  const setEnabled = (on: boolean, withBloom = true) => {
    enabled = on;
    bloom.enabled = withBloom;
    grade.uniforms.uTiltQ.value = withBloom ? 1 : 0;
  };
  const dispose = () => { composer.dispose(); target.dispose(); };
  return { setSize, draw, bloom, grade, setEnabled, dispose };
}
