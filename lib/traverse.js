function traverse(obj, callback, path = []) {
  if (0 < path.length) {
    callback(path, obj);
  }
  if (obj != null && typeof obj === "object") {
    Object.keys(obj).forEach((key) => {
      traverse(obj[key], callback, path.concat(key));
    });
  }
}

module.exports = traverse;
