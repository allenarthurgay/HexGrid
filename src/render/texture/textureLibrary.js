define(function(){
  var textureLibrary = {};

  function addTexture(texture){
    textureLibrary[texture.name] = texture;
  }

  function getTexture(textureName) {
    return textureLibrary[textureName];
  }

  function getNames() {
    var keys = [];
    for(key in textureLibrary) {
      keys.push(key);
    }
    return keys;
  }

  return {
    add: addTexture,
    get: getTexture,
    getNames: getNames
  };
})