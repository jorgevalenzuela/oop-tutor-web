import { useRef, useEffect, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'
import { Moon, Sun, HelpCircle, X } from 'lucide-react'
import { OOP_HIERARCHY, HierarchyNode, NodeType } from '@/data/oopHierarchy'

// ─── Visual constants ────────────────────────────────────────────────────────

const NODE_COLOR: Record<NodeType, number> = {
  root:     0x3C3489,
  category: 0x7F77DD,
  concept:  0xEEEDFE,
  shared:   0x1D9E75,
  leaf:     0xD3D1C7,
}

// Dark mode — all labels light, high contrast on dark canvas (#0C0B22)
// WCAG AA: all combos > 7:1 ratio
const DARK_TEXT: Record<NodeType, string> = {
  root:     '#EEEDFE',
  category: '#ffffff',
  concept:  '#E8E6FD',
  shared:   '#dcf5ed',
  leaf:     '#D4D3D0',
}

// Light mode — all labels dark, high contrast on light canvas (#F8F7FF)
const LIGHT_TEXT: Record<NodeType, string> = {
  root:     '#2a2365',
  category: '#3C3489',
  concept:  '#3C3489',
  shared:   '#0d5e3a',
  leaf:     '#4a4a48',
}

const NODE_RADIUS: Record<NodeType, number> = {
  root:     0.85,
  category: 0.62,
  concept:  0.48,
  shared:   0.48,
  leaf:     0.28,
}

// Base font sizes in px — offset is added by font size controls
const BASE_FONT_PX: Record<NodeType, number> = {
  root:     14,
  category: 12,
  concept:  11,
  shared:   11,
  leaf:     10,
}

const FONT_WEIGHT: Record<NodeType, string> = {
  root:     '700',
  category: '600',
  concept:  '400',
  shared:   '400',
  leaf:     '400',
}

const BG_DARK  = 0x0C0B22
const BG_LIGHT = 0xF8F7FF

// Font offset range: 0 (min, leaf stays at 10px) → 10 (max, root reaches 24px)
const FONT_OFFSET_MIN = 0
const FONT_OFFSET_MAX = 10
const FONT_OFFSET_STEP = 2

// Layout
const ROOT_Y = 4.0
const Y_STEP = -2.2
const RADII  = [0, 5.5, 4.2, 3.2, 2.5, 2.0]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeFontPx(type: NodeType, offset: number): number {
  return Math.max(10, Math.min(24, BASE_FONT_PX[type] + offset))
}

function textShadow(isDark: boolean) {
  return isDark
    ? '0 1px 5px rgba(0,0,0,0.95), 0 0 10px rgba(0,0,0,0.7)'
    : '0 1px 2px rgba(255,255,255,0.6)'
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface LiveNode {
  data:         HierarchyNode
  mesh:         THREE.Mesh
  labelDiv:     HTMLDivElement
  labelObj:     CSS2DObject
  edge:         THREE.Line | null
  position:     THREE.Vector3
  parentLive:   LiveNode | null
  depth:        number
  angle:        number
  expanded:     boolean
  liveChildren: LiveNode[]
}

interface Ctx {
  scene:       THREE.Scene
  camera:      THREE.PerspectiveCamera
  renderer:    THREE.WebGLRenderer
  cssRenderer: CSS2DRenderer
  controls:    OrbitControls
  frameId:     number
  meshToNode:  Map<THREE.Mesh, LiveNode>
  selected:    LiveNode | null
  rootLive:    LiveNode
}

// ─── Layout helpers ──────────────────────────────────────────────────────────

function childPositions(
  parentPos: THREE.Vector3,
  parentAngle: number,
  n: number,
  depth: number,
): Array<{ pos: THREE.Vector3; angle: number }> {
  const r = RADII[Math.min(depth, RADII.length - 1)]
  const y = parentPos.y + Y_STEP

  if (depth === 1) {
    return Array.from({ length: n }, (_, i) => {
      const angle = Math.PI / 4 + (i * 2 * Math.PI) / n
      return { pos: new THREE.Vector3(parentPos.x + r * Math.cos(angle), y, parentPos.z + r * Math.sin(angle)), angle }
    })
  }

  const spread = Math.min(Math.PI * 0.85, Math.PI * 0.25 + n * 0.28)
  return Array.from({ length: n }, (_, i) => {
    const t     = n > 1 ? i / (n - 1) : 0.5
    const angle = parentAngle - spread / 2 + t * spread
    return { pos: new THREE.Vector3(parentPos.x + r * Math.cos(angle), y, parentPos.z + r * Math.sin(angle)), angle }
  })
}

// ─── Scene object factories ──────────────────────────────────────────────────

function makeNode(
  data: HierarchyNode,
  position: THREE.Vector3,
  isDark: boolean,
  fontOffset: number,
): { mesh: THREE.Mesh; labelDiv: HTMLDivElement; labelObj: CSS2DObject } {
  const r = NODE_RADIUS[data.type]

  // ── Shape: root = octahedron (diamond), leaf = flattened, others = sphere ──
  let geo: THREE.BufferGeometry
  if (data.type === 'root') {
    geo = new THREE.OctahedronGeometry(r, 1)   // subdivision=1: rounded diamond
  } else {
    geo = new THREE.SphereGeometry(r, 24, 16)
  }

  const mat = new THREE.MeshPhongMaterial({
    color:     NODE_COLOR[data.type],
    emissive:  new THREE.Color(NODE_COLOR[data.type]).multiplyScalar(0.12),
    shininess: 60,
    specular:  new THREE.Color(0x555577),
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.copy(position)

  // Leaf: slightly flattened — shape cue independent of color
  if (data.type === 'leaf') {
    mesh.scale.set(1.15, 0.5, 1.15)
  }

  // ── Secondary visual indicators (non-color shape cues for accessibility) ──

  // Concept: purple ring (white fill + ring distinguishes from plain spheres)
  if (data.type === 'concept') {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(r + 0.05, 0.04, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0x7F77DD }),
    )
    ring.rotation.x = Math.PI / 2
    mesh.add(ring)
  }

  // Shared: bright white ring — secondary indicator beyond green color,
  // addresses red-green color blindness (ring is visible to all)
  if (data.type === 'shared') {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(r + 0.10, 0.055, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.82 }),
    )
    ring.rotation.x = Math.PI / 2
    mesh.add(ring)
  }

  // ── CSS2D label ──────────────────────────────────────────────────────────
  const maxLen = data.type === 'leaf' ? 22 : 24
  const text   = data.label.length > maxLen ? data.label.slice(0, maxLen - 1) + '…' : data.label

  const div = document.createElement('div')
  div.textContent = text
  div.title       = data.label
  div.style.cssText = [
    `color: ${isDark ? DARK_TEXT[data.type] : LIGHT_TEXT[data.type]}`,
    `font-size: ${computeFontPx(data.type, fontOffset)}px`,
    `font-weight: ${FONT_WEIGHT[data.type]}`,
    `font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
    `margin-top: 4px`,
    `text-align: center`,
    `white-space: nowrap`,
    `pointer-events: none`,
    `user-select: none`,
    `text-shadow: ${textShadow(isDark)}`,
  ].join(';')

  const labelObj = new CSS2DObject(div)
  labelObj.position.set(0, -(r + 0.05), 0)
  mesh.add(labelObj)

  return { mesh, labelDiv: div, labelObj }
}

function makeEdge(from: THREE.Vector3, to: THREE.Vector3): THREE.Line {
  const geo = new THREE.BufferGeometry().setFromPoints([from, to])
  const mat = new THREE.LineBasicMaterial({ color: 0x9A95DD, transparent: true, opacity: 0.65 })
  return new THREE.Line(geo, mat)
}

// ─── Legend data ─────────────────────────────────────────────────────────────

const LEGEND_INTERACTIONS = [
  ['Click',       'Ask the tutor about this concept'],
  ['Dbl-click',   'Expand / collapse child concepts'],
  ['Drag',        'Rotate the map'],
  ['Scroll',      'Zoom in / out'],
] as const

const LEGEND_NODES = [
  { color: '#3C3489', label: 'Root',     desc: 'OOP hierarchy root — diamond shape',        border: undefined, ring: false },
  { color: '#7F77DD', label: 'Category', desc: 'Top-level branches — larger sphere',        border: undefined, ring: false },
  { color: '#EEEDFE', label: 'Concept',  desc: 'Mid-level concept — purple ring outline',   border: '#7F77DD',  ring: false },
  { color: '#1D9E75', label: 'Shared',   desc: 'Appears in multiple branches — white ring', border: undefined, ring: true  },
  { color: '#D3D1C7', label: 'Leaf',     desc: 'Terminal concept — flattened shape',        border: undefined, ring: false },
] as const

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  onNodeSelect: (label: string) => void
}

export default function ConceptMap3D({ onNodeSelect }: Props) {
  const containerRef    = useRef<HTMLDivElement>(null)
  const ctxRef          = useRef<Ctx | null>(null)
  const clickTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingClickRef = useRef<LiveNode | null>(null)
  const onSelectRef     = useRef(onNodeSelect)
  onSelectRef.current   = onNodeSelect

  const [isDark,      setIsDark]      = useState(true)
  const [fontOffset,  setFontOffset]  = useState(0)
  const [showLegend,  setShowLegend]  = useState(false)

  const isDarkRef     = useRef(isDark)
  const fontOffsetRef = useRef(fontOffset)

  // ── Three.js setup (runs once) ────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const w = container.clientWidth
    const h = container.clientHeight

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(BG_DARK)
    scene.fog        = new THREE.FogExp2(BG_DARK, 0.022)

    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 200)
    camera.position.set(0, 8, 22)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    const cssRenderer = new CSS2DRenderer()
    cssRenderer.setSize(w, h)
    cssRenderer.domElement.style.cssText =
      'position:absolute;top:0;left:0;pointer-events:none;overflow:hidden'
    container.appendChild(cssRenderer.domElement)

    scene.add(new THREE.AmbientLight(0x8888cc, 0.9))
    const dir = new THREE.DirectionalLight(0xffffff, 1.1)
    dir.position.set(10, 20, 10)
    scene.add(dir)
    const fill = new THREE.PointLight(0x7F77DD, 1.8, 35)
    fill.position.set(0, 8, 0)
    scene.add(fill)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.minDistance   = 4
    controls.maxDistance   = 55
    controls.target.set(0, 1, 0)

    const meshToNode = new Map<THREE.Mesh, LiveNode>()

    function addNode(data: HierarchyNode, position: THREE.Vector3, parentLive: LiveNode | null, depth: number, angle: number): LiveNode {
      const { mesh, labelDiv, labelObj } = makeNode(data, position, isDarkRef.current, fontOffsetRef.current)
      scene.add(mesh)
      let edge: THREE.Line | null = null
      if (parentLive) { edge = makeEdge(parentLive.position, position); scene.add(edge) }
      const live: LiveNode = { data, mesh, labelDiv, labelObj, edge, position, parentLive, depth, angle, expanded: false, liveChildren: [] }
      meshToNode.set(mesh, live)
      return live
    }

    function expand(node: LiveNode) {
      if (node.expanded || node.data.children.length === 0) return
      node.expanded = true
      const positions = childPositions(node.position, node.angle, node.data.children.length, node.depth + 1)
      for (let i = 0; i < node.data.children.length; i++) {
        node.liveChildren.push(addNode(node.data.children[i], positions[i].pos, node, node.depth + 1, positions[i].angle))
      }
    }

    function collapse(node: LiveNode) {
      for (const child of node.liveChildren) {
        collapse(child)
        child.labelDiv.remove()
        scene.remove(child.mesh)
        meshToNode.delete(child.mesh)
        child.mesh.geometry.dispose()
        ;(child.mesh.material as THREE.Material).dispose()
        if (child.edge) { scene.remove(child.edge); child.edge.geometry.dispose(); ;(child.edge.material as THREE.Material).dispose() }
      }
      node.liveChildren = []
      node.expanded = false
    }

    const rootLive = addNode(OOP_HIERARCHY, new THREE.Vector3(0, ROOT_Y, 0), null, 0, 0)
    expand(rootLive)

    const ctx: Ctx = { scene, camera, renderer, cssRenderer, controls, frameId: 0, meshToNode, selected: null, rootLive }
    ctxRef.current = ctx

    function highlight(node: LiveNode | null) {
      if (ctx.selected) {
        const mat = ctx.selected.mesh.material as THREE.MeshPhongMaterial
        mat.emissive.set(new THREE.Color(NODE_COLOR[ctx.selected.data.type]).multiplyScalar(0.12))
        mat.emissiveIntensity = 1
        ctx.selected.mesh.scale.setScalar(1)
        // restore leaf scale
        if (ctx.selected.data.type === 'leaf') ctx.selected.mesh.scale.set(1.15, 0.5, 1.15)
      }
      ctx.selected = node
      if (node) {
        const mat = node.mesh.material as THREE.MeshPhongMaterial
        mat.emissive.setHex(NODE_COLOR[node.data.type])
        mat.emissiveIntensity = 0.55
        node.mesh.scale.multiplyScalar(1.22)
      }
    }

    function pick(e: MouseEvent): LiveNode | null {
      const el = containerRef.current
      if (!el) return null
      const rect = el.getBoundingClientRect()
      const ndc  = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      )
      const ray = new THREE.Raycaster()
      ray.setFromCamera(ndc, camera)
      const hits = ray.intersectObjects(Array.from(meshToNode.keys()))
      return hits.length ? (meshToNode.get(hits[0].object as THREE.Mesh) ?? null) : null
    }

    function onCanvasClick(e: MouseEvent) {
      const node = pick(e)
      if (!node) return
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current)
        clickTimerRef.current   = null
        pendingClickRef.current = null
        if (node.data.children.length > 0) { node.expanded ? collapse(node) : expand(node) }
      } else {
        pendingClickRef.current = node
        clickTimerRef.current   = setTimeout(() => {
          clickTimerRef.current   = null
          const n = pendingClickRef.current
          pendingClickRef.current = null
          if (n) { highlight(n); onSelectRef.current(n.data.label) }
        }, 280)
      }
    }

    renderer.domElement.addEventListener('click', onCanvasClick)

    function animate() {
      ctx.frameId = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
      cssRenderer.render(scene, camera)
    }
    animate()

    const ro = new ResizeObserver(() => {
      const w = container.clientWidth, h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
      cssRenderer.setSize(w, h)
    })
    ro.observe(container)

    return () => {
      cancelAnimationFrame(ctx.frameId)
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current)
      renderer.domElement.removeEventListener('click', onCanvasClick)
      ro.disconnect()
      controls.dispose()
      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh
          m.geometry.dispose()
          if (Array.isArray(m.material)) m.material.forEach((x) => x.dispose())
          else (m.material as THREE.Material).dispose()
        }
      })
      renderer.dispose()
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement)
      if (container.contains(cssRenderer.domElement)) container.removeChild(cssRenderer.domElement)
    }
  }, [])

  // ── Theme toggle: update background + all label colors ───────────────────
  useEffect(() => {
    isDarkRef.current = isDark
    const ctx = ctxRef.current
    if (!ctx) return
    const bg = isDark ? BG_DARK : BG_LIGHT
    ;(ctx.scene.background as THREE.Color).setHex(bg)
    ;(ctx.scene.fog as THREE.FogExp2).color.setHex(bg)
    const textMap = isDark ? DARK_TEXT : LIGHT_TEXT
    ctx.meshToNode.forEach((node) => {
      node.labelDiv.style.color      = textMap[node.data.type]
      node.labelDiv.style.textShadow = textShadow(isDark)
    })
  }, [isDark])

  // ── Font size: update all existing labels ─────────────────────────────────
  useEffect(() => {
    fontOffsetRef.current = fontOffset
    const ctx = ctxRef.current
    if (!ctx) return
    ctx.meshToNode.forEach((node) => {
      node.labelDiv.style.fontSize = `${computeFontPx(node.data.type, fontOffset)}px`
    })
  }, [fontOffset])

  // ── Shared styles for floating controls ──────────────────────────────────
  const btnBase: React.CSSProperties = {
    background:  isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.07)',
    border:      `1px solid ${isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.14)'}`,
    color:       isDark ? '#EEEDFE' : '#3C3489',
  }

  const legendBg: React.CSSProperties = {
    background:       isDark ? 'rgba(10,9,30,0.96)' : 'rgba(248,247,255,0.97)',
    border:           `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(60,52,137,0.18)'}`,
    color:            isDark ? '#EEEDFE' : '#3C3489',
    backdropFilter:   'blur(10px)',
  }

  return (
    <div ref={containerRef} className="w-full h-full relative" style={{ cursor: 'grab' }}>

      {/* ── Collapsible legend — bottom left ─────────────────────────────── */}
      {showLegend && (
        <div
          className="absolute left-4 z-20 rounded-xl p-4 w-64 overflow-y-auto"
          style={{ ...legendBg, bottom: '3.5rem', maxHeight: 'calc(100% - 5rem)' }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-3 opacity-50">
            How to use the map
          </p>

          <div className="space-y-2 mb-4">
            {LEGEND_INTERACTIONS.map(([action, desc]) => (
              <div key={action} className="flex gap-2 text-xs">
                <span className="font-mono font-semibold w-[72px] flex-shrink-0 opacity-70">{action}</span>
                <span className="opacity-85">{desc}</span>
              </div>
            ))}
          </div>

          <div className="my-3" style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(60,52,137,0.15)'}` }} />

          <p className="text-[10px] font-semibold uppercase tracking-widest mb-2.5 opacity-50">
            Node types
          </p>
          <div className="space-y-2">
            {LEGEND_NODES.map(({ color, label, desc, border, ring }) => (
              <div key={label} className="flex items-start gap-2 text-xs">
                <span className="flex-shrink-0 mt-0.5 relative w-3.5 h-3.5">
                  <span
                    className="block w-3 h-3 rounded-full absolute top-0 left-0"
                    style={{
                      background: color,
                      border: border ? `1.5px solid ${border}` : undefined,
                    }}
                  />
                  {ring && (
                    <span
                      className="block absolute rounded-full"
                      style={{
                        top: -2, left: -2, width: 16, height: 16,
                        border: '1.5px solid rgba(255,255,255,0.85)',
                        borderRadius: '50%',
                      }}
                    />
                  )}
                </span>
                <div className="leading-snug">
                  <span className="font-semibold">{label}</span>
                  <span className="opacity-60"> — {desc}</span>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[10px] mt-3 opacity-40 leading-snug">
            Larger node = higher in the hierarchy
          </p>
        </div>
      )}

      {/* ── Legend toggle — bottom left ───────────────────────────────────── */}
      <button
        onClick={() => setShowLegend((v) => !v)}
        title={showLegend ? 'Hide help' : 'Show help'}
        className="absolute bottom-4 left-4 z-20 flex items-center gap-1 px-2.5 py-1.5
                   rounded-full text-xs font-medium transition-colors"
        style={btnBase}
      >
        {showLegend
          ? <><X className="h-3.5 w-3.5" /> Hide</>
          : <><HelpCircle className="h-3.5 w-3.5" /> Help</>
        }
      </button>

      {/* ── Controls row — bottom right ───────────────────────────────────── */}
      <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5">

        {/* Font size: A- */}
        <button
          onClick={() => setFontOffset((o) => Math.max(FONT_OFFSET_MIN, o - FONT_OFFSET_STEP))}
          disabled={fontOffset <= FONT_OFFSET_MIN}
          title="Decrease font size"
          className="flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold
                     transition-colors disabled:opacity-30"
          style={btnBase}
        >
          A<span className="text-[9px] leading-none">−</span>
        </button>

        {/* Font size: A+ */}
        <button
          onClick={() => setFontOffset((o) => Math.min(FONT_OFFSET_MAX, o + FONT_OFFSET_STEP))}
          disabled={fontOffset >= FONT_OFFSET_MAX}
          title="Increase font size"
          className="flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold
                     transition-colors disabled:opacity-30"
          style={btnBase}
        >
          A<span className="text-[11px] leading-none">+</span>
        </button>

        {/* Dark / light mode */}
        <button
          onClick={() => setIsDark((d) => !d)}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium
                     transition-colors"
          style={btnBase}
        >
          {isDark
            ? <><Sun  className="h-3.5 w-3.5" /> Light</>
            : <><Moon className="h-3.5 w-3.5" /> Dark</>
          }
        </button>
      </div>
    </div>
  )
}
