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
  Vector3,
  FrontSide,
  DoubleSide,
  Mesh,
  OrthographicCamera,
  MeshDepthMaterial,
  FloatType,
  AdditiveBlending
} from 'three';

import { Pass } from 'three/examples/jsm/postprocessing/Pass';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader';

import { getObjectsByLayer } from '../utils/getObjectsByLayer';
import { patchMaterial } from '../utils/patchMaterial';

import GlassShader from './../shaders/glass';
import IcePrepassShader from '../shaders/icePrepass';
import IceShader from '../shaders/ice';
import WaterShader from '../shaders/water';
import { Color, MeshBasicMaterial, MeshPhongMaterial, PlaneBufferGeometry } from 'three/build/three.module';
import RemapShader from '../shaders/remap';
import { fitCameraToObject } from '../utils/fitCameraToObject';
import WaterDepthShader from '../shaders/waterDepth';
import CausticShader from '../shaders/caustic';
import WaterPlaneShader from '../shaders/waterPlane';


export const LAYERS = {
  GLASS: 2,
  ICE: 3,
  WATER: 4,
  WATER_AREA: 5,
  CAUSTIC: 6
}

const glassLayer = new Layers();
const iceLayer = new Layers();
const waterAreaLayer = new Layers();
const waterLayer = new Layers();
const causticLayer = new Layers();

export const LAYERS_OBJECTS = {
  glassLayer,
  iceLayer,
  waterAreaLayer,
  waterLayer,
  causticLayer
}

export const settings = {
  waterColor: new Color(214 / 255, 162 / 255, 72 / 255),
  waterScale: {value: 20.0}
}

glassLayer.set(LAYERS.GLASS);
iceLayer.set(LAYERS.ICE);
waterLayer.set(LAYERS.WATER);
waterAreaLayer.set(LAYERS.WATER_AREA);
causticLayer.set(LAYERS.CAUSTIC);

const setGlassMaterial = (mesh, waterObject, texture, cubeTexture, waterTexture, thicknessMap) => {
  let box = new Box3();
  let center = new Vector3();

  box.setFromObject(waterObject);
  box.getCenter(center);

  let bounds = new Vector2(box.min.y, box.max.y);

  const glassMaterial = new ShaderMaterial( {
    ...GlassShader,
    uniforms: {
      ...UniformsUtils.clone( GlassShader.uniforms ),
      envMap: {value: texture},
      cubeMap: {value: cubeTexture},
      waterMap: {value: waterTexture},
      thicknessMap: {value: thicknessMap},
      heightBounds: {value: bounds},
      waterColor: {value: settings.waterColor},
      uvScale: settings.waterScale
    },

    side: (mesh.name.indexOf('inner') !== -1) ? FrontSide : FrontSide
  });

  console.log(mesh)
  //mesh.geometry.computeFaceNormals();
  if (mesh.name.indexOf('inner') !== -1) {
    mesh.renderOrder = 1;
  } else {
    mesh.renderOrder = 2;
  }
  
  patchMaterial(mesh, glassMaterial);
}

const setIceMaterial = (mesh, waterObject, camera, texture, envTexture, causticTexture) => {
  let box = new Box3();
  let center = new Vector3();

  box.setFromObject(waterObject);
  box.getCenter(center);

  let bounds = new Vector2(box.min.y, box.max.y);

  const iceMaterial = new ShaderMaterial( {
    ...IceShader,
    uniforms: {
      ...UniformsUtils.clone( IceShader.uniforms ),
      noiseMap: {value: texture},
      envMap: {value: envTexture},

      causticMap: {value: causticTexture},
      cameraProjection: {value: camera.projectionMatrix},
      cameraView: {value: camera.matrixWorldInverse},

      heightBounds: {value: bounds},

      uvScale: settings.waterScale,
      waterColor: {value: settings.waterColor},
    }
  });

  patchMaterial(mesh, iceMaterial);
}

const calculateWaterPlainPosition = (mesh, waterPlane, camera) => {
  let box = new Box3();
  let center = new Vector3();

  box.setFromObject(mesh);
  box.getCenter(center);

  waterPlane.position.y = box.max.y;

  camera.position.set(0.0, waterPlane.position.y, 0.0);
  camera.lookAt(0.0, 0.0, 0.0);

  camera.updateProjectionMatrix();
  camera.updateMatrix();
  camera.updateMatrixWorld();
}

const setWaterMaterial = (mesh, camera, baseMaterial, envTexture, depthTexture, causticDepthTexture, causticTexture) => {
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
      causticDepthMap: {value: causticDepthTexture},
      causticMap: {value: causticTexture},
      center: {value: center},
        
      cameraProjection: {value: camera.projectionMatrix},
      cameraView: {value: camera.matrixWorldInverse},

      waterColor: {value: settings.waterColor},
      uvScale: settings.waterScale
    },
    userData: {baseMaterial}
  });

  mesh.renderOrder = 1;
  patchMaterial(mesh, waterMaterial);
}

const getCausticMaterial = (mesh, camera, baseMaterial, envTexture, depthTexture, causticDepthTexture) => {
  let box = new Box3();
  let center = new Vector3();

  box.setFromObject(mesh);
  box.getCenter(center);

  let bounds = new Vector2(box.min.y, box.max.y);

  const causticMaterial = new ShaderMaterial( {
    ...CausticShader,
    uniforms: {
      ...UniformsUtils.clone( CausticShader.uniforms ),
      envMap: {value: envTexture},
      heightBounds: {value: bounds},
      depthMap: {value: depthTexture},
      causticDepthMap: {value: causticDepthTexture},
      center: {value: center},
        
      cameraProjectionInverse: {value: camera.projectionMatrixInverse},
      cameraViewInverse: {value: camera.matrixWorld},

      uvScale: settings.waterScale
    },
    userData: {baseMaterial}
  });

  return causticMaterial;
}

const setWaterPlaneMaterial = (mesh, waterPlane, camera, baseMaterial, envTexture, depthTexture, causticDepthTexture, innerTexture) => {
  let box = new Box3();
  let center = new Vector3();

  box.setFromObject(mesh);
  box.getCenter(center);

  let bounds = new Vector2(box.min.y, box.max.y);

  const waterPlaneMaterial = new ShaderMaterial( {
    ...WaterPlaneShader,
    uniforms: {
      ...UniformsUtils.clone( WaterPlaneShader.uniforms ),
      envMap: {value: envTexture},
      heightBounds: {value: bounds},
      depthMap: {value: depthTexture},
      causticDepthMap: {value: causticDepthTexture},
      center: {value: center},

      innerMap: {value: innerTexture},
        
      cameraProjection: {value: camera.projectionMatrix},
      cameraView: {value: camera.matrixWorldInverse},

      waterColor: {value: settings.waterColor},
      uvScale: settings.waterScale
    },
    userData: {baseMaterial}
  });

  waterPlane.renderOrder = 1;
  patchMaterial(waterPlane, waterPlaneMaterial);
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
  constructor(scene, camera, renderer, thicknessMap, environmentMap, controls) {
    super();

    this.clock = new Clock(true);

    // scene.background = null
    this.orthoCamera = new OrthographicCamera(-0.045, 0.045, 0.045, -0.045, 0.0, 0.1);

    this.scene = scene;
    this.camera = camera;

    renderer.autoClear = false;
    renderer.setClearColor(0x000000, 0.0);

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

    this.renderTargetInnerTextureBuffer = new WebGLRenderTarget( 1024, 1024, {...pars} );
    this.renderTargetInnerTextureBuffer.texture.name = "InnerColorPass.depth";
    this.renderTargetInnerTextureBuffer.texture.generateMipmaps = false;


    this.renderTargetCausticDepthBuffer = new WebGLRenderTarget( 1024, 1024, {type: FloatType} );
    this.renderTargetCausticDepthBuffer.texture.name = "CausticDepthPass.depth";
    this.renderTargetCausticDepthBuffer.texture.generateMipmaps = false;

    this.renderTargetCausticTextureBuffer = new WebGLRenderTarget( 1024, 1024, {...pars} );
    this.renderTargetCausticTextureBuffer.texture.name = "CausticColorPass.depth";
    this.renderTargetCausticTextureBuffer.texture.generateMipmaps = false;

    this.causticMaterial0 = new MeshBasicMaterial({map: this.renderTargetInnerTextureBuffer.texture});
    this.causticQuad = new Pass.FullScreenQuad(this.causticMaterial0);



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

    this.waterDepthMaterial = new ShaderMaterial({
      ...WaterDepthShader,
    });


    this.glassObjects = [];
    this.iceObjects = [];
    this.waterObjects = [];

    this.waterResolution = 512.0;


    const waterPlaneGeometry = new PlaneBufferGeometry(0.09, 0.09, this.waterResolution, this.waterResolution);
    waterPlaneGeometry.rotateX(-Math.PI * 0.5)
    const waterPlaneMaterial = new MeshBasicMaterial({color: 0x0088ff});
    this.waterPlane = new Mesh(waterPlaneGeometry, waterPlaneMaterial);
    this.waterPlane.layers.set(LAYERS.WATER);

    this.waterObjects.push(this.waterPlane);

    this.scene.add(this.waterPlane);

    getObjectsByLayer(this.scene, waterAreaLayer, (object) => {
      if (object.isMesh) {
        calculateWaterPlainPosition(object, this.waterPlane, this.orthoCamera);

        setWaterPlaneMaterial(object, this.waterPlane, this.orthoCamera, this.baseWaterMaterial, environmentMap, this.depthTexture, this.renderTargetCausticDepthBuffer.texture, this.renderTargetInnerTextureBuffer.texture);
        setWaterMaterial(object, this.orthoCamera, this.baseWaterMaterial, environmentMap, this.depthTexture, this.renderTargetCausticDepthBuffer.texture, this.renderTargetCausticTextureBuffer.texture);
        
        this.waterObjects.push(object);
        //this.waterPlane.layers.set(LAYERS.WATER);

        //object.material.onBeforeCompile = console.log;

        //object.visible = false;
      }
    })

    getObjectsByLayer(this.scene, glassLayer, (object) => {
      if (object.isMesh) {
        setGlassMaterial(
          object,
          this.waterObjects[0],
          this.renderTargetReflectionBuffer.texture,
          environmentMap,
          this.renderTargetWaterBuffer.texture,
          thicknessMap,
          
        );
        this.glassObjects.push(object);

        //object.visible = false;
      }
    })

    getObjectsByLayer(this.scene, iceLayer, (object) => {
      if (object.isMesh) {
        setIceMaterial(object, this.waterObjects[0], this.orthoCamera, this.renderTargetIceBuffer.texture, environmentMap, this.renderTargetCausticTextureBuffer.texture);
        this.iceObjects.push(object);
      }
    })

    this.causticMaterial = getCausticMaterial(this.waterObjects[0], this.orthoCamera, this.baseWaterMaterial, environmentMap, this.depthTexture, this.renderTargetCausticDepthBuffer.texture);
    // controls.target = new Vector3(0.0, 0.0, 0.0);

    // controls.update();

    //fitCameraToObject(this.camera, this.waterPlane, 0.0, controls);
    scene.traverse(obj => {
      if (obj.frustumCulled) {
        obj.frustumCulled = false;
      }
    })

    renderer.compile(scene, camera);
    renderer.compile(scene, this.orthoCamera);
  }

  setSize(w, h) {
    // this.renderTargetReflectionBuffer.setSize(Math.ceil(w / 2), Math.ceil(h / 2));
    this.renderTargetReflectionBuffer.setSize(w, h);
    this.renderTargetIceBuffer.setSize(w, h);
    this.renderTargetFXAABuffer.setSize(w, h);
    
    this.renderTargetInnerTextureBuffer.setSize(w, h);

    this.renderTargetCausticDepthBuffer.setSize(w, h);
    this.renderTargetCausticTextureBuffer.setSize(w, h);

    this.FXAAMaterial.uniforms.resolution.value.set(1 / w, 1 / h);

    for (let object of this.iceObjects) {
      object.material.uniforms.resolution.value.set(w, h);
    }

    for (let object of this.waterObjects) {
      //object.material.uniforms.resolution.value.set(w, h);
    }
  }

  renderBackup(renderer, writeBuffer, readBuffer /*, deltaTime, maskActive*/) {
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
    renderer.setRenderTarget(this.renderTargetReflectionBuffer);
    this.camera.layers.enableAll();
    this.camera.layers.disable(LAYERS.GLASS);
    this.camera.layers.disable(LAYERS.WATER);

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
    //this.FXAAQuad.render(renderer);


    renderer.setRenderTarget(this.renderTargetFXAABuffer);
    this.camera.layers.enableAll();
    // this.camera.layers.set(LAYERS.GLASS);
    renderer.render(this.scene, this.camera);

    renderer.setRenderTarget(null);
    this.FXAAQuad.render(renderer);

    //this.scene.background = null;
    //
  }

  render(renderer, writeBuffer, readBuffer /*, deltaTime, maskActive*/) {
    this.clock.getDelta();

    for (let waterObject of this.waterObjects) {
      waterObject.material.uniforms.time.value = this.clock.elapsedTime;
    }

    for (let glassObject of this.glassObjects) {
      glassObject.material.uniforms.time.value = this.clock.elapsedTime;
    }

    for (let iceObject of this.iceObjects) {
      iceObject.material.uniforms.time.value = this.clock.elapsedTime;
    }

    this.causticMaterial.uniforms.time.value = this.clock.elapsedTime;
    this.waterPlane.material.uniforms.time.value = this.clock.elapsedTime;

    let background = this.scene.background;

    this.scene.background = null;


    /** Render depth part under the water */
    renderer.setRenderTarget(this.renderTargetCausticDepthBuffer);

    this.orthoCamera.layers.enableAll();
    this.orthoCamera.layers.disable(LAYERS.WATER_AREA);
    this.orthoCamera.layers.disable(LAYERS.WATER);

    this.scene.overrideMaterial = this.waterDepthMaterial;

    renderer.setClearColor(0x000000, 0.0);
    renderer.clear();
    renderer.render(this.scene, this.orthoCamera);

    this.scene.overrideMaterial = null;
    /** Finish render depth part */

    /** Render caustic color part */
    renderer.setRenderTarget(this.renderTargetCausticTextureBuffer);

    this.orthoCamera.layers.enableAll();
    this.orthoCamera.layers.set(LAYERS.WATER);

    this.scene.overrideMaterial = this.causticMaterial;

    renderer.setClearColor(0x000000, 1.0);
    renderer.clear();
    renderer.render(this.scene, this.orthoCamera);

    this.scene.overrideMaterial = null;
    /** Finish render color part */


    renderer.setClearColor(0x000000, 0.0);

    /** Ice buffer render, do First */
    renderer.setRenderTarget(this.renderTargetIceBuffer);

    this.orthoCamera.layers.set(LAYERS.ICE);
    this.scene.overrideMaterial = this.icePrepassMaterial;

    renderer.clear();
    renderer.render(this.scene, this.orthoCamera);

    this.scene.overrideMaterial = null;

    /** Finish Ice buffer render */

    /** Render water */
    renderer.setRenderTarget(this.renderTargetWaterBuffer);

    this.orthoCamera.layers.disableAll();
    this.orthoCamera.layers.enable(LAYERS.WATER_AREA);
    // this.orthoCamera.layers.enable(LAYERS.WATER);
    
    renderer.setClearColor(0x000000, 0.0);
    renderer.clear();
    renderer.render(this.scene, this.orthoCamera);
    /** Finish drawing water */

    /** Render inner part of the glass, except for the liquid plane */

    renderer.setRenderTarget(this.renderTargetInnerTextureBuffer);

    this.orthoCamera.layers.enableAll();
    this.orthoCamera.layers.disable(LAYERS.WATER_AREA);
    this.orthoCamera.layers.disable(LAYERS.WATER);

    renderer.setClearColor(0x000000, 0.0);//0xada530
    renderer.clear();
    renderer.render(this.scene, this.orthoCamera);

    /** Finish render inner part */

    /** Ice buffer render, do First */
    renderer.setRenderTarget(this.renderTargetIceBuffer);

    this.camera.layers.set(LAYERS.ICE);
    this.scene.overrideMaterial = this.icePrepassMaterial;

    renderer.clear();
    renderer.render(this.scene, this.camera);

    this.scene.overrideMaterial = null;

    /** Finish Ice buffer render */
    

    /** Render All the staff inside the glass except of the water and glass */
    renderer.setRenderTarget(this.renderTargetReflectionBuffer);

    this.camera.layers.enableAll();
    this.camera.layers.disable(LAYERS.GLASS);
    this.camera.layers.disable(LAYERS.WATER);
    this.camera.layers.disable(LAYERS.WATER_AREA);

    
    renderer.clear();
    renderer.render(this.scene, this.camera);
    /** Finish drawing inner glass staff */

    /** Render water */
    renderer.setRenderTarget(this.renderTargetWaterBuffer);

    this.camera.layers.disableAll();
    this.camera.layers.enable(LAYERS.WATER_AREA);
    this.camera.layers.enable(LAYERS.WATER);
    
    renderer.setClearColor(0x000000, 0.0);
    renderer.clear();
    renderer.render(this.scene, this.camera);
    /** Finish drawing water */
    
    this.scene.background = background;
    
    /** Render smooth result */
    renderer.setRenderTarget(this.renderTargetFXAABuffer);
    
    this.camera.layers.enableAll();
    //this.camera.layers.disable(LAYERS.WATER_AREA);
    // this.camera.layers.disable(LAYERS.WATER);
    renderer.clear();
    renderer.render(this.scene, this.camera);


    renderer.setRenderTarget(null);
    this.FXAAQuad.render(renderer);

    // this.causticQuad.render(renderer);


    // this.orthoCamera.layers.enableAll();
    // this.orthoCamera.layers.set(LAYERS.WATER);

    // renderer.setClearColor(0x000000, 1.0);
    // renderer.clear();
    // renderer.render(this.scene, this.orthoCamera);
  }
}