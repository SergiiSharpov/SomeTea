import {
  ObjectLoader,
  PerspectiveCamera,
  WebGLRenderer,
  ShaderChunk
} from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';
import { getComposer, LAYERS } from './composer';

window.ShaderChunk = ShaderChunk;
import { fitCameraToObject } from './utils/fitCameraToObject';

import { setObjectLayerByName } from './utils/setObjectLayerByName';
import { setObjectLayerByMaterialName } from './utils/setObjectLayerByMaterialName';

let scene, camera, renderer, controls;
const composer = getComposer();

const loadScene = (data) => {
  const loader = new ObjectLoader();

  scene = loader.parse(data);

  camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.01, 10000 );

  renderer = new WebGLRenderer({ antialias: false });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  controls = new OrbitControls(camera, renderer.domElement);
  fitCameraToObject(camera, scene, 3.0, controls);

  setObjectLayerByName(scene, /glass/i, LAYERS.GLASS);
  setObjectLayerByName(scene, /liquid/i, LAYERS.WATER);
  setObjectLayerByMaterialName(scene, /ice/i, LAYERS.ICE);

  composer.init(scene, camera, renderer);


  document.body.appendChild(renderer.domElement);
  window.addEventListener('resize', composer.getOnResize());

  composer.getRenderFn()();
}



const SCENE_PATH = '/assets/scenes/scene.json';
fetch(SCENE_PATH)
.then(res => res.json())
.then(loadScene);