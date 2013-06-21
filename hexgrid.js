function Hex(x, y, radius) {
	this.q = x;
	this.r = y;

	this.x = this.q;
	this.z = this.r
	this.y = -this.x - this.z;

	this.size = radius;
	this.color = [1, 1, 1, 1];
	this.height = function() {return this.size * 2;}
	this.width = function() {return 1.7320508 * this.size;} //﻿1.7320508 is ~ Math.sqrt(3)
	this.equals = function(rHex) {
		return this.q === rHex.q && this.r === rHex.r;
	}
}

function HexCamera(glContext) {
    var gl = glContext;
    var fieldOfView = 90;
    var cam_x = 0;
    var cam_y = 0;
    var cam_z = 13;
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
	var hexOutlineVertexBuffer;
	var mvMatrix = mat4.create(); //modelview
	var pMatrix = mat4.create();  //perspective
	var shaderProgram;
    var camera;

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
	}

	function setMatrixUniforms() {
		gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
		gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
	}

	function initBuffers() {

		pointUpHexVertexBuffer = gl.createBuffer();
		hexOutlineVertexBuffer = gl.createBuffer();

		var hexVerts = [0.0, 0.0, 0.0];
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
		}

		// re add first point to complete fan
		hexVerts.push(0.5 * Math.cos(2 * Math.PI / 3));
		hexVerts.push(0.5 * Math.sin(2 * Math.PI / 3));
		hexVerts.push(0.0);

		//re add first point to complete outline
		outlineVerts.push(outlineVerts[0]);
		outlineVerts.push(outlineVerts[1]);
		outlineVerts.push(0.0);

		gl.bindBuffer(gl.ARRAY_BUFFER, pointUpHexVertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(hexVerts), gl.STATIC_DRAW);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
		pointUpHexVertexBuffer.itemSize = 3;
		pointUpHexVertexBuffer.numItems = 8;

		gl.bindBuffer(gl.ARRAY_BUFFER, hexOutlineVertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(outlineVerts), gl.STATIC_DRAW);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
		hexOutlineVertexBuffer.itemSize = 3;
		hexOutlineVertexBuffer.numItems = 7;
	}

	function setModelViewMatrix(x, y, size) {
        mvMatrix = camera.getViewMatrix();
		mat4.translate(mvMatrix, [x, y, 0]);
		mat4.scale(mvMatrix, [size * 2, size * 2, 1]);
	}

	function drawHex(x, y, size, fillColor) {

		setModelViewMatrix(x, y, size);

		gl.bindBuffer(gl.ARRAY_BUFFER, pointUpHexVertexBuffer);

		//set color
		gl.vertexAttrib4fv(shaderProgram.vertexColorAttribute, new Float32Array(fillColor));

		setMatrixUniforms();

		gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, pointUpHexVertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
		gl.drawArrays(gl.TRIANGLE_FAN, 0, pointUpHexVertexBuffer.numItems);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);

		//outline =========================
		gl.bindBuffer(gl.ARRAY_BUFFER, hexOutlineVertexBuffer);

		gl.vertexAttrib4fv(shaderProgram.vertexColorAttribute, new Float32Array([0, 0, 1, 1]));

		setMatrixUniforms();
		gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, hexOutlineVertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
		gl.drawArrays(gl.LINE_STRIP, 0, hexOutlineVertexBuffer.numItems);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
	}

	function drawHexes(hexes) {
		preRender();

		for (var i = 0; i < hexes.length; ++i) {
			var hex = hexes[i];
			var x = hex.width() * (hex.q + hex.r / 2);
			var y = hex.height() * hex.r * 3 / 4.0;

			drawHex(x, y, hex.size, hex.color);
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
        initBuffers();
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
    }

    initGl();

	if (!gl) {
		alert('you do not support!');
        return;
	}

    camera = new HexCamera(gl);

    return {
        camera: camera,
        drawHexes: drawHexes,
        clearCanvas: clearCanvas,
        projectScreenCoordToXYPlane: projectScreenCoordToXYPlane
    }
}

function HexGrid(canvas, use3D) {
	var hexSize = 1.5;
	var hexRenderList = [];
	var hexLookup = {};
	var map = null;

	var renderer = new HexRenderEngine(canvas, use3D);

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

	this.loadMap = function(mapData) {
		map = mapData;
		mapData.forEach(addHexFromTile)
	};

	this.getMap = function() {
		return map;
	}

	this.draw = function() {
		renderer.drawHexes(hexRenderList);
	}

	this.clear = function() {
		renderer.clearCanvas();
	}

	function pixelToHex(x, y) {
		var q = ((1 / 3 * Math.sqrt(3) * (x) - 1 / 3 * y)) / hexSize;
		var r = (2 / 3 * y) / hexSize;
		var ret = {
			q: Math.round(q),
			r: Math.round(r)
		};
		return ret;
	}

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
	}

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

	this.findNeighbors = function(hex) {

		var neighborDeltas = [
			[+1, 0],
			[+1, -1],
			[ 0, -1],
			[-1, 0],
			[-1, +1],
			[ 0, +1]
		];

		var neighbors = [];
		for (var i = 0; i < neighborDeltas.length; ++i) {
			var n = this.find(hex.q + neighborDeltas[i][0], hex.r + neighborDeltas[i][1]);
			if (n) {
				neighbors.push(n);
			}
		}
		return neighbors;
	}

	this.update = function() {}

	this.getCamera = function() {
        return renderer.camera;
    }
}