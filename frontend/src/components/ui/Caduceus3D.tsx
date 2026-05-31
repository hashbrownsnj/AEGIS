import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

/**
 * Caduceus3D — the hero centerpiece.
 *
 * A real-time WebGL caduceus (the medical staff with twin serpents and wings)
 * rendered with three.js. Polished gold metal, an emissive finial and a soft
 * bloom pass give it the "Apple product shot" glow. It auto-revolves, bobs
 * gently, and tilts toward the pointer so it feels alive and reactive.
 *
 * Degrades gracefully: honors prefers-reduced-motion (renders a single static
 * frame), pauses when the tab is hidden, and disposes everything on unmount.
 */
export function Caduceus3D({ className }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const GOLD = 0xe9a23b;
    const GLOW = 0xff8a2a;

    let width = mount.clientWidth || 560;
    let height = mount.clientHeight || 560;

    // ── Renderer ──────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.display = "block";
    mount.appendChild(renderer.domElement);

    // ── Scene + camera ────────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 100);
    camera.position.set(0, 0.2, 9.2);

    // ── Lighting (warm key + cool rim, matching the brand) ─────
    scene.add(new THREE.AmbientLight(0xffe6c4, 0.45));

    const key = new THREE.PointLight(0xffb061, 48, 60, 2);
    key.position.set(5, 6, 7);
    scene.add(key);

    const rim = new THREE.PointLight(0x4ba3ff, 30, 60, 2);
    rim.position.set(-6, -2, -4);
    scene.add(rim);

    const fill = new THREE.DirectionalLight(0xfff0dd, 0.55);
    fill.position.set(-3, 4, 5);
    scene.add(fill);

    // ── Materials ─────────────────────────────────────────────
    const goldMetal = new THREE.MeshStandardMaterial({
      color: GOLD,
      metalness: 1,
      roughness: 0.22,
      emissive: new THREE.Color(GLOW),
      emissiveIntensity: 0.28,
    });
    const goldBright = new THREE.MeshStandardMaterial({
      color: 0xffc879,
      metalness: 1,
      roughness: 0.15,
      emissive: new THREE.Color(GLOW),
      emissiveIntensity: 0.55,
    });
    const finialMat = new THREE.MeshStandardMaterial({
      color: 0xffd89a,
      metalness: 0.6,
      roughness: 0.2,
      emissive: new THREE.Color(0xffb347),
      emissiveIntensity: 1.6,
    });

    // The whole emblem lives in this group so we can spin / tilt it.
    const caduceus = new THREE.Group();
    scene.add(caduceus);

    // ── Central staff ─────────────────────────────────────────
    const staff = new THREE.Mesh(
      new THREE.CylinderGeometry(0.085, 0.085, 5.0, 40),
      goldMetal
    );
    caduceus.add(staff);

    // small collars to break up the staff
    [1.9, -1.9].forEach((y) => {
      const collar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.14, 0.16, 40),
        goldBright
      );
      collar.position.y = y;
      caduceus.add(collar);
    });

    // ── Glowing finial orb on top ─────────────────────────────
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.26, 48, 48), finialMat);
    finial.position.y = 2.62;
    caduceus.add(finial);

    // ── Twin serpents (parametric helices) ────────────────────
    class Helix extends THREE.Curve<THREE.Vector3> {
      constructor(
        private radius: number,
        private heightSpan: number,
        private turns: number,
        private phase: number
      ) {
        super();
      }
      getPoint(t: number, target = new THREE.Vector3()) {
        const a = this.phase + t * this.turns * Math.PI * 2;
        // serpents taper inward toward the top for a coiling feel
        const r = this.radius * (0.62 + 0.38 * (1 - t * 0.55));
        const x = r * Math.cos(a);
        const z = r * Math.sin(a);
        const y = -this.heightSpan / 2 + t * this.heightSpan;
        return target.set(x, y, z);
      }
    }

    const snakeGroup = new THREE.Group();
    caduceus.add(snakeGroup);

    [0, Math.PI].forEach((phase) => {
      const curve = new Helix(0.46, 4.0, 3.25, phase);
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 240, 0.058, 18, false),
        goldMetal
      );
      snakeGroup.add(tube);

      // serpent head — an elongated tilted ellipsoid rising off the staff
      const top = curve.getPoint(1);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 28, 28), goldBright);
      head.scale.set(1, 1.7, 1);
      head.position.copy(top);
      head.position.y += 0.16;
      head.position.x *= 1.5;
      head.position.z *= 1.5;
      head.lookAt(0, top.y + 0.9, 0);
      snakeGroup.add(head);

      // tiny eye glints
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 12), finialMat);
      eye.position.copy(head.position);
      eye.position.y += 0.06;
      snakeGroup.add(eye);
    });

    // ── Wings (the Aegis identity, swept + feathered) ─────────
    function makeWing() {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.quadraticCurveTo(0.5, 0.62, 1.7, 0.74); // leading edge sweeps up/out
      // feathered trailing edge
      shape.lineTo(1.42, 0.5);
      shape.lineTo(1.66, 0.42);
      shape.lineTo(1.28, 0.26);
      shape.lineTo(1.46, 0.18);
      shape.lineTo(1.0, 0.06);
      shape.lineTo(1.14, -0.04);
      shape.quadraticCurveTo(0.42, 0.0, 0, 0);
      const geo = new THREE.ExtrudeGeometry(shape, {
        depth: 0.05,
        bevelEnabled: true,
        bevelSize: 0.018,
        bevelThickness: 0.018,
        bevelSegments: 2,
      });
      geo.center();
      return geo;
    }
    const wingGeo = makeWing();

    const wingR = new THREE.Mesh(wingGeo, goldBright);
    wingR.position.set(0.42, 2.18, 0);
    wingR.rotation.z = 0.32;
    caduceus.add(wingR);

    const wingL = new THREE.Mesh(wingGeo, goldBright);
    wingL.position.set(-0.42, 2.18, 0);
    wingL.scale.x = -1;
    wingL.rotation.z = -0.32;
    caduceus.add(wingL);

    // ── Halo ring behind (echoes the old orb, ties brand together) ──
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(2.55, 0.012, 16, 160),
      new THREE.MeshStandardMaterial({
        color: GLOW,
        emissive: new THREE.Color(GLOW),
        emissiveIntensity: 1.1,
        metalness: 0.4,
        roughness: 0.4,
      })
    );
    halo.position.z = -1.2;
    scene.add(halo);

    // ── Floating dust particles for depth ─────────────────────
    const COUNT = 150;
    const positions = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 11;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 11;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 6 - 1;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const dust = new THREE.Points(
      dustGeo,
      new THREE.PointsMaterial({
        color: 0xffb066,
        size: 0.035,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    scene.add(dust);

    caduceus.rotation.x = 0.12;

    // ── Post-processing bloom ─────────────────────────────────
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      reduceMotion ? 0.5 : 0.72, // strength
      0.5, // radius
      0.18 // threshold — only bright emissive/highlights bloom
    );
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // ── Pointer reactivity ────────────────────────────────────
    const pointer = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };
    function onPointer(e: PointerEvent) {
      // map pointer to [-1, 1] relative to viewport center
      target.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.y = (e.clientY / window.innerHeight) * 2 - 1;
    }
    if (!reduceMotion) window.addEventListener("pointermove", onPointer, { passive: true });

    // ── Animation loop ────────────────────────────────────────
    let raf = 0;
    const clock = new THREE.Clock();
    let spin = 0;

    function frame() {
      const t = clock.getElapsedTime();
      const dt = clock.getDelta();

      // ease pointer
      pointer.x += (target.x - pointer.x) * 0.05;
      pointer.y += (target.y - pointer.y) * 0.05;

      spin += dt * 0.45;
      caduceus.rotation.y = spin + pointer.x * 0.5;
      caduceus.rotation.x = 0.12 + pointer.y * 0.28;
      caduceus.position.y = Math.sin(t * 0.9) * 0.12; // float bob

      halo.rotation.z -= dt * 0.18;
      halo.rotation.x = 0.4 + pointer.y * 0.2;
      halo.rotation.y = -pointer.x * 0.2;

      dust.rotation.y = t * 0.02;
      finialMat.emissiveIntensity = 1.4 + Math.sin(t * 2.0) * 0.35; // soft pulse

      composer.render();
      raf = requestAnimationFrame(frame);
    }

    if (reduceMotion) {
      clock.getDelta();
      composer.render();
    } else {
      raf = requestAnimationFrame(frame);
    }

    // pause when tab hidden (saves battery, keeps it smooth on return)
    function onVisibility() {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (!reduceMotion && raf === 0) {
        clock.getDelta();
        raf = requestAnimationFrame(frame);
      }
    }
    document.addEventListener("visibilitychange", onVisibility);

    // ── Resize ────────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      width = mount!.clientWidth || width;
      height = mount!.clientHeight || height;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      composer.setSize(width, height);
    });
    ro.observe(mount);

    // ── Cleanup ───────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointer);
      scene.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = (m as any).material;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else if (mat) mat.dispose();
      });
      wingGeo.dispose();
      composer.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className={className} aria-hidden />;
}
