import bpy, math, random, pathlib, json
from mathutils import Vector
ROOT=pathlib.Path(__file__).resolve().parents[2]/'outputs'/'lux3d-base-v2';OUT=ROOT/'blender';OUT.mkdir(exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
random.seed(9)
def mat(name,color,metal=.3,rough=.5,emit=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 if emit:p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=emit
 return m
steel=mat('Oxidised steel',(.075,.12,.135),.8,.4);paint=mat('Aged teal enamel',(.16,.25,.25),.45,.53);ivory=mat('Ivory markings',(.63,.61,.46),.2,.6);brass=mat('Brushed brass',(.43,.29,.10),.72,.38);rubber=mat('Rubber seals',(.018,.03,.035),.05,.85);light=mat('Warm fluorescent diffuser',(.95,.69,.34),.1,.4,2.5);cool=mat('Cold light',(.19,.53,.61),.1,.3,1.5)
groups={}
def parent(name):
 if name not in groups:
  o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);groups[name]=o
 return groups[name]
def point(x,y,z):return (x,-z,y)
def box(name,dim,xyz,material,group='ShellStatic',bevel=.018):
 bpy.ops.mesh.primitive_cube_add(size=1,location=point(*xyz));o=bpy.context.object;o.name=name;o.dimensions=(dim[0],dim[2],dim[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(material);o.parent=parent(group)
 if bevel:
  mod=o.modifiers.new('Manufactured edges','BEVEL');mod.width=min(bevel,min(dim)*.22);mod.segments=2;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 for poly in o.data.polygons:poly.use_smooth=False
 return o
def cyl(name,radius,length,xyz,material,group='ShellStatic',axis='y',vertices=12):
 bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=length,location=point(*xyz));o=bpy.context.object;o.name=name;o.data.materials.append(material);o.parent=parent(group)
 if axis=='x':o.rotation_euler[1]=math.pi/2
 if axis=='z':o.rotation_euler[0]=math.pi/2
 return o
def text(name,body,size,xyz,group='ShellStatic',floor=False):
 bpy.ops.object.text_add(location=point(*xyz));o=bpy.context.object;o.name=name;o.data.body=body;o.data.size=size;o.data.align_x='CENTER';o.data.extrude=.0005;o.data.materials.append(ivory);o.parent=parent(group)
 if not floor:o.rotation_euler[0]=math.pi/2
 bpy.ops.object.convert(target='MESH');return o
# Floating construction assemblies remain independently removable in the game.
box('Load-bearing deck',(10.2,.32,12.9),(0,-.22,.45),steel,bevel=.055)
for ix,x in enumerate([-3.7,-1.85,0,1.85,3.7]):
 for iz in range(11):
  z=-5.4+iz*1.12;box('Non-slip deck panel',(1.80,.06,1.07),(x,-.027,z),rubber,bevel=.012)
  for dz in [-.32,0,.32]:
   for dx in [-.56,-.19,.19,.56]:
    o=box('Raised tread',(.19,.012,.028),(x+dx,.008,z+dz),steel,bevel=.004);o.rotation_euler.z=.48
for x in [-2.27,2.27]:
 box('Aisle safety edge',(.07,.022,12.4),(x,.018,.45),brass)
 for z in [-5.2,-2.7,-.2,2.3,4.8]:
  box('Modular mounting rail',(.11,.085,2.2),(x+(-.21 if x<0 else .21),.032,z),steel)
  for dz in [-.86,0,.86]:cyl('Rail anchor',.045,.027,(x+(-.21 if x<0 else .21),.09,z+dz),brass)
for side in [-1,1]:
 x=side*4.85
 for i in range(5):
  z=-4.7+i*2.5;box('Wall cassette',(.15,4.55,2.43),(x,2.22,z),paint,'ShellWalls',.035)
  box('Inset utility panel',(.045,1.45,2.09),(x-side*.1,1.4,z),steel,'ShellWalls')
  box('Upper wall inset',(.035,1.3,2.08),(x-side*.1,3.24,z),rubber,'ShellWalls')
  for dz in [-.98,.98]:
   for y in [.35,2.38,3.85]:cyl('Captive panel bolt',.038,.055,(x-side*.15,y,z+dz),brass,'ShellWalls','x')
  box('Panel seam',(.11,4.42,.045),(x-side*.13,2.22,z+1.23),rubber,'ShellWalls')
 for y,r,offset in [(3.84,.062,.22),(4.05,.042,.34),(4.21,.045,.46)]:
  cyl('Service conduit',r,12.1,(x-side*offset,y,.4),steel,'ShellWalls','z')
  for z in [-4,-1.5,1,3.5,6]:box('Pipe retaining bracket',(.35,.035,.12),(x-side*.2,y+.05,z),brass,'ShellWalls')
 for z in [-5.5,-3,.0,2.5,5.0,6.6]:
  box('Structural rib',(.23,4.6,.16),(x-side*.13,2.25,z),steel,'ShellWalls',.04)
# Rear bulkhead with nested door frame.
box('Rear wall',(10.05,4.7,.18),(0,2.25,-5.84),paint)
for x in [-1.78,1.78]:
 box('Portal gasket',(.32,4.08,.25),(x,1.96,-5.62),rubber)
 box('Portal steel arch',(.19,4.12,.37),(x,1.98,-5.44),steel,.0 if False else 'ShellStatic')
 for y in [.22,1,2,3,3.85]:cyl('Frame bolt',.055,.055,(x,y,-5.22),brass,axis='z')
box('Portal header',(3.75,.27,.39),(0,4.0,-5.46),steel)
box('Threshold',(3.6,.09,.62),(0,.012,-5.38),steel)
for x in [-1.1,-.7,-.3,.3,.7,1.1]:box('Threshold groove',(.035,.012,.51),(x,.064,-5.38),rubber)
for side,name in [(-1,'DoorLeft'),(1,'DoorRight')]:
 g=parent(name);g.location=point(side*.74,1.92,-5.20)
 # Author in world positions then preserve world transform under the door pivot.
 for suffix,dims,loc,ma in [('skin',(1.45,3.73,.18),(side*.74,1.92,-5.2),paint),('central inset',(1.20,2.9,.045),(side*.74,1.92,-5.09),steel),('handle',(.075,.7,.07),(side*.17,1.8,-5.03),brass)]:
  o=box(name+' '+suffix,dims,loc,ma,name,.035);o.matrix_parent_inverse=g.matrix_world.inverted()
 for n in range(7):
  o=box('Door pressed channel',(.025,3.15,.022),(side*.74-.55+n*.18,1.95,-5.053),rubber,name,.002);o.matrix_parent_inverse=g.matrix_world.inverted()
text('Lift number','F / 09',.29,(0,4.19,-5.31));text('Elevator legend','LIFE SUPPORT  /  ELEVATOR',.095,(0,4.07,-5.30))
box('Door safety light',(2.7,.055,.09),(0,3.87,-5.1),light)
# Rear control station and breathable domestic details.
box('Terminal cabinet',(1.75,.96,.68),(-2.95,.49,-5.12),paint,bevel=.045)
box('Terminal worktop',(1.98,.095,1.0),(-2.95,1.0,-4.99),ivory,bevel=.025)
box('CRT case',(1.06,.64,.48),(-2.95,1.37,-5.13),rubber,bevel=.065)
box('CRT glass',(.85,.43,.018),(-2.95,1.40,-4.88),steel)
text('Terminal text','F9 / STANDBY',.10,(-2.95,1.38,-4.858))
for x in [-3.45,-3.22,-2.99,-2.76,-2.53]:
 for z in [-4.65,-4.78]:box('Keyboard key',(.16,.025,.085),(x,1.067,z),rubber,bevel=.009)
box('Filtration housing',(1.4,2.2,.59),(3.02,1.18,-5.23),paint,bevel=.055)
for y in [.43+i*.12 for i in range(12)]:box('Air vent louver',(1.04,.047,.065),(3.02,y,-4.90),rubber)
text('Air stencil','FILTER / 09',.14,(3.02,2.06,-4.916))
box('Call panel',(.48,1.22,.18),(2.05,1.72,-5.26),rubber,bevel=.03)
for y in [1.42,1.68,1.94]:cyl('Lift call button',.061,.035,(2.05,y,-5.144),brass,axis='z',vertices=20)
# Ceiling beams lift away for build view.
for z in [-4.2,.7,5.65]:
 box('Ceiling crossmember',(9.5,.14,.24),(0,4.51,z),steel,'ShellWalls')
 box('Luminaire case',(3.0,.16,.65),(0,4.4,z),rubber,'ShellWalls',.045)
 box('Fluorescent cover',(2.77,.048,.43),(0,4.295,z),light,'ShellWalls',.014)
 for x in [-1.22,-.6,0,.6,1.22]:box('Light safety bar',(.025,.045,.56),(x,4.26,z),steel,'ShellWalls',.006)
text('Aisle stencil','KEEP WALKWAY CLEAR',.19,(0,.024,2.7),floor=True)
# Join static meshes per removable assembly for practical draw calls.
for name,g in list(groups.items()):
 objs=[o for o in g.children if o.type=='MESH']
 if not objs:continue
 bpy.ops.object.select_all(action='DESELECT')
 for o in objs:o.select_set(True)
 bpy.context.view_layer.objects.active=objs[0];bpy.ops.object.join();o=bpy.context.object;o.name=name+'_Mesh'
# Export only shell, no light/camera dependencies.
bpy.ops.export_scene.gltf(filepath=str(OUT/'shell.glb'),export_format='GLB',export_apply=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'base-source.blend'))
print('SHELL_READY '+str(OUT/'shell.glb'))
