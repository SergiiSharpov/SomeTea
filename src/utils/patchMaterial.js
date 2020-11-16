
const MAPS_TO_COPY = ['map', 'normalMap', 'alphaMap', 'bumpMap'];
export const patchMaterial = (object, material) => {
  const oldMaterial = object.material;
  oldMaterial.onBeforeCompile = (shader) => console.log(shader)

  object.material = material;

  for (let key of MAPS_TO_COPY) {
    object.material.uniforms[key] && (object.material.uniforms[key].value = oldMaterial[key]);
  }
}