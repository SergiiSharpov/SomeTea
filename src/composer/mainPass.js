import {
  ShaderMaterial, 
  UniformsUtils, 
  Layers, 
  LinearFilter, 
  RGBAFormat, 
  WebGLRenderTarget,
  WebGLMultisampleRenderTarget,
  RepeatWrapping,
  LinearMipMapLinearFilter,
  Box3,
  Vector2,

  Clock,
  BackSide
} from 'three';

import { Pass } from 'three/examples/jsm/postprocessing/Pass';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader';

import { getObjectsByLayer } from '../utils/getObjectsByLayer';
import { patchMaterial } from '../utils/patchMaterial';

import GlassShader from './../shaders/glass';
import IcePrepassShader from '../shaders/icePrepass';
import IceShader from '../shaders/ice';
import WaterShader from '../shaders/water';
import { MeshBasicMaterial } from 'three/build/three.module';


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

const setIceMaterial = (mesh, texture, envTexture) => {
  const iceMaterial = new ShaderMaterial( {
    ...IceShader,
    uniforms: {
      ...UniformsUtils.clone( IceShader.uniforms ),
      noiseMap: {value: texture},
      envMap: {value: envTexture}
    }
  });

  patchMaterial(mesh, iceMaterial);
}

const setWaterMaterial = (mesh, baseMaterial, envTexture) => {
  let box = new Box3();
  box.setFromObject(mesh);

  let bounds = new Vector2(box.min.y, box.max.y);

  const waterMaterial = new ShaderMaterial( {
    ...WaterShader,
    uniforms: {
      ...UniformsUtils.clone( WaterShader.uniforms ),
      envMap: {value: envTexture},
      heightBounds: {value: bounds}
    },
    userData: {baseMaterial}
  });

  patchMaterial(mesh, waterMaterial);
}

const getBaseWaterMaterial = (envTexture) => {

  const waterMaterial = new MeshBasicMaterial( {
    color: 0x0088ff,

    side: BackSide,

    transparent: true,

    depthTest: false,
    depthWrite: true
  });

  return waterMaterial;
}

export class MainPass extends Pass {
  constructor(scene, camera, renderer, environmentMap) {
    super();

    this.clock = new Clock(true);

    this.scene = scene;
    this.camera = camera;

    renderer.autoClear = false;
    renderer.setClearAlpha(0);

    const pars = { minFilter: LinearFilter, magFilter: LinearFilter, format: RGBAFormat, wrapS: RepeatWrapping, wrapT: RepeatWrapping };

    this.renderTargetReflectionBuffer = new WebGLMultisampleRenderTarget( 1024, 1024, {...pars, minFilter: LinearMipMapLinearFilter} );
    this.renderTargetReflectionBuffer.texture.name = "ReflectionsPass.depth";
    this.renderTargetReflectionBuffer.texture.generateMipmaps = true;

    this.renderTargetIceBuffer = new WebGLRenderTarget( 1024, 1024, {...pars, minFilter: LinearMipMapLinearFilter} );
    this.renderTargetIceBuffer.texture.name = "IcePrePass.depth";
    this.renderTargetIceBuffer.texture.generateMipmaps = true;

    console.log(this.renderTargetIceBuffer)

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

    this.baseWaterMaterial = getBaseWaterMaterial();


    this.glassObjects = [];
    this.iceObjects = [];
    this.waterObjects = [];

    getObjectsByLayer(this.scene, glassLayer, (object) => {
      if (object.isMesh) {
        setGlassMaterial(object, this.renderTargetReflectionBuffer.texture, environmentMap);
        this.glassObjects.push(object);

        //object.visible = false;
      }
    })

    getObjectsByLayer(this.scene, iceLayer, (object) => {
      if (object.isMesh) {
        setIceMaterial(object, this.renderTargetIceBuffer.texture, environmentMap);
        this.iceObjects.push(object);
      }
    })

    getObjectsByLayer(this.scene, waterLayer, (object) => {
      if (object.isMesh) {
        setWaterMaterial(object, this.baseWaterMaterial, environmentMap);
        this.waterObjects.push(object);

        //object.material.onBeforeCompile = console.log;

        //object.visible = false;
      }
    })

    renderer.compile(scene, camera);
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

    for (let object of this.waterObjects) {
      object.material.uniforms.resolution.value.set(w, h);
    }
  }

  render(renderer, writeBuffer, readBuffer /*, deltaTime, maskActive*/) {
    this.clock.getDelta();

    //console.log(this.clock.elapsedTime)

    for (let waterObject of this.waterObjects) {
      waterObject.material.uniforms.time.value = this.clock.elapsedTime;
    }

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

    

    /** Render All the staff inside the glass */
    this.camera.layers.enableAll();
    this.camera.layers.disable(LAYERS.GLASS);

    renderer.setRenderTarget(this.renderTargetReflectionBuffer);
    renderer.setClearAlpha(0)
    renderer.clear();
    renderer.render(this.scene, this.camera);

    /** Finish drawing inner glass staff */

    this.scene.background = background;
    
    /** Render smooth result */
    renderer.setRenderTarget(this.renderTargetFXAABuffer);
    //renderer.setRenderTarget(null);

    this.camera.layers.enableAll();

    renderer.clear();

    //this.scene.background = null;

    

    //this.scene.overrideMaterial = null;
    this.camera.layers.enableAll();
    
    renderer.render(this.scene, this.camera);

    // this.camera.layers.disableAll();
    // this.camera.layers.enable(LAYERS.WATER);

    //this.scene.overrideMaterial = this.baseWaterMaterial;
    // for (let waterObject of this.waterObjects) {
    //   waterObject.userData.oldMaterial = waterObject.material;
    //   waterObject.material = this.baseWaterMaterial;
    // }

    // renderer.render(this.scene, this.camera);

    // for (let waterObject of this.waterObjects) {
    //   waterObject.material = waterObject.userData.oldMaterial;
    // }
    
    
    //this.scene.background = background;

    renderer.setRenderTarget(null);
    this.FXAAQuad.render(renderer);
  }
}