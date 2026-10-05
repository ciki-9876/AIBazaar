import { MAPS, type MapId } from '../../lib/adventure/magician-world';
import {
  HERO_WORLD_HEIGHT,
  DECOR_IDS,
  loadPixelSceneManifest,
  nativeSceneSize,
  PIXEL_ART_ROOT,
  PIXEL_SCENES,
  PIXEL_WORLD_SCALE,
  PROP_IDS,
  type SceneLight,
  type SceneProp,
  type PixelFrameRect,
} from './pixel-scene-assets';

type Rect = PixelFrameRect;
type Atlas = {
  image: HTMLImageElement;
  columns: number;
  rows: number;
  bounds: Rect[];
  registration: Rect;
  groupHeights?: number[];
};
export type Layer = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
};
export type SceneActors = {
  playerX: number;
  facing: -1 | 1;
  walking: boolean;
  tick: number;
};
export type RendererStatus = 'loading' | 'webgl' | 'cpu' | 'error';
export type LightingPass = {
  render: (
    albedo: Layer,
    normals: Layer,
    blockers: Layer,
    time: number,
    debug: boolean,
  ) => void;
  dispose: () => void;
};
/** Optional presentation-only inputs; omitted inputs retain the original pixel-scene lighting. */
export type SceneLightingOptions = {
  ambient: readonly [number, number, number];
  lights: readonly SceneLight[];
  floor: number;
  smoothing?: boolean;
  toneMapping?: 'filmic' | 'illustration';
};

function layer(width: number, height: number): Layer {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Canvas rendering is unavailable');
  context.imageSmoothingEnabled = false;
  return { canvas, context };
}

function rect(
  context: CanvasRenderingContext2D,
  color: string,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  context.fillStyle = color;
  context.fillRect(
    Math.round(x),
    Math.round(y),
    Math.round(width),
    Math.round(height),
  );
}

async function loadAtlas(
  filename: string,
  columns: number,
  rows: number,
): Promise<Atlas> {
  const image = new Image();
  image.src = `${PIXEL_ART_ROOT}/${filename}.png`;
  await image.decode();
  const sample = layer(image.width, image.height);
  sample.context.drawImage(image, 0, 0);
  const pixels = sample.context.getImageData(
    0,
    0,
    image.width,
    image.height,
  ).data;
  const cellWidth = image.width / columns,
    cellHeight = image.height / rows;
  const bounds: Rect[] = [];
  let commonLeft = cellWidth,
    commonTop = cellHeight,
    commonRight = 0,
    commonBottom = 0;
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const left = Math.floor(column * cellWidth),
        top = Math.floor(row * cellHeight);
      const right = Math.floor((column + 1) * cellWidth),
        bottom = Math.floor((row + 1) * cellHeight);
      let x0 = right,
        y0 = bottom,
        x1 = left,
        y1 = top;
      for (let y = top; y < bottom; y++)
        for (let x = left; x < right; x++) {
          if (pixels[(y * image.width + x) * 4 + 3] > 40) {
            x0 = Math.min(x0, x);
            y0 = Math.min(y0, y);
            x1 = Math.max(x1, x + 1);
            y1 = Math.max(y1, y + 1);
          }
        }
      const bound =
        x1 > x0
          ? { x: x0, y: y0, width: x1 - x0, height: y1 - y0 }
          : { x: left, y: top, width: cellWidth, height: cellHeight };
      bounds.push(bound);
      commonLeft = Math.min(commonLeft, bound.x - left);
      commonTop = Math.min(commonTop, bound.y - top);
      commonRight = Math.max(commonRight, bound.x - left + bound.width);
      commonBottom = Math.max(commonBottom, bound.y - top + bound.height);
    }
  }
  return {
    image,
    columns,
    rows,
    bounds,
    registration: {
      x: commonLeft,
      y: commonTop,
      width: commonRight - commonLeft,
      height: commonBottom - commonTop,
    },
  };
}

function sampleAtlas(
  context: CanvasRenderingContext2D,
  atlas: Atlas,
  frame: number,
  x: number,
  bottom: number,
  height: number,
  width?: number,
  flip = false,
  fixedRegistration = false,
) {
  const frameIndex = frame % (atlas.columns * atlas.rows);
  const cellWidth = atlas.image.width / atlas.columns,
    cellHeight = atlas.image.height / atlas.rows;
  const source =
    fixedRegistration && !atlas.groupHeights
      ? {
          ...atlas.registration,
          x:
            Math.floor((frameIndex % atlas.columns) * cellWidth) +
            atlas.registration.x,
          y:
            Math.floor(Math.floor(frameIndex / atlas.columns) * cellHeight) +
            atlas.registration.y,
        }
      : atlas.bounds[frameIndex];
  const scaleHeight =
    atlas.groupHeights?.[Math.floor(frameIndex / atlas.columns)] ??
    source.height;
  const targetHeight = Math.round((height * source.height) / scaleHeight);
  const targetWidth =
    width ?? Math.round((height * source.width) / scaleHeight);
  const anchorX =
    (targetWidth *
      ((source.pivotX ?? source.x + source.width / 2) - source.x)) /
    source.width;
  const anchorY =
    (targetHeight * ((source.pivotY ?? source.y + source.height) - source.y)) /
    source.height;
  const targetX = Math.round(x - (flip ? targetWidth - anchorX : anchorX)),
    targetY = Math.round(bottom - anchorY);
  context.save();
  if (flip) {
    context.translate(targetX + targetWidth, targetY);
    context.scale(-1, 1);
  } else context.translate(targetX, targetY);
  context.drawImage(
    atlas.image,
    source.x,
    source.y,
    source.width,
    source.height,
    0,
    0,
    targetWidth,
    targetHeight,
  );
  context.restore();
  return { x: targetX, y: targetY, width: targetWidth, height: targetHeight };
}

function woodFloor(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  floor: number,
  indoor: boolean,
) {
  const top = Math.round(floor - 4);
  rect(context, indoor ? '#80654b' : '#5a6370', 0, top, width, height - top);
  for (let y = top; y < height; y += indoor ? 9 : 11) {
    rect(context, indoor ? '#584739' : '#424d5b', 0, y, width, 1);
    rect(context, indoor ? '#9a7953' : '#73808b', 0, y + 1, width, 1);
    for (
      let x = (Math.floor((y - top) / 9) % 2) * -22;
      x < width;
      x += indoor ? 51 : 28
    ) {
      rect(context, indoor ? '#584739' : '#46505d', x, y + 2, 1, 7);
      if (indoor) rect(context, '#775d44', x + 9, y + 5, 18, 1);
    }
  }
}

/** Moveable modular vehicle, assembled independently from the street walls and ground. */
function drawBus(context: CanvasRenderingContext2D, x: number, y: number) {
  context.save();
  context.translate(x, y);
  rect(context, '#32454c', 0, 5, 71, 35);
  rect(context, '#927549', 2, 0, 66, 7);
  rect(context, '#d3c6a0', 3, 7, 65, 18);
  for (let px = 7; px < 56; px += 13) {
    rect(context, '#5d8397', px, 8, 10, 14);
    rect(context, '#93b8c1', px, 9, 8, 2);
  }
  rect(context, '#a2664d', 3, 25, 65, 7);
  rect(context, '#cbae75', 3, 32, 65, 2);
  for (const px of [9, 50]) {
    rect(context, '#26363f', px, 34, 11, 12);
    rect(context, '#7b8280', px + 3, 37, 5, 6);
  }
  rect(context, '#ebd9a1', 0, 26, 3, 4);
  rect(context, '#719195', 62, 7, 5, 27);
  context.restore();
}

function brickWall(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  colors: readonly string[],
) {
  rect(context, colors[0], x, y, width, height);
  for (let row = 0; row < Math.ceil(height / 8); row++) {
    const py = y + row * 8;
    rect(context, colors[1], x, py, width, 1);
    for (let px = x + (row % 2 ? 12 : 0); px < x + width; px += 24) {
      rect(context, colors[1], px, py, 1, 8);
      if ((row + Math.floor(px / 24)) % 3 === 0)
        rect(context, colors[2], px + 3, py + 3, 12, 1);
    }
  }
}

function sign(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  width: number,
  large = false,
) {
  rect(context, '#2a333b', x, y, width, large ? 19 : 15);
  rect(context, '#bb9566', x, y, width, 1);
  rect(context, '#bb9566', x, y + (large ? 18 : 14), width, 1);
  context.font = `${large ? 9 : 7}px monospace`;
  context.textAlign = 'center';
  context.fillStyle = '#edc78d';
  context.fillText(text, x + width / 2, y + (large ? 13 : 10));
}

function streetBase(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  floor: number,
) {
  rect(context, '#697c94', 0, 0, width, height);
  rect(context, '#85949b', 0, 64, width, 59);
  for (let x = 0; x < width; x += 43) {
    const top = 92 + (Math.floor(x / 43) % 3) * 9;
    rect(context, '#4a6172', x, top, 38, 116);
    rect(context, '#435868', x + 5, top - 5, 28, 5);
    for (let wy = top + 11; wy < 198; wy += 21)
      for (let wx = x + 5; wx < x + 35; wx += 12) {
        rect(
          context,
          Math.floor(wx + wy) % 5 ? '#7e908f' : '#ac9778',
          wx,
          wy,
          5,
          10,
        );
      }
  }
  brickWall(context, 20, 83, 192, 137, ['#936e57', '#795c4e', '#aa8061']);
  rect(context, '#3d4d52', 16, 77, 201, 8);
  rect(context, '#ac9a77', 20, 85, 192, 3);
  rect(context, '#5b4840', 18, 206, 198, 14);
  rect(context, '#bcad8a', 20, 204, 192, 2);
  sign(context, 'REED · WORKSHOP', 80, 120, 82);
  brickWall(context, 248, 76, 153, 144, ['#625f68', '#504e5a', '#787180']);
  rect(context, '#263b49', 243, 69, 163, 8);
  rect(context, '#bba46e', 250, 78, 151, 3);
  for (const px of [254, 320, 393]) {
    rect(context, '#b79b70', px, 90, 5, 128);
    rect(context, '#776c60', px + 5, 91, 2, 127);
  }
  sign(context, 'LYRIC', 315, 93, 48, true);
  rect(context, '#b6966a', 313, 114, 52, 3);
  for (let x = 316; x < 363; x += 6) rect(context, '#e7bb7b', x, 116, 2, 2);
  woodFloor(context, width, height, floor, false);
  rect(context, '#bcc0b1', 0, floor - 6, width, 3);
  rect(context, '#354852', 0, floor - 3, width, 2);
  drawBus(context, 405, 174);
  // A slim canopy and pavement clutter frame characters without shrinking the human scale.
  rect(context, '#4c6559', 412, 141, 62, 5);
  rect(context, '#a3946f', 470, 146, 2, 29);
  rect(context, '#9a7e5e', 200, 193, 17, 16);
  rect(context, '#536861', 202, 188, 13, 6);
}

function interiorBase(
  context: CanvasRenderingContext2D,
  map: MapId,
  width: number,
  height: number,
  floor: number,
) {
  const theatre = map === 'theatre';
  rect(context, theatre ? '#3c394d' : '#6b655d', 0, 0, width, height);
  rect(context, theatre ? '#302e40' : '#555149', 0, 0, width, 29);
  rect(context, '#ab8a59', 0, 29, width, 2);
  rect(context, '#443e38', 0, 31, width, 3);
  for (let x = 0; x < width; x += 40) {
    rect(context, theatre ? '#4f4356' : '#817762', x, 35, 2, floor - 64);
    rect(context, theatre ? '#302e3c' : '#534e44', x + 2, 35, 1, floor - 64);
  }
  for (let y = 48; y < floor - 34; y += 17)
    for (let x = 12 + (y % 3) * 3; x < width; x += 23) {
      rect(context, theatre ? '#574354' : '#7a705e', x, y, 3, 1);
      rect(context, theatre ? '#453947' : '#5e5a51', x + 4, y + 6, 2, 1);
    }
  rect(context, '#473e37', 0, floor - 28, width, 29);
  rect(context, '#a58b65', 0, floor - 28, width, 2);
  rect(context, '#79674d', 0, floor - 25, width, 2);
  for (let x = 0; x < width; x += 31) {
    rect(context, '#6b5640', x + 2, floor - 20, 27, 17);
    rect(context, '#8c7555', x + 3, floor - 19, 25, 1);
    rect(context, '#473f38', x + 4, floor - 17, 23, 13);
  }
  woodFloor(context, width, height, floor, true);
  if (theatre) {
    rect(context, '#6f3542', 104, 31, 183, 99);
    for (let x = 106; x < 287; x += 11) {
      rect(context, '#8b4650', x, 33, 5, 96);
      rect(context, '#492d38', x + 6, 33, 4, 96);
    }
    rect(context, '#273844', 190, 46, 96, 86);
    rect(context, '#a18357', 187, 42, 101, 3);
    rect(context, '#a18357', 190, 45, 2, 87);
    rect(context, '#a18357', 284, 45, 2, 87);
    context.fillStyle = '#cca766';
    context.font = '8px monospace';
    context.textAlign = 'center';
    context.fillText('LYRIC THEATRE', 238, 69);
    for (const [x, y] of [
      [208, 91],
      [254, 108],
      [267, 84],
      [224, 116],
    ]) {
      rect(context, '#a99163', x, y, 1, 5);
      rect(context, '#a99163', x - 2, y + 2, 5, 1);
    }
    rect(context, '#734a4a', 188, floor - 1, 117, 7);
    rect(context, '#c69963', 188, floor - 2, 117, 1);
    rect(context, '#373337', 184, floor + 6, 125, 3);
    rect(context, '#e6c47f', 233, 39, 11, 4);
    rect(context, '#574e47', 229, 31, 18, 7);
  } else {
    // Small wall pieces have deliberate human-relative dimensions.
    rect(context, '#443b33', 137, 78, 21, 24);
    rect(context, '#b29a70', 139, 80, 17, 20);
    rect(context, '#34464d', 141, 82, 13, 16);
    rect(context, '#cbac6e', 145, 87, 5, 8);
    rect(context, '#4b3e32', 202, 91, 20, 17);
    rect(context, '#baa078', 204, 93, 16, 13);
    rect(context, '#645345', 185, 78, 6, 28);
    rect(context, '#ac926b', 187, 80, 2, 22);
    rect(context, '#70584c', 103, floor + 8, 111, 16);
    rect(context, '#a19071', 105, floor + 10, 107, 1);
    rect(context, '#a19071', 105, floor + 21, 107, 1);
    for (let x = 112; x < 208; x += 14)
      rect(context, '#94776b', x, floor + 14, 5, 4);
  }
}

function drawProp(
  context: CanvasRenderingContext2D,
  atlas: Atlas,
  prop: SceneProp,
) {
  return sampleAtlas(
    context,
    atlas,
    PROP_IDS.indexOf(prop.asset),
    prop.x,
    prop.bottom,
    prop.height,
    prop.width,
    prop.mirror,
  );
}

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Unable to allocate lighting shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const detail = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(detail || 'Lighting shader failed');
  }
  return shader;
}

const VERTEX_SOURCE = `attribute vec2 a_position; varying vec2 v_uv; void main(){ v_uv=a_position*0.5+0.5; gl_Position=vec4(a_position,0.,1.); }`;
const FRAGMENT_SOURCE = `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_albedo;
uniform sampler2D u_normal;
uniform sampler2D u_blockers;
uniform vec2 u_size;
uniform vec3 u_ambient;
uniform vec4 u_lights[8];
uniform vec4 u_colors[8];
uniform float u_floor;
uniform float u_debug;
uniform float u_illustration;
void main(){
  vec4 texel=texture2D(u_albedo,v_uv);
  vec3 normalSample=texture2D(u_normal,v_uv).rgb;
  vec3 n=normalize(normalSample*2.-1.);
  vec2 p=vec2(v_uv.x*u_size.x,(1.-v_uv.y)*u_size.y);
  vec3 irradiance=u_ambient;
  // Tilted actor surfaces retain a little warm ambient bounce in deep dusk, while sharing all point lights.
  irradiance+=vec3(0.12,0.105,0.09)*step(0.065,abs(normalSample.r-0.5));
  for(int i=0;i<8;i++){
    vec4 light=u_lights[i];
    if(light.w>0.){
      vec3 delta=vec3(light.xy-p,light.z);
      float distance=length(delta.xy);
      float edge=max(0.,1.-distance/light.w);
      float attenuation=edge*edge/(1.+dot(delta,delta)/(light.w*light.w));
      float lambert=max(0.,dot(n,normalize(vec3(delta.x,-delta.y,delta.z))));
      float shadow=1.;
      // Floor receives directional silhouettes from each independently placed furnishing.
      if(p.y>u_floor-2. && distance>5. && edge>0. && texture2D(u_blockers,v_uv).r<0.5){
        for(int s=1;s<21;s++){
          float t=float(s)/22.;
          vec2 q=mix(p,light.xy,t);
          vec2 qUv=vec2(q.x/u_size.x,1.-q.y/u_size.y);
          float blocker=texture2D(u_blockers,qUv).r;
          shadow=min(shadow,1.-blocker*0.64);
        }
      }
      irradiance+=u_colors[i].rgb*u_colors[i].a*attenuation*(0.36+0.64*lambert)*shadow;
    }
  }
  // Albedo, furniture, characters and floor are lit in one shared material pass.
  vec3 color=texel.rgb*irradiance;
  if(u_illustration>0.5){
    vec3 gain=irradiance/(vec3(0.6)+irradiance)*1.6;
    color=clamp(texel.rgb*gain,0.,1.);
  }else{
    color=color/(vec3(0.36)+color)*0.95;
  }
  if(u_debug>0.5) color=irradiance*0.5;
  gl_FragColor=vec4(color,texel.a);
}`;

function lightData(lights: readonly SceneLight[], time: number) {
  const positions = new Float32Array(32),
    colors = new Float32Array(32);
  lights.slice(0, 8).forEach((light, index) => {
    positions.set([light.x, light.y, light.z, light.radius], index * 4);
    const pulse =
      1 +
      (light.flicker ?? 0) *
        (Math.sin(time * 2.7 + index) + 0.35 * Math.sin(time * 4.3 + index));
    colors.set([...light.color, light.power * pulse], index * 4);
  });
  return { positions, colors };
}

export function webglLighting(
  canvas: HTMLCanvasElement,
  mapId: MapId,
  options?: SceneLightingOptions,
): LightingPass | null {
  const scene: SceneLightingOptions = options ?? {
    ambient: PIXEL_SCENES[mapId].ambient,
    lights: PIXEL_SCENES[mapId].lights,
    floor: nativeSceneSize(mapId).floor,
    smoothing: false,
  };
  // Keep GPU work offscreen: a failed shader never locks the visible canvas out of its software fallback.
  const gpuCanvas = document.createElement('canvas');
  gpuCanvas.width = canvas.width;
  gpuCanvas.height = canvas.height;
  const gl = gpuCanvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
  });
  if (!gl) return null;
  const output = canvas.getContext('2d');
  if (!output) return null;
  output.imageSmoothingEnabled = scene.smoothing ?? false;
  try {
    const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SOURCE),
      fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SOURCE);
    const program = gl.createProgram();
    if (!program) throw new Error('Unable to allocate lighting program');
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error(
        gl.getProgramInfoLog(program) || 'Unable to link lighting program',
      );
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const position = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const textures = [0, 1, 2].map((unit) => {
      const texture = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_MIN_FILTER,
        scene.smoothing ? gl.LINEAR : gl.NEAREST,
      );
      gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_MAG_FILTER,
        scene.smoothing ? gl.LINEAR : gl.NEAREST,
      );
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        canvas.width,
        canvas.height,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null,
      );
      return texture;
    });
    ['u_albedo', 'u_normal', 'u_blockers'].forEach((name, index) =>
      gl.uniform1i(gl.getUniformLocation(program, name), index),
    );
    gl.uniform2f(
      gl.getUniformLocation(program, 'u_size'),
      canvas.width,
      canvas.height,
    );
    gl.uniform3fv(
      gl.getUniformLocation(program, 'u_ambient'),
      new Float32Array(scene.ambient),
    );
    gl.uniform1f(gl.getUniformLocation(program, 'u_floor'), scene.floor);
    gl.uniform1f(
      gl.getUniformLocation(program, 'u_illustration'),
      scene.toneMapping === 'illustration' ? 1 : 0,
    );
    const lightLocation = gl.getUniformLocation(program, 'u_lights[0]'),
      colorLocation = gl.getUniformLocation(program, 'u_colors[0]'),
      debugLocation = gl.getUniformLocation(program, 'u_debug');
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    let blockersUploaded = false;
    return {
      render(albedo, normals, blockers, time, debug) {
        if (gl.isContextLost()) throw new Error('Lighting context was lost');
        [albedo, normals, blockers].forEach((input, index) => {
          if (index === 2 && blockersUploaded) return;
          gl.activeTexture(gl.TEXTURE0 + index);
          gl.bindTexture(gl.TEXTURE_2D, textures[index]);
          gl.texSubImage2D(
            gl.TEXTURE_2D,
            0,
            0,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            input.canvas,
          );
        });
        blockersUploaded = true;
        const lights = lightData(scene.lights, time);
        gl.uniform4fv(lightLocation, lights.positions);
        gl.uniform4fv(colorLocation, lights.colors);
        gl.uniform1f(debugLocation, debug ? 1 : 0);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        output.drawImage(gpuCanvas, 0, 0);
      },
      dispose() {
        textures.forEach((texture) => gl.deleteTexture(texture));
        gl.deleteBuffer(buffer);
        gl.deleteShader(vertex);
        gl.deleteShader(fragment);
        gl.deleteProgram(program);
      },
    };
  } catch {
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return null;
  }
}

/** Software fallback computes the same point attenuation/material response, never a painted glow overlay. */
export function cpuLighting(
  canvas: HTMLCanvasElement,
  mapId: MapId,
  options?: SceneLightingOptions,
): LightingPass {
  const output = canvas.getContext('2d');
  if (!output) throw new Error('No usable graphics context');
  const { width, height, floor } = options
      ? { width: canvas.width, height: canvas.height, floor: options.floor }
      : nativeSceneSize(mapId),
    scene = options ?? PIXEL_SCENES[mapId];
  const result = output.createImageData(width, height);
  let blockerPixels: Uint8ClampedArray | null = null;
  return {
    render(albedo, normals, blockers, time, debug) {
      const source = albedo.context.getImageData(0, 0, width, height).data,
        normal = normals.context.getImageData(0, 0, width, height).data;
      blockerPixels ??= blockers.context.getImageData(0, 0, width, height).data;
      const block = blockerPixels,
        lights = lightData(scene.lights, time);
      for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++) {
          const at = (y * width + x) * 4;
          let red = scene.ambient[0],
            green = scene.ambient[1],
            blue = scene.ambient[2];
          const nx = normal[at] / 127.5 - 1,
            ny = normal[at + 1] / 127.5 - 1,
            nz = normal[at + 2] / 127.5 - 1;
          if (Math.abs(normal[at] / 255 - 0.5) >= 0.065) {
            red += 0.12;
            green += 0.105;
            blue += 0.09;
          }
          for (let i = 0; i < scene.lights.length; i++) {
            const start = i * 4,
              dx = lights.positions[start] - x,
              dy = lights.positions[start + 1] - y,
              dz = lights.positions[start + 2],
              radius = lights.positions[start + 3];
            const distance = Math.hypot(dx, dy),
              edge = Math.max(0, 1 - distance / radius);
            if (!edge) continue;
            const depthDistance = Math.hypot(dx, dy, dz);
            const lambert = Math.max(
              0,
              (nx * dx - ny * dy + nz * dz) / depthDistance,
            );
            let shadow = 1;
            if (y > floor - 2 && block[at] < 128)
              for (let s = 1; s < 13; s++) {
                const t = s / 14,
                  bx = Math.round(x + dx * t),
                  by = Math.round(y + dy * t);
                if (
                  bx >= 0 &&
                  bx < width &&
                  by >= 0 &&
                  by < height &&
                  block[(by * width + bx) * 4] > 128
                ) {
                  shadow = 0.36;
                  break;
                }
              }
            const power =
              ((edge * edge) /
                (1 + (depthDistance * depthDistance) / (radius * radius))) *
              (0.36 + 0.64 * lambert) *
              lights.colors[start + 3] *
              shadow;
            red += lights.colors[start] * power;
            green += lights.colors[start + 1] * power;
            blue += lights.colors[start + 2] * power;
          }
          const redLit = (source[at] / 255) * red,
            greenLit = (source[at + 1] / 255) * green,
            blueLit = (source[at + 2] / 255) * blue;
          result.data[at] = debug
            ? Math.min(255, red * 127.5)
            : options?.toneMapping === 'illustration'
              ? Math.round(
                  Math.min(255, source[at] * (red / (0.6 + red)) * 1.6),
                )
              : Math.round((redLit / (0.36 + redLit)) * 242.25);
          result.data[at + 1] = debug
            ? Math.min(255, green * 127.5)
            : options?.toneMapping === 'illustration'
              ? Math.round(
                  Math.min(255, source[at + 1] * (green / (0.6 + green)) * 1.6),
                )
              : Math.round((greenLit / (0.36 + greenLit)) * 242.25);
          result.data[at + 2] = debug
            ? Math.min(255, blue * 127.5)
            : options?.toneMapping === 'illustration'
              ? Math.round(
                  Math.min(255, source[at + 2] * (blue / (0.6 + blue)) * 1.6),
                )
              : Math.round((blueLit / (0.36 + blueLit)) * 242.25);
          result.data[at + 3] = 255;
        }
      output.putImageData(result, 0, 0);
    },
    dispose() {},
  };
}

export class PixelSceneRenderer {
  private readonly mapId: MapId;
  private readonly canvas: HTMLCanvasElement;
  private readonly albedo: Layer;
  private readonly normal: Layer;
  private readonly blockers: Layer;
  private readonly base: Layer;
  private readonly baseNormal: Layer;
  private readonly baseBlockers: Layer;
  private readonly scratch: Layer;
  private lighting: LightingPass | null = null;
  private hero: Atlas | null = null;
  private npcs: Atlas | null = null;
  private props: Atlas | null = null;
  private decor: Atlas | null = null;
  private disposed = false;
  private animationStart = 0;
  private lastWalking = false;
  readonly width: number;
  readonly height: number;

  constructor(canvas: HTMLCanvasElement, mapId: MapId) {
    this.mapId = mapId;
    this.canvas = canvas;
    const size = nativeSceneSize(mapId);
    this.width = size.width;
    this.height = size.height;
    canvas.width = size.width;
    canvas.height = size.height;
    this.albedo = layer(size.width, size.height);
    this.normal = layer(size.width, size.height);
    this.blockers = layer(size.width, size.height);
    this.base = layer(size.width, size.height);
    this.baseNormal = layer(size.width, size.height);
    this.baseBlockers = layer(size.width, size.height);
    this.scratch = layer(128, 128);
  }

  async load(): Promise<RendererStatus> {
    const [props, hero, npcs, manifest] = await Promise.all([
      loadAtlas('props-atlas', 4, 2),
      loadAtlas('hero-atlas', 8, 2),
      loadAtlas('npc-atlas', 4, 3),
      loadPixelSceneManifest(),
    ]);
    if (this.disposed) return 'loading';
    props.bounds = manifest.atlases.props.frames.map((frame) => ({ ...frame }));
    hero.bounds = [
      ...manifest.atlases.hero.walk,
      ...manifest.atlases.hero.idle,
    ];
    hero.groupHeights = [
      Math.max(...manifest.atlases.hero.walk.map((frame) => frame.height)),
      Math.max(...manifest.atlases.hero.idle.map((frame) => frame.height)),
    ];
    npcs.bounds = [
      ...manifest.atlases.npcs.reed,
      ...manifest.atlases.npcs.mia,
      ...manifest.atlases.npcs.felix,
    ];
    npcs.groupHeights = [
      manifest.atlases.npcs.reed,
      manifest.atlases.npcs.mia,
      manifest.atlases.npcs.felix,
    ].map((frames) => Math.max(...frames.map((frame) => frame.height)));
    if (manifest.atlases.decor) {
      const decor = await loadAtlas(
        manifest.atlases.decor.file.replace(/\.png$/u, ''),
        4,
        2,
      );
      decor.bounds = manifest.atlases.decor.frames.map((frame) => ({
        ...frame,
      }));
      this.decor = decor;
    }
    if (this.disposed) return 'loading';
    this.props = props;
    this.hero = hero;
    this.npcs = npcs;
    this.composeBase();
    this.lighting = webglLighting(this.canvas, this.mapId);
    if (this.lighting) return 'webgl';
    this.lighting = cpuLighting(this.canvas, this.mapId);
    return 'cpu';
  }

  private composeBase() {
    if (!this.props) return;
    const { floor } = nativeSceneSize(this.mapId),
      scene = PIXEL_SCENES[this.mapId];
    if (this.mapId === 'street')
      streetBase(this.base.context, this.width, this.height, floor);
    else
      interiorBase(
        this.base.context,
        this.mapId,
        this.width,
        this.height,
        floor,
      );
    // Walls face the camera; floor planks use an upward material normal.
    rect(this.baseNormal.context, '#8080ff', 0, 0, this.width, this.height);
    rect(
      this.baseNormal.context,
      '#80f0bf',
      0,
      floor - 4,
      this.width,
      this.height - floor + 4,
    );
    rect(this.baseBlockers.context, '#000000', 0, 0, this.width, this.height);
    if (this.decor)
      for (const decor of scene.decor ?? []) {
        if (decor.asset === 'curtains') continue;
        sampleAtlas(
          this.base.context,
          this.decor,
          DECOR_IDS.indexOf(decor.asset),
          decor.x,
          decor.bottom,
          decor.height,
          decor.width,
          decor.mirror,
        );
      }
    for (const prop of scene.props) {
      if (prop.foreground) continue;
      const bounds = drawProp(this.base.context, this.props, prop);
      if (prop.blocker) {
        // Furniture is behind the walk lane; its lower silhouette occludes lamp rays onto the floor.
        const shape = this.scratch.context;
        shape.clearRect(0, 0, 128, 128);
        drawProp(shape, this.props, {
          ...prop,
          x: bounds.width / 2,
          bottom: bounds.height,
        });
        shape.globalCompositeOperation = 'source-in';
        rect(shape, '#ffffff', 0, 0, 128, 128);
        shape.globalCompositeOperation = 'source-over';
        this.baseBlockers.context.drawImage(
          this.scratch.canvas,
          0,
          0,
          bounds.width,
          bounds.height,
          bounds.x,
          bounds.y,
          bounds.width,
          bounds.height,
        );
      }
    }
    if (this.decor)
      for (const decor of scene.decor ?? []) {
        if (decor.asset !== 'curtains') continue;
        sampleAtlas(
          this.base.context,
          this.decor,
          DECOR_IDS.indexOf(decor.asset),
          decor.x,
          decor.bottom,
          decor.height,
          decor.width,
          decor.mirror,
        );
      }
  }

  private drawActor(
    atlas: Atlas,
    frame: number,
    x: number,
    floor: number,
    height: number,
    facing: -1 | 1,
    baseFacing: -1 | 1 = 1,
  ) {
    const context = this.albedo.context;
    rect(context, '#17212b66', x - 9, floor - 1, 18, 3);
    const bounds = sampleAtlas(
      context,
      atlas,
      frame,
      x,
      floor,
      height,
      undefined,
      facing !== baseFacing,
      true,
    );
    const shape = this.scratch.context;
    shape.clearRect(0, 0, 128, 128);
    const source = atlas.bounds[frame];
    shape.save();
    if (facing !== baseFacing) {
      shape.translate(bounds.width, 0);
      shape.scale(-1, 1);
    }
    shape.drawImage(
      atlas.image,
      source.x,
      source.y,
      source.width,
      source.height,
      0,
      0,
      bounds.width,
      bounds.height,
    );
    shape.restore();
    shape.globalCompositeOperation = 'source-in';
    rect(shape, facing === -1 ? '#6480fb' : '#9c80fb', 0, 0, 128, 128);
    shape.globalCompositeOperation = 'source-over';
    this.normal.context.drawImage(
      this.scratch.canvas,
      0,
      0,
      bounds.width,
      bounds.height,
      bounds.x,
      bounds.y,
      bounds.width,
      bounds.height,
    );
  }

  render(actors: SceneActors, milliseconds: number, debug: boolean) {
    if (!this.lighting || !this.hero || !this.npcs || this.disposed) return;
    if (actors.walking !== this.lastWalking) {
      this.animationStart = milliseconds;
      this.lastWalking = actors.walking;
    }
    const seconds = milliseconds / 1000,
      localSeconds = (milliseconds - this.animationStart) / 1000;
    this.albedo.context.drawImage(this.base.canvas, 0, 0);
    this.normal.context.drawImage(this.baseNormal.canvas, 0, 0);
    this.blockers.context.drawImage(this.baseBlockers.canvas, 0, 0);
    const floor = MAPS[this.mapId].floor / PIXEL_WORLD_SCALE;
    const frame = actors.walking
      ? Math.floor(localSeconds * 11) % 8
      : 8 + (Math.floor(localSeconds * 5) % 8);
    this.drawActor(
      this.hero,
      frame,
      actors.playerX / PIXEL_WORLD_SCALE,
      floor,
      HERO_WORLD_HEIGHT / PIXEL_WORLD_SCALE,
      actors.facing,
    );
    for (const hotspot of MAPS[this.mapId].hotspots) {
      if (hotspot.kind !== 'npc' || !hotspot.character) continue;
      const row =
        hotspot.character === 'reed' ? 0 : hotspot.character === 'mia' ? 1 : 2;
      const npcFrame = row * 4 + (Math.floor((seconds + row * 0.45) * 4) % 4);
      this.drawActor(
        this.npcs,
        npcFrame,
        hotspot.x / PIXEL_WORLD_SCALE,
        floor,
        hotspot.character === 'mia' ? 46 : 48,
        actors.playerX < hotspot.x ? -1 : 1,
        -1,
      );
    }
    if (this.props)
      for (const prop of PIXEL_SCENES[this.mapId].props)
        if (prop.foreground) drawProp(this.albedo.context, this.props, prop);
    try {
      this.lighting.render(
        this.albedo,
        this.normal,
        this.blockers,
        seconds,
        debug,
      );
    } catch {
      this.lighting.dispose();
      this.lighting = cpuLighting(this.canvas, this.mapId);
      this.canvas.dataset.renderer = 'cpu';
      this.canvas.dataset.lightingFallback = 'context-lost';
      this.lighting.render(
        this.albedo,
        this.normal,
        this.blockers,
        seconds,
        debug,
      );
    }
    this.canvas.dataset.heroFrame = String(frame);
    this.canvas.dataset.npcFrame = String(Math.floor(seconds * 4) % 4);
    this.canvas.dataset.simulationTick = String(actors.tick);
  }

  dispose() {
    this.disposed = true;
    this.lighting?.dispose();
  }
}
