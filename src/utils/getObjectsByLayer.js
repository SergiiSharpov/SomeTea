
export const getObjectsByLayer = (object, layer, callback = () => {}) => {
  object.traverse((obj) => {
    if (obj.layers.test(layer)) {
      callback(obj);
    }
  })
}