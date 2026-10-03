"""Render the existing cushion as a reusable inventory/printed-card asset.
Run with Blender --background --python; does not edit the working Blender scene.
"""
import bpy, math, pathlib, json
from mathutils import Vector

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/art-assets/card-specimen'
SOURCE = ROOT / 'outputs/card-specimen'
OUT.mkdir(parents=True, exist_ok=True)
SOURCE.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(ROOT / 'outputs/battle-slice/battle-slice-v5.blend'))
root = bpy.data.objects['rubber']
keep = {root, *root.children_recursive}
for obj in list(bpy.data.objects):
    if obj not in keep:
        bpy.data.objects.remove(obj, do_unlink=True)
root.location = (0, 0, 0)
bpy.ops.object.select_all(action='DESELECT')
for obj in keep: obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'cushion.glb'), export_format='GLB', use_selection=True, export_apply=True, export_yup=True)

scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 48
scene.cycles.use_denoising = True
scene.render.resolution_x = 1024
scene.render.resolution_y = 1024
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.world = bpy.data.worlds.new('Specimen studio')
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.16,.19,.22,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value = .35
scene.view_settings.view_transform = 'AgX'

def light(name, location, energy, color, size):
    data=bpy.data.lights.new(name,'AREA');data.energy=energy;data.color=color;data.shape='DISK';data.size=size
    obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj.location=location
    obj.rotation_euler=(Vector((0,0,.13))-obj.location).to_track_quat('-Z','Y').to_euler()

light('Warm softbox',(-1.5,-1.2,2.5),180,(1,.83,.65),2)
light('Cool contour',(1.3,.7,1.6),150,(.64,.79,1),1.5)
light('Front bounce',(.4,-2,.7),45,(1,.92,.82),1.6)
data=bpy.data.cameras.new('Icon camera');camera=bpy.data.objects.new('Icon camera',data);scene.collection.objects.link(camera)
camera.location=(1.0,-1.4,1.8)
camera.rotation_euler=(Vector((0,0,.13))-camera.location).to_track_quat('-Z','Y').to_euler()
data.type='ORTHO';data.ortho_scale=1.0;scene.camera=camera
scene.render.filepath=str(OUT/'cushion-icon.png')
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'cushion-specimen.blend'))
bpy.ops.render.render(write_still=True)
(OUT/'manifest.json').write_text(json.dumps({'source':'Existing original rubber geometry from battle-slice-v5.blend','surfaces':'Poly Haven CC0 brown_leather; see material-study/sources.json','render':'Blender Cycles, 1024px transparent PNG, orthographic three-quarter','model':'cushion.glb','icon':'cushion-icon.png'},indent=2),encoding='utf8')
