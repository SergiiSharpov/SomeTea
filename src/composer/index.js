import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { MainPass, LAYERS } from './mainPass';

const getComposer = () => {
  let onRender = () => {};
  let onResize = () => {};
  let resize = () => {};
  let render = () => {};

  const getOnResize = () => onResize;
  const getOnRender = () => onRender;
  const getResizeFn = () => resize;
  const getRenderFn = () => render;

  const init = (scene, camera, renderer) => {
    const composer = new EffectComposer( renderer );
    composer.addPass( new MainPass(scene, camera, renderer) );
  
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
      composer.render();
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
  LAYERS
}