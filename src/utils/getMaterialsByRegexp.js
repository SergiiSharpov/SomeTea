
export const getMaterialsByRegexp = (object, nameRegExp, callback = () => {}) => {
  object.traverse((obj) => {
    if (obj.isMesh && obj.material.name && obj.material.name.match(nameRegExp) !== null) {
      callback(obj.material, obj);
    }
  })
}