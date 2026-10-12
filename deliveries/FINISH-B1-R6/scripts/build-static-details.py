"""Build FINISH-44 static room/chair detail from the exact R5 native source.

This script writes only inside deliveries/FINISH-B1-R6. Blender mesh data is
stored in Blender's X-right/Y-depth/Z-up space; export_yup performs the one
existing Blender-to-glTF conversion. New polygons are merged into existing
single-material static batches, so no runtime object, node, asset request, or
interactive hook is added.
"""
from __future__ import annotations
import bmesh, bpy, hashlib, json, math, pathlib, struct
from mathutils import Vector

OUT = pathlib.Path(__file__).resolve().parents[1]
R5 = OUT / "inputs" / "r5" / "FINISH-B1-R5"
BASE = R5 / "assets"
ASSETS = OUT / "assets"
EVIDENCE = OUT / "evidence"
SOURCE = ASSETS / "source"
ROOM_BASE_BLEND = BASE / "source" / "room.blend"
ROOM_OUTPUT_BLEND = ASSETS / "source" / "room.blend"
FIXTURE_BASE_GLB = BASE / "fixture.glb"
FIXTURE_OUTPUT_BLEND = SOURCE / "fixture.blend"
NATIVE_ROOM_GLB = EVIDENCE / "native-room-export.glb"
NATIVE_FIXTURE_GLB = EVIDENCE / "native-fixture-export.glb"
GEOMETRY_JSON = EVIDENCE / "geometry-additions.json"

if tuple(bpy.app.version[:3]) != (5, 2, 2):
    raise RuntimeError(f"Expected Blender 5.2.2, got {bpy.app.version_string}")
for p in (EVIDENCE, SOURCE):
    p.mkdir(parents=True, exist_ok=True)

class Geometry:
    def __init__(self, asset, mesh_name, material, space):
        self.asset, self.mesh_name, self.material, self.space = asset, mesh_name, material, space
        self.vertices, self.faces = [], []
    def face(self, coords):
        start = len(self.vertices)
        self.vertices.extend([[float(v[0]), float(v[1]), float(v[2])] for v in coords])
        self.faces.append(list(range(start, start + len(coords))))
    def box(self, center, size, bevel=0.0):
        x,y,z=center; sx,sy,sz=[v/2 for v in size]
        if bevel > 0:
            b=min(bevel,sx*.45,sy*.45,sz*.45)
            bm=bmesh.new(); bmesh.ops.create_cube(bm,size=1.0)
            for v in bm.verts:
                v.co.x=v.co.x*2*sx+x; v.co.y=v.co.y*2*sy+y; v.co.z=v.co.z*2*sz+z
            bmesh.ops.bevel(bm,geom=list(bm.edges),offset=b,segments=2,profile=.5,clamp_overlap=True)
            bm.verts.ensure_lookup_table(); start=len(self.vertices)
            self.vertices.extend([[float(v.co.x),float(v.co.y),float(v.co.z)] for v in bm.verts])
            for f in bm.faces: self.faces.append([start+v.index for v in f.verts])
            bm.free(); return
        pts=[(x-sx,y-sy,z-sz),(x+sx,y-sy,z-sz),(x+sx,y+sy,z-sz),(x-sx,y+sy,z-sz),
             (x-sx,y-sy,z+sz),(x+sx,y-sy,z+sz),(x+sx,y+sy,z+sz),(x-sx,y+sy,z+sz)]
        start=len(self.vertices); self.vertices.extend([list(p) for p in pts])
        # Outward winding for the six faces.
        for f in ((0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)):
            self.faces.append([start+i for i in f])
    def ellipsoid(self, center, radii, seg=10, rings=6):
        cx,cy,cz=center; rx,ry,rz=radii; start=len(self.vertices)
        self.vertices.append([cx,cy,cz+rz])
        for j in range(1,rings):
            phi=math.pi*j/rings
            for i in range(seg):
                theta=2*math.pi*i/seg
                self.vertices.append([cx+rx*math.sin(phi)*math.cos(theta),cy+ry*math.sin(phi)*math.sin(theta),cz+rz*math.cos(phi)])
        bottom=len(self.vertices); self.vertices.append([cx,cy,cz-rz])
        first=start+1
        for i in range(seg): self.faces.append([start,first+i,first+(i+1)%seg])
        for j in range(rings-2):
            a=first+j*seg; b=a+seg
            for i in range(seg):
                k=(i+1)%seg; self.faces.append([a+i,b+i,b+k,a+k])
        last=first+(rings-2)*seg
        for i in range(seg): self.faces.append([bottom,last+(i+1)%seg,last+i])
    def cylinder_y(self, center, radius, depth, segments=16, taper=1.0):
        x,y,z=center; start=len(self.vertices); h=depth/2
        for yy,rr in ((y-h,radius*taper),(y+h,radius)):
            for i in range(segments):
                a=2*math.pi*i/segments; self.vertices.append([x+rr*math.cos(a),yy,z+rr*math.sin(a)])
        self.faces.append([start+i for i in range(segments-1,-1,-1)])
        self.faces.append([start+segments+i for i in range(segments)])
        for i in range(segments):
            k=(i+1)%segments; self.faces.append([start+i,start+k,start+segments+k,start+segments+i])
    def cylinder_x(self, center, radius, depth, segments=12):
        x,y,z=center; start=len(self.vertices); h=depth/2
        for xx in (x-h,x+h):
            for i in range(segments):
                a=2*math.pi*i/segments; self.vertices.append([xx,y+radius*math.cos(a),z+radius*math.sin(a)])
        self.faces.append([start+i for i in range(segments-1,-1,-1)])
        self.faces.append([start+segments+i for i in range(segments)])
        for i in range(segments):
            k=(i+1)%segments; self.faces.append([start+i,start+k,start+segments+k,start+segments+i])
    def cylinder_z(self, center, radius, height, segments=12, top_scale=1.0):
        x,y,z=center; start=len(self.vertices); h=height/2
        for zz,rr in ((z-h,radius),(z+h,radius*top_scale)):
            for i in range(segments):
                a=2*math.pi*i/segments; self.vertices.append([x+rr*math.cos(a),y+rr*math.sin(a),zz])
        self.faces.append([start+i for i in range(segments-1,-1,-1)])
        self.faces.append([start+segments+i for i in range(segments)])
        for i in range(segments):
            k=(i+1)%segments; self.faces.append([start+i,start+k,start+segments+k,start+segments+i])
    def torus_y(self, center, major, minor, segments=20, tube=6):
        x,y,z=center; start=len(self.vertices)
        for i in range(segments):
            a=2*math.pi*i/segments
            for j in range(tube):
                b=2*math.pi*j/tube; r=major+minor*math.cos(b)
                self.vertices.append([x+r*math.cos(a),y+minor*math.sin(b),z+r*math.sin(a)])
        for i in range(segments):
            for j in range(tube):
                a=start+i*tube+j; b=start+((i+1)%segments)*tube+j
                c=start+((i+1)%segments)*tube+(j+1)%tube; d=start+i*tube+(j+1)%tube
                self.faces.append([a,b,c,d])
    def hex_prism_y(self, center, radius, depth):
        x,y,z=center; start=len(self.vertices); h=depth/2
        # Point-up hexagon in the X/Z wall plane; front normal faces camera (-Y).
        pts=[(x+radius*math.cos(math.pi/2+i*math.pi/3),z+radius*math.sin(math.pi/2+i*math.pi/3)) for i in range(6)]
        for yy in (y-h,y+h): self.vertices.extend([[px,yy,pz] for px,pz in pts])
        self.faces.append([start+i for i in range(5,-1,-1)])
        self.faces.append([start+6+i for i in range(6)])
        for i in range(6):
            k=(i+1)%6; self.faces.append([start+i,start+k,start+6+k,start+6+i])
    def hex_ring_y(self, center, outer, inner, depth):
        x,y,z=center; start=len(self.vertices); h=depth/2
        for yy,rr in ((y-h,outer),(y-h,inner),(y+h,outer),(y+h,inner)):
            self.vertices.extend([[x+rr*math.cos(math.pi/2+i*math.pi/3),yy,z+rr*math.sin(math.pi/2+i*math.pi/3)] for i in range(6)])
        for i in range(6):
            k=(i+1)%6
            # Front annulus, rear annulus and outer/inner walls.
            self.faces += [[start+i,start+k,start+6+k,start+6+i],
                           [start+12+i,start+18+i,start+18+k,start+12+k],
                           [start+i,start+12+i,start+12+k,start+k],
                           [start+6+i,start+6+k,start+18+k,start+18+i]]
    def frustum_z(self, center, r_bottom, r_top, height, segments=12):
        x,y,z=center; start=len(self.vertices); h=height/2
        for zz,rr in ((z-h,r_bottom),(z+h,r_top)):
            for i in range(segments):
                a=2*math.pi*i/segments; self.vertices.append([x+rr*math.cos(a),y+rr*math.sin(a),zz])
        self.faces.append([start+i for i in range(segments-1,-1,-1)])
        for i in range(segments):
            k=(i+1)%segments; self.faces.append([start+i,start+k,start+segments+k,start+segments+i])
        self.faces.append([start+segments+i for i in range(segments)])
    def leaf(self, base, tip, width):
        bx,by,bz=base; tx,ty,tz=tip
        dx,dy,dz=tx-bx,ty-by,tz-bz
        horiz=math.hypot(dx,dy) or 1.0; px=-dy/horiz*width; py=dx/horiz*width
        mid=((bx+tx)*.5,(by+ty)*.5,(bz+tz)*.5)
        # Raised center rib makes the stylized leaf readable without a texture.
        v=[(bx,by,bz),(mid[0]+px,mid[1]+py,mid[2]),(mid[0],mid[1],mid[2]+.015),(mid[0]-px,mid[1]-py,mid[2]),(tx,ty,tz)]
        self.face([v[0],v[1],v[2],v[4]])
        self.face([v[0],v[2],v[3],v[4]])
        self.face([v[4],v[2],v[1],v[0]])
        self.face([v[4],v[3],v[2],v[0]])
    def tube_path_xz(self, cx, y, cz, radius, tube_radius, start_angle=0, end_angle=math.pi, steps=16, sides=6):
        start=len(self.vertices)
        for i in range(steps+1):
            a=start_angle+(end_angle-start_angle)*i/steps
            px=cx+radius*math.cos(a); pz=cz+radius*math.sin(a)
            tx=-math.sin(a); tz=math.cos(a)
            nx, nz=tz, -tx
            for j in range(sides):
                b=2*math.pi*j/sides
                self.vertices.append([px+tube_radius*math.cos(b)*nx,y+tube_radius*math.sin(b),pz+tube_radius*math.cos(b)*nz])
        for i in range(steps):
            for j in range(sides):
                a=start+i*sides+j; b=start+i*sides+(j+1)%sides
                c=start+(i+1)*sides+(j+1)%sides; d=start+(i+1)*sides+j
                self.faces.append([a,b,c,d])

# Geometry additions are authored in Blender object-local coordinates and later
# mapped to glTF by (x, z, -y). Room groups have identity TRS under Room_Root.
G={}
def group(asset, mesh, material, space):
    key=(asset,mesh,material)
    if key not in G: G[key]=Geometry(asset,mesh,material,space)
    return G[key]

def room(mesh,material): return group('room.glb',mesh,material,'Room_Root-local / Blender X-right,Y-depth,Z-up')

# Large, gently staggered 4+3 honeycomb light array, kept above the existing
# shelf line. Existing emitter materials and one-material static batches remain.
hexes=[(.05,2.27,'Hex_LilacEmissive'),(.40,2.27,'Hex_VioletEmissive'),(.75,2.27,'Hex_LilacEmissive'),(1.10,2.27,'Hex_VioletEmissive'),
       (.225,2.02,'Hex_VioletEmissive'),(.575,2.02,'Hex_LilacEmissive'),(.925,2.02,'Hex_VioletEmissive')]
for x,z,mat in hexes:
    room('StaticBatch__Room_Root__Neon_PinkAccent','Neon_PinkAccent').hex_ring_y((x,1.785,z),.135,.115,.021)
    room('StaticBatch__Room_Root__'+mat,mat).hex_prism_y((x,1.774,z),.111,.016)

# Three small shelf planters and foliage create a planted top/lower shelf line.
plants=[(-1.80,1.55,1.70,.090),(-.82,1.55,2.205,.085),(.80,1.55,2.205,.085)]
for pi,(x,y,z,r) in enumerate(plants):
    pot=room('StaticBatch__Room_Root__Plant_CeramicWhite','Plant_CeramicWhite')
    pot.frustum_z((x,y,z+.075),r*.78,r,.15,12)
    pot.torus_y((x,y-.001,z+.142),r*.94,.009,14,5)  # slight lip accent, still same ceramic material
    leaf_geo=room('StaticBatch__Room_Root__Plant_Foliage','Plant_Foliage')
    leaf_geo.cylinder_z((x,y,z+.205),.009,.12,8)
    for i in range(7):
        a=2*math.pi*i/7 + pi*.13
        length=.17 + .025*(i%3)
        start=(x+math.cos(a)*.018,y+math.sin(a)*.018,z+.22)
        tip=(x+math.cos(a)*length,y+math.sin(a)*length,z+.22+(.07 if i%2==0 else .12))
        leaf_geo.leaf(start,tip,.032 if i%2 else .038)
    leaf_geo.leaf((x,y,z+.22),(x+.018,y-.012,z+.47),.037)

# A compact camera body and lens sit on the left shelf, visually pairing with
# the existing ai-real-camera hook without changing or replacing that hook.
cam_dark=room('StaticBatch__Room_Root__Monitor_BezelMatte','Monitor_BezelMatte')
cam_dark.box((-1.43,1.56,1.82),(.22,.13,.145),.008)
cam_dark.cylinder_y((-1.43,1.475,1.82),.057,.05,18)
cam_dark.torus_y((-1.43,1.445,1.82),.057,.009,18,6)
cam_dark.cylinder_y((-1.43,1.442,1.82),.038,.008,16)
room('StaticBatch__Room_Root__Neon_PinkAccent','Neon_PinkAccent').torus_y((-1.43,1.435,1.82),.026,.003,16,5)
room('StaticBatch__Room_Root__Desk_IvoryTop','Desk_IvoryTop').box((-1.43,1.56,1.902),(.095,.07,.025),.005)

# A second, lower wall shelf puts the camera, PC cooling face, headset, and
# controller silhouettes inside the unchanged narrow mobile-home frustum.
# The arrangement is deliberately static and batched into existing materials.
gallery=room('StaticBatch__Room_Root__Desk_IvoryTop','Desk_IvoryTop')
gallery.box((.86,1.625,1.565),(1.78,.16,.045),.012)
room('StaticBatch__Room_Root__Neon_PinkAccent','Neon_PinkAccent').box((.86,1.538,1.555),(1.64,.012,.016),.003)
# A compact planter at the left end of the new shelf.
gallery_pot=room('StaticBatch__Room_Root__Plant_CeramicWhite','Plant_CeramicWhite')
gallery_pot.frustum_z((.10,1.57,1.665),.052,.069,.105,12)
gallery_pot.torus_y((.10,1.568,1.718),.064,.006,12,5)
gallery_leaf=room('StaticBatch__Room_Root__Plant_Foliage','Plant_Foliage')
gallery_leaf.cylinder_z((.10,1.57,1.76),.006,.09,8)
for i in range(6):
    a=2*math.pi*i/6
    gallery_leaf.leaf((.10,1.57,1.78),(.10+math.cos(a)*.105,1.57+math.sin(a)*.045,1.89+(.025 if i%2 else 0)),.025)
# Camera body/lens, front-facing toward the room from the shelf.
cam_dark.box((.32,1.545,1.805),(.205,.12,.125),.008)
cam_dark.cylinder_y((.32,1.472,1.805),.047,.032,16)
cam_dark.torus_y((.32,1.452,1.805),.047,.007,16,5)
cam_dark.cylinder_y((.32,1.45,1.805),.030,.008,14)
room('StaticBatch__Room_Root__Neon_PinkAccent','Neon_PinkAccent').torus_y((.32,1.444,1.805),.020,.0025,14,4)
# Two compact circular speaker faces read as a pair on the same lower shelf.
for x in (.56,.76):
    room('StaticBatch__Room_Root__Monitor_BezelMatte','Monitor_BezelMatte').cylinder_y((x,1.525,1.685),.056,.035,16)
    room('StaticBatch__Room_Root__Desk_IvoryTop','Desk_IvoryTop').torus_y((x,1.503,1.685),.045,.006,16,5)
    room('StaticBatch__Room_Root__Neon_PinkAccent','Neon_PinkAccent').torus_y((x,1.496,1.685),.027,.003,14,4)
    room('StaticBatch__Room_Root__Monitor_BezelMatte','Monitor_BezelMatte').cylinder_y((x,1.492,1.685),.018,.010,12)
# A readable small tower face with three rings and pink fan hubs.
gallery.box((.99,1.60,1.785),(.25,.09,.405),.012)
room('StaticBatch__Room_Root__Monitor_BezelMatte','Monitor_BezelMatte').box((.99,1.548,1.785),(.205,.015,.355),.006)
for z in (1.655,1.785,1.915):
    room('StaticBatch__Room_Root__Monitor_BezelMatte','Monitor_BezelMatte').torus_y((.99,1.533,z),.050,.007,16,5)
    room('StaticBatch__Room_Root__Neon_PinkAccent','Neon_PinkAccent').torus_y((.99,1.526,z),.038,.004,16,5)
    gallery.cylinder_y((.99,1.520,z),.018,.012,12)
    for a in (0,math.pi/2,math.pi,3*math.pi/2):
        room('StaticBatch__Room_Root__Monitor_BezelMatte','Monitor_BezelMatte').ellipsoid((.99+math.cos(a)*.027,1.519,z+math.sin(a)*.027),(.007,.003,.018),7,4)
# A headset and stand at the right of the tower, placed high enough to clear
# the seated character silhouette in the exact mobile-home view.
gallery.box((1.31,1.59,1.595),(.23,.14,.022),.006)
gallery.cylinder_z((1.31,1.59,1.735),.012,.26,10)
room('StaticBatch__Room_Root__Monitor_BezelMatte','Monitor_BezelMatte').tube_path_xz(1.31,1.57,1.865,.135,.018,0,math.pi,16,6)
for x in (1.175,1.445):
    room('StaticBatch__Room_Root__Monitor_BezelMatte','Monitor_BezelMatte').cylinder_y((x,1.555,1.86),.048,.040,14)
    room('StaticBatch__Room_Root__Neon_PinkAccent','Neon_PinkAccent').torus_y((x,1.530,1.86),.042,.005,14,5)
# Small static controllers on a narrow display card complete the right-side
# gaming accessories without adding an interaction owner or runtime node.
room('StaticBatch__Room_Root__Monitor_BezelMatte','Monitor_BezelMatte').box((1.64,1.615,1.765),(.20,.035,.27),.006)
for cx,cz in ((1.59,1.76),(1.69,1.76)):
    gallery.ellipsoid((cx,1.578,cz),(.068,.030,.043),12,6)
    gallery.ellipsoid((cx-.038,1.578,cz-.030),(.030,.028,.035),10,5)
    gallery.ellipsoid((cx+.038,1.578,cz-.030),(.030,.028,.035),10,5)
    room('StaticBatch__Room_Root__Chair_DarkMetal','Chair_DarkMetal').cylinder_y((cx-.020,1.552,cz+.008),.010,.009,8)
    room('StaticBatch__Room_Root__Neon_PinkAccent','Neon_PinkAccent').ellipsoid((cx+.024,1.551,cz+.015),(.008,.004,.008),8,4)

# The warm light bar is mounted on the existing monitor top edge. Its dark
# housing and broad yellow lens make the accent readable without lighting or
# runtime changes.
room('StaticBatch__Room_Root__Monitor_BezelMatte','Monitor_BezelMatte').box((0,1.315,1.18),(.78,.060,.055),.012)
room('StaticBatch__Room_Root__Project_SolarYellow','Project_SolarYellow').box((0,1.279,1.187),(.70,.014,.025),.006)

# Give the current mobile crop a readable drawer support, a compact left
# console/microphone, and the clipped left monitor speaker. All additions stay
# on the existing static desk/audio material batches; the desk and chair roots
# and their placements are unchanged.
drawer=room('StaticBatch__Room_Root__Desk_IvoryTop','Desk_IvoryTop')
drawer.box((-.30,.742,.535),(.26,.055,.41),.009)
drawer_dark=room('StaticBatch__Room_Root__Monitor_BezelMatte','Monitor_BezelMatte')
for z in (.420,.535,.650):
    drawer_dark.box((-.30,.708,z),(.19,.012,.009),.003)
    drawer_dark.box((-.30,.699,z-.035),(.060,.012,.014),.003)
# Low-profile console sits at the visible left desk edge, clear of the key rows.
console=room('StaticBatch__Room_Root__Desk_IvoryTop','Desk_IvoryTop')
console.box((-.35,.755,1.005),(.205,.185,.065),.009)
drawer_dark.box((-.35,.656,1.012),(.175,.010,.036),.004)
for x in (-.41,-.35,-.29):
    room('StaticBatch__Room_Root__Chair_DarkMetal','Chair_DarkMetal').cylinder_z((x,.755,1.052),.014,.014,10)
    room('StaticBatch__Room_Root__Neon_PinkAccent','Neon_PinkAccent').torus_y((x,.638,1.012),.008,.002,10,4)
# A small upright microphone occupies the left monitor margin in mobile while
# remaining beside the keyboard in desktop-home.
mic_x=-.42; mic_y=.88
room('StaticBatch__Room_Root__Chair_DarkMetal','Chair_DarkMetal').cylinder_z((mic_x,mic_y,.895),.065,.025,12)
drawer_dark.cylinder_z((mic_x,mic_y,1.015),.014,.225,10)
drawer_dark.ellipsoid((mic_x,mic_y,1.155),(.038,.040,.085),12,6)
for z in (1.13,1.15,1.17):
    room('StaticBatch__Room_Root__Neon_PinkAccent','Neon_PinkAccent').torus_y((mic_x,mic_y-.043,z),.029,.002,12,4)

# A left desktop audio console, mic grille, and drawer pulls add layered forms
# around the existing microphone/keyboard while remaining static geometry.
room('StaticBatch__Room_Root__Desk_IvoryTop','Desk_IvoryTop').box((-1.07,.985,.812),(.34,.24,.085),.012)
room('StaticBatch__Room_Root__Monitor_BezelMatte','Monitor_BezelMatte').box((-1.07,.857,.812),(.29,.012,.050),.004)
for i in range(3):
    x=-1.165+i*.095
    room('StaticBatch__Room_Root__Chair_DarkMetal','Chair_DarkMetal').cylinder_z((x,.99,.862),.024,.020,12)
    room('StaticBatch__Room_Root__Neon_PinkAccent','Neon_PinkAccent').torus_y((x,.855,.812),.010,.0025,12,4)
# Fine mic grille bands sit over the existing static capsule silhouette.
for z in (1.055,1.068,1.081):
    room('StaticBatch__Room_Root__Chair_DarkMetal','Chair_DarkMetal').torus_y((-.62,1.035,z),.034,.002,12,4)
# Slim drawer pulls: 3 on either support, aligned to existing drawer fronts.
for x in (-1.0,.98):
    for z in (.18,.38,.58):
        room('StaticBatch__Room_Root__Monitor_BezelMatte','Monitor_BezelMatte').box((x,.775,z),(.18,.020,.014),.004)

# Two round speaker faces are detailed with nested cones/rings, retaining the
# existing speaker nodes and material assignment.
for x in (-.68,.68):
    room('StaticBatch__Room_Root__Monitor_BezelMatte','Monitor_BezelMatte').torus_y((x,1.175,.875),.069,.009,18,6)
    room('StaticBatch__Room_Root__Desk_IvoryTop','Desk_IvoryTop').torus_y((x,1.165,.875),.047,.006,18,6)
    room('StaticBatch__Room_Root__Monitor_BezelMatte','Monitor_BezelMatte').cylinder_y((x,1.16,.875),.030,.015,16)
    room('StaticBatch__Room_Root__Neon_PinkAccent','Neon_PinkAccent').torus_y((x,1.148,.875),.011,.0025,12,4)

# Additional static keycap rows are batched into existing dark/amber material
# meshes; no new key response owner or separate asset request is created.
key_dark=room('StaticBatch__Room_Root__Monitor_BezelMatte','Monitor_BezelMatte')
key_amber=room('StaticBatch__Room_Root__Project_SolarYellow','Project_SolarYellow')
for row,y in enumerate((.900,.945,.990,1.035)):
    count=11 if row<3 else 9; offset=(11-count)*.022
    for col in range(count):
        x=-.34+col*.052+offset
        target=key_amber if (row==0 and col in (0,5,10)) else key_dark
        target.box((x,y,.794),(.036,.030,.014),.003)
# One wide static space bar.
key_dark.box((-.08,.865,.794),(.20,.032,.014),.003)

# A three-fan white PC face with dark rings and small pink hubs. Glass geometry,
# transmission material, and existing chassis node are untouched.
for z in (.855,1.005,1.155):
    room('StaticBatch__Room_Root__Monitor_BezelMatte','Monitor_BezelMatte').torus_y((1.05,.887,z),.060,.008,16,5)
    room('StaticBatch__Room_Root__Neon_PinkAccent','Neon_PinkAccent').torus_y((1.05,.878,z),.044,.004,16,5)
    room('StaticBatch__Room_Root__Desk_IvoryTop','Desk_IvoryTop').cylinder_y((1.05,.872,z),.021,.016,12)
    # Four short radial blades around the center hub.
    for a in (0,math.pi/2,math.pi,3*math.pi/2):
        room('StaticBatch__Room_Root__Monitor_BezelMatte','Monitor_BezelMatte').ellipsoid((1.05+math.cos(a)*.031,.874,z+math.sin(a)*.031),(.008,.004,.021),7,4)

# Two face-on controllers on the existing right-side pegboard; they are static
# visual meshes in existing material batches, not new interactive props/hooks.
for idx,(yy,zz) in enumerate(((.68,1.72),(1.00,1.47))):
    white=room('StaticBatch__Room_Root__Desk_IvoryTop','Desk_IvoryTop')
    dark=room('StaticBatch__Room_Root__Monitor_BezelMatte','Monitor_BezelMatte')
    accent=room('StaticBatch__Room_Root__Neon_PinkAccent','Neon_PinkAccent')
    # Controller face plane is perpendicular to X; pegboard is the existing right-wall panel.
    white.ellipsoid((1.985,yy,zz),(.032,.145,.060),12,6)
    white.ellipsoid((1.985,yy-.092,zz-.038),(.035,.050,.060),10,5)
    white.ellipsoid((1.985,yy+.092,zz-.038),(.035,.050,.060),10,5)
    for dy in (-.055,.055):
        dark.cylinder_x((1.948,yy+dy,zz+.005),.018,.010,10)
        dark.ellipsoid((1.945,yy+dy,zz+.005),(.006,.014,.014),8,4)
    for dy,dz in ((-.055,.024),(.055,.024),(.055,-.002),(.055,.050)):
        accent.ellipsoid((1.946,yy+dy,zz+dz),(.006,.010,.010),8,4)

# Headset and stand beside the PC: a static arch, soft earcups, stem and base.
stand=room('StaticBatch__Room_Root__Desk_IvoryTop','Desk_IvoryTop')
dark=room('StaticBatch__Room_Root__Monitor_BezelMatte','Monitor_BezelMatte')
accent=room('StaticBatch__Room_Root__Neon_PinkAccent','Neon_PinkAccent')
stand.box((1.48,1.30,.775),(.26,.18,.025),.008)
stand.cylinder_z((1.48,1.30,.965),.014,.36,12)
dark.tube_path_xz(1.48,1.30,1.19,.145,.020,0,math.pi,20,7)
for x in (1.335,1.625):
    dark.cylinder_y((x,1.285,1.185),.053,.045,16)
    dark.torus_y((x,1.258,1.185),.047,.006,16,5)
    accent.torus_y((x,1.253,1.185),.025,.003,12,4)

# White trim is also added along the chair back's visible outer shell as a soft
# quilted inset. The existing fixture-chair-blue silhouette and root stay fixed.
FG=Geometry('fixture.glb','StaticBatch__chair-root__fixture-ivory','fixture-ivory','chair-root-local / Blender X-right,Y-depth,Z-up')
rows=[(.625,.105),(.665,.142),(.735,.158),(.835,.164),(.945,.154),(1.045,.125),(1.095,.075)]
xs=(-1.0,-.5,0,.5,1.0)
front=[]; back=[]
for zi,(z,w) in enumerate(rows):
    for xmul in xs:
        x=xmul*w
        edge=abs(xmul)
        yfront=-.276-.012*(1-edge)*(0.6+0.4*math.sin(math.pi*zi/(len(rows)-1)))
        front.append((x,yfront,z)); back.append((x,yfront+.040,z))
for j in range(len(rows)-1):
    for i in range(len(xs)-1):
        a=j*len(xs)+i; b=a+1; c=a+len(xs)+1; d=a+len(xs)
        FG.faces.append([a,b,c,d])
        FG.faces.append([len(front)+d,len(front)+c,len(front)+b,len(front)+a])
# Close perimeter and narrow sides so Blender and glTF viewers see a finished pad.
for i in range(len(xs)-1):
    a=i; b=i+1; FG.faces.append([a,len(front)+a,len(front)+b,b])
    a=(len(rows)-1)*len(xs)+i; b=a+1; FG.faces.append([a,b,len(front)+b,len(front)+a])
for j in range(len(rows)-1):
    a=j*len(xs); b=(j+1)*len(xs); FG.faces.append([a,b,len(front)+b,len(front)+a])
    a=j*len(xs)+len(xs)-1; b=(j+1)*len(xs)+len(xs)-1; FG.faces.append([a,len(front)+a,len(front)+b,b])
FG.vertices=front+back
G[('fixture.glb',FG.mesh_name,FG.material)]=FG

# Append each material batch to an existing object. No Blender object/node is
# added; geometry stays static under the same Room_Root/chair-root parents.
bpy.ops.wm.open_mainfile(filepath=str(ROOM_BASE_BLEND))
for (asset,mesh_name,material),geo in G.items():
    if asset != 'room.glb': continue
    if not geo.vertices or not geo.faces: raise RuntimeError(f"Empty geometry batch {mesh_name}/{material}")
    obj=bpy.data.objects.get(mesh_name)
    if obj is None or obj.type!='MESH': raise RuntimeError(f"Missing existing target mesh {mesh_name}")
    mat_index=obj.data.materials.find(material)
    if mat_index<0: raise RuntimeError(f"Target {mesh_name} lacks existing material {material}")
    bm=bmesh.new(); bm.from_mesh(obj.data); bm.verts.ensure_lookup_table()
    new_verts=[bm.verts.new(v) for v in geo.vertices]
    new_faces=[]
    for face in geo.faces:
        f=bm.faces.new([new_verts[i] for i in face]); f.material_index=mat_index; new_faces.append(f)
    bmesh.ops.recalc_face_normals(bm,faces=new_faces)
    bm.to_mesh(obj.data); bm.free(); obj.data.update()

# Save room native source and export the complete existing Room_Root using the
# exact Blender-to-glTF Y-up conversion and R5 export behavior.
def export_root(root_obj, target, export_anim=False):
    bpy.ops.object.select_all(action='DESELECT')
    def select_tree(o):
        o.select_set(True)
        for c in o.children: select_tree(c)
    select_tree(root_obj); bpy.context.view_layer.objects.active=root_obj
    bpy.ops.export_scene.gltf(filepath=str(target),export_format='GLB',use_selection=True,export_yup=True,
        export_apply=False,export_materials='EXPORT',export_lights=True,export_cameras=False,
        export_animations=export_anim,export_animation_mode='NLA_TRACKS' if export_anim else 'ACTIONS',export_image_format='AUTO')
    if not target.exists() or target.stat().st_size<1000: raise RuntimeError(f"No real Blender GLB export at {target}")

if bpy.app.version_string.split()[0] != '5.2.2': raise RuntimeError(bpy.app.version_string)
# The room additions are merged only into existing static batch data blocks.
for (asset,mesh_name,material),geo in G.items():
    if asset!='room.glb': continue
    if bpy.data.objects[mesh_name].parent.name!='Room_Root': raise RuntimeError(f"Unexpected parent: {mesh_name}")
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOM_OUTPUT_BLEND))
bpy.ops.wm.open_mainfile(filepath=str(ROOM_OUTPUT_BLEND))
export_root(bpy.data.objects['Room_Root'],NATIVE_ROOM_GLB,False)

# Build an editable fixture .blend by importing the exact R5 fixture GLB, then
# append the same geometry data to its existing ivory static batch.
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(FIXTURE_BASE_GLB))
fixture_obj=bpy.data.objects.get(FG.mesh_name)
if fixture_obj is None or fixture_obj.parent is None or fixture_obj.parent.name!='chair-root':
    raise RuntimeError('Fixture target changed or its root binding is missing')
mat_index=fixture_obj.data.materials.find(FG.material)
if mat_index<0: raise RuntimeError('Imported fixture lacks exact ivory material')
bm=bmesh.new(); bm.from_mesh(fixture_obj.data); bm.verts.ensure_lookup_table()
new_verts=[bm.verts.new(v) for v in FG.vertices]; new_faces=[]
for face in FG.faces:
    f=bm.faces.new([new_verts[i] for i in face]); f.material_index=mat_index; new_faces.append(f)
bmesh.ops.recalc_face_normals(bm,faces=new_faces); bm.to_mesh(fixture_obj.data); bm.free(); fixture_obj.data.update()
SOURCE.mkdir(parents=True,exist_ok=True); bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(FIXTURE_OUTPUT_BLEND))
bpy.ops.wm.open_mainfile(filepath=str(FIXTURE_OUTPUT_BLEND))
export_root(bpy.data.objects['chair-root'],NATIVE_FIXTURE_GLB,False)

# Geometry JSON is the authoritative reproducible delta consumed by the GLB
# merger. All non-added source geometry remains bound to the pinned R5 blend/GLB.
rows=[]
for (asset,mesh_name,material),geo in sorted(G.items()):
    rows.append({'asset':asset,'mesh':mesh_name,'material':material,'coordinateSpace':geo.space,
                 'vertices':geo.vertices,'faces':geo.faces,'vertexCount':len(geo.vertices),'faceCount':len(geo.faces)})
receipt={'schemaVersion':1,'blenderVersion':bpy.app.version_string,'baseCommit':'a5ebcc88170703751a5f504f67aed637d2f7d8e9',
         'axisConversion':'One Blender export_yup conversion; source Blender XYZ -> glTF XYZ is [x,z,-y].',
         'newObjectOrNodeNames':[],'staticOnly':True,'geometryBatches':rows,
         'roomBlend':{'path':'assets/source/room.blend','sha256':hashlib.sha256(ROOM_OUTPUT_BLEND.read_bytes()).hexdigest(),'bytes':ROOM_OUTPUT_BLEND.stat().st_size},
         'fixtureBlend':{'path':'source/fixture.blend','sha256':hashlib.sha256(FIXTURE_OUTPUT_BLEND.read_bytes()).hexdigest(),'bytes':FIXTURE_OUTPUT_BLEND.stat().st_size},
         'nativeExports':{p.name:{'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size} for p in (NATIVE_ROOM_GLB,NATIVE_FIXTURE_GLB)}}
GEOMETRY_JSON.write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'status':'PASS','blender':bpy.app.version_string,'roomObjectCount':len(bpy.data.objects),'geometryBatches':[(r['asset'],r['mesh'],r['material'],r['vertexCount'],r['faceCount']) for r in rows],
                  'roomBlendBytes':ROOM_OUTPUT_BLEND.stat().st_size,'fixtureBlendBytes':FIXTURE_OUTPUT_BLEND.stat().st_size,
                  'nativeRoomBytes':NATIVE_ROOM_GLB.stat().st_size,'nativeFixtureBytes':NATIVE_FIXTURE_GLB.stat().st_size},indent=2))
