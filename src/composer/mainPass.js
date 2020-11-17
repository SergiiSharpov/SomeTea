import {
  ShaderMaterial, 
  UniformsUtils, 
  Layers, 
  LinearFilter, 
  RGBAFormat, 
  WebGLRenderTarget,
  WebGLMultisampleRenderTarget,
  RepeatWrapping
} from 'three';

import { Pass } from 'three/examples/jsm/postprocessing/Pass';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader';

import { getObjectsByLayer } from '../utils/getObjectsByLayer';
import { patchMaterial } from '../utils/patchMaterial';

import GlassShader from './../shaders/glass';
import IcePrepassShader from '../shaders/icePrepass';
import IceShader from '../shaders/ice';


export const LAYERS = {
  GLASS: 2,
  ICE: 3,
  WATER: 4
}

const glassLayer = new Layers();
const iceLayer = new Layers();
const waterLayer = new Layers();

export const LAYERS_OBJECTS = {
  glassLayer,
  iceLayer,
  waterLayer
}

glassLayer.set(LAYERS.GLASS);
iceLayer.set(LAYERS.ICE);
waterLayer.set(LAYERS.WATER);

const setGlassMaterial = (mesh, texture, cubeTexture) => {
  const glassMaterial = new ShaderMaterial( {
    ...GlassShader,
    uniforms: {
      ...UniformsUtils.clone( GlassShader.uniforms ),
      envMap: {value: texture},
      cubeMap: {value: cubeTexture}
    }
  });

  patchMaterial(mesh, glassMaterial);
}

const setIceMaterial = (mesh, texture) => {
  const iceMaterial = new ShaderMaterial( {
    ...IceShader,
    uniforms: {
      ...UniformsUtils.clone( IceShader.uniforms ),
      envMap: {value: texture}
    }
  });

  patchMaterial(mesh, iceMaterial);
}

export class MainPass extends Pass {
  constructor(scene, camera, renderer) {
    super();

    this.scene = scene;
    this.camera = camera;

    renderer.autoClear = false;
    renderer.setClearAlpha(0);

    const pars = { minFilter: LinearFilter, magFilter: LinearFilter, format: RGBAFormat, wrapS: RepeatWrapping, wrapT: RepeatWrapping };

    this.renderTargetReflectionBuffer = new WebGLMultisampleRenderTarget( 1024, 1024, pars );
    this.renderTargetReflectionBuffer.texture.name = "ReflectionsPass.depth";
    this.renderTargetReflectionBuffer.texture.generateMipmaps = false;

    this.renderTargetIceBuffer = new WebGLRenderTarget( 1024, 1024, pars );
    this.renderTargetIceBuffer.texture.name = "IcePrePass.depth";
    this.renderTargetIceBuffer.texture.generateMipmaps = false;

    this.renderTargetFXAABuffer = new WebGLMultisampleRenderTarget( 1024, 1024, pars );
    this.renderTargetFXAABuffer.texture.name = "FXAAPass.depth";
    this.renderTargetFXAABuffer.texture.generateMipmaps = false;

    this.icePrepassMaterial = new ShaderMaterial( {
      ...IcePrepassShader,
      uniforms: UniformsUtils.clone( IcePrepassShader.uniforms )
    });


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
        setGlassMaterial(object, this.renderTargetReflectionBuffer.texture, scene.background);
        this.glassObjects.push(object);

        //object.visible = false;
      }
    })

    getObjectsByLayer(this.scene, iceLayer, (object) => {
      if (object.isMesh) {
        setIceMaterial(object, this.renderTargetIceBuffer.texture);
        this.iceObjects.push(object);
      }
    })

    getObjectsByLayer(this.scene, waterLayer, (object) => {
      if (object.isMesh) {
        //setIceMaterial(object);
        this.waterObjects.push(object);

        object.material.onBeforeCompile = console.log;

        //object.visible = false;
      }
    })
  }

  setSize(w, h) {
    // this.renderTargetReflectionBuffer.setSize(Math.ceil(w / 2), Math.ceil(h / 2));
    this.renderTargetReflectionBuffer.setSize(w, h);
    this.renderTargetIceBuffer.setSize(w, h);
    this.renderTargetFXAABuffer.setSize(w, h);
    this.FXAAMaterial.uniforms.resolution.value.set(1 / w, 1 / h);
    for (let object of this.iceObjects) {
      object.material.uniforms.resolution.value.set(w, h);
    }
  }

  render(renderer, writeBuffer, readBuffer /*, deltaTime, maskActive */) {
    let background = this.scene.background;

    this.scene.background = null;

    /** Ice buffer render, do First */
    renderer.setRenderTarget(this.renderTargetIceBuffer);

    this.camera.layers.set(LAYERS.ICE);
    this.scene.overrideMaterial = this.icePrepassMaterial;

    renderer.clear();
    renderer.render(this.scene, this.camera);

    this.scene.overrideMaterial = null;

    /** Finish Ice buffer render */

    this.scene.background = background;

    /** Render All the staff inside the glass */
    this.camera.layers.enableAll();
    this.camera.layers.disable(LAYERS.GLASS);

    renderer.setRenderTarget(this.renderTargetReflectionBuffer);
    renderer.setClearAlpha(0)
    renderer.clear();
    renderer.render(this.scene, this.camera);

    /** Finish drawing inner glass staff */
    
    /** Render smooth result */
    renderer.setRenderTarget(this.renderTargetFXAABuffer);

    this.camera.layers.enableAll();

    renderer.clear();
    renderer.render(this.scene, this.camera);

    renderer.setRenderTarget(null);
    this.FXAAQuad.render(renderer);
  }
}