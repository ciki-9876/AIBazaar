import * as T from 'three';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import { RENDER_STYLES, type RenderStyleSettings } from './presets';

// Screen-space only. Never replaces a model material or installs onBeforeCompile.
// OutputPass applies the existing renderer's tone mapping and sRGB conversion
// once. The artistic pass consumes those display colors, without another OETF.
const fragment = /* glsl */ `
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform vec2 resolution;
uniform float nearPlane, farPlane, perspective;
uniform float strength, split, compare, original;
uniform int style;
varying vec2 vUv;
float lum(vec3 c) { return dot(c, vec3(.299,.587,.114)); }
float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p) {
  vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);
}
vec3 pixel(vec2 uv) {
  vec4 p=texture2D(tColor,clamp(uv,vec2(.001),vec2(.999)));
  return mix(vec3(.047,.071,.064), p.rgb, p.a);
}
float depth(vec2 uv) {
  float z=texture2D(tDepth,clamp(uv,vec2(.001),vec2(.999))).x;
  return mix(nearPlane+z*(farPlane-nearPlane),
    (2.*nearPlane*farPlane)/(farPlane+nearPlane-(z*2.-1.)*(farPlane-nearPlane)),perspective);
}
void main() {
  vec2 uv=vUv, px=1./resolution;
  vec3 src=pixel(uv);
  if (original>.5 || (compare>.5 && uv.x<split)) { gl_FragColor=vec4(src,1); return; }
  float l=lum(src);
  vec3 sum=src*4.; float weights=4.;
  // Small bilateral kernel reduces surface noise without changing source maps.
  for (int x=-1;x<=1;x++) for(int y=-1;y<=1;y++) {
    vec3 s=pixel(uv+vec2(float(x),float(y))*px*1.8);
    float w=exp(-abs(lum(s)-l)*18.);
    sum+=s*w; weights+=w;
  }
  vec3 c=sum/weights;
  float a=lum(pixel(uv+px*vec2(-1,1))), b=lum(pixel(uv+px*vec2(0,1))), d=lum(pixel(uv+px*vec2(1,1)));
  float e=lum(pixel(uv+px*vec2(-1,0))), f=lum(pixel(uv+px*vec2(1,0)));
  float g=lum(pixel(uv+px*vec2(-1,-1))), h=lum(pixel(uv+px*vec2(0,-1))), i=lum(pixel(uv+px*vec2(1,-1)));
  float sobel=length(vec2(-a-2.*e-g+d+2.*f+i,-g-2.*h-i+a+2.*b+d));
  float z=depth(uv);
  float dz=max(abs(depth(uv+px*vec2(1.4,0))-z),abs(depth(uv+px*vec2(0,1.4))-z))/max(z,.1);
  // A transparent shadow catcher still writes depth. Do not ink its invisible
  // horizon, or turn a translucent rarity aura into a solid silhouette.
  float alpha=texture2D(tColor,uv).a;
  float contour=smoothstep(.007,.04,dz)*smoothstep(.12,.8,alpha);
  float edge=max(smoothstep(.10,.42,sobel),contour);
  float fine=hash(floor(uv*resolution));
  float grain=noise(uv*resolution*.39)*.55+fine*.45;
  float light=pow(clamp(lum(c),0.,1.),.57);
  vec3 outColor=src;
  if(style==0) {
    // Five broad light bands, warm highlights and blue-violet shadow pigment.
    float band=(floor(light*5.)+.45)/5.;
    vec3 chroma=mix(vec3(lum(c)),c,1.35);
    vec3 flatColor=clamp(chroma/max(lum(c),.065)*band,0.,1.);
    flatColor=mix(flatColor,flatColor*vec3(.88,.89,1.10),.33*(1.-light));
    flatColor=mix(flatColor,vec3(1.,.94,.77),smoothstep(.76,1.,light)*.27);
    float celLine=max(contour,smoothstep(.16,.55,sobel)*.43);
    outColor=mix(flatColor,vec3(.035,.045,.083),celLine*.82);
  } else if(style==1) {
    // Paper + solid ink + screened midtones. Dot period is fixed in pixels.
    vec2 q=mat2(.866,-.5,.5,.866)*(uv*resolution);
    vec2 cell=fract(q/4.5)-.5;
    float darkness=1.-smoothstep(.12,.89,light);
    float dotInk=1.-smoothstep(sqrt(darkness)*.37-.045,sqrt(darkness)*.37+.045,length(cell));
    float ink=max(max(dotInk*.84,edge),1.-smoothstep(.18,.30,light));
    outColor=mix(vec3(.96,.946,.885),vec3(.045,.061,.068),ink);
    outColor-=vec3((grain-.5)*.034);
  } else if(style==2) {
    // Stable, low-frequency paper deformation: no frame-random flickering.
    vec2 warp=vec2(noise(uv*resolution*.033),noise(uv*resolution*.029+13.))-.5;
    float wet=lum(pixel(uv+warp*px*3.8));
    float tone=pow(max(wet,0.),.44);
    float density=(1.-smoothstep(.11,.88,tone))*.84;
    density*=.93+.21*noise(uv*resolution*.024);
    float bleed=smoothstep(.05,.32,sobel)*(.45+.25*noise(uv*resolution*.09));
    float stroke=max(contour*.92,bleed);
    vec3 paper=vec3(.945,.928,.864)+(grain-.5)*.048;
    vec3 ink=vec3(.071,.093,.087);
    float pigment=clamp(density+stroke*.80,0.,.96);
    // Keep empty background as unpainted paper in the specimen view.
    float present=alpha;
    outColor=mix(paper,ink,pigment*present);
    outColor+=vec3(.018,.025,.020)*sin(tone*17.)*density;
  } else if(style==3) {
    vec2 p=uv*resolution;
    float hatch1=smoothstep(.26,.40,abs(fract((p.x+p.y*.57)/5.5)-.5));
    float hatch2=smoothstep(.32,.45,abs(fract((p.x-p.y*.9)/7.5)-.5));
    vec3 paper=vec3(.94,.824,.607), soot=vec3(.12,.18,.19), red=vec3(.70,.25,.15);
    float shadow=1.-smoothstep(.13,.8,light);
    float warm=smoothstep(.018,.10,c.r-c.b);
    vec3 block=mix(paper,red,warm*.74*step(.36,light));
    float marks=max(edge*.92,hatch1*shadow*.9);
    marks=max(marks,hatch2*(1.-smoothstep(.16,.36,light)));
    marks=max(marks,(1.-smoothstep(.08,.17,light))*.88);
    outColor=mix(block,soot,marks)+(grain-.5)*.048;
  } else {
    vec3 cyan=vec3(.06,.94,1.), pink=vec3(1.,.15,.63);
    float broad=abs(lum(pixel(uv+px*vec2(4,0)))-lum(pixel(uv-px*vec2(4,0))))+
      abs(lum(pixel(uv+px*vec2(0,4)))-lum(pixel(uv-px*vec2(0,4))));
    vec3 neon=mix(cyan,pink,smoothstep(-.09,.12,c.r-c.g)+sin(uv.y*4.)*.06);
    vec3 dark=vec3(.018,.025,.075)+c*vec3(.10,.06,.18);
    outColor=dark+neon*(edge*.92+smoothstep(.03,.5,broad)*.27);
    outColor+=pow(max(c,vec3(0)),vec3(3.))*vec3(.20,.1,.28);
  }
  if(style!=2 && alpha<.999) {
    vec3 ground=style==0?vec3(.09,.14,.15):style==1?vec3(.96,.946,.885):style==3?vec3(.94,.824,.607):vec3(.018,.025,.075);
    if(style==1 || style==3) ground+=(grain-.5)*.025;
    outColor=mix(ground,outColor,alpha);
  }
  gl_FragColor=vec4(clamp(mix(src,outColor,strength),0.,1.),1.);
}
`;

export class StylePostProcess {
  private source: T.WebGLRenderTarget;
  private display: T.WebGLRenderTarget;
  private output = new OutputPass();
  private material: T.ShaderMaterial;
  private quad: FullScreenQuad;
  private size = new T.Vector2();
  constructor(private renderer: T.WebGLRenderer) {
    this.source = new T.WebGLRenderTarget(1, 1, {
      type: T.HalfFloatType,
      depthBuffer: true,
    });
    this.source.depthTexture = new T.DepthTexture(1, 1, T.UnsignedIntType);
    this.display = new T.WebGLRenderTarget(1, 1, {
      type: T.UnsignedByteType,
      depthBuffer: false,
    });
    this.source.texture.name = 'style/source-linear';
    this.display.texture.name = 'style/display-srgb';
    this.material = new T.ShaderMaterial({
      name: 'F9 screen-space print styles',
      toneMapped: false,
      depthTest: false,
      depthWrite: false,
      blending: T.NoBlending,
      uniforms: {
        tColor: { value: this.display.texture },
        tDepth: { value: this.source.depthTexture },
        resolution: { value: new T.Vector2() },
        nearPlane: { value: 0.1 },
        farPlane: { value: 100 },
        perspective: { value: 1 },
        style: { value: 0 },
        strength: { value: 1 },
        split: { value: 0.5 },
        compare: { value: 0 },
        original: { value: 0 },
      },
      vertexShader:
        'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }',
      fragmentShader: fragment,
    });
    this.quad = new FullScreenQuad(this.material);
  }
  render(scene: T.Scene, camera: T.Camera, settings: RenderStyleSettings) {
    const r = this.renderer;
    r.getDrawingBufferSize(this.size);
    const { x: w, y: h } = this.size;
    if (this.source.width !== w || this.source.height !== h) {
      this.source.setSize(w, h);
      this.display.setSize(w, h);
      this.material.uniforms.resolution.value.set(w, h);
    }
    const u = this.material.uniforms;
    u.style.value = RENDER_STYLES.findIndex((s) => s.id === settings.style);
    u.strength.value = T.MathUtils.clamp(settings.strength, 0, 1);
    u.split.value = T.MathUtils.clamp(settings.split, 0, 1);
    u.compare.value = settings.compare ? 1 : 0;
    u.original.value = settings.original ? 1 : 0;
    if (
      camera instanceof T.PerspectiveCamera ||
      camera instanceof T.OrthographicCamera
    ) {
      u.nearPlane.value = camera.near;
      u.farPlane.value = camera.far;
      u.perspective.value = camera instanceof T.PerspectiveCamera ? 1 : 0;
    }
    const target = r.getRenderTarget();
    try {
      r.setRenderTarget(this.source);
      r.clear();
      r.render(scene, camera);
      this.output.render(r, this.display, this.source, 0, false);
      r.setRenderTarget(target);
      this.quad.render(r);
    } finally {
      r.setRenderTarget(target);
    }
  }
  dispose() {
    this.source.depthTexture?.dispose();
    this.source.dispose();
    this.display.dispose();
    this.output.dispose();
    this.material.dispose();
    this.quad.dispose();
  }
}
