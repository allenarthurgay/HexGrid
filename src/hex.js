define(function(){
  function Hex(q, r, radius) {
    this.q = q;
    this.r = r;

    this.x = this.q;
    this.z = this.r;
    this.y = -this.x - this.z;

    this.size = radius;
    this.color = [1, 1, 1, 1];
    this.animation = null;
    this.height = function() {return this.size * 2;}
    this.width = function() {return 1.7320508 * this.size;} // 1.7320508 is ~ Math.sqrt(3)
    this.equals = function(rHex) {
      return this.q === rHex.q && this.r === rHex.r;
    }
  }
  return Hex;
});