define(function(){
	function Vector(x, y, z){
		this.x = x;
		this.y = y;
		this.z = z;

	}

	function convertXYZtoQR(x, y, z){
		return {
			q: x,
			r: z
		};
	}
	return {
		Vector: Vector,
		convertXYZtoQR: convertXYZtoQR
	}
});