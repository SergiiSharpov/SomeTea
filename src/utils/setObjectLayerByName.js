import { getObjectsByRegexp } from "./getObjectsByRegexp"


export const setObjectLayerByName = (object, nameRegExp, layer) => {
  getObjectsByRegexp(object, nameRegExp, (obj) => {
    obj.layers.set(layer);
  })
}