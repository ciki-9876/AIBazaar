import bpy,pathlib,math,json,datetime
from mathutils import Vector
ROOT=pathlib.Path(__file__).resolve().parents[2]/'outputs'/'lux3d-base-v2';OUT=ROOT/'blender'
bpy.ops.wm.open_mainfile(filepath=str(OUT/'base-source.blend'))
layout=[('generator',-3.5,-2.55,math.pi/2),('clinic',-3.5,1.2,math.pi/2),('grow',3.5,-1.3,-math.pi/2),('workshop',3.5,3.7,-math.pi/2),('storage',-3.5,4.95,math.pi/2)]
for id,x,z,yaw in layout:
 source=ROOT/('prepared-revision' if id=='grow' else 'prepared')/(id+'.glb');assert source.exists(),id
 before=set(bpy.context.scene.objects);bpy.ops.import_scene.gltf(filepath=str(source));new=set(bpy.context.scene.objects)-before
 root=bpy.data.objects.new('Facility_'+id,None);bpy.context.collection.objects.link(root)
 for o in new:
  if o.parent not in new:o.parent=root
 root.location=(x,-z,.06);root.rotation_euler.z=yaw
 # Physical rail-mounted plinth, deliberately outside the generated original.
 bpy.ops.mesh.primitive_cube_add(size=1,location=(x,-z,.13));o=bpy.context.object;o.name='Mount_'+id;o.dimensions=(1.85,1.95 if id in ['generator','storage'] else 4.25,.14);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(bpy.data.materials['Oxidised steel']);mod=o.modifiers.new('Rail corners','BEVEL');mod.width=.035;mod.segments=2;bpy.ops.object.modifier_apply(modifier=mod.name)
# Export the complete embedded scene before adding renderer-only objects.
bpy.ops.export_scene.gltf(filepath=str(OUT/'scene.glb'),export_format='GLB',export_apply=True)
for z in [-4.2,.7,5.65]:
 bpy.ops.object.light_add(type='AREA',location=(0,-z,4.18));l=bpy.context.object;l.name='Warm work light';l.data.energy=650;l.data.shape='RECTANGLE';l.data.size=2.6;l.data.size_y=.5;l.data.color=(1,.78,.5)
bpy.ops.object.light_add(type='AREA',location=(0,-7,3.9));l=bpy.context.object;l.name='Soft entrance fill';l.data.energy=1200;l.data.size=7;l.data.color=(.57,.75,.85);l.rotation_euler=(Vector((0,1,1.5))-l.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.light_add(type='AREA',location=(4,1.5,3.6));l=bpy.context.object;l.data.energy=300;l.data.size=3;l.data.color=(.4,.8,.72);l.rotation_euler=(Vector((0,0,1.4))-l.location).to_track_quat('-Z','Y').to_euler()
s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=40;s.cycles.use_denoising=True;s.render.resolution_x=1440;s.render.resolution_y=1050;s.render.resolution_percentage=100;s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[0].default_value=(.035,.055,.065,1);s.world.node_tree.nodes['Background'].inputs[1].default_value=.4
bpy.ops.object.camera_add(location=(0,-10.8,3.15));cam=bpy.context.object;cam.name='Cabin_camera';cam.data.lens=28;cam.rotation_euler=(Vector((0,1.5,1.65))-cam.location).to_track_quat('-Z','Y').to_euler();s.camera=cam
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'f9-lux3d-base.blend'))
s.render.filepath=str(OUT/'cabin.png');bpy.ops.render.render(write_still=True)
# Inspection cutaway for construction readability, without destructive shell edits.
for o in bpy.data.objects.get('ShellWalls').children:o.hide_render=True
cam.location=(11,-14,14);cam.rotation_euler=(Vector((0,-.5,.6))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=18;s.render.filepath=str(OUT/'construction.png');bpy.ops.render.render(write_still=True)
(OUT/'assembly-facts.json').write_text(json.dumps({'executedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'facilityCount':5,'layout':layout,'sceneExport':str(OUT/'scene.glb'),'rendered':['cabin.png','construction.png']},indent=2))
print('ASSEMBLY_AND_RENDERS_READY',flush=True)
