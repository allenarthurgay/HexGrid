define(['render/texture/textureLibrary'], function(texLib){
  var animationDefaults = {};

  function getDefaultsForTexture(texName) {
    return animationDefaults[texName];
  }

  function setDefaultsForTexture(texName, firstFrame, frameCount, frameDelay) {
    animationDefaults[texName] = {
      firstFrame: firstFrame,
      frameCount: frameCount,
      frameDelay: frameDelay
    };
  }
  function TextureAnimation(texName) {
    var self = this;
    var time = 0;
    this.name = texName;
    this.update = function(frameTime) {
      time += frameTime;
      if(time > self.delay) {
        time = time % self.delay;
        self.frame = (self.frame + 1) % self.frameCount;
      }
    }

    this.getFrame = function() {
      return self.texture.getFrame(self.frame);
    }

    this.init = function(texture) {
      self.texture = texture;
      var defaults = getDefaultsForTexture(texName);
      self.frame = defaults.firstFrame;
      self.delay = defaults.frameDelay;
      self.frameCount = self.texture.getFrameCount();
    }

    var texture = texLib.get(texName);

    if(!texture.ready) {
      texture.onReady(self.init);
    }
    else {
      self.init(texture);
    }
  }

  return {
    TextureAnimation: TextureAnimation,
    setDefaultsForTexture: setDefaultsForTexture,
    getDefaultsForTexture: getDefaultsForTexture
  };
})