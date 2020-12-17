import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { MainPass, LAYERS, LAYERS_OBJECTS } from './mainPass';

import Stats from 'stats-js';

const getComposer = () => {
  let onRender = () => {};
  let onResize = () => {};
  let resize = () => {};
  let render = () => {};

  const getOnResize = () => onResize;
  const getOnRender = () => onRender;
  const getResizeFn = () => resize;
  const getRenderFn = () => render;

  const init = (scene, camera, renderer, thicknessMap, textureCube, controls) => {
    const composer = new EffectComposer( renderer );
    composer.addPass( new MainPass(scene, camera, renderer, thicknessMap, textureCube, controls) );

    let stats = new Stats();
    document.body.appendChild( stats.dom );
  
    resize = (width, height) => {
      const targetWidth = width || renderer.domElement.parentNode.offsetWidth;
      const targetHeight = height || renderer.domElement.parentNode.offsetHeight;
  
      camera.aspect = targetWidth / targetHeight;
      camera.updateProjectionMatrix();
  
      renderer.setSize( targetWidth, targetHeight );
      composer.setSize( targetWidth, targetHeight );
    };
  
    onResize = () => resize(window.innerWidth, window.innerHeight);
  
    onRender = () => {
      stats.begin();
      composer.render();
      stats.end();
    };
  
    render = () => {
      requestAnimationFrame(render);
  
      onRender();
    }
  }

  return {
    init,
    getOnRender,
    getOnResize,
    getRenderFn,
    getResizeFn
  }
}

export {
  getComposer,
  LAYERS,
  LAYERS_OBJECTS
}