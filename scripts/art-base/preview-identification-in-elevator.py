"""Place the identification desk in the elevator shell for pipeline QA.

This is a preview scene only: the existing gameplay room layout is not changed.
"""

import pathlib
import bpy
from mathutils import Vector

ROOT = pathlib.Path(__file__).resolve().parents[2] / 'outputs' / 'lux3d-base-v2'
OUT = ROOT / 'analyzer'
OUT.mkdir(parents=True, exist_ok=True)

shell = ROOT / 'blender' / 'base-source.blend'
asset = OUT / 'identification-desk.glb'
assert shell.exists(), shell
assert asset.exists(), asset

bpy.ops.wm.open_mainfile(filepath=str(shell))
before = set(bpy.context.scene.objects)
bpy.ops.import_scene.gltf(filepath=str(asset))
new_objects = set(bpy.context.scene.objects) - before
desk = bpy.data.objects.get('Facility_identification_desk')
assert desk is not None, 'identification desk root missing after GLB import'

# Center aisle placement is deliberately a preview slot. The live game still
# has its five existing facilities and no occupancy rule is changed here.
desk.location = (0.0, 0.0, 0.06)
desk.rotation_euler.z = 3.141592653589793

# Make the preview placement easy to select in Blender and keep imported
# descendants under the facility root.
preview_root = bpy.data.objects.new('Preview_IdentificationDesk_2Slot', None)
bpy.context.collection.objects.link(preview_root)
desk.parent = preview_root
preview_root['assetId'] = 'identification-desk'
preview_root['previewOnly'] = True
preview_root['footprintSlots'] = 2

bpy.ops.mesh.primitive_cube_add(size=1, location=(0.0, 0.0, 0.13))
mount = bpy.context.object
mount.name = 'Preview_Mount_IdentificationDesk'
mount.dimensions = (4.05, 1.80, 0.14)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
if bpy.data.materials.get('Oxidised steel'):
    mount.data.materials.append(bpy.data.materials['Oxidised steel'])

scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 1440
scene.render.resolution_y = 1050
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs[0].default_value = (0.035, 0.055, 0.065, 1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value = 0.4

def area(name, location, energy, color, size, target):
    bpy.ops.object.light_add(type='AREA', location=location)
    light = bpy.context.object
    light.name = name
    light.data.energy = energy
    light.data.color = color
    light.data.size = size
    light.rotation_euler = (Vector(target) - light.location).to_track_quat('-Z', 'Y').to_euler()
    return light

area('Preview_Warm_Key', (2.8, 2.5, 5.6), 1050, (1.0, 0.78, 0.52), 4.0, (0, 0, 1.2))
area('Preview_Cool_Fill', (-3.0, -2.5, 3.8), 700, (0.40, 0.72, 0.80), 3.5, (0, 0, 1.0))
area('Preview_Entrance_Fill', (0, -7.0, 3.8), 1300, (0.57, 0.75, 0.85), 7.0, (0, 0.8, 1.5))

bpy.ops.object.camera_add(location=(0, -11.5, 3.6))
camera = bpy.context.object
camera.name = 'Preview_IdentificationDesk_Camera'
camera.data.lens = 32
camera.rotation_euler = (Vector((0, 0.2, 1.8)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
scene.camera = camera

# Export a reviewable scene containing the shell and the new asset. Renderer
# objects are kept in the .blend but excluded from the GLB.
scene.render.filepath = str(OUT / 'identification-desk-in-elevator.png')
bpy.ops.render.render(write_still=True)

for obj in list(scene.objects):
    if obj.name.startswith('Preview_') or obj == camera:
        obj.hide_render = True
        obj.hide_viewport = True

bpy.ops.export_scene.gltf(
    filepath=str(OUT / 'identification-desk-in-elevator.glb'),
    export_format='GLB',
    export_apply=True,
)
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'identification-desk-in-elevator.blend'))
print('IDENTIFICATION_ELEVATOR_PREVIEW_READY', flush=True)
