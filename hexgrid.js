function Player(hexGrid) {
    var me;
	function currentLocation(){
		var canvasSize = hexGrid.getCanvasSize();
		return hexGrid.findByPixel(canvasSize[0]/2, canvasSize[1]/2);
	}
    function tick() {
        if(me) {
            me.color = [1,1,1,1];
        }
        me = currentLocation();

        if(me) {
            me.color = [1,0,0,1];
        }
    }
    return {
        tick: tick,
		currentLocation: currentLocation
    }
}

function PatrolAI(hexGrid, start, end) {
    var path = hexGrid.getLine(start,end);
    var time = new Date().getTime();
    var tickTime = 300;
    var pathPos = 0;
    var pathDir = 1;
    var activePathColor = [0.8,0.8,0.8,1];
    var clearPathColor = [1,1,1,1];
    var myColor = [0.5,0.3,0.3,1];
    var deadColor= [0.3,0,0,1];
    var dead = false;

    function colorPath(color) {
        for(var i = 0; i < path.length; ++i) {
            path[i].color = color;
        }
    }

    function setNewPatrolPath(hex) {
        colorPath(clearPathColor);
        var me = path[pathPos];
        path = hexGrid.getPath(me,hex);

        colorPath(activePathColor);
        me.color = myColor;
        pathPos = 0;
    }
    function posHex() {
        return path[pathPos];
    }
    function die() {
        dead = true;
    }
    function reCalculatePath() {
        if(dead) {
            return;
        }
		var me = path[pathPos];
		me.color = clearPathColor;

        pathPos = 0;
        setNewPatrolPath(path[path.length-1])
    }

    function tick() {
        if(dead) {
            colorPath(clearPathColor);
            path[pathPos].color = deadColor;
            return;
        }
        var delta = new Date().getTime() - time;

        if(tickTime < delta) {
            path[pathPos].color = activePathColor;
            pathPos += pathDir;
            if(pathPos > path.length-1 || pathPos < 0) {
                pathDir = -pathDir;
                pathPos += pathDir;
            }
            path[pathPos].color = myColor;
            time = new Date().getTime();
        }
    }

    return {
        tick: tick,
        setNewPatrolPath: setNewPatrolPath,
        reCalculatePath: reCalculatePath,
        posHex: posHex,
        die: die
    }
}

function Vector(x, y, z){
	this.x = x;
	this.y = y;
	this.z = z;

}

function HexToQR(x, y, z){
	this.q = x;
	this.r = z;
}

function Hex(q, r, radius) {
	this.q = q;
	this.r = r;

	this.x = this.q;
	this.z = this.r;
	this.y = -this.x - this.z;

	this.size = radius;
	this.color = [1, 1, 1, 1];
    this.texture = 0;
    this.animationFrame = 0;
    this.animationTime = 0;
	this.height = function() {return this.size * 2;}
	this.width = function() {return 1.7320508 * this.size;} //﻿1.7320508 is ~ Math.sqrt(3)
	this.equals = function(rHex) {
		return this.q === rHex.q && this.r === rHex.r;
	}
}

function HexCamera(glContext) {
	var gl = glContext;
	var fieldOfView = 90;
	var cam_x = 47;
	var cam_y = 12;
	var cam_z = 50;
	var degree = -30.0;

	function getViewMatrix() {
		var m = mat4.create();
		mat4.identity(m);
		mat4.translate(m, [-cam_x, -cam_y, -cam_z]);
		mat4.rotate(m, degree * Math.PI / 180.0, [1, 0, 0], m);
		return m;
	}

	function getProjectionMatrix() {
		var m = mat4.create();
		mat4.identity(m);
		mat4.perspective(fieldOfView / 2.0, gl.viewportWidth / gl.viewportHeight, 0.1, 1000.0, m);
		return m;
	}

	function unprojectPoint(screenX, screenY) {
		var cameraMatrix;
		var projectionMatrix;
		var inverseMatrix = mat4.create();
		var pvMat = mat4.create();

		mat4.identity(inverseMatrix);
		cameraMatrix = getViewMatrix();
		projectionMatrix = getProjectionMatrix();

		mat4.multiply(projectionMatrix, cameraMatrix, pvMat);
		mat4.inverse(pvMat, inverseMatrix);

		var inNear = [];
		inNear[0] = (screenX - gl.viewportX) / gl.viewportWidth * 2.0 - 1.0; // normalize window X coord to -1 to 1
		inNear[1] = (screenY - gl.viewportY) / gl.viewportHeight * 2.0 - 1.0; // normalize window Y coord to -1 to 1
		inNear[2] = -1.0; // 2.0 * sz - 1.0 but optimized for near plane click
		inNear[3] = 1.0; // 1 = point, 0 = vector

		var inFar = [];
		inFar[0] = (screenX - gl.viewportX) / gl.viewportWidth * 2.0 - 1.0; // normalize window X coord to -1 to 1
		inFar[1] = (screenY - gl.viewportY) / gl.viewportHeight * 2.0 - 1.0; // normalize window Y coord to -1 to 1
		inFar[2] = 1.0; // 2.0 * sz - 1.0 but optimized for far plane click
		inFar[3] = 1.0; // 1 = point, 0 = vector

		var near = [0, 0, 0, 0];
		var far = [0, 0, 0, 0];

		mat4.multiply(inverseMatrix, inNear, near);

		if (near[3] == 0.0) {
			console.log("unproject point resulted in 0 for w coordinate. Does this ever happen?");
			return null;
		}

		//normalize output
		near[3] = 1.0 / near[3];
		near[0] = near[0] * near[3];
		near[1] = near[1] * near[3];
		near[2] = near[2] * near[3];


		mat4.multiply(inverseMatrix, inFar, far);

		if (far[3] == 0.0) {
			console.log("unproject point resulted in 0 for w coordinate. Does this ever happen?");
			return null;
		}

		//normalize output
		far[3] = 1.0 / far[3];
		far[0] = far[0] * far[3];
		far[1] = far[1] * far[3];
		far[2] = far[2] * far[3];

		return [
			[near[0], near[1], near[2]],
			[far[0], far[1], far[2]]
		];
	}

	function move(x,y,z) {
		cam_x += x;
		cam_y += y;
		cam_z += z;
	}

	function moveX(x) {
		move(x,0,0);
	}

	function moveY(y) {
		move(0,y,0);
	}

	function moveZ(z) {
		move(0,0,z);
	}

	function getPos() {
		return [cam_x,cam_y,cam_z];
	}

	function adjustAngleDegrees(deltaDegrees) {
		degree += deltaDegrees;
	}
	return {
		moveX: moveX,
		moveY: moveY,
		moveZ: moveZ,
		move: move,
		getPos: getPos,
		adjustAngleDegrees: adjustAngleDegrees,
		getViewMatrix : getViewMatrix,
		getProjectionMatrix: getProjectionMatrix,
		unprojectPoint: unprojectPoint
	};

}

function HexRenderEngine(canvas) {
	var gl = undefined;
	var pointUpHexVertexBuffer;
    var hexIndexBuffer;
	var hexOutlineVertexBuffer;
	var hexTextureVertexBuffer;
	var mvMatrix = mat4.create(); //modelview
	var pMatrix = mat4.create();  //perspective
	var shaderProgram;
	var textureProgram;
	var camera;
    var textureMap = {};

	function getShader(id) {
		var shaderScript = document.getElementById(id);
		if (!shaderScript) {
			return null;
		}

		var str = "";
		var k = shaderScript.firstChild;
		while (k) {
			if (k.nodeType == 3) {
				str += k.textContent;
			}
			k = k.nextSibling;
		}

		var shader;
		if (shaderScript.type == "x-shader/x-fragment") {
			shader = gl.createShader(gl.FRAGMENT_SHADER);
		} else if (shaderScript.type == "x-shader/x-vertex") {
			shader = gl.createShader(gl.VERTEX_SHADER);
		} else {
			return null;
		}

		gl.shaderSource(shader, str);
		gl.compileShader(shader);

		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			alert(gl.getShaderInfoLog(shader));
			return null;
		}

		return shader;
	}

	function initShaders() {
		var fragmentShader = getShader("shader-fs");
		var vertexShader = getShader("shader-vs");

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

        var fs = getShader("shader-tex-fs");
        var vs = getShader("shader-tex-vs");

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
    var texturesToLoad = 9;
    var textureFiles = ["test.png","test2.png","pie0.png","pie1.png","pie2.png","pie3.png","pie4.png","pie5.png","pie6.png"];
    function createTextureFromImage(image, idx, uniform) {
        var texture = gl.createTexture();
        textureMap[idx] = texture;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        texturesToLoad--;
        gl.bindTexture(gl.TEXTURE_2D, null);

    }
    function handleTextureLoaded(image, texture, textureName) {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    function initTextures() {

        var image = new Image();
        image.onload = function() { createTextureFromImage(image, 0); }
        image.src = textureFiles[0];

        var image1 = new Image();
        image1.onload = function() { createTextureFromImage(image1, 1); }
        image1.src = textureFiles[1];

        var image2 = new Image();
        image2.onload = function() { createTextureFromImage(image2, 2); }
        image2.src = textureFiles[2];

        var image3 = new Image();
        image3.onload = function() { createTextureFromImage(image3, 3); }
        image3.src = textureFiles[3];

        var image4 = new Image();
        image4.onload = function() { createTextureFromImage(image4, 4); }
        image4.src = textureFiles[4];

        var image5 = new Image();
        image5.onload = function() { createTextureFromImage(image5, 5); }
        image5.src = textureFiles[5];

        var image6 = new Image();
        image6.onload = function() { createTextureFromImage(image6, 6); }
        image6.src = textureFiles[6];

        var image7 = new Image();
        image7.onload = function() { createTextureFromImage(image7, 7); }
        image7.src = textureFiles[7];

        var image8 = new Image();
        image8.onload = function() { createTextureFromImage(image8, 8); }
        image8.src = textureFiles[8];
    }

	function setModelViewMatrix(x, y, size) {
		mvMatrix = camera.getViewMatrix();
		mat4.translate(mvMatrix, [x, y, 0]);
		mat4.scale(mvMatrix, [size * 2, size * 2, 1]);
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

    function drawHex(x, y, size, fillColor, texId, frame) {

        setModelViewMatrix(x, y, size);

        if(texId > 0) {
            var idx = texId == 3 ? texId + frame - 1 : texId - 1;
            drawWithTexture(textureMap[idx]);
        }
        else {
            drawWithColor(fillColor);
        }

        drawOutline();
    }

	function drawHexes(hexes) {
		preRender();

		for (var i = 0; i < hexes.length; ++i) {
			var hex = hexes[i];
			var x = hex.width() * (hex.q + hex.r / 2);
			var y = hex.height() * hex.r * 3 / 4.0;
            if(hex.texture == 3) {
                hex.animationTime++;
                if(hex.animationTime > 10) {
                    hex.animationTime = 0;
                    hex.animationFrame = (++hex.animationFrame) % 7;
                }
            }
			drawHex(x, y, hex.size, hex.color, hex.texture, hex.animationFrame);
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

	function preRender() {
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

	camera = new HexCamera(gl);

	return {
		camera: camera,
		drawHexes: drawHexes,
		clearCanvas: clearCanvas,
		projectScreenCoordToXYPlane: projectScreenCoordToXYPlane,
        numTextures: numTextures
	}
}

function HexGrid(canvas, use3D) {
	var hexSize = 5.0;
	var hexRenderList = [];
	var hexLookup = {};
	var map = null;

	var renderer = new HexRenderEngine(canvas, use3D);

    this.numTextures = function() {
        return renderer.numTextures();
    }
    this.loop = function() {
        this.update();
        this.renderOneFrame();
    }

    this.getCanvasSize = function() {return [canvas.width, canvas.height];}

	function makeHexToMapKey(q, r) {
		return q + "_" + r ;
	}

	function mapHexToTile(hex, mapTile) {
		hexLookup[makeHexToMapKey(hex.q, hex.r)] = {
			hex: hex,
			tile: mapTile
		};
	}

	function addHexFromTile(mapTile) {
		var hex = new Hex(mapTile.x, mapTile.y, hexSize);
		mapHexToTile(hex, mapTile);
		hexRenderList.push(hex);
	}

	this.getLine = function(hex1, hex2){
		var vecDistance = this.vectorDistanceBetween(hex1, hex2);
		var distance = this.scalarDistance(hex1, hex2);
		var hexes = [];
		for (var i = 0; i < distance; i++) {
			var factor = i / distance;
			var dX = Math.round(vecDistance.x * factor);
			var dY = Math.round(vecDistance.y * factor);
			var dZ = Math.round(vecDistance.z * factor);

			var nextX = hex1.x + dX;
			var nextY = hex1.y + dY;
			var nextZ = hex1.z + dZ;
			var blah = new HexToQR(nextX, nextY, nextZ);
			var realHex = this.find(blah.q, blah.r);
			if (realHex) {
				hexes.push(realHex);
			}
		}
		return hexes;
	};

	this.vectorDistanceBetween = function vectorDistanceBetween(hex1, hex2){
		var dX = hex2.x - hex1.x;
		var dY = hex2.y - hex1.y;
		var dZ = hex2.z - hex1.z;

		return {
			x: dX,
			y: dY,
			z: dZ
		};
	};

	this.scalarDistance = function hexDistance(hex1, hex2){
		var abs = Math.abs,
			x1 = hex1.x, y1=hex1.y, z1=hex1.z,
			x2 = hex2.x, y2 = hex2.y, z2 = hex2.z;

		return (abs(x1 - x2) + abs(y1 - y2) + abs(z1 - z2)) / 2;
	}

	this.loadMap = function(mapData) {
		map = mapData;
		mapData.forEach(addHexFromTile)
	};

	this.getMap = function() {
		return map;
	};

	this.draw = function() {
		renderer.drawHexes(hexRenderList);
	};

	this.clear = function() {
		renderer.clearCanvas();
	};

	function pixelToHex(x, y) {
		var q = ((1 / 3 * Math.sqrt(3) * (x) - 1 / 3 * y)) / hexSize;
		var r = (2 / 3 * y) / hexSize;
		var ret = {
			q: Math.round(q),
			r: Math.round(r)
		};
		return ret;
	};

	this.findByPixel = function(x, y) {
		var point = renderer.projectScreenCoordToXYPlane(x, y);
		x = point[0];
		y = point[1];
		var hexToFind = pixelToHex(x, y);
		return this.find(hexToFind.q, hexToFind.r);
	};

	this.find = function(x, y) {
		var key = makeHexToMapKey(x, y);
		var lookup = hexLookup[key];
		if(lookup){
			return lookup.hex;
		}
		return null;
	};

	this.remove = function(x, y) {
		var key = makeHexToMapKey(x, y);
		var lookup = hexLookup[key];
		if(lookup){
			hexLookup[key] = null;
		}
		var h = new Hex(x, y, hexSize);
		for (var i = 0; i < hexRenderList.length; ++i) {
			if (hexRenderList[i].equals(h)) {
				hexRenderList.splice(i, 1);
				break;
			}
		}
	}

	this.removeAll = function() {
		hexRenderList = [];
		map = {};
	}

	this.applyToAllHexes = function(func) {
		if (typeof func !== 'function') {
			return;
		}

		for (var i = 0; i < hexRenderList.length; ++i) {
			func(hexRenderList[i]);
		}
	}

	this.renderOneFrame = function() {
		this.clear();
		this.draw();
	}

	var neighborDeltas = [
		[+1, 0],
		[+1, -1],
		[ 0, -1],
		[-1, 0],
		[-1, +1],
		[ 0, +1]
	];

	this.getNeighbor = function(hex, neighborIdx){
		return this.find(hex.q + neighborDeltas[neighborIdx][0], hex.r + neighborDeltas[neighborIdx][1]);
	}

	this.findNeighbors = function(hex) {

		var neighbors = [];
		for (var i = 0; i < neighborDeltas.length; ++i) {
			var n = this.getNeighbor(hex,i);
			if (n) {
				neighbors.push(n);
			}
		}
		return neighbors;
	}

	this.getRing = function(hex,distance) {
		var q = hex.q-distance, r = hex.r + distance;
		var ring = [];

		for(var i = 0; i < neighborDeltas.length; ++i) {
			for(var j = 0; j < distance; ++j) {
				var h = this.find(q, r);
				if(h){
					ring.push(h);
				}
				q += neighborDeltas[i][0];
				r += neighborDeltas[i][1];
			}
		}
		return ring;
	}

	this.getRange = function(hex, distance) {
		var range = [hex];
		for(var dx = -distance; dx <=distance; ++dx) {
			for(var dy = Math.max(-distance, -dx-distance); dy <= Math.min(distance, -dx + distance); ++dy) {
				var dz = -dx-dy;

				var q = hex.x + dx;
				var r = hex.z + dz;
				var h = this.find(q,r);
				if(h) {
					range.push(h);
				}
			}
		}
		return range;
	}

	this.getRangeIntersection= function(h1,d1,h2,d2) {
		var r1 = this.getRange(h1, d1);
		var r2 = this.getRange(h2, d2);
		var intersection = [];
		for(var i = 0; i < r1.length; ++i){
			for(var j = 0; j < r2.length; ++j) {
				if(r1[i].equals(r2[j])){
					intersection.push(r1[i]);
				}
			}
		}
		return intersection;
	}

	this.update = function() {}

	this.getCamera = function() {
		return renderer.camera;
	}

	var pathFinder = AStarPathFinderFactory(this, function(){return 1;});
	this.getPath = pathFinder.findPath;
}


/**
 *
 * @param {Function} findNeighborsDelegate
 * @param {Function} heuristicsDelegate
 * @constructor
 */
function AStarPathFinderFactory(hexGrid, heuristicsDelegate){
	var heuristics = heuristicsDelegate;

	function removeNodeFromList(list, node){
		for(var i=0; i < list.length; i++){
			if(list[i].equals(node)){
				list.splice(i, 1);
				return;
			}
		}
	}

	function isNodeInList(list, node){
		for(var i=0; i < list.length; i++){
			if(list[i].equals(node)){
				return true;
			}
		}
		return false;
	}

	function clearNodeOfAddProperties(node){
		node.g = 0;
		node.h = 0;
		node.parent = null;
		node.f = 0;
	}

	function findPath(startHex, endHex){
		var openList = [];
		var closedList = [];
		openList.push(startHex);

		while(openList.length > 0){
			var lowInd = 0;
			for(var i = 0; i < openList.length; i++){
				if(openList[i].f < openList[lowInd].f) { lowInd = i; }
			}
			var currentHex = openList[lowInd];

			if(currentHex.equals(endHex)) {
				var curr = currentHex;
				var ret = [];
				while(curr.parent) {
					ret.push(curr);
					curr = curr.parent;
				}
                ret.push(startHex);
				var path = ret.reverse();
				hexGrid.applyToAllHexes(clearNodeOfAddProperties);
				return path;
			}

			removeNodeFromList(openList, currentHex);
			closedList.push(currentHex)

			var neighbors = hexGrid.findNeighbors(currentHex);

			for(var i=0; i<neighbors.length;i++) {
				var neighbor = neighbors[i];
				if(isNodeInList(closedList, neighbor) || hexBlocked(neighbor)) {
					// not a valid node to process, skip to next neighbor
					continue;
				}

				// g score is the shortest distance from start to current node, we need to check if
				//	 the path we have arrived at this neighbor is the shortest one we have seen yet
				if(currentHex.g == undefined){
					currentHex.g = 0;
				}
				var gScore = currentHex.g + 1; // 1 is the distance from a node to it's neighbor
				var gScoreIsBest = false;


				if(!isNodeInList(openList, neighbor)) {
					// This the the first time we have arrived at this node, it must be the best
					// Also, we need to take the h (heuristic) score since we haven't done so yet

					gScoreIsBest = true;
					neighbor.h = heuristics(neighbor, endHex);
					openList.push(neighbor);
				}
				else if(gScore < neighbor.g) {
					// We have already seen the node, but last time it had a worse g (distance from start)
					gScoreIsBest = true;
				}

				if(gScoreIsBest) {
					// Found an optimal (so far) path to this node.	 Store info on how we got here and
					//	just how good it really is...
					neighbor.parent = currentHex;
					neighbor.g = gScore;
					neighbor.f = neighbor.g + neighbor.h;
				}
			}

		}
	}

	return {
		findPath : findPath
	};
}