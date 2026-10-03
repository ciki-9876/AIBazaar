import bpy
import math
import pathlib
from mathutils import Vector

ROOT = pathlib.Path(__file__).resolve().parents[2] / 'outputs' / 'lux3d-base-v2'
OUT = ROOT / 'analyzer'
OUT.mkdir(parents=True, exist_ok=True)

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for collection in list(bpy.data.collections):
    if collection.name != 'Collection':
        bpy.data.collections.remove(collection)

def material(name, color, metallic=0.2, roughness=0.55, emission=None, emission_strength=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    if emission:
        bsdf.inputs['Emission Color'].default_value = (*emission, 1)
        bsdf.inputs['Emission Strength'].default_value = emission_strength
    return m

steel = material('Analyzer / aged steel', (0.08, 0.13, 0.14), 0.8, 0.42)
paint = material('Analyzer / faded enamel', (0.20, 0.31, 0.31), 0.42, 0.48)
dark = material('Analyzer / instrument black', (0.018, 0.028, 0.03), 0.3, 0.5)
brass = material('Analyzer / engraved brass', (0.52, 0.34, 0.11), 0.72, 0.32)
ivory = material('Analyzer / label ivory', (0.74, 0.68, 0.47), 0.15, 0.56)
glass = material('Analyzer / scanner glass', (0.16, 0.48, 0.50), 0.1, 0.16, (0.08, 0.38, 0.42), 0.45)
cyan = material('Analyzer / active cyan', (0.08, 0.34, 0.37), 0.1, 0.24, (0.08, 0.78, 0.86), 3.2)
amber = material('Analyzer / used amber', (0.44, 0.25, 0.07), 0.1, 0.3, (0.95, 0.42, 0.08), 2.0)
rubber = material('Analyzer / rubber', (0.015, 0.022, 0.023), 0.05, 0.82)

root = bpy.data.objects.new('Facility_identification_desk', None)
bpy.context.collection.objects.link(root)
root['assetId'] = 'identification-desk'
root['displayName'] = '异常鉴定台'
root['family'] = 'home-facility'
root['footprintSlots'] = 2
root['dimensionsMeters'] = '3.8 x 1.6 x 3.2'
root['stateVariants'] = 'normal,active,used'

def parent(name, parent_obj=root):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent_obj
    return obj

normal = parent('State_Normal')
active = parent('State_Active')
used = parent('State_Used')
active.hide_viewport = True
active.hide_render = True
used.hide_viewport = True
used.hide_render = True

def box(name, location, dimensions, mat, parent_obj=root, bevel=0.025):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    obj.parent = parent_obj
    if bevel:
        mod = obj.modifiers.new('manufactured edge', 'BEVEL')
        mod.width = min(bevel, min(dimensions) * 0.22)
        mod.segments = 2
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj

def cylinder(name, location, radius, depth, mat, parent_obj=root, vertices=16, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    obj.parent = parent_obj
    return obj

def text(name, body, location, size, mat=ivory, parent_obj=root):
    # Blender text faces local +Z; rotate toward the front (+Y) so labels read
    # correctly in the same front-facing direction as the brass plaque.
    bpy.ops.object.text_add(location=location, rotation=(-math.pi / 2, 0, math.pi))
    obj = bpy.context.object
    obj.name = name
    obj.data.body = body
    obj.data.align_x = 'CENTER'
    obj.data.align_y = 'CENTER'
    obj.data.size = size
    obj.data.extrude = 0.003
    obj.data.materials.append(mat)
    obj.parent = parent_obj
    return obj

def torus(name, location, major, minor, mat, parent_obj=root):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=32, minor_segments=8, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    obj.parent = parent_obj
    return obj

def cable(name, points, mat, parent_obj=root):
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.bevel_depth = 0.028
    curve.bevel_resolution = 2
    spline = curve.splines.new('BEZIER')
    spline.bezier_points.add(len(points) - 1)
    for bp, point in zip(spline.bezier_points, points):
        bp.co = point
        bp.handle_left_type = 'AUTO'
        bp.handle_right_type = 'AUTO'
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    obj.parent = parent_obj
    return obj

# Two-slot rail plinth and the compact diagnostic cabinet.
box('Analyzer_Platform', (0, 0, 0.08), (3.85, 1.62, 0.16), steel, root, 0.04)
box('Analyzer_Cabinet', (0, -0.02, 0.70), (3.52, 1.25, 1.12), paint, root, 0.08)
box('Analyzer_CabinetInset', (0, 0.62, 0.72), (3.15, 0.07, 0.78), dark, root, 0.02)
box('Analyzer_Tabletop', (0, 0.0, 1.36), (3.68, 1.48, 0.16), steel, root, 0.04)
box('Analyzer_Tray', (0, 0.18, 1.49), (1.68, 0.68, 0.10), brass, root, 0.025)
box('Analyzer_TrayInset', (0, 0.18, 1.55), (1.40, 0.48, 0.035), dark, root, 0.015)

# Drawer faces, brass pulls, and a visible control panel.
for x in (-1.25, 1.25):
    box(f'Analyzer_Drawer_{x:+.2f}', (x, 0.64, 0.72), (0.92, 0.07, 0.38), dark, root, 0.018)
    cylinder(f'Analyzer_DrawerPull_{x:+.2f}', (x, 0.70, 0.72), 0.035, 0.15, brass, root, 12, (math.pi / 2, 0, 0))
box('Analyzer_ControlPanel', (0.0, 0.70, 1.90), (1.36, 0.08, 0.46), dark, root, 0.02)
for x in (-0.43, -0.14, 0.15, 0.44):
    cylinder('Analyzer_ControlButton', (x, 0.76, 1.91), 0.055, 0.025, brass, root, 12, (math.pi / 2, 0, 0))
box('Analyzer_ScanReadout', (0.0, 0.755, 2.12), (0.78, 0.025, 0.08), cyan, root, 0.008)

# Uprights, overhead scanner rail, glass hood, and scanning ring.
for x in (-1.53, 1.53):
    box(f'Analyzer_Upright_{x:+.2f}', (x, -0.48, 2.25), (0.12, 0.14, 1.75), steel, root, 0.02)
box('Analyzer_OverheadRail', (0, -0.48, 3.09), (3.26, 0.16, 0.15), brass, root, 0.025)
box('Analyzer_GlassHood', (0, -0.42, 2.15), (2.48, 0.035, 1.10), glass, root, 0.012)
box('Analyzer_GlassTop', (0, -0.08, 2.70), (2.48, 0.72, 0.035), glass, root, 0.012)
torus('Analyzer_ScannerRing', (0, 0.08, 2.38), 0.72, 0.055, brass, root)
torus('Analyzer_ScannerLight', (0, 0.08, 2.38), 0.61, 0.025, cyan, root)
cylinder('Analyzer_ScannerHub', (0, 0.08, 2.38), 0.12, 0.15, dark, root, 16)
for x in (-0.46, 0.46):
    box('Analyzer_RingEmitter', (x, 0.08, 2.38), (0.10, 0.07, 0.08), cyan, root, 0.01)

# Rear service box and deliberately visible cable routing.
box('Analyzer_ServiceBox', (1.50, -0.53, 1.80), (0.38, 0.16, 0.72), paint, root, 0.025)
for z in (1.62, 1.80, 1.98):
    box('Analyzer_ServiceVent', (1.50, -0.625, z), (0.23, 0.02, 0.035), dark, root, 0.004)
cable('Analyzer_Cable', [(1.50, -0.63, 2.08), (1.15, -0.58, 2.62), (0.30, -0.45, 3.02)], rubber, root)

# Permanent brass identification plaque.
box('Analyzer_BrassPlaque', (0, 0.78, 2.42), (1.35, 0.035, 0.30), brass, root, 0.018)
text('Analyzer_PlaqueText', 'ID / ANALYSIS', (0, 0.805, 2.42), 0.13, dark, root)
text('Analyzer_FloorLabel', 'F09 / IDENTIFICATION', (0, 0.60, 0.03), 0.10, ivory, root)

# State-specific indicators. Only normal is visible in the exported default scene;
# active and used remain named and editable for the runtime state switch.
box('Analyzer_NormalStatus', (-1.20, 0.78, 2.42), (0.16, 0.035, 0.16), ivory, normal, 0.01)
box('Analyzer_ActiveStatus', (-1.20, 0.78, 2.42), (0.16, 0.035, 0.16), cyan, active, 0.01)
text('Analyzer_ActiveText', 'SCAN', (-0.82, 0.81, 2.42), 0.10, cyan, active)
box('Analyzer_UsedStatus', (-1.20, 0.78, 2.42), (0.16, 0.035, 0.16), amber, used, 0.01)
text('Analyzer_UsedText', 'DONE', (-0.82, 0.81, 2.42), 0.10, amber, used)

# Preview floor, lighting, and camera are kept in the .blend but excluded from GLB.
floor = box('PREVIEW_ONLY_Floor', (0, 0, -0.10), (7.0, 5.0, 0.10), dark, root, 0.01)
floor['previewOnly'] = True
bpy.ops.object.light_add(type='AREA', location=(2.5, 2.8, 6.0))
key = bpy.context.object
key.name = 'PREVIEW_ONLY_Key'
key.data.energy = 850
key.data.size = 4.0
key.data.color = (1.0, 0.80, 0.55)
key.rotation_euler = (Vector((0, 0, 1.3)) - key.location).to_track_quat('-Z', 'Y').to_euler()
bpy.ops.object.light_add(type='AREA', location=(-3.5, -2.0, 3.5))
fill = bpy.context.object
fill.name = 'PREVIEW_ONLY_Fill'
fill.data.energy = 500
fill.data.size = 3.0
fill.data.color = (0.35, 0.70, 0.78)
fill.rotation_euler = (Vector((0, 0, 1.0)) - fill.location).to_track_quat('-Z', 'Y').to_euler()
bpy.ops.object.camera_add(location=(5.8, 7.5, 4.8))
camera = bpy.context.object
camera.name = 'PREVIEW_ONLY_Camera'
camera.data.lens = 52
camera.rotation_euler = (Vector((0, 0, 1.45)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
bpy.context.scene.camera = camera

def set_state_render_visibility(state_obj, visible):
    """Apply visibility to descendants; empty-parent hide flags do not cascade."""
    for obj in bpy.data.objects:
        ancestor = obj.parent
        while ancestor is not None:
            if ancestor == state_obj:
                obj.hide_render = not visible
                break
            ancestor = ancestor.parent

# The beauty render represents the default/normal state. Keep the alternate
# indicator geometry in the editable source and exported GLB for runtime
# switching, but do not let those variants stack in the preview render.
set_state_render_visibility(active, False)
set_state_render_visibility(used, False)

scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 1100
scene.render.resolution_y = 820
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs[0].default_value = (0.018, 0.032, 0.038, 1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value = 0.32

# Save the editable source before GLB export. The preview-only objects stay in the .blend.
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'identification-desk.blend'))
scene.render.filepath = str(OUT / 'identification-desk.png')
bpy.ops.render.render(write_still=True)

# Keep preview-only objects out of the game asset.
for obj in [floor, key, fill, camera]:
    obj.hide_render = True
    obj.hide_viewport = True
# Restore state meshes before exporting so the runtime asset contains the
# named normal/active/used variants even though only normal was rendered above.
set_state_render_visibility(active, True)
set_state_render_visibility(used, True)
bpy.ops.export_scene.gltf(
    filepath=str(OUT / 'identification-desk.glb'),
    export_format='GLB',
    export_apply=True,
)
print('IDENTIFICATION_DESK_READY', flush=True)
