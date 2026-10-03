"""Original F9 battle slice assets. Run in a separate Blender --background process."""
import bpy, math, pathlib, json
from mathutils import Vector

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / 'public' / 'art-assets' / 'battle-slice'
SOURCE = ROOT / 'outputs' / 'battle-slice'
OUT.mkdir(parents=True, exist_ok=True)
SOURCE.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def mat(name, color, metal=0, rough=.5, glow=0):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Metallic'].default_value=metal; p.inputs['Roughness'].default_value=rough
    if glow:
        p.inputs['Emission Color'].default_value=(*color,1); p.inputs['Emission Strength'].default_value=glow
    return m
steel=mat('Blue-black enamel',(.095,.145,.15),.65,.36)
edge=mat('Worn brass',(.46,.32,.12),.75,.32)
dark=mat('Black rubber',(.024,.032,.033),0,.82)
silver=mat('Machined steel',(.48,.56,.55),.85,.24)
wood=mat('Warm walnut',(.24,.105,.045),0,.57)
leather=mat('Leather cushion',(.27,.115,.055),0,.72)
thread=mat('Canvas and stitching',(.58,.49,.29),0,.8)
red=mat('Oxide red',(.35,.095,.065),.25,.65)
amber=mat('Amber indicator',(.95,.51,.12),.1,.3,3)
teal=mat('Maintenance indicator',(.15,.65,.59),.2,.35,2)
concrete=mat('Concrete',(.115,.14,.14),0,.93)

def group(name):
    o=bpy.data.objects.new(name,None); bpy.context.collection.objects.link(o); return o
parent=None
def finish(o,name,m):
    o.name=name; o.parent=parent; o.data.materials.append(m); return o
def box(name,loc,size,m,bevel=.025):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc); o=bpy.context.object
    o.dimensions=size; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=o.modifiers.new('Rounded manufactured edges','BEVEL'); mod.width=bevel; mod.segments=3
        o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    return finish(o,name,m)
def cyl(name,loc,r,depth,m,verts=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts,radius=r,depth=depth,location=loc)
    o=finish(bpy.context.object,name,m)
    mod=o.modifiers.new('Edge bevel','BEVEL'); mod.width=.012; mod.segments=2
    o.modifiers.new('Weighted normals','WEIGHTED_NORMAL'); return o
def line(name,points,r,m):
    c=bpy.data.curves.new(name,'CURVE'); c.dimensions='3D'; c.bevel_depth=r; c.bevel_resolution=2
    s=c.splines.new('POLY'); s.points.add(len(points)-1)
    for p,v in zip(s.points,points): p.co=(*v,1)
    o=bpy.data.objects.new(name,c); bpy.context.collection.objects.link(o); o.parent=parent; c.materials.append(m); return o
def sphere(name,loc,scale,m):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,location=loc)
    o=bpy.context.object; o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    for p in o.data.polygons:p.use_smooth=True
    return finish(o,name,m)

parent=group('environment')
box('Foundation',(0,0,-.53),(14,9,.25),dark)
for x in [-5,0,5]:
    box('Concrete slab',(x,0,-.36),(4.96,10,.13),concrete,.025)
box('Battle platform',(0,0,-.16),(10.65,5.9,.26),steel,.08)
box('Central inlay',(0,0,-.005),(10.25,1.55,.025),dark,.01)
for y in [-2.85,2.85]:
    box('Brass frame',(0,y,.015),(10.5,.06,.08),edge,.012)
    for x in [-5,-3.4,-1.7,0,1.7,3.4,5]: cyl('Frame bolt',(x,y,.07),.035,.018,silver,12)
for x in [-5.23,5.23]:
    box('Side frame',(x,0,0),(.08,5.75,.13),edge)
    for y in [-2.35,2.35]:
        box('Beacon housing',(x,y,.18),(.20,.30,.3),dark)
        box('Beacon',(x,y,.35),(.1,.15,.08),amber)
for x in [-1.73,1.73]:box('Lane divider',(x,0,.015),(.026,5.4,.025),edge,.002)
for x in [-5.9,5.9]:
    box('Checkpoint bollard',(x,2,.35),(.30,.35,1.5),steel)
    box('Bollard stripe',(x,1.81,.7),(.31,.035,.20),edge)
    line('Exposed conduit',[(x,-3.5,-.16),(x,-2,-.12),(x,2.8,-.12),(x,3.2,.3)],.055,silver)
# One continuous, headless body spanning all routes; no second barrier.
parent=group('hostcreature')
skin=mat('Ashen folded hide',(.25,.215,.235),.05,.73)
crease=mat('Deep tissue folds',(.065,.052,.066),0,.85)
verts=[]; faces=[]; rings=145; radial=48
for i in range(rings):
    x=-5.12+10.24*i/(rings-1)
    taper=max(.025,math.sin(math.pi*i/(rings-1))**.32)
    centre=.12*math.sin(x*1.25)+.045*math.cos(x*3)
    for j in range(radial):
        a=2*math.pi*j/radial
        fold=1+.095*math.sin(x*10+a*3)+.045*math.sin(x*19-a*5)
        ry=(.43+.08*math.sin(x*1.7))*taper*fold
        rz=(.42+.13*math.cos(x*1.3)+.07*math.sin(x*2.6))*taper*fold
        verts.append((x,centre+math.cos(a)*ry,.14+rz*(1+math.sin(a))))
for i in range(rings-1):
    for j in range(radial):
        n=(j+1)%radial;faces.append((i*radial+j,i*radial+n,(i+1)*radial+n,(i+1)*radial+j))
faces.extend([tuple(reversed(range(radial))),tuple((rings-1)*radial+j for j in range(radial))])
mesh=bpy.data.meshes.new('Continuous folded anatomy');mesh.from_pydata(verts,[],faces);mesh.update()
o=bpy.data.objects.new('CreatureBody',mesh);bpy.context.collection.objects.link(o);finish(o,'CreatureBody',skin)
for f in mesh.polygons:f.use_smooth=True
# Half-hidden limbs fold back under the mass, without defining a head or tail.
for i,x in enumerate([-4.1,-2.7,-.8,1.3,3.3]):
    side=-1 if i%2 else 1
    pts=[(x,.1,.28),(x+.42,side*.39,.23),(x+.25,side*.62,.12),(x-.31,side*.59,.10),(x-.62,side*.41,.12)]
    line('FoldedLimb_'+str(i),pts,.075,skin)
    line('Crease_'+str(i),[(x-.25,-.18,.51),(x,-.23,.59),(x+.13,-.25,.51)],.013,crease)

# The player is an optical trace, not another creature or a literal mutation.
parent=group('hostshadow')
shadow=mat('Impossible cast shadow',(.016,.025,.031),.05,.95)
shadowrim=mat('Cold shadow edge',(.065,.12,.14),.1,.8)
verts=[];faces=[]
for i in range(121):
    x=-5.05+10.1*i/120
    width=.13+.24*math.exp(-x*x/1.4)+.045*math.sin(x*3.1)
    centre=.055*math.sin(x*1.6)
    for side in [-1,1]:verts.append((x,centre+side*width,.085+.016*math.sin(x*2)))
for i in range(120):faces.append((i*2,i*2+1,i*2+3,i*2+2))
mesh=bpy.data.meshes.new('Stretched personal silhouette');mesh.from_pydata(verts,[],faces);mesh.update()
o=bpy.data.objects.new('ShadowBody',mesh);bpy.context.collection.objects.link(o);finish(o,'ShadowBody',shadow)
sphere('ShadowHead',(.28,.50,.09),(.27,.25,.055),shadow)
for side in [-1,1]:
    line('ShadowLeg',[(side*.19,-.15,.087),(side*.54,-.35,.087),(side*1.05,-.47,.087)],.07,shadow)
    for i in range(4):line('ShadowFinger',[(side*4.75,.02,.09),(side*(4.88+i*.045),.15+i*.07,.09)],.024,shadowrim)
line('ShadowRim',[(x/10,.21+.035*math.sin(x/3),.09) for x in range(-49,50)],.012,shadowrim)

parent=group('slingshot')
line('Walnut fork',[(0,-.35,.10),(0,-.07,.14),(-.26,.25,.22)],.065,wood)
line('Walnut fork right',[(0,-.07,.14),(.26,.25,.22)],.065,wood)
for y in range(5):line('Handle wrap',[(-.063,-.31+y*.04,.135),(.063,-.31+y*.04,.135)],.016,thread)
line('Elastic',[(-.26,.25,.24),(0,-.02,.29),(.26,.25,.24)],.019,red)
sphere('Pellet',(0,-.02,.30),(.05,.05,.05),silver)
for x in [-.26,.26]:cyl('Fork cap',(x,.25,.24),.06,.045,edge)

parent=group('gapblade')
box('Knife grip',(0,-.20,.09),(.15,.38,.13),wood,.045)
for y in [-.33,-.12]:cyl('Grip rivet',(0,y,.16),.022,.012,edge)
mesh=bpy.data.meshes.new('Blade mesh')
verts=[(-.07,-.02,.12),(.07,-.02,.12),(.085,.20,.12),(0,.43,.12),(-.065,.26,.12),(-.07,-.02,.155),(.07,-.02,.155),(.085,.20,.155),(0,.43,.155),(-.065,.26,.155)]
faces=[(0,4,3,2,1),(5,6,7,8,9)]+[(i,(i+1)%5,(i+1)%5+5,i+5) for i in range(5)]
mesh.from_pydata(verts,[],faces); o=bpy.data.objects.new('Blade',mesh); bpy.context.collection.objects.link(o); finish(o,'Blade',silver)
box('Knife bolster',(0,-.015,.1),(.22,.06,.18),edge,.02)

parent=group('rubber')
box('Cushion backing',(0,0,.04),(.66,.70,.07),dark,.07)
box('Stitched leather cushion',(0,0,.15),(.63,.67,.23),leather,.10)
for x in [-.235,.235]:
    for i in range(11):line('Stitch',[(x-.014,-.25+i*.05,.255),(x+.014,-.25+i*.05,.255)],.005,thread)
for y in [-.25,.25]:
    for i in range(10):line('Stitch',[(-.22+i*.047,y-.015,.255),(-.22+i*.047,y+.015,.255)],.005,thread)
for x in [-.12,.12]:
    for y in [-.13,.13]:sphere('Tuft button',(x,y,.264),(.026,.026,.012),dark)
box('Cushion tag',(.30,-.11,.10),(.06,.17,.045),edge,.007)

parent=group('springbow')
box('Crossbow stock',(0,-.10,.13),(.20,.80,.17),wood,.05)
box('Rail',(0,.06,.25),(.09,.72,.06),silver,.015)
line('Left bow limb',[(0,.15,.20),(-.40,.22,.26),(-.67,.37,.22)],.046,steel)
line('Right bow limb',[(0,.15,.20),(.40,.22,.26),(.67,.37,.22)],.046,steel)
line('Bow string',[(-.67,.37,.23),(0,-.23,.26),(.67,.37,.23)],.012,thread)
for x in [-.24,.24]:
    cyl('Spring mount',(x,.20,.24),.105,.075,edge)
    pts=[]
    for i in range(81):
        a=i/80*math.pi*8; r=.025+i/80*.065; pts.append((x+math.cos(a)*r,.2+math.sin(a)*r,.29))
    line('Spiral spring',pts,.009,silver)
line('Loaded bolt',[(0,-.1,.3),(0,.44,.3)],.017,silver)
box('Grip cap',(0,-.47,.13),(.21,.06,.16),edge)

parent=group('sealant')
cyl('Sealant can',(0,0,.18),.20,.35,steel)
cyl('Can rim',(0,0,.36),.215,.035,edge)
cyl('Lid',(0,0,.385),.19,.025,silver)
box('Can paper label',(0,-.196,.2),(.22,.026,.19),thread,.009)
box('Label mark',(0,-.215,.2),(.11,.012,.045),red,.002)
line('Spout',[(.08,0,.40),(.19,.08,.52),(.29,.15,.52)],.035,silver)
line('Handle',[(-.18,0,.3),(-.3,0,.43),(-.3,0,.59),(.1,0,.59),(.18,0,.37)],.021,dark)
box('Indicator',(-.08,-.09,.4),(.055,.055,.02),teal,.008)

# Export one immutable library; each family is cloned under an actual card UID.
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'battle-slice-v4.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'equipment-library-v4.glb'), export_format='GLB', export_apply=True, export_yup=True)
facts={'source':'Original procedural Blender geometry; no external textures or paid generation', 'families':['slingshot','gapblade','rubber','springbow','sealant'], 'environment':'Asymmetric hosts: recumbent unknown creature and stretched player shadow', 'version':4, 'blender':bpy.app.version_string, 'fileBytes':(OUT/'equipment-library-v4.glb').stat().st_size}
(OUT/'manifest.json').write_text(json.dumps(facts,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(facts))
