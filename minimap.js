import * as THREE from './three.module.js';
import {BufferGeometryUtils} from './BufferGeometryUtils.js';
import {rigManager} from './rig.js';
import {camera} from './app-object.js';
import {GuardianMesh} from './land.js';

const localVector = new THREE.Vector3();
const localEuler = new THREE.Euler();

let mapRenderer, mapScene, mapCamera, mapCameraOffset, mapIndicator;
const _initMap = () => {
  const mapCanvas = document.getElementById('map-canvas');
  mapRenderer = new THREE.WebGLRenderer({
    canvas: mapCanvas,
    antialias: true,
    alpha: true,
  });
  mapRenderer.setPixelRatio(window.devicePixelRatio);
  mapScene = new THREE.Scene();

  mapCamera = new THREE.PerspectiveCamera(60, 200 / 140, 0.1, 1000);
  mapCameraOffset = new THREE.Vector3(0, 4, 10);
  mapCamera.position.copy(mapCameraOffset);
  mapCamera.rotation.order = 'YXZ';
  mapCamera.lookAt(new THREE.Vector3(0, 0, 0));

  {
    const shape = new THREE.Shape();
    shape.moveTo( -1, 0 );
    shape.lineTo( 0, -2 );
    shape.lineTo( 1, 0 );
    shape.lineTo( 0, -0.5 );
    // shape.lineTo( -1, 0 );
    const extrudeSettings = {
      steps: 2,
      depth: 0.1,
      // bevelEnabled: false,
      bevelEnabled: true,
      bevelThickness: 0,
      bevelSize: 0,
      bevelOffset: 0,
      bevelSegments: 1,
    };
    const geometry = new THREE.ExtrudeBufferGeometry( shape, extrudeSettings )
      .applyMatrix4(new THREE.Matrix4().makeTranslation(0, 0.5, 0));
    const material = new THREE.MeshBasicMaterial({
      color: 0xef5350,
      side: THREE.DoubleSide,
    });
    mapIndicator = new THREE.Mesh( geometry, material );
    mapIndicator.frustumCulled = false;
    mapScene.add(mapIndicator);
  }

  const planeMesh = (() => {
    const s = 0.1;
    const geometry = BufferGeometryUtils.mergeBufferGeometries([
      new THREE.BoxBufferGeometry(10, s, s).applyMatrix4(new THREE.Matrix4().makeTranslation(0, 0, -10/2)),
      new THREE.BoxBufferGeometry(10, s, s).applyMatrix4(new THREE.Matrix4().makeTranslation(0, 0, 10/2)),
      new THREE.BoxBufferGeometry(s, s, 10).applyMatrix4(new THREE.Matrix4().makeTranslation(10/2, 0, 0)),
      new THREE.BoxBufferGeometry(s, s, 10).applyMatrix4(new THREE.Matrix4().makeTranslation(-10/2, 0, 0)),
    ]);
    const material = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.5,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    return mesh;
  })();
  mapScene.add(planeMesh);
};
_initMap();

const objectGeometry = new THREE.BoxBufferGeometry(0.5, 0.5, 0.5);
const objectMaterial = new THREE.MeshBasicMaterial({
  color: 0x5c6bc0,
});

const objects = [];
const _makeObject = baseMesh => {
  const mesh = new THREE.Mesh(objectGeometry, objectMaterial);
  mesh.frustumCulled = false;
  mesh.update = () => {
    mesh.position.copy(baseMesh.position);
    mesh.quaternion.copy(baseMesh.quaternion);
    mesh.scale.copy(baseMesh.scale);
  };
  return mesh;
};
const _makeWorld = extents => {
  const box = new THREE.Box3().set(
    new THREE.Vector3().fromArray(extents, 0),
    new THREE.Vector3().fromArray(extents, 3),
  );
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const geometry = BufferGeometryUtils.mergeBufferGeometries([
    new THREE.PlaneBufferGeometry(size.x, size.y)
      // .applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI/2)))
      .applyMatrix4(new THREE.Matrix4().makeTranslation(center.x, center.y, center.z + size.z/2)),
    new THREE.PlaneBufferGeometry(size.x, size.y)
      // .applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI/2)))
      .applyMatrix4(new THREE.Matrix4().makeTranslation(center.x, center.y, center.z - size.z/2)),
    new THREE.PlaneBufferGeometry(size.z, size.y)
      .applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI/2)))
      .applyMatrix4(new THREE.Matrix4().makeTranslation(center.x + size.z/2, center.y, center.z)),
    new THREE.PlaneBufferGeometry(size.z, size.y)
      .applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI/2)))
      .applyMatrix4(new THREE.Matrix4().makeTranslation(center.x - size.x/2, center.y, center.z)),
  ]);
  const material = new THREE.MeshNormalMaterial({
    color: 0x9ccc65,
    /* transparent: true,
    opacity: 0.5, */
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.update = () => {};
  return mesh;
};

const update = () => {
  localEuler.setFromQuaternion(camera.quaternion, 'YXZ');
  localEuler.x = 0;
  localEuler.z = 0;
  mapCamera.position.copy(rigManager.localRig.inputs.hmd.position)
    .add(localVector.copy(mapCameraOffset).applyEuler(localEuler));
  mapIndicator.position.copy(rigManager.localRig.inputs.hmd.position);
  mapIndicator.quaternion.setFromEuler(localEuler);
  mapCamera.lookAt(mapIndicator.position);
  mapRenderer.render(mapScene, mapCamera);

  for (const object of objects) {
    object.update();
  }
};

const minimap = {
  update,
  addObject(baseMesh) {
    const object = _makeObject(baseMesh);
    mapScene.add(object);
    objects.push(object);
    return object;
  },
  removeObject(object) {
    mapScene.remove(object);
    objects.splice(objects.indexOf(object), 1);
  },
  addWorld(extents) {
    const object = _makeWorld(extents);
    mapScene.add(object);
    objects.push(object);
    return object;
  },
};
export default minimap;