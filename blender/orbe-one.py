"""Modela o Orbe One (celular fictício) e exporta public/models/orbe-one.glb.

Uso:
  blender -b -P blender/orbe-one.py -- --out public/models/orbe-one.glb [--preview pasta/]

Tudo é gerado por código: perfil de retângulo arredondado extrudado, chanfros com bmesh,
normais ponderadas para faces planas limpas. Medidas reais em metros: 71 x 149 x 7,9 mm.
Desenho próprio: módulo de câmera circular centralizado ("orbe"), sem notch nem ilha.
"""

import math
import sys

import bmesh
import bpy

W, H, D = 0.071, 0.149, 0.0079
CORNER = 0.0105  # raio dos cantos vistos de frente
EDGE = 0.0024  # raio do arredondamento da lateral
GLASS = 0.0006  # espessura aparente dos vidros

# --- argumentos -----------------------------------------------------------------------------
args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
OUT = args[args.index("--out") + 1] if "--out" in args else "orbe-one.glb"
PREVIEW = args[args.index("--preview") + 1] if "--preview" in args else None
HDRI = args[args.index("--hdri") + 1] if "--hdri" in args else None

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


# --- materiais (Principled BSDF → PBR do glTF) ----------------------------------------------
def material(name, color, metallic=0.0, roughness=0.5, coat=0.0, coat_roughness=0.05, emission=None, ior=1.5):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["IOR"].default_value = ior
    for key in ("Coat Weight", "Clearcoat"):
        if key in bsdf.inputs:
            bsdf.inputs[key].default_value = coat
            break
    for key in ("Coat Roughness", "Clearcoat Roughness"):
        if key in bsdf.inputs:
            bsdf.inputs[key].default_value = coat_roughness
            break
    if emission is not None:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
        bsdf.inputs["Emission Strength"].default_value = 1.0
    return mat


def srgb(hex_color):
    """Converte #rrggbb (sRGB) para cor linear, como o Blender espera."""
    h = hex_color.lstrip("#")
    out = []
    for i in (0, 2, 4):
        c = int(h[i : i + 2], 16) / 255
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return tuple(out)


MAT = {
    # Valores PBR de referência: alumínio anodizado, vidro fosco com coat, vidro óptico (IOR 1,52).
    "frame": material("FrameMetal", srgb("#4a4b50"), metallic=1.0, roughness=0.28),
    "back": material("BackGlass", srgb("#2f3034"), metallic=0.0, roughness=0.35, coat=0.5, coat_roughness=0.3),
    "display": material("Display", srgb("#050506"), roughness=0.08, coat=1.0, coat_roughness=0.02, ior=1.52),
    "module": material("ModuleGlass", srgb("#1d1e22"), roughness=0.1, coat=1.0, coat_roughness=0.02, ior=1.52),
    "ring": material("LensRing", srgb("#7a7b80"), metallic=1.0, roughness=0.22),
    "lens": material("LensGlass", srgb("#020306"), roughness=0.02, coat=1.0, coat_roughness=0.01, ior=1.52),
    "sensor": material("LensSensor", srgb("#0d2a36"), metallic=0.6, roughness=0.15),
    "flash": material("Flash", srgb("#e9e2c8"), roughness=0.35),
    "black": material("PortBlack", srgb("#09090a"), roughness=0.6),
    "antenna": material("Antenna", srgb("#3a3b3f"), roughness=0.55),
    "battery": material("Battery", srgb("#22232a"), metallic=0.2, roughness=0.55),
    "pcb": material("PCB", srgb("#10302a"), roughness=0.5),
    "chip": material("ChipMetal", srgb("#1b1c20"), metallic=0.8, roughness=0.3),
}


# --- geometria -------------------------------------------------------------------------------
def rounded_rect(w, h, r, seg=24):
    pts = []
    for cx, cz, start in ((w / 2 - r, h / 2 - r, 0), (-w / 2 + r, h / 2 - r, 90), (-w / 2 + r, -h / 2 + r, 180), (w / 2 - r, -h / 2 + r, 270)):
        for i in range(seg + 1):
            a = math.radians(start + 90 * i / seg)
            pts.append((cx + r * math.cos(a), cz + r * math.sin(a)))
    return pts


def finish(obj, mat, weighted=True):
    for poly in obj.data.polygons:
        poly.use_smooth = True
    obj.data.materials.append(mat)
    if weighted:
        mod = obj.modifiers.new("WeightedNormal", "WEIGHTED_NORMAL")
        mod.keep_sharp = True
    return obj


def link(obj, parent=None):
    bpy.context.collection.objects.link(obj)
    if parent is not None:
        obj.parent = parent
    return obj


def slab(name, w, h, r, y0, y1, edge, mat, parent=None, edge_seg=6, uv=False):
    """Retângulo arredondado no plano XZ, extrudado de y0 a y1 (Y = espessura), com chanfro."""
    bm = bmesh.new()
    pts = rounded_rect(w, h, r)
    a = [bm.verts.new((x, y0, z)) for x, z in pts]
    b = [bm.verts.new((x, y1, z)) for x, z in pts]
    n = len(pts)
    cap_a = bm.faces.new(a[::-1])
    cap_b = bm.faces.new(b)
    for i in range(n):
        bm.faces.new((a[i], a[(i + 1) % n], b[(i + 1) % n], b[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    if edge > 0:
        rim = [e for e in bm.edges if cap_a in e.link_faces or cap_b in e.link_faces]
        bmesh.ops.bevel(bm, geom=rim, offset=edge, offset_type="OFFSET", segments=edge_seg, profile=0.5, affect="EDGES", clamp_overlap=True)
    if uv:
        layer = bm.loops.layers.uv.new("UVMap")
        for face in bm.faces:
            for loop in face.loops:
                x, _, z = loop.vert.co
                loop[layer].uv = ((x + w / 2) / w, (z + h / 2) / h)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    return finish(link(bpy.data.objects.new(name, me), parent), mat)


def disc(name, radius, y0, y1, x, z, mat, parent=None, edge=0.0, seg=64):
    """Cilindro com eixo em Y (sai da traseira), com chanfro opcional na borda."""
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=radius, radius2=radius, depth=abs(y1 - y0))
    bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=__import__("mathutils").Matrix.Rotation(math.radians(90), 3, "X"))
    bmesh.ops.translate(bm, verts=bm.verts, vec=(x, (y0 + y1) / 2, z))
    if edge > 0:
        caps = [f for f in bm.faces if len(f.verts) == seg]
        rim = [e for e in bm.edges if any(f in caps for f in e.link_faces)]
        bmesh.ops.bevel(bm, geom=rim, offset=edge, offset_type="OFFSET", segments=3, profile=0.5, affect="EDGES", clamp_overlap=True)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    return finish(link(bpy.data.objects.new(name, me), parent), mat)


def dome(name, radius, y, x, z, mat, parent=None, flatten=0.3):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=48, v_segments=24, radius=radius)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -1e-6], context="VERTS")
    bmesh.ops.scale(bm, vec=(1, 1, flatten), verts=bm.verts)
    bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=__import__("mathutils").Matrix.Rotation(math.radians(-90), 3, "X"))
    bmesh.ops.translate(bm, verts=bm.verts, vec=(x, y, z))
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    return finish(link(bpy.data.objects.new(name, me), parent), mat, weighted=False)


def box(name, size, loc, mat, parent=None, bevel=0.0003):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if bevel > 0:
        mod = obj.modifiers.new("Bevel", "BEVEL")
        mod.width = bevel
        mod.segments = 3
    if parent is not None:
        obj.parent = parent
    return finish(obj, mat)


def empty(name):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    return obj


# Camadas (a vista explodida da página separa estas quatro).
L_SCREEN, L_FRAME, L_BATTERY, L_BOARD = (empty(n) for n in ("Layer_Screen", "Layer_Frame", "Layer_Battery", "Layer_Board"))

# A frente fica em -Y (vira +Z no glTF, de frente para a câmera da página).
FRONT, BACK = -D / 2, D / 2

# Estrutura: corpo metálico com laterais arredondadas.
slab("Frame", W, H, CORNER, FRONT + GLASS, BACK - GLASS, EDGE, MAT["frame"], L_FRAME, edge_seg=8)

# Tela: vidro frontal com a interface (a textura é aplicada no Three.js). UV planar 0–1.
slab("Display", W - 0.0012, H - 0.0012, CORNER - 0.0006, FRONT - 0.0002, FRONT + GLASS + 0.0002, 0.0005, MAT["display"], L_SCREEN, edge_seg=4, uv=True)

# Traseira de vidro fosco.
slab("BackGlass", W - 0.0012, H - 0.0012, CORNER - 0.0006, BACK - GLASS - 0.0002, BACK + 0.0002, 0.0005, MAT["back"], L_FRAME, edge_seg=4)

# Módulo de câmera circular (a "órbita" da marca), centralizado no alto da traseira.
MZ = H / 2 - 0.024
disc("ModuleRing", 0.0142, BACK, BACK + 0.0014, 0, MZ, MAT["frame"], L_FRAME, edge=0.0004)
disc("ModuleTop", 0.0134, BACK + 0.0013, BACK + 0.0016, 0, MZ, MAT["module"], L_FRAME, edge=0.0001)
for i, (dx, dz) in enumerate(((-0.0056, 0.0034), (0.0056, 0.0034), (0.0, -0.0060))):
    disc(f"LensRing{i}", 0.0047, BACK + 0.0015, BACK + 0.0026, dx, MZ + dz, MAT["ring"], L_FRAME, edge=0.00025)
    disc(f"LensBlack{i}", 0.0039, BACK + 0.0025, BACK + 0.0027, dx, MZ + dz, MAT["black"], L_FRAME)
    disc(f"LensSensor{i}", 0.0024, BACK + 0.0026, BACK + 0.0028, dx, MZ + dz, MAT["sensor"], L_FRAME)
    dome(f"LensGlass{i}", 0.0036, BACK + 0.0027, dx, MZ + dz, MAT["lens"], L_FRAME, flatten=0.22)
disc("Flash", 0.0016, BACK + 0.0015, BACK + 0.0018, 0.0094, MZ - 0.0076, MAT["flash"], L_FRAME)
disc("Mic", 0.0004, BACK + 0.0015, BACK + 0.0017, -0.0094, MZ - 0.0076, MAT["black"], L_FRAME)

# Botões laterais (cápsulas com chanfro).
box("PowerButton", (0.0012, 0.0028, 0.017), (W / 2 + 0.0003, 0, 0.026), MAT["frame"], L_FRAME, bevel=0.0005)
box("VolumeUp", (0.0012, 0.0028, 0.011), (-W / 2 - 0.0003, 0, 0.040), MAT["frame"], L_FRAME, bevel=0.0005)
box("VolumeDown", (0.0012, 0.0028, 0.011), (-W / 2 - 0.0003, 0, 0.026), MAT["frame"], L_FRAME, bevel=0.0005)

# Faixas de antena nas laterais.
for i, (sx, z) in enumerate(((1, 0.058), (-1, 0.058), (1, -0.058), (-1, -0.058))):
    box(f"Antenna{i}", (0.0004, D * 0.62, 0.0011), (sx * (W / 2 + 0.00005), 0, z), MAT["antenna"], L_FRAME, bevel=0.0)

# Base: porta USB-C, grade de alto-falante e microfone.
box("UsbPort", (0.0088, 0.0031, 0.0006), (0, 0, -H / 2 - 0.00005), MAT["black"], L_FRAME, bevel=0.0012)


def hole_z(name, radius, x, z, depth, mat, parent):
    """Furo na borda inferior: cilindro com eixo em Z, já na posição final (geometria em coordenadas do mundo)."""
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=24, radius1=radius, radius2=radius, depth=depth)
    bmesh.ops.translate(bm, verts=bm.verts, vec=(x, 0, z))
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    return finish(link(bpy.data.objects.new(name, me), parent), mat, weighted=False)


for side in (-1, 1):
    for k in range(5):
        hole_z(f"Speaker{side}_{k}", 0.00045, side * (0.0105 + k * 0.0018), -H / 2 - 0.0001, 0.0006, MAT["black"], L_FRAME)

# Internos: escondidos no corpo com o aparelho fechado; a página os separa na cena "Por dentro".
slab("Battery", 0.058, 0.074, 0.006, -0.0021, 0.0019, 0.0006, MAT["battery"], L_BATTERY, edge_seg=3, uv=True)
L_BATTERY.location = (0, 0, -0.013)
slab("Board", 0.062, 0.128, 0.008, -0.0006, 0.0006, 0.0002, MAT["pcb"], L_BOARD, edge_seg=2, uv=True)
for i, (x, z, s) in enumerate(((0.0, 0.040, 0.016), (-0.015, 0.018, 0.008), (0.014, 0.020, 0.010), (0.0, -0.035, 0.012))):
    box(f"Chip{i}", (s, 0.0012, s), (x, -0.0011, z), MAT["chip"], L_BOARD, bevel=0.0002)

# --- exporta ---------------------------------------------------------------------------------
bpy.ops.object.select_all(action="DESELECT")
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", export_apply=True, export_yup=True, use_selection=False)
print(f"GLB: {OUT}")

# --- prévia opcional (Cycles + HDRI) -----------------------------------------------------------
if PREVIEW:
    import os

    world = bpy.data.worlds.new("Studio")
    scene.world = world
    world.use_nodes = True
    nodes = world.node_tree.nodes
    if HDRI:
        env = nodes.new("ShaderNodeTexEnvironment")
        env.image = bpy.data.images.load(HDRI)
        world.node_tree.links.new(env.outputs["Color"], nodes["Background"].inputs["Color"])
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 96
    scene.cycles.use_denoising = True
    scene.render.resolution_x, scene.render.resolution_y = 900, 1100
    scene.render.film_transparent = True
    scene.view_settings.view_transform = "AgX" if "AgX" in [i.identifier for i in scene.view_settings.bl_rna.properties["view_transform"].enum_items] else "Filmic"

    cam_data = bpy.data.cameras.new("Cam")
    cam_data.lens = 85
    cam = bpy.data.objects.new("Cam", cam_data)
    bpy.context.collection.objects.link(cam)
    scene.camera = cam
    target = empty("Target")
    track = cam.constraints.new("TRACK_TO")
    track.target = target
    track.track_axis = "TRACK_NEGATIVE_Z"
    track.up_axis = "UP_Y"

    os.makedirs(PREVIEW, exist_ok=True)
    for label, loc, aim in (
        ("front", (-0.18, -0.42, 0.06), (0, 0, 0)),
        ("back", (0.2, 0.42, 0.08), (0, 0, 0)),
        ("camera", (0.05, 0.16, 0.09), (0, 0, MZ)),
        ("bottom", (0.06, -0.1, -0.16), (0, 0, -H / 2)),
    ):
        cam.location = loc
        target.location = aim
        scene.render.filepath = os.path.join(PREVIEW, f"{label}.png")
        bpy.ops.render.render(write_still=True)
        print(f"prévia: {label}")
