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
  BackSide,

  DepthTexture,
  Vector3
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
import RemapShader from '../shaders/remap';


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

const setGlassMaterial = (mesh, texture, cubeTexture, waterTexture) => {
  const glassMaterial = new ShaderMaterial( {
    ...GlassShader,
    uniforms: {
      ...UniformsUtils.clone( GlassShader.uniforms ),
      envMap: {value: texture},
      cubeMap: {value: cubeTexture},
      waterMap: {value: waterTexture}
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

const setWaterMaterial = (mesh, baseMaterial, envTexture, depthTexture) => {
  let box = new Box3();
  let center = new Vector3();

  box.setFromObject(mesh);
  box.getCenter(center);

  let bounds = new Vector2(box.min.y, box.max.y);

  const waterMaterial = new ShaderMaterial( {
    ...WaterShader,
    uniforms: {
      ...UniformsUtils.clone( WaterShader.uniforms ),
      envMap: {value: envTexture},
      heightBounds: {value: bounds},
      depthMap: {value: depthTexture},
      center: {value: center}
    },
    userData: {baseMaterial}
  });

  patchMaterial(mesh, waterMaterial);
}

const getBaseWaterMaterial = () => {

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
    renderer.setClearColor(0xffffff, 0.0);

    const pars = { minFilter: LinearFilter, magFilter: LinearFilter, format: RGBAFormat, wrapS: RepeatWrapping, wrapT: RepeatWrapping };

    this.depthTexture = new DepthTexture(1024, 1024);

    this.renderTargetReflectionBuffer = new WebGLRenderTarget( 1024, 1024, {...pars, minFilter: LinearMipMapLinearFilter, depthTexture: this.depthTexture} );
    this.renderTargetReflectionBuffer.texture.name = "ReflectionsPass.depth";
    this.renderTargetReflectionBuffer.texture.generateMipmaps = true;

    this.renderTargetWaterBuffer = new WebGLRenderTarget( 1024, 1024, {...pars, minFilter: LinearMipMapLinearFilter} );
    this.renderTargetWaterBuffer.texture.name = "WaterPass.depth";
    this.renderTargetWaterBuffer.texture.generateMipmaps = true;

    this.renderTargetIceBuffer = new WebGLRenderTarget( 1024, 1024, {...pars, minFilter: LinearMipMapLinearFilter} );
    this.renderTargetIceBuffer.texture.name = "IcePrePass.depth";
    this.renderTargetIceBuffer.texture.generateMipmaps = true;

    this.renderTargetFXAABuffer = new WebGLRenderTarget( 1024, 1024, pars );
    this.renderTargetFXAABuffer.texture.name = "FXAAPass.depth";
    this.renderTargetFXAABuffer.texture.generateMipmaps = false;

    this.icePrepassMaterial = new ShaderMaterial( {
      ...IcePrepassShader,
      uniforms: UniformsUtils.clone( IcePrepassShader.uniforms )
    });

    this.waterRemapMaterial = new ShaderMaterial( {
      ...RemapShader,
      uniforms: {map: {value: this.renderTargetWaterBuffer.texture}}
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
        setGlassMaterial(
          object,
          this.renderTargetReflectionBuffer.texture,
          environmentMap,
          this.renderTargetWaterBuffer.texture
        );
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
        setWaterMaterial(object, this.baseWaterMaterial, environmentMap, this.depthTexture);
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

    

    /** Render All the staff inside the glass except of the water and glass */
    this.camera.layers.enableAll();
    this.camera.layers.disable(LAYERS.GLASS);
    this.camera.layers.disable(LAYERS.WATER);

    renderer.setRenderTarget(this.renderTargetReflectionBuffer);
    renderer.clear();
    renderer.render(this.scene, this.camera);
    /** Finish drawing inner glass staff */

    /** Render water */
    this.camera.layers.set(LAYERS.WATER);
    renderer.setRenderTarget(this.renderTargetWaterBuffer);
    renderer.clear();
    renderer.render(this.scene, this.camera);
    /** Finish drawing water */
    

    this.scene.background = background;
    
    /** Render smooth result */
    renderer.setRenderTarget(this.renderTargetFXAABuffer);
    //renderer.setRenderTarget(null);
   
    this.camera.layers.enableAll();
    this.camera.layers.disable(LAYERS.WATER);
    //this.camera.layers.disable(LAYERS.ICE);
    
    renderer.clear();
    renderer.render(this.scene, this.camera);

    this.scene.overrideMaterial = this.waterRemapMaterial;
    this.scene.background = null;
    this.camera.layers.set(LAYERS.WATER);

    renderer.render(this.scene, this.camera);

    this.scene.background = background;
    this.scene.overrideMaterial = null;

    renderer.setRenderTarget(null);
    this.FXAAQuad.render(renderer);

    //this.scene.background = null;
    //
  }
}