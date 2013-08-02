define(['render/glMatrix-0.9.5.min'],function(matrix){
	function HexCamera(glContext) {
		var gl = glContext;
		var fieldOfView = 90;
		var cam_x = 47;
		var cam_y = 12;
		var cam_z = 50;
		var degree = -30.0;

		function getViewMatrix() {
			var m = matrix.mat4.create();
			matrix.mat4.identity(m);
			matrix.mat4.translate(m, [-cam_x, -cam_y, -cam_z]);
			matrix.mat4.rotate(m, degree * Math.PI / 180.0, [1, 0, 0], m);
			return m;
		}

		function getProjectionMatrix() {
			var m = matrix.mat4.create();
			matrix.mat4.identity(m);
			matrix.mat4.perspective(fieldOfView / 2.0, gl.viewportWidth / gl.viewportHeight, 0.1, 1000.0, m);
			return m;
		}

		function unprojectPoint(screenX, screenY) {
			var cameraMatrix;
			var projectionMatrix;
			var inverseMatrix = matrix.mat4.create();
			var pvMat = matrix.mat4.create();

			matrix.mat4.identity(inverseMatrix);
			cameraMatrix = getViewMatrix();
			projectionMatrix = getProjectionMatrix();

			matrix.mat4.multiply(projectionMatrix, cameraMatrix, pvMat);
			matrix.mat4.inverse(pvMat, inverseMatrix);

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

			matrix.mat4.multiply(inverseMatrix, inNear, near);

			if (near[3] == 0.0) {
				console.log("unproject point resulted in 0 for w coordinate. Does this ever happen?");
				return null;
			}

			//normalize output
			near[3] = 1.0 / near[3];
			near[0] = near[0] * near[3];
			near[1] = near[1] * near[3];
			near[2] = near[2] * near[3];


			matrix.mat4.multiply(inverseMatrix, inFar, far);

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
	return HexCamera;
});