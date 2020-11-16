import {
  ShaderMaterial, 
  UniformsUtils, 
  Layers, 
  LinearFilter, 
  RGBAFormat, 
  WebGLRenderTarget,
  WebGLMultisampleRenderTarget
} from 'three';

import { Pass } from 'three/examples/jsm/postprocessing/Pass';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader';

import { getObjectsByLayer } from '../utils/getObjectsByLayer';
import { patchMaterial } from '../utils/patchMaterial';

import GlassShader from './../shaders/glass';


export const LAYERS = {
  GLASS: 2,
  ICE: 3,
  WATER: 4
}

const glassLayer = new Layers();
const iceLayer = new Layers();
const waterLayer = new Layers();

glassLayer.set(LAYERS.GLASS);
iceLayer.set(LAYERS.ICE);
waterLayer.set(LAYERS.WATER);

const setGlassMaterial = (mesh) => {
  const glassMaterial = new ShaderMaterial( {
    ...GlassShader,
    uniforms: UniformsUtils.clone( GlassShader.uniforms )
  });

  patchMaterial(mesh, glassMaterial);
}

export class MainPass extends Pass {
  constructor(scene, camera, renderer) {
    super();

    this.scene = scene;
    this.camera = camera;

    renderer.autoClear = false;

    const pars = { minFilter: LinearFilter, magFilter: LinearFilter, format: RGBAFormat };

    this.renderTargetReflectionBuffer = new WebGLRenderTarget( 1024, 1024, pars );
    this.renderTargetReflectionBuffer.texture.name = "ReflectionsPass.depth";
    this.renderTargetReflectionBuffer.texture.generateMipmaps = false;

    this.renderTargetFXAABuffer = new WebGLMultisampleRenderTarget( 1024, 1024, pars );
    this.renderTargetFXAABuffer.texture.name = "FXAAPass.depth";
    this.renderTargetFXAABuffer.texture.generateMipmaps = false;

    this.FXAAMaterial = new ShaderMaterial({
      ...FXAAShader,
      uniforms: UniformsUtils.clone( FXAAShader.uniforms )
    });

    this.FXAAMaterial.uniforms.tDiffuse.value = this.renderTargetFXAABuffer.texture;

    this.FXAAQuad = new Pass.FullScreenQuad(this.FXAAMaterial);

    this.glassObjects = [];
    this.iceObjects = [];
    this.waterObjects = [];

    getObjectsByLayer(this.scene, glassLayer, (object) => {
      if (object.isMesh) {
        setGlassMaterial(object);
        this.glassObjects.push(object);
      }
    })
  }

  setSize(w, h) {
    this.renderTargetReflectionBuffer.setSize(Math.ceil(w / 2), Math.ceil(h / 2));
    this.renderTargetFXAABuffer.setSize(w, h);
    this.FXAAMaterial.uniforms.resolution.value.set(1 / w, 1 / h);
  }

  render(renderer, writeBuffer, readBuffer /*, deltaTime, maskActive */) {

    /** Render All the staff inside the glass */
    this.camera.layers.enableAll();
    this.camera.layers.disable(LAYERS.GLASS);

    renderer.setRenderTarget(this.renderTargetReflectionBuffer);
    renderer.clear();
    renderer.render(this.scene, this.camera);
    

    /** Render glass and the stuff inside of it */
    renderer.setRenderTarget(this.renderTargetFXAABuffer);

    for (let object of this.glassObjects) {
      object.material.uniforms.envMap.value = this.renderTargetReflectionBuffer.texture;
    }
    this.camera.layers.enableAll();

    renderer.clear();
    renderer.render(this.scene, this.camera);

    /** Render smooth result */
    renderer.setRenderTarget(null);
    this.FXAAQuad.render(renderer);
  }
}