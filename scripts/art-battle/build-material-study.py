"""Refine the existing library in an isolated Blender background process.
Preserves root/animated-part names and leaves v4 source/assets untouched.
CC0 surface maps are already image textures; they export directly via glTF.
"""
import bpy, math, pathlib, json
from mathutils import Vector
ROOT = pathlib.Path(__file__).resolve().parents[2]
ASSETS = ROOT / 'public/art-assets/material-study'
bpy.ops.wm.open_mainfile(filepath=str(ROOT / 'outputs/battle-slice/battle-slice-v4.blend'))
images = {}
def image(asset, suffix, color=False):
    key=(asset,suffix)
    if key not in images:
        img=bpy.data.images.load(str(ASSETS/f'{asset}-{suffix}.jpg'),check_existing=True)
        img.colorspace_settings.name='sRGB' if color else 'Non-Color'
        images[key]=img
    return images[key]
def texture_material(name, asset, tint=(1,1,1,1), strength=.4, metal=False, color=True):
    m=bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes=True; nodes=m.node_tree.nodes; links=m.node_tree.links; nodes.clear()
    p=nodes.new('ShaderNodeBsdfPrincipled'); p.inputs['Base Color'].default_value=tint
    out=nodes.new('ShaderNodeOutputMaterial'); links.new(p.outputs['BSDF'],out.inputs['Surface'])
    if color:
        t=nodes.new('ShaderNodeTexImage');t.image=image(asset,'color',True);links.new(t.outputs['Color'],p.inputs['Base Color'])
    t=nodes.new('ShaderNodeTexImage');t.image=image(asset,'normal')
    n=nodes.new('ShaderNodeNormalMap');n.inputs['Strength'].default_value=strength
    links.new(t.outputs['Color'],n.inputs['Color']);links.new(n.outputs['Normal'],p.inputs['Normal'])
    t=nodes.new('ShaderNodeTexImage');t.image=image(asset,'arm')
    split=nodes.new('ShaderNodeSeparateColor');links.new(t.outputs['Color'],split.inputs['Color'])
    links.new(split.outputs['Green'],p.inputs['Roughness'])
    if metal:p.inputs['Metallic'].default_value=.9
    return m
wood=texture_material('Warm walnut','wood_table_001',strength=.25)
leather=texture_material('Leather cushion','brown_leather',strength=.45)
steel=texture_material('Blue-black enamel','blue_metal_plate',strength=.35)
silver=texture_material('Machined steel','metal_plate_02',(1,1,1,1),.25,True,True)
brass=texture_material('Worn brass','blue_metal_plate',(.34,.23,.10,1),.2,True,False)

def finish(o,name,parent,mat):
    o.name=name;o.parent=parent;o.data.materials.clear();o.data.materials.append(mat);return o
def box(name,loc,scale,parent,mat,bevel=.007):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.dimensions=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    b=o.modifiers.new('Manufactured edge','BEVEL');b.width=bevel;b.segments=3
    o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    return finish(o,name,parent,mat)
def line(name,pts,r,parent,mat):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=3
    s=c.splines.new('POLY');s.points.add(len(pts)-1)
    for p,v in zip(s.points,pts):p.co=(*v,1)
    o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.parent=parent;c.materials.append(mat);return o

# A physically depressed cushion, retaining existing stitches and buttons.
old=next(o for o in bpy.data.objects if o.name.startswith('Stitched leather cushion'))
root=old.parent
bpy.data.objects.remove(old,do_unlink=True)
verts=[];faces=[];nx=48;ny=48
for j in range(ny+1):
    y=-.32+.64*j/ny
    for i in range(nx+1):
        x=-.30+.60*i/nx
        edge=max(0,(1-(abs(x)/.305)**8)*(1-(abs(y)/.325)**8))
        z=.16+.12*edge**.35
        for bx in [-.12,.12]:
            for by in [-.13,.13]:z-=.04*math.exp(-((x-bx)**2+(y-by)**2)/.0015)
        z+=.003*math.sin(x*95+y*35)*math.exp(-((abs(y)-.27)/.045)**2)
        verts.append((x,y,z))
for j in range(ny):
    for i in range(nx):
        a=j*(nx+1)+i;faces.append((a,a+1,a+nx+2,a+nx+1))
mesh=bpy.data.meshes.new('Compressed leather surface');mesh.from_pydata(verts,[],faces);mesh.update()
o=bpy.data.objects.new('Stitched leather cushion',mesh);bpy.context.collection.objects.link(o);finish(o,o.name,root,leather)
for f in mesh.polygons:f.use_smooth=True
box('Leather sidewall',(0,0,.125),(.61,.65,.16),root,leather,.065)
for o in root.children:
    if o.name.startswith('Tuft button'):o.location.z=.249
    if o.name=='Stitch' or o.name.startswith('Stitch.'):
        o.data.bevel_depth=.0022
        for spline in o.data.splines:
            for p in spline.points:
                x,y=p.co.x,p.co.y
                edge=max(0,(1-(abs(x)/.305)**8)*(1-(abs(y)/.325)**8))
                z=.16+.12*edge**.35
                for bx in [-.12,.12]:
                    for by in [-.13,.13]:z-=.04*math.exp(-((x-bx)**2+(y-by)**2)/.0015)
                p.co.z=z+.0015
for inset,z in [(.291,.18),(.283,.22)]:
    pts=[]
    for i in range(129):
        a=i/128*math.tau
        pts.append((inset*math.copysign(abs(math.cos(a))**.3,math.cos(a)),(inset+.02)*math.copysign(abs(math.sin(a))**.3,math.sin(a)),z))
    line('Leather piping',pts,.006,root,leather)

root=bpy.data.objects['springbow']
dark=bpy.data.materials['Black rubber'];thread=bpy.data.materials['Canvas and stitching']
for x in [-.086,.086]:
    box('Rail seat',(x,-.08,.22),(.022,.45,.024),root,brass)
    for y in [-.29,.11]:
        bpy.ops.mesh.primitive_cylinder_add(vertices=20,radius=.022,depth=.017,location=(x,y,.239))
        finish(bpy.context.object,'Slotted rail fastener',root,silver)
        box('Fastener slot',(x,y,.249),(.023,.004,.002),root,dark,.001)
for i in range(8):
    y=-.39+i*.019
    line('Grip binding',[(-.093,y,.12),(-.081,y,.208),(.081,y,.208),(.093,y,.12)],.009,root,leather)
line('Trigger guard',[(-.07,-.24,.10),(-.11,-.24,.02),(-.1,-.37,.005),(.10,-.37,.005),(.11,-.24,.02),(.07,-.24,.10)],.011,root,brass)
box('Trigger',(0,-.28,.052),(.02,.045,.07),root,silver)
for x in [-.24,.24]:
    bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=.026,depth=.02,location=(x,.2,.315))
    finish(bpy.context.object,'Coil axle',root,silver)

# Convert curves/modifiers and provide continuous, dimension-based box UVs.
# Primary top faces use X/Y so wood grain runs along the stock, not across it.
textured={'Warm walnut','Leather cushion','Blue-black enamel','Machined steel','Worn brass'}
targets=[o for o in bpy.data.objects if o.type in {'MESH','CURVE'} and o.parent and o.parent.name in {'springbow','rubber','slingshot','gapblade','sealant'}]
for o in targets:
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
    bpy.ops.object.convert(target='MESH')
    if not o.data.materials or o.data.materials[0].name not in textured:continue
    uv=o.data.uv_layers.active or o.data.uv_layers.new(name='SurfaceUV')
    tile=.65 if o.data.materials[0].name=='Leather cushion' else .9
    for poly in o.data.polygons:
        axis=max(range(3),key=lambda a:abs(poly.normal[a]))
        for li in poly.loop_indices:
            v=o.matrix_world @ o.data.vertices[o.data.loops[li].vertex_index].co
            a,b=(v.x,v.y) if axis==2 else (v.x,v.z) if axis==1 else (v.y,v.z)
            uv.data[li].uv=(a*.18+.09,b*.18+.12) if o.data.materials[0].name=='Machined steel' else (a/tile+.3,b/tile+.1)

dest=ROOT/'public/art-assets/battle-slice/equipment-library-v5.glb'
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'outputs/battle-slice/battle-slice-v5.blend'))
bpy.ops.export_scene.gltf(filepath=str(dest),export_format='GLB',export_apply=True,export_yup=True)
report={'version':5,'source':'v4 geometry refined in Blender; CC0 Poly Haven maps (see material-study/sources.json)','bytes':dest.stat().st_size,'texturedMaterials':list(textured),'roots':[o.name for o in bpy.data.objects if not o.parent]}
(ASSETS/'model-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report))
