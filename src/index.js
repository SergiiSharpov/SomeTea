import {
  ObjectLoader,
  PerspectiveCamera,
  WebGLRenderer,
  CubeTextureLoader,

  ShaderChunk,

  AmbientLight, DirectionalLight, Scene, BufferGeometry, MeshBasicMaterial, Mesh, TextureLoader
} from 'three';

import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader';

import * as dat from 'dat.gui';

import { fitCameraToObject } from './utils/fitCameraToObject';
import { getComposer, LAYERS, LAYERS_OBJECTS } from './composer';
import { settings } from './composer/mainPass';
import { EquirectangularReflectionMapping, EquirectangularRefractionMapping } from 'three/build/three.module';

window.ShaderChunk = ShaderChunk;

let camera, renderer, controls, textureCube, thicknessMap, gui;
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
    absorption: 0.08
  },
  ice: {
    roughness: 0.0,
    fresnelPower: 0.5,
    bumpScale: 0.2,
    reflectivity: 0.75,
    color: [110.0, 154.0, 188.0]
  },
  water: {
    opacity: 0.9,
    height: 1.0,

    uvScale: 20,

    highWaterColor: [212, 139, 57],
    waterColor: [173, 165, 48],

    speed: 1.0,
    depth: 0.0
  },
  currentView: 'all'
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

  gui.add(GUI_STATE.water, 'speed', 0.0, 10.0, 0.01)
  .name('Speed')
  .onChange((v) => {
    settings.speed.value = v;
  })


  let qualityFolder = gui.addFolder('Quality');

  qualityFolder.add(settings.quality, 'reflection', 0.1, 1.0, 0.1)
  .name('Reflection')
  .onChange(() => {
    composer.getResizeFn()(window.innerWidth, window.innerHeight);
  })

  qualityFolder.add(settings, 'waterResolution', 2.0, 512.0, 2.0)
  .name('Water resolution');

  let bubblesFolder = gui.addFolder('Bubbles');

  bubblesFolder.add(settings.bubblesPower, 'value', 0, 1.0, 0.01)
  .name('Intensity');

  let causticFolder = gui.addFolder('Caustic');

  causticFolder.add(settings.causticPower, 'value', 0, 1.0, 0.01)
  .name('Intensity');

  causticFolder.add(settings.causticSoftness, 'value', 0, 2.0, 0.01)
  .name('Softness');


  let waterFolder = gui.addFolder('Water');

  waterFolder.add(settings.waterScale, 'value', 0, 128.0, 0.01)
  .name('Waves scale');

  waterFolder.addColor(GUI_STATE.water, 'waterColor')
  .name('Color')
  .onChange((v) => {
    settings.waterColor.fromArray(v.map(i => i / 255));
  })

  waterFolder.add(settings.waterOpacity, 'value', 0.0, 1.0, 0.01)
  .name('Water opacity');

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

  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2');
  if (!gl) {
    console.log('your browser/OS/drivers do not support WebGL2');
    renderer = new WebGLRenderer({ antialias: false, alpha: true });
  } else {
    console.log('webgl2 works!');
    renderer = new WebGLRenderer({ antialias: false, alpha: true, context: gl, canvas, premultipliedAlpha: false });
  }

  
  renderer.setPixelRatio(Math.floor(window.devicePixelRatio));// 
  renderer.setSize(window.innerWidth, window.innerHeight);

  controls = new OrbitControls(camera, renderer.domElement);
  fitCameraToObject(camera, scene, 3.0, controls);

  // setObjectLayerByName(scene, /glass/i, LAYERS.GLASS);
  // setObjectLayerByName(scene, /liquid/i, LAYERS.WATER);
  // setObjectLayerByMaterialName(scene, /ice/i, LAYERS.ICE);

  composer.init(scene, camera, renderer, thicknessMap, textureCube, controls);
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

    // textureCube.mapping = EquirectangularRefractionMapping;
  })
}

const loadThickness = () => {
  return new Promise((resolve, reject) => {
    const loader = new TextureLoader();
    loader.setPath( '/assets/img/' );

    thicknessMap = loader.load('Glass_Thickness.png', resolve, () => {}, reject);
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
  let Glass = await loadModel('/assets/models/Fuze_Glass_01_M.glb');
  let Ice = await loadModel('/assets/models/Fuze_Ice_01.glb');
  let Liquid = await loadModel('/assets/models/Fuze_Liquid_01.glb');
  let Lemon = await loadModel('/assets/models/Lemon_Fuze_01.glb');
  let Mint = await loadModel('/assets/models/Mint_Fuze_01.glb');
  let Stirrer = await loadModel('/assets/models/Stirrer_Fuze_01.glb');


  const scene = new Scene();

  [
    ...Glass.scene.children.map((obj, i) => {
      if (obj.isMesh) {
        obj.layers.set(LAYERS.GLASS);

        if (obj.material.normalMap) {
          console.log(obj.material.normalMap)
        }

        // console.log('Glass', obj, i)

        if (i !== 3) {
          // obj.visible = false;

          //obj.layers.set(LAYERS.GLASS);
        }
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

        obj.layers.set(LAYERS.WATER_AREA)
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
Promise.all([loadEnvironment(), loadThickness()])
.then(() => {
  // fetch(SCENE_PATH)
  // .then(res => res.json())
  // .then((json) => {
  //   const loader = new ObjectLoader();

  //   let scene = loader.parse(json);

  //   scene.traverse(obj => {
  //     if (obj.isMesh) {
  //       console.log(obj.name)
  //       if (obj.name === 'FuzeGlass_Low001') {
  //         obj.layers.set(LAYERS.GLASS)
  //       }
  //     }
  //   })

  //   initApp(scene);
  // });

  loadScene().then(initApp)
})
