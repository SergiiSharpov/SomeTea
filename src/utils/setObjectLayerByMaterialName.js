import { getMaterialsByRegexp } from "./getMaterialsByRegexp"


export const setObjectLayerByMaterialName = (object, nameRegExp, layer) => {
  getMaterialsByRegexp(object, nameRegExp, (material, obj) => {
    obj.layers.set(layer);
  })
}