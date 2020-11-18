import {
  ObjectLoader,
  PerspectiveCamera,
  WebGLRenderer,
  CubeTextureLoader
} from 'three';

import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader';

import * as dat from 'dat.gui';

import { fitCameraToObject } from './utils/fitCameraToObject';

import { setObjectLayerByName } from './utils/setObjectLayerByName';
import { setObjectLayerByMaterialName } from './utils/setObjectLayerByMaterialName';

import { getComposer, LAYERS, LAYERS_OBJECTS } from './composer';
import { AmbientLight, DirectionalLight, Scene } from 'three/build/three.module';

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
    color: [255, 255, 255],
    fresnelPower: 1.0,
    reflectivity: 0.75,
    absorption: 0.25,
    normalPower: 1.0,
    refractionRatio: 0.0
  },
  ice: {
    roughness: 0.0,
    fresnelPower: 0.5,
    bumpScale: 0.2,
    reflectivity: 0.75,
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

  glassFolder.add(GUI_STATE.glass, 'reflectivity', 0.0, 1.0, 0.01)
  .name('Reflectivity')
  .onChange((v) => {
    for (let glass of glassObjects) {
      glass.material.uniforms.reflectivity.value = v;
    }
  })

  glassFolder.add(GUI_STATE.glass, 'fresnelPower', 0.0, 2.0, 0.01)
  .name('Fresnel power')
  .onChange((v) => {
    for (let glass of glassObjects) {
      glass.material.uniforms.fresnelPower.value = v;
    }
  })

  glassFolder.add(GUI_STATE.glass, 'absorption', 0.0, 1.0, 0.01)
  .name('Light absorption')
  .onChange((v) => {
    for (let glass of glassObjects) {
      glass.material.uniforms.absorption.value = v;
    }
  })

  glassFolder.add(GUI_STATE.glass, 'normalPower', 0.0, 1.0, 0.01)
  .name('Normal power')
  .onChange((v) => {
    for (let glass of glassObjects) {
      glass.material.uniforms.normalPower.value = v;
    }
  })

  glassFolder.add(GUI_STATE.glass, 'refractionRatio', 0.0, 1.0, 0.01)
  .name('Refraction ratio')
  .onChange((v) => {
    for (let glass of glassObjects) {
      glass.material.uniforms.refractionRatio.value = v;
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

  iceFolder.add(GUI_STATE.ice, 'fresnelPower', 0.0, 1.0, 0.01)
  .name('Fresnel power')
  .onChange((v) => {
    for (let ice of iceObjects) {
      ice.material.uniforms.fresnelPower.value = v;
    }
  })

  iceFolder.add(GUI_STATE.ice, 'roughness', 0.0, 1.0, 0.01)
  .name('Roughness')
  .onChange((v) => {
    for (let ice of iceObjects) {
      ice.material.uniforms.roughness.value = v;
    }
  })

  iceFolder.add(GUI_STATE.ice, 'bumpScale', 0.0, 0.99, 0.01)
  .name('Bump scale')
  .onChange((v) => {
    for (let ice of iceObjects) {
      ice.material.uniforms.bumpScale.value = v;
    }
  })

  iceFolder.add(GUI_STATE.ice, 'reflectivity', 0.0, 1.0, 0.01)
  .name('Reflectivity')
  .onChange((v) => {
    for (let ice of iceObjects) {
      ice.material.uniforms.reflectivity.value = v;
    }
  })
  
}

const initApp = (scene) => {
  const loader = new ObjectLoader();

  //scene = loader.parse(data);

  scene.background = textureCube;

  console.log(scene)

  camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.01, 10000 );

  renderer = new WebGLRenderer({ antialias: false, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  controls = new OrbitControls(camera, renderer.domElement);
  fitCameraToObject(camera, scene, 3.0, controls);

  // setObjectLayerByName(scene, /glass/i, LAYERS.GLASS);
  // setObjectLayerByName(scene, /liquid/i, LAYERS.WATER);
  // setObjectLayerByMaterialName(scene, /ice/i, LAYERS.ICE);

  composer.init(scene, camera, renderer, textureCube);
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

const loadModel = (path) => {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();

    loader.load(
      path,
      resolve,
      null,
      reject
    )
  })
}

const loadScene = async () => {
  let Glass = await loadModel('/assets/models/Fuze_Glass_01.glb');
  let Ice = await loadModel('/assets/models/Fuze_Ice_01.glb');
  let Liquid = await loadModel('/assets/models/Fuze_Liquid_01.glb');
  let Lemon = await loadModel('/assets/models/Lemon_Fuze_01.glb');
  let Mint = await loadModel('/assets/models/Mint_Fuze_01.glb');
  let Stirrer = await loadModel('/assets/models/Stirrer_Fuze_01.glb');



  const scene = new Scene();

  [
    ...Glass.scene.children.map(obj => {
      if (obj.isMesh) {
        obj.layers.set(LAYERS.GLASS)
      }

      return obj;
    }),
    ...Ice.scene.children.map(obj => {
      if (obj.isMesh) {
        obj.layers.set(LAYERS.ICE)
      }

      return obj;
    }),
    ...Liquid.scene.children.map(obj => {
      if (obj.isMesh) {
        obj.material.transparent = true;
        obj.material.opacity = 0.68;

        obj.layers.set(LAYERS.WATER)
      }

      return obj;
    }),
    ...Lemon.scene.children,
    ...Mint.scene.children,
    ...Stirrer.scene.children
  ].map(obj => scene.add(obj));
  

  const dirLight = new DirectionalLight(0xffffff, 1.0);
  dirLight.position.set(0.808049, 0.685002, 0.42915);

  scene.add(dirLight)
  scene.add(new AmbientLight(0xffffff, 0.5))

  return scene;
}


const SCENE_PATH = '/assets/scenes/scene.json';
loadEnvironment().then(() => {
  // fetch(SCENE_PATH)
  // .then(res => res.json())
  // .then(loadScene);

  loadScene().then(initApp)
})
