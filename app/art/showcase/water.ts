import * as T from 'three';

/** A single shared reflection captures the actual scene for all coplanar puddles.
 * The oblique projection uses the inverse matrix, including orthographic views.
 */
export class FloorReflection {
  group = new T.Group();
  private target = new T.WebGLRenderTarget(768, 768, {
    type: T.HalfFloatType,
    depthBuffer: true,
  });
  private camera = new T.OrthographicCamera();
  private textureMatrix = new T.Matrix4();
  private material: T.ShaderMaterial;
  private geometry: T.BufferGeometry;
  constructor(private height = 0.14) {
    this.group.userData.dynamic = true;
    const shape = new T.Shape();
    for (let i = 0; i <= 80; i++) {
      const a = (i / 80) * Math.PI * 2;
      const r = 1 + Math.sin(a * 3 + 0.7) * 0.1 + Math.cos(a * 7) * 0.035;
      const x = Math.cos(a) * r,
        y = Math.sin(a) * r;
      if (i) shape.lineTo(x, y);
      else shape.moveTo(x, y);
    }
    shape.closePath();
    this.geometry = new T.ShapeGeometry(shape, 80);
    this.material = new T.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        reflection: { value: this.target.texture },
        textureMatrix: { value: this.textureMatrix },
        time: { value: 0 },
      },
      vertexShader: `uniform mat4 textureMatrix;varying vec4 reflected;varying vec3 worldP;void main(){vec4 p=modelMatrix*vec4(position,1.);worldP=p.xyz;reflected=textureMatrix*p;gl_Position=projectionMatrix*viewMatrix*p;}`,
      fragmentShader: `uniform sampler2D reflection;uniform float time;varying vec4 reflected;varying vec3 worldP;void main(){vec2 uv=reflected.xy/reflected.w;uv+=vec2(sin(worldP.x*11.+time*.8),cos(worldP.z*12.-time*.7))*.0008;vec3 col=texture2D(reflection,uv).rgb;gl_FragColor=vec4(mix(col,vec3(.05,.12,.13),.14),.58);}`,
    });
    for (const [x, z, sx, sz] of [
      [1.7, 3.7, 1.75, 0.9],
      [4, -0.6, 0.95, 1.25],
      [-3.5, 2.3, 0.65, 0.45],
    ]) {
      const m = new T.Mesh(this.geometry, this.material);
      m.rotation.x = -Math.PI / 2;
      m.scale.set(sx, sz, 1);
      m.position.set(x, height, z);
      this.group.add(m);
    }
  }
  render(
    renderer: T.WebGLRenderer,
    scene: T.Scene,
    camera: T.OrthographicCamera,
    time: number,
  ) {
    const mirror = this.camera;
    mirror.copy(camera);
    const position = camera.getWorldPosition(new T.Vector3()),
      direction = camera.getWorldDirection(new T.Vector3());
    position.y = 2 * this.height - position.y;
    direction.y = -direction.y;
    mirror.position.copy(position);
    mirror.up.copy(camera.up);
    mirror.up.y *= -1;
    mirror.lookAt(position.clone().add(direction));
    mirror.updateMatrixWorld();
    mirror.matrixWorldInverse.copy(mirror.matrixWorld).invert();
    mirror.projectionMatrix.copy(camera.projectionMatrix);
    const plane = new T.Plane(
        new T.Vector3(0, 1, 0),
        -this.height + 0.006,
      ).applyMatrix4(mirror.matrixWorldInverse),
      clip = new T.Vector4(
        plane.normal.x,
        plane.normal.y,
        plane.normal.z,
        plane.constant,
      );
    const q = new T.Vector4(
      Math.sign(clip.x),
      Math.sign(clip.y),
      1,
      1,
    ).applyMatrix4(mirror.projectionMatrix.clone().invert());
    clip.multiplyScalar(2 / clip.dot(q));
    const e = mirror.projectionMatrix.elements;
    e[2] = clip.x - e[3];
    e[6] = clip.y - e[7];
    e[10] = clip.z - e[11];
    e[14] = clip.w - e[15];
    mirror.projectionMatrixInverse.copy(mirror.projectionMatrix).invert();
    this.textureMatrix
      .set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1)
      .multiply(mirror.projectionMatrix)
      .multiply(mirror.matrixWorldInverse);
    const previous = renderer.getRenderTarget(),
      auto = renderer.shadowMap.autoUpdate;
    this.group.visible = false;
    renderer.shadowMap.autoUpdate = false;
    try {
      renderer.setRenderTarget(this.target);
      renderer.clear();
      renderer.render(scene, mirror);
    } finally {
      renderer.setRenderTarget(previous);
      renderer.shadowMap.autoUpdate = auto;
      this.group.visible = true;
    }
    this.material.uniforms.time.value = time;
  }
  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.target.dispose();
  }
}
