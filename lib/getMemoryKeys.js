const traverse = require("./traverse");

function getMemoryKeys(memories) {
  const memoryKeys = [];
  traverse(memories, (path) => {
    memoryKeys.push(path.join("."));
  });
  return memoryKeys;
}

module.exports = getMemoryKeys;
