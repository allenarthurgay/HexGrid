define(['render/glMatrix-0.9.5.min','render/camera','render/shaders','render/texture/texture','render/texture/textureLibrary'],
function(matrix, Camera, Shaders, Texture, textureLibrary){
  function RenderEngine(canvas) {
    var gl = undefined;
    var pointUpHexVertexBuffer;
    var hexIndexBuffer;
    var hexOutlineVertexBuffer;
    var hexTextureVertexBuffer;
    var mvMatrix = matrix.mat4.create(); //modelview
    var pMatrix = matrix.mat4.create();  //perspective
    var shaderProgram;
    var textureProgram;
    var camera;
    var ready = false;
    var frameTime = 0;
    var lastTimestamp = 0;
    var textureMap = {};
    var textureFiles = ['img/test.png','img/morepie.gif','img/ninja.gif','img/water.gif'];
    var texturesToLoad = textureFiles.length;

    function getShader(src, type) {
      if (!src) {
        return null;
      }

      var shader;
      if (type === Shaders.SHADER_TYPE_FRAG) {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
      } else if (type === Shaders.SHADER_TYPE_VERT) {
        shader = gl.createShader(gl.VERTEX_SHADER);
      } else {
        return null;
      }

      gl.shaderSource(shader, src);
      gl.compileShader(shader);

      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader));
        return null;
      }

      return shader;
    }

    function initShaders() {
      var fragmentShader = getShader(Shaders.basic.fs, Shaders.SHADER_TYPE_FRAG);
      var vertexShader = getShader(Shaders.basic.vs, Shaders.SHADER_TYPE_VERT);

      shaderProgram = gl.createProgram();
      gl.attachShader(shaderProgram, vertexShader);
      gl.attachShader(shaderProgram, fragmentShader);
      gl.linkProgram(shaderProgram);

      if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("Could not initialise shaders");
      }

      gl.useProgram(shaderProgram);

      shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
      shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");

      shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
      shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");

      var fs = getShader(Shaders.texture.fs, Shaders.SHADER_TYPE_FRAG);
      var vs = getShader(Shaders.texture.vs, Shaders.SHADER_TYPE_VERT);

      textureProgram = gl.createProgram();
      gl.attachShader(textureProgram, vs);
      gl.attachShader(textureProgram, fs);
      gl.linkProgram(textureProgram);

      if (!gl.getProgramParameter(textureProgram, gl.LINK_STATUS)) {
        alert("Could not initialise shaders");
      }

      gl.useProgram(textureProgram);

      textureProgram.vertexPositionAttribute = gl.getAttribLocation(textureProgram, "aVertexPosition");

      textureProgram.pMatrixUniform = gl.getUniformLocation(textureProgram, "uPMatrix");
      textureProgram.mvMatrixUniform = gl.getUniformLocation(textureProgram, "uMVMatrix");

      textureProgram.textureCoordAttribute = gl.getAttribLocation(textureProgram, "aTextureCoord");
      textureProgram.textureSampler = gl.getUniformLocation(textureProgram, "textureSampler");
    }

    function setMatrixUniforms(prog) {
      gl.uniformMatrix4fv(prog.pMatrixUniform, false, pMatrix);
      gl.uniformMatrix4fv(prog.mvMatrixUniform, false, mvMatrix);
    }

    function initBuffers() {
      pointUpHexVertexBuffer = gl.createBuffer();
      hexOutlineVertexBuffer = gl.createBuffer();
      hexTextureVertexBuffer = gl.createBuffer();

      var hexVerts = [0, 0, 0];
      var texCoords = [0.5, 0.5];
      var outlineVerts = [];

      for (var i = 0; i <= 6; i++) {
          var angle = 2 * Math.PI / 6 * (0.5 - i);

          var x_i = 0.5 * Math.cos(angle);
          var y_i = 0.5 * Math.sin(angle);

          hexVerts.push(x_i);
          hexVerts.push(y_i);
          hexVerts.push(0.0);

          outlineVerts.push(x_i);
          outlineVerts.push(y_i);
          outlineVerts.push(0.01);

          texCoords.push(x_i + 0.5);
          texCoords.push(y_i + 0.5);
      }

      // re add first point to complete fan
      hexVerts.push(0.5 * Math.cos(2 * Math.PI / 3));
      hexVerts.push(0.5 * Math.sin(2 * Math.PI / 3));
      hexVerts.push(0.0);

      // re add first texture coord
      texCoords.push(0.5 + 0.5 * Math.cos(2 * Math.PI / 3));
      texCoords.push(0.5 + 0.5 * Math.sin(2 * Math.PI / 3));

      //re add first point to complete outline
      outlineVerts.push(outlineVerts[0]);
      outlineVerts.push(outlineVerts[1]);
      outlineVerts.push(0.0);

      hexIndexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, hexIndexBuffer);

      // This array defines each face as two triangles, using the
      // indices into the vertex array to specify each triangle's
      // position.

      var cubeVertexIndices = [
          0,  1,  2,      0,  2,  3,    // front
          0,  3,  4,      0,  4,  5,    // back
          0,  5,  6,      0,  6, 1
      ];

      // Now send the element array to GL

      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeVertexIndices), gl.STATIC_DRAW);

      gl.bindBuffer(gl.ARRAY_BUFFER, pointUpHexVertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(hexVerts), gl.STATIC_DRAW);
      pointUpHexVertexBuffer.itemSize = 3;
      pointUpHexVertexBuffer.numItems = 8;

      gl.bindBuffer(gl.ARRAY_BUFFER, hexTextureVertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
      hexTextureVertexBuffer.itemSize = 2;
      hexTextureVertexBuffer.numItems = 8;

      gl.bindBuffer(gl.ARRAY_BUFFER, hexOutlineVertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(outlineVerts), gl.STATIC_DRAW);
      hexOutlineVertexBuffer.itemSize = 3;
      hexOutlineVertexBuffer.numItems = 7;
    }
    
    function notifyTextureReady(texture) {
      texturesToLoad--;
      console.log(texture.name + 'ready, ' + texturesToLoad + ' textures left to load');
      if(texturesToLoad === 0){
        ready = true;
        console.log('textures ready!');
      }
    }

    function initTextures() {
      textureFiles.map(function(src){
        var texture = new Texture(gl, src);
        if(texture.ready){
          notifyTextureReady(texture);
        }
        else {
          texture.onReady(notifyTextureReady);
        }
        textureLibrary.add(texture);
      });
    }

    function setModelViewMatrix(x, y, size) {
        mvMatrix = camera.getViewMatrix();
        matrix.mat4.translate(mvMatrix, [x, y, 0]);
        matrix.mat4.scale(mvMatrix, [size * 2, size * 2, 1]);
    }

    function drawWithTexture(texture) {
      gl.useProgram(textureProgram);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(textureProgram.textureSampler, 0);

      gl.enableVertexAttribArray(textureProgram.textureCoordAttribute);
      gl.bindBuffer(gl.ARRAY_BUFFER, hexTextureVertexBuffer);
      gl.vertexAttribPointer(textureProgram.textureCoordAttribute, hexTextureVertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

      gl.enableVertexAttribArray(textureProgram.vertexPositionAttribute);
      gl.bindBuffer(gl.ARRAY_BUFFER, pointUpHexVertexBuffer);
      gl.vertexAttribPointer(textureProgram.vertexPositionAttribute, pointUpHexVertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, hexIndexBuffer);

      setMatrixUniforms(textureProgram);

      gl.drawElements(gl.TRIANGLES, 18, gl.UNSIGNED_SHORT, 0);

      gl.disableVertexAttribArray(textureProgram.textureCoordAttribute);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);

      gl.bindTexture(gl.TEXTURE_2D, null);
    }

    function drawWithColor(color) {
      gl.useProgram(shaderProgram);

      //set color
      gl.vertexAttrib4fv(shaderProgram.vertexColorAttribute, new Float32Array(color));
      gl.bindBuffer(gl.ARRAY_BUFFER, pointUpHexVertexBuffer);
      gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, pointUpHexVertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, hexIndexBuffer);

      setMatrixUniforms(shaderProgram);

      gl.drawElements(gl.TRIANGLES, 18, gl.UNSIGNED_SHORT, 0);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    function drawOutline() {
      //outline =========================
      gl.useProgram(shaderProgram);
      gl.bindBuffer(gl.ARRAY_BUFFER, hexOutlineVertexBuffer);

      gl.vertexAttrib4fv(shaderProgram.vertexColorAttribute, new Float32Array([0, 0, 1, 1]));

      setMatrixUniforms(shaderProgram);
      gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, hexOutlineVertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
      gl.drawArrays(gl.LINE_STRIP, 0, hexOutlineVertexBuffer.numItems);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    function drawHex(x, y, size, fillColor, texture) {
      setModelViewMatrix(x, y, size);

      if(texture) {
          drawWithTexture(texture);
      }
      else {
          drawWithColor(fillColor);
      }

      drawOutline();
    }

    function drawHexes(hexes) {
      // do not render until textures are loaded
      if(!ready) return;

      preRender();

      for (var i = 0; i < hexes.length; ++i) {
          var hex = hexes[i];
          var x = hex.width() * (hex.q + hex.r / 2);
          var y = hex.height() * hex.r * 3 / 4.0;
          
          var texture = null;
          if(hex.animation) {
            hex.animation.update(frameTime);
            texture = hex.animation.getFrame();
          }
          drawHex(x, y, hex.size, hex.color, texture);
      }

      postRender();
    }

    function clearCanvas() {
      gl.clearColor(0, 0, 0, 1.0);
      gl.viewportX = 0;
      gl.viewportY = 0;
      gl.viewport(gl.viewportX, gl.viewportY, gl.viewportWidth, gl.viewportHeight);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }

    var getTimestamp = function(){return new Date().getTime();};

    if(window.performace) {
      getTimestamp = function(){return window.performance.now();};
    }

    function getFrameTime() {
      var timestamp = getTimestamp();
      var time = timestamp - lastTimestamp;

      lastTimestamp = timestamp;

      return Math.max(time, 0);
    }

    function preRender() {
      frameTime = getFrameTime();
      pMatrix = camera.getProjectionMatrix();
    }

    function postRender() {

    }

    function intersectLineWithXYPlane(far, near) {
      var vector = [far[0] - near[0], far[1] - near[1], far[2] - near[2]];
      var t = -near[2] / vector[2];
      return [near[0] + t * vector[0], near[1] + t * vector[1]];
    }

    function projectScreenCoordToXYPlane(screenX, screenY) {
      screenY = gl.viewportHeight - screenY;// canvas starts 0,top to H,bottom -- gl is opposite
      var nearFarPoints = camera.unprojectPoint(screenX, screenY);
      return intersectLineWithXYPlane(nearFarPoints[0], nearFarPoints[1]);
    }

    function initGl() {
      var contextNames = ["webgl", "experimental-webgl", "moz-webgl", "webkit-3d"];

      for (var i = 0; i < contextNames.length; i++) {
        try {
          gl = canvas.getContext(contextNames[i]);
          if (gl) {
            break;
          }
        } catch (e) {
          console.log("WebGL is not supported by this configuration: " + contextNames[i]);
        }
        if (gl === undefined) {
          console.log("WebGL is not supported by this configuration: " + contextNames[i]);
        }
      }

      try {
        gl.viewportWidth = canvas.width;
        gl.viewportHeight = canvas.height;
      }
      catch (e) {
        console.log(e.message);
      }
      initShaders();
      initTextures();
      initBuffers();
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
    }

    initGl();

    if (!gl) {
      alert('you do not support!');
      return;
    }

    function numTextures() {
      return textureFiles.length;
    }

    camera = new Camera(gl);

    return {
      camera: camera,
      drawHexes: drawHexes,
      clearCanvas: clearCanvas,
      projectScreenCoordToXYPlane: projectScreenCoordToXYPlane,
      numTextures: numTextures
    }
  }
  
  return RenderEngine;
});