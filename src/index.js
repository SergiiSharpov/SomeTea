import {
  ObjectLoader,
  PerspectiveCamera,
  WebGLRenderer,
  ShaderChunk,
  CubeTextureLoader
} from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';
import * as dat from 'dat.gui';

window.ShaderChunk = ShaderChunk;
import { fitCameraToObject } from './utils/fitCameraToObject';

import { setObjectLayerByName } from './utils/setObjectLayerByName';
import { setObjectLayerByMaterialName } from './utils/setObjectLayerByMaterialName';

import { getComposer, LAYERS, LAYERS_OBJECTS } from './composer';

let scene, camera, renderer, controls, textureCube, gui;
const composer = getComposer();

const hideLoader = () => {
  let loader = document.body.querySelector('.loader-container');

  loader.style.opacity = 0;
  setTimeout(() => {
    loader.parentNode.removeChild(loader);
  }, 300);
}

const GUI_STATE = {
  glass: {
    roughness: 0.0,
    color: [0, 128, 255]
  },
  ice: {
    depthScale: 0.005,
    noiseScale: 64.0,
    color: [110.0, 154.0, 188.0]
  },
  currentView: 'all',
  waterOpacity: 0.68
}

const currentViewChoises = ['all', 'glass', 'ice', 'water']

const createGui = (scene, renderer) => {
  const allObjects = [];
  const glassObjects = [];
  const iceObjects = [];
  const waterObjects = [];

  scene.traverse((obj) => {
    if (obj.isMesh) {
      allObjects.push(obj);

      if (obj.layers.test(LAYERS_OBJECTS.glassLayer)) {
        glassObjects.push(obj);
      } else if (obj.layers.test(LAYERS_OBJECTS.iceLayer)) {
        iceObjects.push(obj);
      } else if (obj.layers.test(LAYERS_OBJECTS.waterLayer)) {
        waterObjects.push(obj);
      }
    }
  })

  gui = new dat.GUI();

  gui.add(GUI_STATE, 'currentView', currentViewChoises)
  .name('View')
  .onChange((v) => {
    for (let object of allObjects) {
      object.visible = v === 'all';
    }

    if (v === 'all') {
      return false;
    }

    let arrayToEnable = (v === 'glass') ? glassObjects : (v === 'ice') ? iceObjects : waterObjects;

    for (let object of arrayToEnable) {
      object.visible = true;
    }
  })

  gui.add(GUI_STATE, 'waterOpacity', 0.0, 1.0, 0.01)
  .name('Water opacity')
  .onChange((v) => {
    for (let object of waterObjects) {
      object.material.opacity = v;
    }
  })

  let glassFolder = gui.addFolder('Glass');

  glassFolder.addColor(GUI_STATE.glass, 'color')
  .name('Color')
  .onChange((v) => {
    for (let glass of glassObjects) {
      glass.material.uniforms.glassColor.value.fromArray(v.map(i => i / 255));
    }
  })

  glassFolder.add(GUI_STATE.glass, 'roughness', 0.0, 1.0, 0.01)
  .name('Roughness')
  .onChange((v) => {
    for (let glass of glassObjects) {
      glass.material.uniforms.roughness.value = v;
    }
  })
  
  let iceFolder = gui.addFolder('Ice');

  iceFolder.addColor(GUI_STATE.ice, 'color')
  .name('Color')
  .onChange((v) => {
    for (let ice of iceObjects) {
      ice.material.uniforms.iceColor.value.fromArray(v.map(i => i / 255));
    }
  })

  iceFolder.add(GUI_STATE.ice, 'depthScale', 0.0, 0.01, 0.0005)
  .name('Depth scale')
  .onChange((v) => {
    for (let ice of iceObjects) {
      ice.material.uniforms.depthScale.value = v;
    }
  })

  iceFolder.add(GUI_STATE.ice, 'noiseScale', 0.0, 256, 1)
  .name('Noise scale')
  .onChange((v) => {
    for (let ice of iceObjects) {
      ice.material.uniforms.noiseScale.value = v;
    }
  })
  
}

const loadScene = (data) => {
  const loader = new ObjectLoader();

  scene = loader.parse(data);

  scene.background = textureCube;

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
  createGui(scene, renderer);


  document.body.appendChild(renderer.domElement);
  window.addEventListener('resize', composer.getOnResize());

  composer.getRenderFn()();

  hideLoader();
}

const loadEnvironment = () => {
  return new Promise((resolve, reject) => {
    const loader = new CubeTextureLoader();
    loader.setPath( '/assets/img/' );

    textureCube = loader.load([ 'posx.jpg', 'negx.jpg', 'posy.jpg', 'negy.jpg', 'posz.jpg', 'negz.jpg' ], resolve, () => {}, reject);
  })
}


const SCENE_PATH = '/assets/scenes/scene.json';
loadEnvironment().then(() => {
  fetch(SCENE_PATH)
  .then(res => res.json())
  .then(loadScene);
})
