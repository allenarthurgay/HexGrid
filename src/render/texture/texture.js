define(['render/util/stream','render/util/gif','render/texture/animation'],function(Stream,Gif,Animation){
	function Texture(gl, src) {
    var self = this;
    this.name = '';
    this.frame = 0;
    this.frameTime = 64;
    this.frameList = [];
    this.animated = false;
    this.ready = false;
    this.colorTable = null;
    this.gifFrames = 0;
    this.readyCallbacks = [];
    
    this.onReady = function(callback) {
      self.readyCallbacks.push(callback);
    }

    this.addFrame = function(glTexture){
      self.frameList.push(glTexture);
      self.animated = self.frameList.length > 1;
    };

    this.getFrame = function(index) {
      if(!self.ready) {
        return;
      }

      return self.frameList[index % self.frameList.length];
    };

    this.getFrameCount = function() {
      return self.frameList.length;
    };
    
    function notifyReady() {
      self.ready = true;
      for(var i = 0; i < self.readyCallbacks.length; ++i) {
        self.readyCallbacks[i](self);
      }
    }

    function createGlTextureFromImage(image) {
      var texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindTexture(gl.TEXTURE_2D, null);
      self.addFrame(texture);
    }

    function createGlTextureFromArrayBufferView(width, height, pixBuff) {
      var texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, width, height, 0, gl.RGB, gl.UNSIGNED_BYTE, pixBuff);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindTexture(gl.TEXTURE_2D, null);
      self.addFrame(texture);
    }

    function buildPixelBuffer(img) {
      var buffer = new Uint8Array(img.width*img.height*3);
      for(var i = 0; i < img.pixels.length; ++i) {
        buffer.set(self.colorTable[img.pixels[i]],i*3 );
      }
      return buffer;
    }
    function loadGif(texSrc) {
      var gifHandler = {
        hdr: function(header) {
          self.colorTable = header.gct;
        },
        img: function(img) {
          self.gifFrames++;
          var pixBuff = buildPixelBuffer(img);
          createGlTextureFromArrayBufferView(img.width, img.height, pixBuff);
        },
        eof: function(block) {
          Animation.setDefaultsForTexture(self.name, 0, self.frameList.length, self.frameTime);
          console.log('gifFrames: ' + self.gifFrames + ' frameListSize: ' + self.frameList.length);
          notifyReady();
        },
        gce: function(gceBlock) {
          if(gceBlock.delayTime > 0) {
            self.frameTime = 10*gceBlock.delayTime;
          }
        }
      };

      var h = new XMLHttpRequest();
      h.overrideMimeType('text/plain; charset=x-user-defined');
      h.onload = function(e) {
        stream = new Stream(h.responseText);
        try {
          Gif.parse(stream, gifHandler);
        } catch(err) {
          console.log('parse error!!!');
          console.log(err.message);
        }
      };
      h.onerror = function() { console.log('ERROR xhr!!!!'); };
      h.open('GET', texSrc, true);
      h.send();
    }

    function getTexName(str) {
      var arr = str.split('/');
      return arr[arr.length-1].split('.')[0];
    }
    function loadFromSource(imgSrc) {
      self.name = getTexName(imgSrc);
      if(imgSrc.toLowerCase().indexOf('.gif') === imgSrc.length - '.gif'.length){
          loadGif(imgSrc);
      }
      else {
        
        var image = new Image();
        image.onload = function(){
          createGlTextureFromImage(image);

          Animation.setDefaultsForTexture(self.name, 0, 1, 0);
          notifyReady();
        };
        image.src = imgSrc;
      }
    }

    loadFromSource(src);
  }

  return Texture;
});