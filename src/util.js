goog.provide('hexgrid.util');

function Vector(x, y, z){
	this.x = x;
	this.y = y;
	this.z = z;

}

function convertXYZtoQR(x, y, z){
	this.q = x;
	this.r = z;
}
