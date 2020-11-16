
export const getObjectsByRegexp = (object, nameRegExp, callback = () => {}) => {
  object.traverse((obj) => {
    if (obj.name.match(nameRegExp) !== null) {
      callback(obj);
    }
  })
}